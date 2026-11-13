import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { attachmentCssParser } from "../attachment-layers.ts";
import { noOklchNeutralMixRule, vendorPrefixOrderRule } from "../css-safety.ts";

const svelteTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

const cssTester = new RuleTester({
    languageOptions: {
        parser: attachmentCssParser,
    },
});

describe("css-safety ESLint rules", () => {
    describe("css-safety/vendor-prefix-order", () => {
        it("enforces vendor-prefixed properties before standard properties in .svelte <style>", () => {
            svelteTester.run("css-safety/vendor-prefix-order", vendorPrefixOrderRule, {
                valid: [
                    {
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .overlay {
            -webkit-backdrop-filter: blur(16px);
            backdrop-filter: blur(16px);
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/overlay/Overlay.svelte",
                    },
                    {
                        // Different nested blocks do not interfere with each other
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .card {
            backdrop-filter: blur(12px);
            &:hover {
                -webkit-backdrop-filter: blur(16px);
                backdrop-filter: blur(16px);
            }
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/overlay/Overlay.svelte",
                    },
                    {
                        // Comments and custom properties are ignored
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .card {
            /* backdrop-filter: blur(8px); */
            --webkit-custom: 1;
            -webkit-backdrop-filter: blur(16px);
            backdrop-filter: blur(16px);
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/overlay/Overlay.svelte",
                    },
                ],
                invalid: [
                    {
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .overlay {
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/overlay/Overlay.svelte",
                        errors: [{ messageId: "vendorPrefixAfterStandard" }],
                    },
                    {
                        // Trailing declaration without semicolon
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .box {
            user-select: none;
            -webkit-user-select: none
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/overlay/Overlay.svelte",
                        errors: [{ messageId: "vendorPrefixAfterStandard" }],
                    },
                ],
            });
        });

        it("enforces vendor-prefixed properties before standard properties in .css files", () => {
            cssTester.run("css-safety/vendor-prefix-order", vendorPrefixOrderRule, {
                valid: [
                    {
                        code: `
.mask {
    -webkit-mask-image: linear-gradient(black, transparent);
    mask-image: linear-gradient(black, transparent);
}
`,
                        filename: "src/css/foundation/scroll.css",
                    },
                ],
                invalid: [
                    {
                        code: `
.mask {
    mask-image: linear-gradient(black, transparent);
    -webkit-mask-image: linear-gradient(black, transparent);
}
`,
                        filename: "src/css/foundation/scroll.css",
                        errors: [{ messageId: "vendorPrefixAfterStandard" }],
                    },
                ],
            });
        });
    });

    describe("css-safety/no-oklch-neutral-mix", () => {
        it("flags color-mix(in oklch, ...) with neutral gray tokens in .svelte <style>", () => {
            svelteTester.run("css-safety/no-oklch-neutral-mix", noOklchNeutralMixRule, {
                valid: [
                    {
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .btn {
            background: color-mix(in oklab, var(--cs-color-danger-500) 24%, var(--cs-color-base-950));
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/toggle-button/ToggleButton.svelte",
                    },
                    {
                        // Non-neutral color-mix in oklch is allowed
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .btn {
            background: color-mix(in oklch, var(--cs-color-accent-500) 50%, white);
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/button/Button.svelte",
                    },
                ],
                invalid: [
                    {
                        code: `
<div></div>
<style>
    @layer components.primitive {
        .btn {
            background: color-mix(in oklch, var(--cs-color-danger-500) 24%, var(--cs-color-base-950));
        }
    }
</style>
`,
                        filename: "src/svelte/primitives/toggle-button/ToggleButton.svelte",
                        errors: [{ messageId: "oklchNeutralMix" }],
                    },
                ],
            });
        });

        it("flags color-mix(in oklch, ...) with neutral gray tokens in .css files", () => {
            cssTester.run("css-safety/no-oklch-neutral-mix", noOklchNeutralMixRule, {
                valid: [
                    {
                        code: `
:root {
    --soft: color-mix(in oklab, var(--cs-color-accent-500) 24%, var(--cs-color-base-950));
    --alpha: color-mix(in oklch, var(--cs-color-base-900) 5%, transparent);
}
`,
                        filename: "src/css/foundation/color-semantics.css",
                    },
                ],
                invalid: [
                    {
                        code: `
:root {
    --bad: color-mix(in oklch, var(--cs-color-warning-500) 24%, var(--cs-color-zinc-950));
}
`,
                        filename: "src/css/foundation/color-semantics.css",
                        errors: [{ messageId: "oklchNeutralMix" }],
                    },
                ],
            });
        });
    });
});
