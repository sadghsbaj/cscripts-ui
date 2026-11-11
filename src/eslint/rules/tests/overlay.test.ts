import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { overlayPreferFocusTrapOnContentRule } from "../overlay.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("overlay ESLint rules", () => {
    describe("overlay/prefer-focus-trap-on-content", () => {
        it("validates that focusTrap is attached to inner content rather than <Overlay> directly", () => {
            ruleTester.run("overlay/prefer-focus-trap-on-content", overlayPreferFocusTrapOnContentRule, {
                valid: [
                    {
                        code: '<Overlay variant="blur"><div {@attach focusTrap()}>Modal Content</div></Overlay>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Overlay variant="dim"><div>Content without focus trap</div></Overlay>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<div {@attach focusTrap()}><Overlay variant="blur">Content</Overlay></div>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Dialog {@attach focusTrap()}>Dialog content</Dialog>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Overlay {@attach focusTrap()} variant="blur"><div>Content</div></Overlay>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "focusTrapOnOverlay" }],
                    },
                    {
                        code: '<Overlay {@attach focusTrap} variant="dim"><div>Content</div></Overlay>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "focusTrapOnOverlay" }],
                    },
                    {
                        code: '<Overlay {@attach focusTrap({ allowOutsideClick: true })}><div>Content</div></Overlay>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "focusTrapOnOverlay" }],
                    },
                    {
                        code: '<Overlay use:focusTrap><div>Content</div></Overlay>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "focusTrapOnOverlay" }],
                    },
                ],
            });
        });
    });
});
