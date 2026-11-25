import { flushSync, mount, tick, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import CommandPaletteTestHost from "../command-palette/CommandPaletteTestHost.internal.svelte";
import { createCommandPaletteRegistry } from "../command-palette/index.ts";
import { theme, THEME_LABELS, THEME_MODES, type ThemeManager, type ThemeMode } from "../theme/index.ts";
import {
    COMMAND_PALETTE_THEME_PLUGIN_ID,
    createCommandPaletteThemePlugin,
} from "./index.ts";

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Expected element matching "${selector}"`);
    return el;
}

function dispatchKeyDown(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function typeIntoInput(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    flushSync();
}

function getVisibleOptionValues(root: ParentNode): string[] {
    return [...root.querySelectorAll<HTMLElement>('[role="option"]:not([hidden])')].map(
        (el) => el.dataset.value ?? ""
    );
}

function createMockThemeManager(initialMode: ThemeMode = "system"): {
    manager: ThemeManager;
    setSpy: ReturnType<typeof vi.fn<(mode: ThemeMode) => void>>;
} {
    let mode = $state<ThemeMode>(initialMode);
    const setSpy = vi.fn((next: ThemeMode) => {
        mode = next;
    });
    const manager = {
        get mode() {
            return mode;
        },
        set: setSpy,
    } as unknown as ThemeManager;

    return { manager, setSpy };
}

describe("command-palette-theme", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders root item with localized label, active mode trailing, bilingual keywords, optional shortcut, and group", () => {
        const { manager } = createMockThemeManager("dark");
        const plugin = createCommandPaletteThemePlugin({
            manager,
            group: "Preferences",
            shortcut: ["Mod", "Shift", "T"],
            keywords: ["palette-skin"],
        });

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                plugins: [plugin],
                focusTrap: false,
            },
        });
        flushSync();

        const rootValue = `${COMMAND_PALETTE_THEME_PLUGIN_ID}:root`;
        const rootOption = mustQuery<HTMLElement>(document.body, `[role="option"][data-value="${rootValue}"]`);
        const groupLabel = mustQuery<HTMLElement>(document.body, ".cs-command-palette-group-label");
        const trailing = mustQuery<HTMLElement>(rootOption, ".cs-command-palette-item-trailing");
        const shortcutEl = mustQuery<HTMLElement>(rootOption, ".cs-command-palette-item-shortcut");

        expect(groupLabel.textContent?.trim()).toBe("Preferences");
        expect(mustQuery<HTMLElement>(rootOption, ".cs-command-palette-item-text").textContent?.trim()).toBeTruthy();
        expect(trailing.textContent?.trim()).toBe(THEME_LABELS.dark);
        expect(shortcutEl.textContent).toContain("Mod");
        expect(shortcutEl.textContent).toContain("Shift");
        expect(shortcutEl.textContent).toContain("T");

        // Bilingual keywords (English & German) + custom keyword match the root item.
        const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
        for (const query of ["theme", "dunkel", "darstellung", "palette-skin"]) {
            typeIntoInput(input, query);
            expect(getVisibleOptionValues(document.body)).toEqual([rootValue]);
        }

        typeIntoInput(input, "");
        unmount(host);
    });

    test("selecting root item pushes theme sub-page and highlights the currently active mode after tick()", async () => {
        const { manager } = createMockThemeManager("dark");
        const plugin = createCommandPaletteThemePlugin({ manager });

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                plugins: [plugin],
                focusTrap: false,
            },
        });
        flushSync();

        const rootOption = mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:root"]`
        );
        rootOption.click();
        flushSync();

        expect(host.getOpen()).toBe(true);
        expect(host.getPages()).toEqual([plugin.id]);

        // Wait for tick() inside onSelect to move highlight to the active mode.
        await tick();
        flushSync();

        const activeModeValue = `${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:dark`;
        expect(host.getHighlightedValue()).toBe(activeModeValue);
        const darkOption = mustQuery<HTMLElement>(document.body, `[role="option"][data-value="${activeModeValue}"]`);
        expect(darkOption.getAttribute("aria-selected")).toBe("true");
        expect(darkOption.dataset.highlighted).toBe("");

        unmount(host);
    });

    test("sub-page lists system, light, dark with checked=true only on active mode and suppresses group label", async () => {
        const { manager } = createMockThemeManager("light");
        const plugin = createCommandPaletteThemePlugin({ manager });

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                plugins: [plugin],
                focusTrap: false,
                customPages: [
                    {
                        value: "unrelated-page",
                        label: "Other",
                        items: [{ value: "other-item", label: "Other Item" }],
                    },
                ],
            },
        });
        flushSync();

        // Unrelated page does not render theme plugin items.
        host.pushPage("unrelated-page");
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual(["other-item"]);
        host.popPage();
        flushSync();

        // Enter theme sub-page.
        mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:root"]`
        ).click();
        flushSync();
        await tick();
        flushSync();

        expect(getVisibleOptionValues(document.body)).toEqual(
            THEME_MODES.map((m) => `${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:${m}`)
        );
        expect(document.body.querySelector(".cs-command-palette-group-label")).toBeNull();

        for (const mode of THEME_MODES) {
            const option = mustQuery<HTMLElement>(
                document.body,
                `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:${mode}"]`
            );
            const expectedChecked = mode === "light";
            expect(option.getAttribute("aria-checked")).toBe(expectedChecked ? "true" : "false");
            if (expectedChecked) {
                expect(option.dataset.checked).toBe("");
            } else {
                expect(option.dataset.checked).toBeUndefined();
            }
        }

        unmount(host);
    });

    test("selecting a mode with closeOnSelect=true (default) calls manager.set, closes palette, and updates trailing/checked on reopen", async () => {
        const { manager, setSpy } = createMockThemeManager("system");
        const onClose = vi.fn();
        const plugin = createCommandPaletteThemePlugin({ manager });

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                plugins: [plugin],
                onClose,
                focusTrap: false,
            },
        });
        flushSync();

        // Open sub-page via Enter.
        const input = mustQuery<HTMLInputElement>(document.body, '[role="combobox"]');
        dispatchKeyDown(input, "Enter");
        flushSync();
        await tick();
        flushSync();

        // Select dark mode.
        mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:dark"]`
        ).click();
        flushSync();

        expect(setSpy).toHaveBeenCalledTimes(1);
        expect(setSpy).toHaveBeenCalledWith("dark");
        expect(host.getOpen()).toBe(false);
        expect(onClose).toHaveBeenCalledWith("select");

        // Reopen -> root trailing reflects "dark".
        host.setOpen(true);
        flushSync();
        const rootOption = mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:root"]`
        );
        expect(mustQuery<HTMLElement>(rootOption, ".cs-command-palette-item-trailing").textContent?.trim()).toBe(
            THEME_LABELS.dark
        );

        // Re-enter sub-page -> dark is checked and highlighted after tick().
        rootOption.click();
        flushSync();
        await tick();
        flushSync();

        const darkOption = mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:dark"]`
        );
        expect(darkOption.getAttribute("aria-checked")).toBe("true");
        expect(host.getHighlightedValue()).toBe(`${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:dark`);

        unmount(host);
    });

    test("selecting a mode with closeOnSelect=false keeps palette open on sub-page and reactively updates checked and root trailing", async () => {
        const { manager, setSpy } = createMockThemeManager("system");
        const onClose = vi.fn();
        const plugin = createCommandPaletteThemePlugin({
            manager,
            closeOnSelect: false,
        });

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                plugins: [plugin],
                onClose,
                focusTrap: false,
            },
        });
        flushSync();

        mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:root"]`
        ).click();
        flushSync();
        await tick();
        flushSync();

        // Switch system -> light -> dark while staying open on sub-page.
        mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:light"]`
        ).click();
        flushSync();

        expect(setSpy).toHaveBeenCalledWith("light");
        expect(host.getOpen()).toBe(true);
        expect(host.getPages()).toEqual([plugin.id]);
        expect(onClose).not.toHaveBeenCalled();

        expect(
            mustQuery<HTMLElement>(
                document.body,
                `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:light"]`
            ).getAttribute("aria-checked")
        ).toBe("true");
        expect(
            mustQuery<HTMLElement>(
                document.body,
                `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:system"]`
            ).getAttribute("aria-checked")
        ).toBe("false");

        mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:dark"]`
        ).click();
        flushSync();

        expect(setSpy).toHaveBeenCalledWith("dark");
        expect(host.getOpen()).toBe(true);
        expect(host.getPages()).toEqual([plugin.id]);
        expect(
            mustQuery<HTMLElement>(
                document.body,
                `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:dark"]`
            ).getAttribute("aria-checked")
        ).toBe("true");

        // Pop back to root -> root trailing reflects "dark".
        host.popPage();
        flushSync();
        expect(host.getPages()).toEqual([]);
        const rootOption = mustQuery<HTMLElement>(
            document.body,
            `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:root"]`
        );
        expect(mustQuery<HTMLElement>(rootOption, ".cs-command-palette-item-trailing").textContent?.trim()).toBe(
            THEME_LABELS.dark
        );

        unmount(host);
    });

    test("supports custom labels, custom id, and registry.register(...)", async () => {
        const { manager } = createMockThemeManager("light");
        const registry = createCommandPaletteRegistry();
        const dispose = registry.register(
            createCommandPaletteThemePlugin({
                id: "custom-theme",
                manager,
                labels: {
                    root: "Color Scheme",
                    page: "Pick Scheme",
                    modes: {
                        system: "Auto",
                        light: "Daylight",
                        dark: "Midnight",
                    },
                },
            })
        );

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                registry,
                focusTrap: false,
            },
        });
        flushSync();

        const rootOption = mustQuery<HTMLElement>(document.body, '[role="option"][data-value="custom-theme:root"]');
        expect(mustQuery<HTMLElement>(rootOption, ".cs-command-palette-item-text").textContent?.trim()).toBe(
            "Color Scheme"
        );
        expect(mustQuery<HTMLElement>(rootOption, ".cs-command-palette-item-trailing").textContent?.trim()).toBe(
            "Daylight"
        );

        rootOption.click();
        flushSync();
        await tick();
        flushSync();

        expect(host.getPages()).toEqual(["custom-theme"]);
        expect(mustQuery<HTMLElement>(document.body, ".cs-command-palette-scope").textContent?.trim()).toBe(
            "Pick Scheme"
        );
        expect(
            mustQuery<HTMLElement>(
                document.body,
                '[role="option"][data-value="custom-theme:mode:system"] .cs-command-palette-item-text'
            ).textContent?.trim()
        ).toBe("Auto");
        expect(
            mustQuery<HTMLElement>(
                document.body,
                '[role="option"][data-value="custom-theme:mode:dark"] .cs-command-palette-item-text'
            ).textContent?.trim()
        ).toBe("Midnight");
        expect(host.getHighlightedValue()).toBe("custom-theme:mode:light");

        dispose();
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual([]);

        unmount(host);
    });

    test("works with default singleton theme manager and cleans up side effects", async () => {
        const initialMode = theme.mode;
        try {
            theme.set("system");
            const plugin = createCommandPaletteThemePlugin({ closeOnSelect: false });

            const host = mount(CommandPaletteTestHost, {
                target: container,
                props: {
                    open: true,
                    plugins: [plugin],
                    focusTrap: false,
                },
            });
            flushSync();

            mustQuery<HTMLElement>(
                document.body,
                `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:root"]`
            ).click();
            flushSync();
            await tick();
            flushSync();

            mustQuery<HTMLElement>(
                document.body,
                `[role="option"][data-value="${COMMAND_PALETTE_THEME_PLUGIN_ID}:mode:dark"]`
            ).click();
            flushSync();

            expect(theme.mode).toBe("dark");
            expect(document.documentElement.dataset.theme).toBe("dark");

            unmount(host);
        } finally {
            theme.set(initialMode);
            localStorage.removeItem("cs-theme");
            delete document.documentElement.dataset.theme;
            delete document.documentElement.dataset.themeSwitching;
            document.documentElement.style.colorScheme = "";
        }
    });

    test("defaults to placement 'end' (after declarative groups) and supports overriding to 'start'", () => {
        const { manager } = createMockThemeManager("light");
        const defaultPlugin = createCommandPaletteThemePlugin({ manager });
        expect(defaultPlugin.placement).toBe("end");

        const hostDefault = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                plugins: [defaultPlugin],
                groups: [
                    {
                        key: "actions",
                        label: "Actions",
                        items: [{ value: "decl-action", label: "Declarative Action" }],
                    },
                ],
                focusTrap: false,
            },
        });
        flushSync();

        const rootValue = `${COMMAND_PALETTE_THEME_PLUGIN_ID}:root`;
        expect(getVisibleOptionValues(document.body)).toEqual(["decl-action", rootValue]);
        unmount(hostDefault);

        const startPlugin = createCommandPaletteThemePlugin({ manager, placement: "start" });
        expect(startPlugin.placement).toBe("start");

        const hostStart = mount(CommandPaletteTestHost, {
            target: container,
            props: {
                open: true,
                plugins: [startPlugin],
                groups: [
                    {
                        key: "actions",
                        label: "Actions",
                        items: [{ value: "decl-action", label: "Declarative Action" }],
                    },
                ],
                focusTrap: false,
            },
        });
        flushSync();

        expect(getVisibleOptionValues(document.body)).toEqual([rootValue, "decl-action"]);
        unmount(hostStart);
    });
});
