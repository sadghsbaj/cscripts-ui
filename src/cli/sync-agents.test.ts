import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { syncAgents } from "./sync-agents.ts";

function writeFixtureFiles(root: string, files: Record<string, string>): void {
    for (const [relativePath, content] of Object.entries(files)) {
        const fullPath = path.join(root, relativePath);
        mkdirSync(path.dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, content, "utf8");
    }
}

describe("syncAgents", () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = mkdtempSync(path.join(os.tmpdir(), "cs-sync-agents-"));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it("copies cs-* files into rules/ and agents/, creating missing target directories and ignoring non-cs-* source files", () => {
        const sourceRoot = path.join(tempDir, "source/.agents");
        const targetRoot = path.join(tempDir, "app/.agents");

        writeFixtureFiles(sourceRoot, {
            "rules/cs-naming.md": "# naming v1",
            "rules/cs-svelte.md": "# svelte v1",
            "rules/internal-notes.md": "# should be ignored",
            "agents/cs-tester.md": "# tester v1",
            "agents/draft-agent.md": "# should be ignored",
        });

        syncAgents({ sourceRoot, targetRoot });

        expect(readFileSync(path.join(targetRoot, "rules/cs-naming.md"), "utf8")).toBe("# naming v1");
        expect(readFileSync(path.join(targetRoot, "rules/cs-svelte.md"), "utf8")).toBe("# svelte v1");
        expect(readFileSync(path.join(targetRoot, "agents/cs-tester.md"), "utf8")).toBe("# tester v1");
        expect(existsSync(path.join(targetRoot, "rules/internal-notes.md"))).toBe(false);
        expect(existsSync(path.join(targetRoot, "agents/draft-agent.md"))).toBe(false);
    });

    it("removes stale cs-* files from target rules/ and agents/ on upgrade", () => {
        const sourceRoot = path.join(tempDir, "source/.agents");
        const targetRoot = path.join(tempDir, "app/.agents");

        writeFixtureFiles(sourceRoot, {
            "rules/cs-new-rule.md": "# new rule",
            "agents/cs-new-agent.md": "# new agent",
        });

        writeFixtureFiles(targetRoot, {
            "rules/cs-old-rule.md": "# stale rule",
            "rules/cs-new-rule.md": "# old content",
            "agents/cs-old-agent.md": "# stale agent",
        });

        syncAgents({ sourceRoot, targetRoot });

        expect(existsSync(path.join(targetRoot, "rules/cs-old-rule.md"))).toBe(false);
        expect(existsSync(path.join(targetRoot, "agents/cs-old-agent.md"))).toBe(false);
        expect(readFileSync(path.join(targetRoot, "rules/cs-new-rule.md"), "utf8")).toBe("# new rule");
        expect(readFileSync(path.join(targetRoot, "agents/cs-new-agent.md"), "utf8")).toBe("# new agent");
    });

    it("preserves app-owned non-cs-* files and root AGENTS.md", () => {
        const sourceRoot = path.join(tempDir, "source/.agents");
        const appRoot = path.join(tempDir, "app");
        const targetRoot = path.join(appRoot, ".agents");

        writeFixtureFiles(sourceRoot, {
            "rules/cs-naming.md": "# updated naming",
            "agents/cs-tester.md": "# updated tester",
        });

        writeFixtureFiles(appRoot, {
            "AGENTS.md": "# App root instructions",
            ".agents/rules/app-domain.md": "# App domain rule",
            ".agents/agents/custom-agent.md": "# App custom agent",
            ".agents/rules/cs-naming.md": "# old naming",
        });

        syncAgents({ sourceRoot, cwd: appRoot });

        expect(readFileSync(path.join(appRoot, "AGENTS.md"), "utf8")).toBe("# App root instructions");
        expect(readFileSync(path.join(targetRoot, "rules/app-domain.md"), "utf8")).toBe("# App domain rule");
        expect(readFileSync(path.join(targetRoot, "agents/custom-agent.md"), "utf8")).toBe(
            "# App custom agent",
        );
        expect(readFileSync(path.join(targetRoot, "rules/cs-naming.md"), "utf8")).toBe("# updated naming");
        expect(readFileSync(path.join(targetRoot, "agents/cs-tester.md"), "utf8")).toBe("# updated tester");
    });

    it("handles missing agents/ in sourceRoot while still cleaning stale cs-* files in target agents/", () => {
        const sourceRoot = path.join(tempDir, "source/.agents");
        const targetRoot = path.join(tempDir, "app/.agents");

        writeFixtureFiles(sourceRoot, {
            "rules/cs-naming.md": "# naming",
        });

        writeFixtureFiles(targetRoot, {
            "agents/cs-old-agent.md": "# stale agent",
            "agents/custom-agent.md": "# keep me",
        });

        expect(() => syncAgents({ sourceRoot, targetRoot })).not.toThrow();
        expect(existsSync(path.join(targetRoot, "agents/cs-old-agent.md"))).toBe(false);
        expect(readFileSync(path.join(targetRoot, "agents/custom-agent.md"), "utf8")).toBe("# keep me");
        expect(readFileSync(path.join(targetRoot, "rules/cs-naming.md"), "utf8")).toBe("# naming");
    });

    it("is a safe no-op when cwd/template/.agents matches sourceRoot or sourceRoot equals targetRoot", () => {
        const repoRoot = path.join(tempDir, "repo");
        const templateAgents = path.join(repoRoot, "template/.agents");
        const repoAgents = path.join(repoRoot, ".agents");

        writeFixtureFiles(repoRoot, {
            "template/.agents/rules/cs-from-template.md": "# from template",
            ".agents/rules/cs-existing.md": "# existing in repo",
        });

        syncAgents({ cwd: repoRoot, sourceRoot: templateAgents });

        expect(readFileSync(path.join(repoAgents, "rules/cs-existing.md"), "utf8")).toBe(
            "# existing in repo",
        );
        expect(existsSync(path.join(repoAgents, "rules/cs-from-template.md"))).toBe(false);

        const sameRoot = path.join(tempDir, "same/.agents");
        writeFixtureFiles(sameRoot, {
            "rules/cs-keep.md": "# untouched",
        });

        syncAgents({ sourceRoot: sameRoot, targetRoot: sameRoot });

        expect(readFileSync(path.join(sameRoot, "rules/cs-keep.md"), "utf8")).toBe("# untouched");
    });
});
