import type { Linter } from "eslint";
import { describe, expect, it } from "vitest";

import csDefaultEslint, { csEslint, csLibraryEslint } from "../../index.ts";

function hasPlugin(configs: Linter.Config[], pluginName: string): boolean {
    return configs.some((config) => config.plugins && pluginName in config.plugins);
}

function hasRulePrefix(configs: Linter.Config[], prefix: string): boolean {
    return configs.some((config) => config.rules && Object.keys(config.rules).some((key) => key.startsWith(prefix)));
}

describe("ESLint config bundle split", () => {
    it("exports csEslint as the default export without library-only layer plugins or rules", () => {
        expect(csDefaultEslint).toBe(csEslint);

        expect(hasPlugin(csEslint, "component-layers")).toBe(false);
        expect(hasPlugin(csEslint, "attachment-layers")).toBe(false);
        expect(hasRulePrefix(csEslint, "component-layers/")).toBe(false);
        expect(hasRulePrefix(csEslint, "attachment-layers/")).toBe(false);
    });

    it("includes component-layers, attachment-layers, and library-internal overrides in csLibraryEslint", () => {
        expect(hasPlugin(csLibraryEslint, "component-layers")).toBe(true);
        expect(hasPlugin(csLibraryEslint, "attachment-layers")).toBe(true);
        expect(hasRulePrefix(csLibraryEslint, "component-layers/")).toBe(true);
        expect(hasRulePrefix(csLibraryEslint, "attachment-layers/")).toBe(true);

        const overrideFiles = csLibraryEslint.flatMap((config) => (config.files ?? []).flat());
        expect(overrideFiles).toContain("src/uno/shortcuts/**");
        expect(overrideFiles).toContain("src/uno/dots/**");
        expect(overrideFiles).toContain("src/modules/browser-storage/**");
        expect(overrideFiles).toContain("template/src/main.ts");
        expect(overrideFiles).toContain("src/modules/clipboard/clipboard.utils.ts");
        expect(overrideFiles).toContain("src/modules/select/SelectTrigger.svelte");
        expect(overrideFiles).toContain("src/modules/kbd/Kbd.svelte");
    });
});
