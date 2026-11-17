import { flushSync, mount, unmount } from "svelte";
import { createAttachmentKey } from "svelte/attachments";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { TextArea } from "../text-area/index.ts";
import { TextInput, TextInputField } from "../text-input/index.ts";
import { autoResize } from "./index.ts";

function queryRequired<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

describe("autoResize Svelte 5 Reactive & Component Integration", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
    });

    describe("Reactive enabled Getter Lifecycle", () => {
        test("toggles attachment state cleanly on -> off -> on via reactive getter", () => {
            let enabled = $state(true);

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    rows: 2,
                    [createAttachmentKey()]: autoResize({
                        enabled: () => enabled,
                        maxRows: 6,
                        minWidth: 120,
                    }),
                },
            });
            flushSync();

            const textarea = queryRequired<HTMLTextAreaElement>(container, "textarea.cs-text-area");
            expect(textarea.classList.contains("cs-auto-resize")).toBe(true);
            expect(textarea.dataset.autoResize).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("2");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("6");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("120px");

            // Toggle off
            enabled = false;
            flushSync();

            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in textarea.dataset).toBe(false);
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("");

            // Toggle back on
            enabled = true;
            flushSync();

            expect(textarea.classList.contains("cs-auto-resize")).toBe(true);
            expect(textarea.dataset.autoResize).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("2");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("6");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("120px");

            unmount(instance);
        });

        test("toggles attachment state cleanly when starting disabled (off -> on -> off)", () => {
            let enabled = $state(false);

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "sm",
                    rows: 1,
                    [createAttachmentKey()]: autoResize({
                        enabled: () => enabled,
                        maxRows: 4,
                    }),
                },
            });
            flushSync();

            const textarea = queryRequired<HTMLTextAreaElement>(container, "textarea.cs-text-area");
            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in textarea.dataset).toBe(false);

            enabled = true;
            flushSync();

            expect(textarea.classList.contains("cs-auto-resize")).toBe(true);
            expect(textarea.dataset.autoResize).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("1");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("4");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");

            enabled = false;
            flushSync();

            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in textarea.dataset).toBe(false);
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");

            unmount(instance);
        });
    });

    describe("TextArea Integration", () => {
        test("coordinates with TextArea rows={1} and maxRows={4} and cleans up on unmount", () => {
            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    rows: 1,
                    [createAttachmentKey()]: autoResize({ maxRows: 4 }),
                },
            });
            flushSync();

            const textarea = queryRequired<HTMLTextAreaElement>(container, "textarea.cs-text-area");
            expect(textarea.classList.contains("cs-text-area")).toBe(true);
            expect(textarea.classList.contains("cs-auto-resize")).toBe(true);
            expect(textarea.dataset.autoResize).toBe("");
            expect(textarea.getAttribute("rows")).toBe("1");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("1");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("4");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");

            unmount(instance);

            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in textarea.dataset).toBe(false);
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");
        });

        test("infers TextArea default rows (3) when rows prop is omitted", () => {
            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    [createAttachmentKey()]: autoResize(),
                },
            });
            flushSync();

            const textarea = queryRequired<HTMLTextAreaElement>(container, "textarea.cs-text-area");
            expect(textarea.dataset.autoResize).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("3");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");

            unmount(instance);
        });
    });

    describe("TextInputField Integration", () => {
        test("coordinates with standalone TextInputField for horizontal minWidth/maxWidth and cleans up on unmount", () => {
            const instance = mount(TextInputField, {
                target: container,
                props: {
                    placeholder: "Tag...",
                    [createAttachmentKey()]: autoResize({
                        minWidth: "60px",
                        maxWidth: "240px",
                    }),
                },
            });
            flushSync();

            const input = queryRequired<HTMLInputElement>(container, "input.cs-text-input-field");
            expect(input.classList.contains("cs-text-input-field")).toBe(true);
            expect(input.classList.contains("cs-auto-resize")).toBe(true);
            expect(input.dataset.autoResize).toBe("");
            expect(input.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("60px");
            expect(input.style.getPropertyValue("--cs-auto-resize-max-width")).toBe("240px");
            expect(input.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");
            expect(input.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");

            unmount(instance);

            expect(input.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in input.dataset).toBe(false);
            expect(input.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("");
            expect(input.style.getPropertyValue("--cs-auto-resize-max-width")).toBe("");
        });

        test("TextInput shell remains free of auto-resize attributes when attached to TextInputField", () => {
            const shellInstance = mount(TextInput, {
                target: container,
                props: {
                    variant: "soft",
                    size: "sm",
                    class: "w-auto",
                },
            });
            flushSync();

            const shell = queryRequired<HTMLDivElement>(container, ".cs-text-input");
            const fieldInstance = mount(TextInputField, {
                target: shell,
                props: {
                    [createAttachmentKey()]: autoResize({
                        minWidth: "60px",
                        maxWidth: "240px",
                    }),
                },
            });
            flushSync();

            const input = queryRequired<HTMLInputElement>(shell, "input.cs-text-input-field");
            expect(shell.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in shell.dataset).toBe(false);
            expect(input.classList.contains("cs-auto-resize")).toBe(true);
            expect(input.dataset.autoResize).toBe("");
            expect(input.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("60px");
            expect(input.style.getPropertyValue("--cs-auto-resize-max-width")).toBe("240px");

            unmount(fieldInstance);
            unmount(shellInstance);
        });
    });
});
