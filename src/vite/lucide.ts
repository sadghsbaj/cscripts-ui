import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";

export interface CSLucideOptions {
    /**
     * Whether to rewrite barrel imports from `@lucide/svelte` into direct per-icon
     * subpath imports (`@lucide/svelte/icons/<name>`) on the fly during dev and build.
     */
    enabled: boolean;
}

const INDEX_FILES = ["icons/index.js", "aliases/aliases.js", "aliases/prefixed.js", "aliases/suffixed.js"] as const;

const EXPORT_REGEX = /default\s+as\s+(\w+)\s*\}\s*from\s*["'](?:\.\/|\.\.\/icons\/)([^"']+?)\.(?:svelte|js)["']/g;

const IMPORT_STATEMENT_REGEX = /\bimport\s*\{([^}]+)\}\s*from\s*["']@lucide\/svelte["']\s*;?/g;

let cachedIconMap: Map<string, string> | undefined;

function getLucideIconMap(rootDir: string): Map<string, string> {
    if (cachedIconMap) return cachedIconMap;

    const map = new Map<string, string>();

    try {
        const req = createRequire(path.join(rootDir, "package.json"));
        const pkgPath = req.resolve("@lucide/svelte/package.json");
        const distDir = path.join(path.dirname(pkgPath), "dist");

        for (const relPath of INDEX_FILES) {
            const fullPath = path.join(distDir, relPath);
            if (!existsSync(fullPath)) continue;

            const content = readFileSync(fullPath, "utf8");
            for (const match of content.matchAll(EXPORT_REGEX)) {
                const exportName = match[1];
                const iconSlug = match[2];
                if (exportName && iconSlug) {
                    map.set(exportName, `@lucide/svelte/icons/${iconSlug}`);
                }
            }
        }
    } catch {
        // Fallback if @lucide/svelte is not installed in the consuming project
    }

    cachedIconMap = map;
    return map;
}

function rewriteLucideImports(code: string, iconMap: Map<string, string>): string | undefined {
    if (!code.includes("@lucide/svelte") || iconMap.size === 0) return undefined;

    let mutated = false;

    const result = code.replaceAll(IMPORT_STATEMENT_REGEX, (fullMatch, specifiersBlock: string) => {
        const rawSpecifiers = specifiersBlock
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        const directImports: string[] = [];
        const remainingSpecifiers: string[] = [];

        for (const spec of rawSpecifiers) {
            if (spec.startsWith("type ")) {
                remainingSpecifiers.push(spec);
                continue;
            }

            const asMatch = /^(\w+)\s+as\s+(\w+)$/.exec(spec);
            const importedName = asMatch ? asMatch[1] : spec;
            const localName = asMatch ? asMatch[2] : spec;

            const targetSubpath = importedName ? iconMap.get(importedName) : undefined;
            if (targetSubpath && localName) {
                directImports.push(`import ${localName} from "${targetSubpath}";`);
            } else {
                remainingSpecifiers.push(spec);
            }
        }

        if (directImports.length === 0) {
            return fullMatch;
        }

        mutated = true;

        if (remainingSpecifiers.length > 0) {
            directImports.push(`import { ${remainingSpecifiers.join(", ")} } from "@lucide/svelte";`);
        }

        return directImports.join("\n");
    });

    return mutated ? result : undefined;
}

/**
 * Vite plugin that optimizes `@lucide/svelte` barrel imports on the fly.
 *
 * Architectural Notes:
 * - Why `optimizeDeps` Cannot Bundle `@lucide/svelte`: `@lucide/svelte` distributes raw `.svelte`
 *   components, so `@sveltejs/vite-plugin-svelte` excludes it from Vite's dependency pre-bundler.
 *   Importing from the root `@lucide/svelte` barrel otherwise forces Vite and Rollup to resolve
 *   and compile ~2,000 `.svelte` icon modules.
 * - On-The-Fly Subpath Rewriting: Parses `@lucide/svelte`'s export & alias maps once at startup
 *   and rewrites `import { Check, Truck } from "@lucide/svelte"` into direct subpath imports
 *   (`@lucide/svelte/icons/check`) during `transform` (`enforce: "pre"`).
 */
export function csLucide(options: CSLucideOptions): Plugin {
    if (!options.enabled) {
        return {
            name: "vite-plugin-cs-lucide-noop",
        };
    }

    let rootDir = process.cwd();

    return {
        name: "vite-plugin-cs-lucide",
        enforce: "pre",

        configResolved(config) {
            rootDir = config.root;
        },

        transform(code, id) {
            if (id.includes("node_modules") && !id.includes("node_modules/cs/")) {
                return;
            }

            const iconMap = getLucideIconMap(rootDir);
            const transformed = rewriteLucideImports(code, iconMap);

            if (!transformed) return;

            return {
                code: transformed,
                map: null,
            };
        },
    };
}
