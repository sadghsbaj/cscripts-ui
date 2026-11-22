import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorSwatchTestHost, { type ColorSwatchHostItem } from "./ColorSwatchTestHost.internal.svelte";
import { COLOR_SWATCH_SIZES, ColorSwatch, type ColorSwatchSize } from "./index.ts";

describe("ColorSwatch Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders span in standalone preview mode across sizes xs-xl without HitArea or checkmark", () => {
        expect(COLOR_SWATCH_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);

        let size = $state<ColorSwatchSize>("xs");
        let color = $state("#2563eb");

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                get size() {
                    return size;
                },
                get color() {
                    return color;
                },
            },
        });
        flushSync();

        for (const nextSize of COLOR_SWATCH_SIZES) {
            size = nextSize;
            flushSync();

            const root = container.querySelector<HTMLSpanElement>("span.cs-color-swatch");
            expect(root).not.toBeNull();
            expect(root?.tagName).toBe("SPAN");
            expect(root?.dataset.size).toBe(nextSize);
            expect(root?.dataset.mode).toBe("preview");
            expect(root?.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#2563eb");
            expect(root?.getAttribute("role")).toBe("img");
            expect(root?.getAttribute("aria-label")).toBe("#2563eb");
            expect(root?.hasAttribute("aria-pressed")).toBe(false);
            expect(root?.hasAttribute("data-selected")).toBe(false);
            expect(root?.querySelector(".cs-color-swatch-fill")?.getAttribute("aria-hidden")).toBe("true");
            expect(root?.querySelector(".cs-hit-area")).toBeNull();
            expect(root?.querySelector(".cs-color-swatch-check")).toBeNull();
        }

        color = "#16a34a";
        flushSync();
        const root = container.querySelector<HTMLSpanElement>("span.cs-color-swatch");
        expect(root?.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#16a34a");
        expect(root?.getAttribute("aria-label")).toBe("#16a34a");

        unmount(instance);
    });

    test("resolves aria-label from label, rest aria-label, trimmed color, or localized Transparent", () => {
        let color = $state<string | undefined>(undefined);
        let label = $state<string | undefined>(undefined);
        let restAriaLabel = $state<string | undefined>(undefined);
        let restAriaLabelledby = $state<string | undefined>(undefined);

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                size: "md",
                get color() {
                    return color;
                },
                get label() {
                    return label;
                },
                get "aria-label"() {
                    return restAriaLabel;
                },
                get "aria-labelledby"() {
                    return restAriaLabelledby;
                },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLSpanElement>("span.cs-color-swatch");
        expect(root?.style.getPropertyValue("--cs-color-swatch-bg")).toBe("transparent");
        expect(root?.getAttribute("aria-label")).toBe("Transparent");

        color = "TRANSPARENT";
        flushSync();
        expect(root?.getAttribute("aria-label")).toBe("Transparent");

        color = " ".repeat(3);
        flushSync();
        expect(root?.getAttribute("aria-label")).toBe("Transparent");

        color = "  #3b82f6  ";
        flushSync();
        expect(root?.getAttribute("aria-label")).toBe("#3b82f6");

        restAriaLabelledby = "swatch-heading";
        flushSync();
        expect(root?.hasAttribute("aria-label")).toBe(false);
        expect(root?.getAttribute("aria-labelledby")).toBe("swatch-heading");

        restAriaLabelledby = undefined;
        restAriaLabel = "Fallback rest label";
        flushSync();
        expect(root?.getAttribute("aria-label")).toBe("Fallback rest label");

        label = "Ocean Blue";
        flushSync();
        expect(root?.getAttribute("aria-label")).toBe("Ocean Blue");

        unmount(instance);
    });

    test("decorative omits role and aria-label and sets aria-hidden in preview mode only", () => {
        let decorative = $state(true);
        let mode = $state<"preview" | "button">("preview");

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                size: "md",
                color: "#ef4444",
                get decorative() {
                    return decorative;
                },
                get mode() {
                    return mode;
                },
            },
        });
        flushSync();

        let root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.tagName).toBe("SPAN");
        expect(root?.hasAttribute("role")).toBe(false);
        expect(root?.getAttribute("aria-hidden")).toBe("true");
        expect(root?.hasAttribute("aria-label")).toBe(false);

        decorative = false;
        flushSync();
        root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.getAttribute("role")).toBe("img");
        expect(root?.hasAttribute("aria-hidden")).toBe(false);
        expect(root?.getAttribute("aria-label")).toBe("#ef4444");

        decorative = true;
        mode = "button";
        flushSync();
        root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.tagName).toBe("BUTTON");
        expect(root?.hasAttribute("aria-hidden")).toBe(false);
        expect(root?.getAttribute("aria-label")).toBe("#ef4444");

        unmount(instance);
    });

    test("button mode renders button type='button' (overriding rest type) with sized HitArea", () => {
        let size = $state<ColorSwatchSize>("xs");
        const restWithSubmitType = { type: "submit" } as Record<string, unknown>;

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                ...restWithSubmitType,
                mode: "button",
                color: "#0ea5e9",
                get size() {
                    return size;
                },
            },
        });
        flushSync();

        const button = container.querySelector<HTMLButtonElement>("button.cs-color-swatch");
        expect(button).not.toBeNull();
        expect(button?.type).toBe("button");
        expect(button?.getAttribute("type")).toBe("button");
        expect(button?.dataset.mode).toBe("button");
        expect(button?.hasAttribute("role")).toBe(false);
        expect(button?.hasAttribute("aria-pressed")).toBe(false);

        const expectedHitAreaSizes: Record<ColorSwatchSize, "sm" | "md"> = {
            xs: "sm",
            sm: "sm",
            md: "sm",
            lg: "sm",
            xl: "md",
        };

        for (const nextSize of COLOR_SWATCH_SIZES) {
            size = nextSize;
            flushSync();

            const hitArea = button?.querySelector<HTMLSpanElement>(".cs-hit-area");
            expect(hitArea).not.toBeNull();
            expect(hitArea?.getAttribute("aria-hidden")).toBe("true");
            expect(hitArea?.dataset.size).toBe(expectedHitAreaSizes[nextSize]);
        }

        size = "md";
        flushSync();
        expect(button?.querySelector<HTMLSpanElement>(".cs-hit-area")?.dataset.size).toBe("sm");

        unmount(instance);
    });

    test("button mode manages selected -> aria-pressed/data-selected and blocks onclick when disabled", () => {
        let selected = $state<boolean | undefined>(undefined);
        let disabled = $state(false);
        const onclick = vi.fn();

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                size: "md",
                mode: "button",
                color: "#8b5cf6",
                get selected() {
                    return selected;
                },
                get disabled() {
                    return disabled;
                },
                onclick,
            },
        });
        flushSync();

        const button = container.querySelector<HTMLButtonElement>("button.cs-color-swatch");
        expect(button).not.toBeNull();
        expect(button?.hasAttribute("aria-pressed")).toBe(false);
        expect(button?.hasAttribute("data-selected")).toBe(false);
        expect(button?.disabled).toBe(false);
        expect(button?.hasAttribute("data-disabled")).toBe(false);

        selected = true;
        flushSync();
        expect(button?.getAttribute("aria-pressed")).toBe("true");
        expect(button?.dataset.selected).toBe("");

        selected = false;
        flushSync();
        expect(button?.getAttribute("aria-pressed")).toBe("false");
        expect(button?.hasAttribute("data-selected")).toBe(false);

        selected = undefined;
        flushSync();
        expect(button?.hasAttribute("aria-pressed")).toBe(false);
        expect(button?.hasAttribute("data-selected")).toBe(false);

        button?.click();
        flushSync();
        expect(onclick).toHaveBeenCalledTimes(1);

        disabled = true;
        flushSync();
        expect(button?.disabled).toBe(true);
        expect(button?.dataset.disabled).toBe("");

        button?.click();
        flushSync();
        expect(onclick).toHaveBeenCalledTimes(1);

        disabled = false;
        flushSync();
        expect(button?.disabled).toBe(false);
        expect(button?.hasAttribute("data-disabled")).toBe(false);

        button?.click();
        flushSync();
        expect(onclick).toHaveBeenCalledTimes(2);

        unmount(instance);
    });

    test("computes data-check-contrast for light, dark, and translucent/transparent colors", () => {
        let color = $state("#ffffff");

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                size: "md",
                get color() {
                    return color;
                },
            },
        });
        flushSync();

        const root = container.querySelector<HTMLElement>(".cs-color-swatch");
        const cases: Array<[string, "dark" | "light" | "checker"]> = [
            ["#ffffff", "dark"],
            ["#fde047", "dark"],
            ["#000000", "light"],
            ["#1e3a8a", "light"],
            ["rgba(255, 255, 255, 0.2)", "checker"],
            ["transparent", "checker"],
            ["#00000040", "checker"],
        ];

        for (const [nextColor, expectedContrast] of cases) {
            color = nextColor;
            flushSync();
            expect(root?.dataset.checkContrast).toBe(expectedContrast);
        }

        unmount(instance);
    });

    test("showCheck={false} omits checkmark and data-show-check while keeping data-selected", () => {
        let showCheck = $state(true);
        let mode = $state<"button" | "preview">("button");

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                size: "md",
                color: "#111827",
                selected: true,
                get mode() {
                    return mode;
                },
                get showCheck() {
                    return showCheck;
                },
            },
        });
        flushSync();

        let root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.dataset.selected).toBe("");
        expect(root?.dataset.showCheck).toBe("");
        expect(root?.querySelector(":scope .cs-color-swatch-check svg")).not.toBeNull();

        showCheck = false;
        flushSync();
        expect(root?.dataset.selected).toBe("");
        expect(root?.hasAttribute("data-show-check")).toBe(false);
        expect(root?.querySelector(".cs-color-swatch-check")).toBeNull();

        mode = "preview";
        flushSync();
        root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.tagName).toBe("SPAN");
        expect(root?.dataset.selected).toBe("");
        expect(root?.hasAttribute("data-show-check")).toBe(false);
        expect(root?.querySelector(".cs-color-swatch-check")).toBeNull();

        showCheck = true;
        flushSync();
        expect(root?.dataset.selected).toBe("");
        expect(root?.dataset.showCheck).toBe("");
        expect(root?.querySelector(":scope .cs-color-swatch-check svg")).not.toBeNull();

        unmount(instance);
    });

    test("scales svg.cs-color-swatch-check-icon width, height, and stroke-width across sizes xs-xl", () => {
        const expectedCheckIconSizes: Record<ColorSwatchSize, number> = {
            xs: 11,
            sm: 13,
            md: 15,
            lg: 17,
            xl: 20,
        };
        const expectedCheckStrokeWidths: Record<ColorSwatchSize, number> = {
            xs: 3.4,
            sm: 3.4,
            md: 3.1,
            lg: 2.8,
            xl: 2.8,
        };

        let size = $state<ColorSwatchSize>("xs");

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                color: "#111827",
                selected: true,
                get size() {
                    return size;
                },
            },
        });
        flushSync();

        for (const nextSize of COLOR_SWATCH_SIZES) {
            size = nextSize;
            flushSync();

            const svg = container.querySelector<SVGSVGElement>("svg.cs-color-swatch-check-icon");
            expect(svg).not.toBeNull();
            expect(svg?.querySelector("path")).not.toBeNull();
            expect(svg?.getAttribute("width")).toBe(String(expectedCheckIconSizes[nextSize]));
            expect(svg?.getAttribute("height")).toBe(String(expectedCheckIconSizes[nextSize]));
            expect(svg?.getAttribute("stroke-width")).toBe(String(expectedCheckStrokeWidths[nextSize]));
        }

        unmount(instance);
    });

    test("sets data-halo-tone and strips alpha for --cs-color-swatch-halo-raw on translucent colors", () => {
        let color = $state("#ffffff");
        let mode = $state<"button" | "preview">("button");

        const instance = mount(ColorSwatch, {
            target: container,
            props: {
                size: "md",
                showCheck: false,
                selected: true,
                get mode() {
                    return mode;
                },
                get color() {
                    return color;
                },
            },
        });
        flushSync();

        let root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.dataset.haloTone).toBe("near-white");
        expect(root?.style.getPropertyValue("--cs-color-swatch-halo-raw")).toBe("");

        const toneCases: Array<[string, "near-white" | "near-black" | "transparent" | "normal"]> = [
            ["#ffffff", "near-white"],
            ["#000000", "near-black"],
            ["transparent", "transparent"],
            ["rgba(0 0 0 / 0)", "transparent"],
            ["#3b82f6", "normal"],
        ];

        for (const [nextColor, expectedTone] of toneCases) {
            color = nextColor;
            flushSync();
            expect(root?.dataset.haloTone).toBe(expectedTone);
            expect(root?.style.getPropertyValue("--cs-color-swatch-halo-raw")).toBe("");
        }

        // Translucent sRGB color -> rgb(...) without alpha
        color = "rgba(99 102 241 / 0.25)";
        flushSync();
        expect(root?.dataset.haloTone).toBe("normal");
        expect(root?.style.getPropertyValue("--cs-color-swatch-halo-raw")).toBe("rgb(99 102 241)");

        // Translucent OKLCH color -> oklch(...) without '/' alpha separator
        color = "oklch(0.75 0.2 330 / 0.25)";
        flushSync();
        const oklchHaloRaw = root?.style.getPropertyValue("--cs-color-swatch-halo-raw") ?? "";
        expect(oklchHaloRaw.startsWith("oklch(")).toBe(true);
        expect(oklchHaloRaw.includes("/")).toBe(false);

        // Switching to preview mode preserves halo attributes/vars; opaque color clears --cs-color-swatch-halo-raw
        mode = "preview";
        flushSync();
        root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.tagName).toBe("SPAN");
        expect(root?.style.getPropertyValue("--cs-color-swatch-halo-raw")).toBe(oklchHaloRaw);

        color = "#3b82f6";
        flushSync();
        expect(root?.dataset.haloTone).toBe("normal");
        expect(root?.style.getPropertyValue("--cs-color-swatch-halo-raw")).toBe("");

        unmount(instance);
    });

    test("reads color fallback and disabled state from ColorPickerContext", () => {
        let pickerValue = $state("#f97316");
        let pickerDisabled = $state(false);
        let swatchColor = $state<string | undefined>(undefined);
        let swatchMode = $state<"auto" | "button">("auto");
        const onclick = vi.fn();

        const instance = mount(ColorSwatchTestHost, {
            target: container,
            props: {
                withPicker: true,
                get pickerValue() {
                    return pickerValue;
                },
                get pickerDisabled() {
                    return pickerDisabled;
                },
                get color() {
                    return swatchColor;
                },
                get mode() {
                    return swatchMode;
                },
                disabled: false,
                onclick,
            },
        });
        flushSync();

        let root = container.querySelector<HTMLElement>(".cs-color-swatch");
        expect(root?.tagName).toBe("SPAN");
        expect(root?.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#f97316");
        expect(root?.getAttribute("aria-label")).toBe("#f97316");
        expect(root?.hasAttribute("data-disabled")).toBe(false);

        pickerValue = "#0f172a";
        flushSync();
        expect(root?.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#0f172a");
        expect(root?.getAttribute("aria-label")).toBe("#0f172a");
        expect(root?.dataset.checkContrast).toBe("light");

        swatchColor = "#fde047";
        flushSync();
        expect(root?.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#fde047");
        expect(root?.dataset.checkContrast).toBe("dark");

        swatchMode = "button";
        pickerDisabled = true;
        flushSync();
        root = container.querySelector<HTMLButtonElement>("button.cs-color-swatch");
        expect(root).not.toBeNull();
        expect((root as HTMLButtonElement).disabled).toBe(true);
        expect(root?.dataset.disabled).toBe("");

        root?.click();
        flushSync();
        expect(onclick).not.toHaveBeenCalled();

        pickerDisabled = false;
        flushSync();
        expect((root as HTMLButtonElement).disabled).toBe(false);
        expect(root?.hasAttribute("data-disabled")).toBe(false);
        root?.click();
        flushSync();
        expect(onclick).toHaveBeenCalledTimes(1);

        unmount(instance);
    });

    test("integrates with ColorSwatchGroupContext for radio mode, cross-selection, preventDefault, and disabled", () => {
        const groupState = $state<{
            selectedColor: string | undefined;
            disabled: boolean;
        }>({
            selectedColor: "#ef4444",
            disabled: false,
        });
        const onGroupSelect = vi.fn();
        const clickFirst = vi.fn();
        const clickSecond = vi.fn();
        const clickPrevented = vi.fn((event: MouseEvent) => {
            event.preventDefault();
        });

        const swatches = $state<ColorSwatchHostItem[]>([
            { id: "red", color: "#ef4444", label: "Red", onclick: clickFirst },
            { id: "blue", color: "#3b82f6", label: "Blue", onclick: clickSecond },
            { id: "green", color: "#22c55e", label: "Green", onclick: clickPrevented },
            { id: "preview-only", color: "#a855f7", mode: "preview" },
            { id: "no-color" },
        ]);

        const instance = mount(ColorSwatchTestHost, {
            target: container,
            props: {
                withGroup: true,
                get groupSelectedColor() {
                    return groupState.selectedColor;
                },
                set groupSelectedColor(next: string | undefined) {
                    groupState.selectedColor = next;
                },
                get groupDisabled() {
                    return groupState.disabled;
                },
                onGroupSelect,
                get swatches() {
                    return swatches;
                },
            },
        });
        flushSync();

        const redBtn = container.querySelector<HTMLButtonElement>('[data-swatch-id="red"]');
        const blueBtn = container.querySelector<HTMLButtonElement>('[data-swatch-id="blue"]');
        const greenBtn = container.querySelector<HTMLButtonElement>('[data-swatch-id="green"]');
        const previewSpan = container.querySelector<HTMLSpanElement>('[data-swatch-id="preview-only"]');
        const noColorBtn = container.querySelector<HTMLButtonElement>('[data-swatch-id="no-color"]');

        expect(redBtn?.tagName).toBe("BUTTON");
        expect(redBtn?.dataset.mode).toBe("radio");
        expect(redBtn?.getAttribute("role")).toBe("radio");
        expect(redBtn?.getAttribute("aria-checked")).toBe("true");
        expect(redBtn?.dataset.selected).toBe("");
        expect(redBtn?.hasAttribute("aria-pressed")).toBe(false);

        expect(blueBtn?.getAttribute("role")).toBe("radio");
        expect(blueBtn?.getAttribute("aria-checked")).toBe("false");
        expect(blueBtn?.hasAttribute("data-selected")).toBe(false);

        expect(previewSpan?.tagName).toBe("SPAN");
        expect(previewSpan?.dataset.mode).toBe("preview");
        expect(previewSpan?.getAttribute("role")).toBe("img");

        // Cross-interaction: Red (selected) -> Blue -> Red
        blueBtn?.click();
        flushSync();
        expect(clickSecond).toHaveBeenCalledTimes(1);
        expect(onGroupSelect).toHaveBeenCalledTimes(1);
        expect(onGroupSelect).toHaveBeenLastCalledWith("#3b82f6");
        expect(groupState.selectedColor).toBe("#3b82f6");
        expect(redBtn?.getAttribute("aria-checked")).toBe("false");
        expect(redBtn?.hasAttribute("data-selected")).toBe(false);
        expect(blueBtn?.getAttribute("aria-checked")).toBe("true");
        expect(blueBtn?.dataset.selected).toBe("");

        redBtn?.click();
        flushSync();
        expect(clickFirst).toHaveBeenCalledTimes(1);
        expect(onGroupSelect).toHaveBeenCalledTimes(2);
        expect(onGroupSelect).toHaveBeenLastCalledWith("#ef4444");
        expect(redBtn?.getAttribute("aria-checked")).toBe("true");
        expect(blueBtn?.getAttribute("aria-checked")).toBe("false");

        // event.preventDefault() stops groupCtx.select(color)
        greenBtn?.click();
        flushSync();
        expect(clickPrevented).toHaveBeenCalledTimes(1);
        expect(onGroupSelect).toHaveBeenCalledTimes(2);
        expect(groupState.selectedColor).toBe("#ef4444");

        // Swatch without color does not invoke groupCtx.select
        noColorBtn?.click();
        flushSync();
        expect(onGroupSelect).toHaveBeenCalledTimes(2);

        // Explicit selected prop overrides groupCtx.isSelected
        const blueSwatch = swatches[1];
        if (!blueSwatch) throw new Error("Expected blue swatch");
        blueSwatch.selected = true;
        flushSync();
        expect(blueBtn?.getAttribute("aria-checked")).toBe("true");
        expect(blueBtn?.dataset.selected).toBe("");
        blueSwatch.selected = undefined;
        flushSync();
        expect(blueBtn?.getAttribute("aria-checked")).toBe("false");

        // groupCtx.disabled disables all swatches and blocks click/select
        groupState.disabled = true;
        flushSync();
        expect(blueBtn?.disabled).toBe(true);
        expect(blueBtn?.dataset.disabled).toBe("");
        blueBtn?.click();
        flushSync();
        expect(clickSecond).toHaveBeenCalledTimes(1);
        expect(onGroupSelect).toHaveBeenCalledTimes(2);

        // Swatch-level disabled blocks click/select even when group is enabled
        groupState.disabled = false;
        blueSwatch.disabled = true;
        flushSync();
        expect(blueBtn?.disabled).toBe(true);
        expect(redBtn?.disabled).toBe(false);
        blueBtn?.click();
        flushSync();
        expect(clickSecond).toHaveBeenCalledTimes(1);
        expect(onGroupSelect).toHaveBeenCalledTimes(2);

        unmount(instance);
    });

    test("binds ref across mode switches, forwards rest attributes/classes, and renders children snippet", () => {
        let ref: HTMLElement | null = null;
        let mode = $state<"preview" | "button">("preview");

        const instance = mount(ColorSwatchTestHost, {
            target: container,
            props: {
                size: "lg",
                color: "#ec4899",
                selected: true,
                get mode() {
                    return mode;
                },
                customChildText: "NEW",
                swatchAttrs: {
                    id: "brand-swatch",
                    class: "custom-swatch-class",
                    "data-testid": "swatch-root",
                    title: "Brand Pink",
                },
                get ref() {
                    return ref;
                },
                set ref(el: HTMLElement | null) {
                    ref = el;
                },
            },
        });
        flushSync();

        const spanRoot = container.querySelector<HTMLSpanElement>("#brand-swatch");
        expect(spanRoot).not.toBeNull();
        expect(spanRoot?.tagName).toBe("SPAN");
        expect(ref).toBe(spanRoot);
        expect(spanRoot?.classList.contains("cs-color-swatch")).toBe(true);
        expect(spanRoot?.classList.contains("custom-swatch-class")).toBe(true);
        expect(spanRoot?.dataset.testid).toBe("swatch-root");
        expect(spanRoot?.getAttribute("title")).toBe("Brand Pink");
        expect(spanRoot?.querySelector(".cs-color-swatch-fill")).not.toBeNull();
        expect(spanRoot?.querySelector(".cs-color-swatch-check")).not.toBeNull();
        expect(spanRoot?.querySelector(".custom-swatch-child")?.textContent).toBe("NEW");

        mode = "button";
        flushSync();
        const buttonRoot = container.querySelector<HTMLButtonElement>("#brand-swatch");
        expect(buttonRoot).not.toBeNull();
        expect(buttonRoot?.tagName).toBe("BUTTON");
        expect(ref).toBe(buttonRoot);
        expect(buttonRoot?.classList.contains("cs-color-swatch")).toBe(true);
        expect(buttonRoot?.classList.contains("custom-swatch-class")).toBe(true);
        expect(buttonRoot?.dataset.testid).toBe("swatch-root");
        expect(buttonRoot?.querySelector(".custom-swatch-child")?.textContent).toBe("NEW");

        unmount(instance);
        expect(ref).toBeNull();
    });
});
