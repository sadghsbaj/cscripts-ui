import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export const CS_DOCS_PLUGIN_NAME = "vite-plugin-cs-docs";

export interface CSDocsOptions {
    /**
     * Whether to serve the bundled `cscripts-ui` playground documentation in the dev server.
     * @default true
     */
    enabled?: boolean;

    /**
     * URL pathname where the documentation is served.
     * @default "/docs"
     */
    path?: string;
}

function normalizeRoutePath(routePath: string): string {
    const trimmed = routePath.trim();
    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
}

/**
 * Vite dev-server plugin that serves the prebuilt single-file `cscripts-ui` playground
 * documentation at `/docs` (configurable via `path`) without affecting production builds.
 */
export function csDocs(options: CSDocsOptions = {}): Plugin {
    const enabled = options.enabled ?? true;
    if (!enabled) {
        return {
            name: CS_DOCS_PLUGIN_NAME,
            apply: "serve",
        };
    }

    const routePath = normalizeRoutePath(options.path ?? "/docs");
    const docsHtmlPath = path.resolve(import.meta.dirname, "./docs.html");

    return {
        name: CS_DOCS_PLUGIN_NAME,
        apply: "serve",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.method !== "GET" && req.method !== "HEAD") {
                    next();
                    return;
                }

                const reqPath = (req.url ?? "/").split("?", 1)[0] ?? "/";
                if (reqPath !== routePath && reqPath !== `${routePath}/`) {
                    next();
                    return;
                }

                if (!existsSync(docsHtmlPath)) {
                    res.statusCode = 503;
                    res.setHeader("Content-Type", "text/plain; charset=utf-8");
                    res.end("cscripts-ui docs bundle not found. Run `bun run build:docs` in cscripts-ui.");
                    return;
                }

                const html = readFileSync(docsHtmlPath, "utf8");
                res.statusCode = 200;
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.setHeader("Cache-Control", "no-store");
                res.end(req.method === "HEAD" ? undefined : html);
            });
        },
    };
}
