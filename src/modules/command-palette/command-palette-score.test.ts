import { describe, expect, test } from "vitest";

import { scoreCommandPaletteMatch, type CommandPaletteFilterCandidate } from "./index.ts";

describe("scoreCommandPaletteMatch", () => {
    test("returns positive baseline score for empty or whitespace-only queries", () => {
        const candidate: CommandPaletteFilterCandidate = {
            value: "new-file",
            label: "Create File",
        };

        expect(scoreCommandPaletteMatch("", candidate)).toBe(1);
        expect(scoreCommandPaletteMatch("   \t\n ", candidate)).toBe(1);
    });

    test("ranks exact > prefix > word-boundary > substring on label", () => {
        const exact: CommandPaletteFilterCandidate = { value: "a", label: "open" };
        const prefix: CommandPaletteFilterCandidate = { value: "b", label: "open settings" };
        const boundary: CommandPaletteFilterCandidate = { value: "c", label: "re-open file" };
        const substring: CommandPaletteFilterCandidate = { value: "d", label: "reopened" };

        const sExact = scoreCommandPaletteMatch("open", exact);
        const sPrefix = scoreCommandPaletteMatch("open", prefix);
        const sBoundary = scoreCommandPaletteMatch("open", boundary);
        const sSub = scoreCommandPaletteMatch("open", substring);

        expect(sExact).toBeGreaterThan(sPrefix);
        expect(sPrefix).toBeGreaterThan(sBoundary);
        expect(sBoundary).toBeGreaterThan(sSub);
        expect(sSub).toBeGreaterThan(0);
    });

    test("recognizes delimiter characters as word boundaries", () => {
        const boundaryLabels = ["my-theme", "my_theme", "my/theme", "my.theme", "my:theme", "my theme"];
        const midWordScore = scoreCommandPaletteMatch("theme", { value: "x", label: "mytheme" });

        for (const label of boundaryLabels) {
            const score = scoreCommandPaletteMatch("theme", { value: label, label });
            expect(score).toBeGreaterThan(midWordScore);
        }
    });

    test("matches multi-token queries across fields and requires all tokens to match", () => {
        const candidate: CommandPaletteFilterCandidate = {
            value: "git-checkout",
            label: "Switch Branch",
            keywords: ["git", "checkout"],
            groupLabel: "Version Control",
        };

        const fullPhrase = scoreCommandPaletteMatch("switch branch", candidate);
        const reversedTokens = scoreCommandPaletteMatch("branch switch", candidate);
        const crossField = scoreCommandPaletteMatch("git branch", candidate);
        const missingToken = scoreCommandPaletteMatch("git deploy", candidate);

        expect(fullPhrase).toBeGreaterThan(reversedTokens);
        expect(reversedTokens).toBeGreaterThan(0);
        expect(crossField).toBeGreaterThan(0);
        expect(missingToken).toBe(0);
    });

    test("ranks label matches above keywords, groupLabel, and value matches", () => {
        const labelMatch: CommandPaletteFilterCandidate = { value: "1", label: "Theme" };
        const keywordMatch: CommandPaletteFilterCandidate = {
            value: "2",
            label: "Appearance",
            keywords: ["theme"],
        };
        const groupMatch: CommandPaletteFilterCandidate = {
            value: "3",
            label: "Dark Mode",
            groupLabel: "Theme",
        };
        const valueMatch: CommandPaletteFilterCandidate = {
            value: "theme",
            label: "Dark Mode",
        };

        const sLabel = scoreCommandPaletteMatch("theme", labelMatch);
        const sKeyword = scoreCommandPaletteMatch("theme", keywordMatch);
        const sGroup = scoreCommandPaletteMatch("theme", groupMatch);
        const sValue = scoreCommandPaletteMatch("theme", valueMatch);

        expect(sLabel).toBeGreaterThan(sKeyword);
        expect(sKeyword).toBeGreaterThan(sGroup);
        expect(sGroup).toBeGreaterThan(sValue);
        expect(sValue).toBeGreaterThan(0);
    });

    test("is case-insensitive across query, label, keywords, groupLabel, and value", () => {
        const candidate: CommandPaletteFilterCandidate = {
            value: "Toggle-Dark",
            label: "Appearance Settings",
            keywords: ["NightMode"],
            groupLabel: "SystemPrefs",
        };

        expect(scoreCommandPaletteMatch("APPEARANCE", candidate)).toBeGreaterThan(0);
        expect(scoreCommandPaletteMatch("nightmode", candidate)).toBeGreaterThan(0);
        expect(scoreCommandPaletteMatch("SYSTEMPREFS", candidate)).toBeGreaterThan(0);
        expect(scoreCommandPaletteMatch("toggle-dark", candidate)).toBeGreaterThan(0);
    });

    test("returns 0 for non-matching queries including non-contiguous subsequences", () => {
        const candidate: CommandPaletteFilterCandidate = {
            value: "create-file",
            label: "Create File",
            keywords: ["new", "document"],
            groupLabel: "Workspace",
        };

        expect(scoreCommandPaletteMatch("zzz", candidate)).toBe(0);
        expect(scoreCommandPaletteMatch("crf", candidate)).toBe(0);
        expect(scoreCommandPaletteMatch("create nonexistent", candidate)).toBe(0);
    });
});
