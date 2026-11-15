#!/usr/bin/env bun
/* eslint-disable unicorn/no-exports-in-scripts -- Exported for unit testing while remaining an executable CLI script. */
import { copyFileSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";

const SYNC_FOLDERS = ["rules", "agents"] as const;
const MANAGED_PREFIX = "cs-";

export interface SyncAgentsOptions {
    sourceRoot?: string;
    targetRoot?: string;
    cwd?: string;
}

export function syncAgents(options: SyncAgentsOptions = {}): void {
    const cwd = options.cwd ?? process.cwd();
    const sourceRoot =
        options.sourceRoot ?? path.resolve(realpathSync(import.meta.dir), "../../template/.agents");
    const targetRoot = options.targetRoot ?? path.resolve(cwd, ".agents");

    const resolvedSource = path.resolve(sourceRoot);
    const resolvedTarget = path.resolve(targetRoot);

    // Self-execution guard: never modify cscripts-ui itself when run inside the library repo.
    if (
        path.resolve(cwd, "template/.agents") === resolvedSource ||
        resolvedSource === resolvedTarget
    ) {
        return;
    }

    for (const folder of SYNC_FOLDERS) {
        const sourceDir = path.join(resolvedSource, folder);
        const targetDir = path.join(resolvedTarget, folder);

        if (existsSync(targetDir)) {
            for (const entry of readdirSync(targetDir)) {
                if (entry.startsWith(MANAGED_PREFIX)) {
                    rmSync(path.join(targetDir, entry), { recursive: true, force: true });
                }
            }
        }

        if (!existsSync(sourceDir)) {
            continue;
        }

        const managedFiles = readdirSync(sourceDir, { withFileTypes: true }).filter(
            (entry) => entry.isFile() && entry.name.startsWith(MANAGED_PREFIX),
        );

        if (managedFiles.length === 0) {
            continue;
        }

        mkdirSync(targetDir, { recursive: true });
        for (const file of managedFiles) {
            copyFileSync(path.join(sourceDir, file.name), path.join(targetDir, file.name));
        }
    }
}

if (import.meta.main) {
    syncAgents();
}
