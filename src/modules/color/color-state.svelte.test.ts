import { flushSync } from "svelte";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
    createColorState,
    getColorPickerContext,
    getColorSwatchGroupContext,
    hasColorPickerContext,
    hasColorSwatchGroupContext,
    isInGamut,
    setColorPickerContext,
    setColorSwatchGroupContext,
    type ColorAlphaFormat,
    type ColorFormat,
    type ColorGamut,
    type ColorPickerContext,
    type ColorSwatchGroupContext,
} from "./index.ts";

describe("ColorState & Svelte 5 reactivity", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe("Initialization & fallback", () => {
        test("defaults to #000000 when no value or defaultValue is provided", () => {
            const state = createColorState();

            expect(state.value).toBe("#000000");
            expect(state.resolvedFormat).toBe("hex");
            expect(state.inGamut).toBe(true);
            expect(state.parsed.rgb).toEqual([0, 0, 0]);
            expect(state.parsed.alpha).toBe(1);
            expect(state.channels.hsv).toEqual({ h: 0, s: 0, v: 0 });
            expect(state.channels.hsl).toEqual({ h: 0, s: 0, l: 0 });
            expect(state.channels.rgb).toEqual({ r: 0, g: 0, b: 0 });
            expect(state.channels.alpha).toBe(1);
        });

        test("initializes from defaultValue, falls back on invalid defaultValue, and prioritizes controlled value()", () => {
            const withDefault = createColorState({
                defaultValue: "hsl(210 80% 50%)",
            });
            expect(withDefault.resolvedFormat).toBe("hsl");
            expect(withDefault.getChannel("hue")).toBeCloseTo(210, 4);
            expect(withDefault.getChannel("hsl-saturation")).toBeCloseTo(80, 4);
            expect(withDefault.getChannel("lightness")).toBeCloseTo(50, 4);

            const invalidDefault = createColorState({
                defaultValue: "not-a-color",
            });
            expect(invalidDefault.value).toBe("#000000");
            expect(invalidDefault.resolvedFormat).toBe("hex");

            const controlledOverrides = createColorState({
                value: () => "rgb(10 20 30)",
                defaultValue: "#ff0000",
            });
            expect(controlledOverrides.value).toBe("rgb(10 20 30)");
            expect(controlledOverrides.resolvedFormat).toBe("rgb");
            expect(controlledOverrides.getChannel("red")).toBe(10);
            expect(controlledOverrides.getChannel("green")).toBe(20);
            expect(controlledOverrides.getChannel("blue")).toBe(30);

            const invalidControlledFallsBackToDefault = createColorState({
                value: () => "garbage",
                defaultValue: "#112233",
            });
            expect(invalidControlledFallsBackToDefault.value).toBe("#112233");
        });

        test("clamps initial value to configured gamut", () => {
            const state = createColorState({
                defaultValue: "color(display-p3 1 0 0)",
                gamut: () => "srgb",
            });

            expect(state.inGamut).toBe(true);
            expect(state.parsed.rgb[0]).toBeLessThanOrEqual(1);
            expect(state.parsed.rgb[1]).toBeGreaterThanOrEqual(0);
        });
    });

    describe("Channel preservation invariants", () => {
        test("HSV: preserves hue and saturation across value=0 and restores blue hue when value returns", () => {
            const state = createColorState({ defaultValue: "#000000" });

            state.setChannel("hue", 210);
            state.setChannel("saturation", 80);
            expect(state.channels.hsv.h).toBe(210);
            expect(state.channels.hsv.s).toBe(80);
            expect(state.channels.hsv.v).toBe(0);
            expect(state.channels.hsl.h).toBe(210);

            state.setChannel("value", 0);
            expect(state.channels.hsv.h).toBe(210);
            expect(state.channels.hsv.s).toBe(80);
            expect(state.channels.hsl.h).toBe(210);

            state.setChannel("value", 50);
            expect(state.channels.hsv.h).toBe(210);
            expect(state.channels.hsv.s).toBe(80);
            expect(state.channels.hsv.v).toBe(50);
            expect(state.channels.rgb.b).toBeGreaterThan(state.channels.rgb.r);

            // Saturation -> 0 and back preserves hue
            state.setChannel("saturation", 0);
            expect(state.channels.hsv.h).toBe(210);
            expect(state.channels.hsv.s).toBe(0);

            state.setChannel("saturation", 80);
            expect(state.channels.hsv.h).toBe(210);
            expect(state.channels.hsv.s).toBe(80);
            expect(state.channels.rgb.b).toBeGreaterThan(state.channels.rgb.r);
        });

        test("HSL: preserves hue and hsl-saturation at lightness 0/100 extremes and hsl-saturation=0", () => {
            const state = createColorState({ defaultValue: "hsl(210 80% 50%)" });

            state.setChannel("lightness", 0);
            expect(state.channels.hsl.h).toBeCloseTo(210, 4);
            expect(state.channels.hsl.s).toBeCloseTo(80, 4);
            expect(state.channels.hsl.l).toBe(0);

            state.setChannel("lightness", 100);
            expect(state.channels.hsl.h).toBeCloseTo(210, 4);
            expect(state.channels.hsl.s).toBeCloseTo(80, 4);
            expect(state.channels.hsl.l).toBe(100);

            state.setChannel("lightness", 50);
            expect(state.channels.hsl.h).toBeCloseTo(210, 4);
            expect(state.channels.hsl.s).toBeCloseTo(80, 4);
            expect(state.channels.rgb.b).toBeGreaterThan(state.channels.rgb.r);

            state.setChannel("hsl-saturation", 0);
            expect(state.channels.hsl.h).toBeCloseTo(210, 4);
            state.setChannel("hsl-saturation", 75);
            expect(state.channels.hsl.h).toBeCloseTo(210, 4);
            expect(state.channels.hsl.s).toBe(75);
        });

        test("OKLCH: preserves oklch-hue across chroma=0 and oklch-lightness=0/1", () => {
            const state = createColorState({ defaultValue: "oklch(0.65 0.24 260)" });
            expect(state.channels.oklch.h).toBeCloseTo(260, 4);

            state.setChannel("chroma", 0);
            expect(state.channels.oklch.h).toBeCloseTo(260, 4);
            expect(state.channels.oklch.c).toBe(0);

            state.setChannel("chroma", 0.2);
            expect(state.channels.oklch.h).toBeCloseTo(260, 4);
            expect(state.channels.oklch.c).toBeCloseTo(0.2, 6);

            state.setChannel("oklch-lightness", 0);
            expect(state.channels.oklch.h).toBeCloseTo(260, 4);
            state.setChannel("oklch-lightness", 1);
            expect(state.channels.oklch.h).toBeCloseTo(260, 4);

            state.setChannel("oklch-lightness", 0.65);
            expect(state.channels.oklch.h).toBeCloseTo(260, 4);
            expect(state.channels.oklch.l).toBeCloseTo(0.65, 6);
        });

        test("Alpha: preserves all color model channels when alpha drops to 0 and returns to 1", () => {
            const state = createColorState({ defaultValue: "rgb(40 120 220)" });
            const initialHsv = { ...state.channels.hsv };
            const initialHsl = { ...state.channels.hsl };
            const initialOklch = { ...state.channels.oklch };
            const initialRgb = { ...state.channels.rgb };

            state.setChannel("alpha", 0);
            expect(state.value).toBe("rgb(40 120 220 / 0)");
            expect(state.channels.alpha).toBe(0);
            expect(state.channels.hsv).toEqual(initialHsv);
            expect(state.channels.hsl).toEqual(initialHsl);
            expect(state.channels.oklch).toEqual(initialOklch);
            expect(state.channels.rgb).toEqual(initialRgb);

            state.setChannel("alpha", 1);
            expect(state.value).toBe("rgb(40 120 220)");
            expect(state.channels.alpha).toBe(1);
            expect(state.channels.hsv).toEqual(initialHsv);
            expect(state.channels.hsl).toEqual(initialHsl);
            expect(state.channels.oklch).toEqual(initialOklch);
            expect(state.channels.rgb).toEqual(initialRgb);
        });

        test("cross-space switching and Hue 360 preservation across channel edits", () => {
            const state = createColorState({ defaultValue: "#000000" });

            // Hue 360 stays 360 across value=0 -> value=50
            state.setChannel("hue", 360);
            state.setChannel("saturation", 80);
            state.setChannel("value", 0);
            expect(state.channels.hsv.h).toBe(360);
            state.setChannel("value", 50);
            expect(state.channels.hsv.h).toBe(360);
            expect(state.channels.rgb.r).toBeGreaterThan(state.channels.rgb.b);

            // Switch hsv -> hsl -> oklch -> rgb -> hsv on the same instance
            state.setChannels({ "hsl-saturation": 60, lightness: 40 });
            expect(state.getChannel("lightness")).toBeCloseTo(40, 4);

            state.setChannels({ "oklch-lightness": 0.6, chroma: 0.15, "oklch-hue": 145 });
            expect(state.getChannel("oklch-hue")).toBeCloseTo(145, 4);
            expect(state.channels.rgb.g).toBeGreaterThan(state.channels.rgb.r);

            state.setChannels({ red: 30, green: 90, blue: 210 });
            expect(state.getChannel("blue")).toBe(210);

            state.setChannels({ hue: 270, saturation: 70, value: 90 });
            expect(state.getChannel("hue")).toBe(270);
            expect(state.getChannel("saturation")).toBe(70);
            expect(state.getChannel("value")).toBe(90);
        });

        test("clamps out-of-sRGB oklch mutations when gamut is 'srgb'", () => {
            const state = createColorState({
                defaultValue: "oklch(0.65 0.1 145)",
                gamut: () => "srgb",
            });

            state.setChannel("chroma", 0.35);
            expect(state.inGamut).toBe(true);
            expect(isInGamut(state.parsed, "srgb")).toBe(true);
            expect(state.getChannel("chroma")).toBeLessThan(0.35);

            state.setChannel("oklch-lightness", 1);
            expect(state.inGamut).toBe(true);
            expect(isInGamut(state.parsed, "srgb")).toBe(true);
            expect(state.parsed.rgb).toEqual([1, 1, 1]);
        });
    });

    describe("Atomic setChannels & setString", () => {
        test("setChannels applies HSV and OKLCH multi-channel edits atomically with a single emission", () => {
            const onValueChange = vi.fn();
            const state = createColorState({
                defaultValue: "hsl(210 50% 50%)",
                onValueChange,
            });

            state.setChannels({ saturation: 65, value: 80 });
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(state.getChannel("saturation")).toBe(65);
            expect(state.getChannel("value")).toBe(80);
            expect(state.getChannel("hue")).toBeCloseTo(210, 4);

            state.setChannels({ chroma: 0.18, "oklch-lightness": 0.65 });
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(state.getChannel("chroma")).toBeCloseTo(0.18, 6);
            expect(state.getChannel("oklch-lightness")).toBeCloseTo(0.65, 6);

            state.setChannels({ red: 12, green: 34, blue: 56, alpha: 0.5 });
            expect(onValueChange).toHaveBeenCalledTimes(3);
            expect(state.getChannel("red")).toBe(12);
            expect(state.getChannel("green")).toBe(34);
            expect(state.getChannel("blue")).toBe(56);
            expect(state.getChannel("alpha")).toBe(0.5);

            // Cross-model atomic setChannels
            state.setChannels({ red: 255, hue: 120 });
            expect(onValueChange).toHaveBeenCalledTimes(4);
            expect(state.getChannel("hue")).toBeCloseTo(120, 4);
            expect(state.channels.rgb.g).toBeGreaterThan(state.channels.rgb.r);

            state.setChannels({ hue: 120, saturation: 50, lightness: 50 });
            expect(onValueChange).toHaveBeenCalledTimes(5);
            expect(state.getChannel("hue")).toBeCloseTo(120, 4);
            expect(state.getChannel("lightness")).toBeCloseTo(50, 4);
            expect(state.channels.rgb.g).toBeGreaterThan(state.channels.rgb.r);
        });

        test("setString updates state and sourceFormat on valid input, and no-ops returning false on invalid input", () => {
            const setValue = vi.fn();
            const onValueChange = vi.fn();
            const onCommit = vi.fn();
            const state = createColorState({
                defaultValue: "#ff0000",
                setValue,
                onValueChange,
                onCommit,
            });

            expect(state.setString("not-a-color", { commit: true })).toBe(false);
            expect(state.value).toBe("#ff0000");
            expect(state.resolvedFormat).toBe("hex");
            expect(setValue).not.toHaveBeenCalled();
            expect(onValueChange).not.toHaveBeenCalled();
            expect(onCommit).not.toHaveBeenCalled();

            expect(state.setString("oklch(0.7 0.15 140)", { commit: true })).toBe(true);
            expect(state.resolvedFormat).toBe("oklch");
            expect(state.getChannel("oklch-lightness")).toBeCloseTo(0.7, 4);
            expect(state.getChannel("chroma")).toBeCloseTo(0.15, 4);
            expect(state.getChannel("oklch-hue")).toBeCloseTo(140, 2);
            expect(setValue).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onCommit).toHaveBeenCalledTimes(1);

            // setString with { commit: false } defers onCommit until commit()
            expect(state.setString("rgb(10 20 30)", { commit: false })).toBe(true);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onCommit).toHaveBeenCalledTimes(1);

            state.commit();
            expect(onCommit).toHaveBeenCalledTimes(2);
            expect(onCommit).toHaveBeenLastCalledWith("rgb(10 20 30)");
        });
    });

    describe("Live vs. Commit lifecycle & idempotency", () => {
        test("live mutations emit onValueChange/setValue without onCommit until commit(), and second commit() is a no-op", () => {
            const setValue = vi.fn();
            const onValueChange = vi.fn();
            const onCommit = vi.fn();

            const state = createColorState({
                defaultValue: "#000000",
                setValue,
                onValueChange,
                onCommit,
            });

            state.setChannel("red", 100, { commit: false });
            state.setChannel("green", 150, { commit: false });
            state.setChannel("blue", 200, { commit: false });

            expect(setValue).toHaveBeenCalledTimes(3);
            expect(onValueChange).toHaveBeenCalledTimes(3);
            expect(onCommit).not.toHaveBeenCalled();

            state.commit();
            expect(onCommit).toHaveBeenCalledTimes(1);
            expect(onCommit).toHaveBeenCalledWith(state.value);

            // Second commit without new changes is a no-op
            state.commit();
            expect(onCommit).toHaveBeenCalledTimes(1);
        });

        test("commit: true flushes immediately and no-op edits do not re-emit duplicate onValueChange", () => {
            const onValueChange = vi.fn();
            const onCommit = vi.fn();

            const state = createColorState({
                defaultValue: "rgb(10 20 30)",
                onValueChange,
                onCommit,
            });

            // Identical value edit -> no emission
            state.setChannel("red", 10);
            expect(onValueChange).not.toHaveBeenCalled();
            expect(onCommit).not.toHaveBeenCalled();

            // Live edit followed by a no-op edit with commit: true flushes pending commit once
            state.setChannel("red", 50, { commit: false });
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onCommit).not.toHaveBeenCalled();

            state.setChannel("red", 50, { commit: true });
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onCommit).toHaveBeenCalledTimes(1);
            expect(onCommit).toHaveBeenLastCalledWith("rgb(50 20 30)");

            // Empty partial with commit: true after live edit commits once
            state.setChannel("green", 80, { commit: false });
            state.setChannels({}, { commit: true });
            expect(onCommit).toHaveBeenCalledTimes(2);
            expect(onCommit).toHaveBeenLastCalledWith("rgb(50 80 30)");

            // Direct commit: true fires onCommit immediately and leaves nothing pending
            state.setChannel("blue", 120, { commit: true });
            expect(onValueChange).toHaveBeenCalledTimes(3);
            expect(onCommit).toHaveBeenCalledTimes(3);
            expect(onCommit).toHaveBeenLastCalledWith("rgb(50 80 120)");

            state.commit();
            expect(onCommit).toHaveBeenCalledTimes(3);
        });
    });

    describe("Format, alphaFormat, and reactive getters", () => {
        test("handles format='auto' with alphaFormat 'auto', 'always', and 'never'", () => {
            const autoAlpha = createColorState({
                defaultValue: "#ff0000",
                format: () => "auto",
                alphaFormat: () => "auto",
            });
            expect(autoAlpha.value).toBe("#ff0000");

            autoAlpha.setChannel("alpha", 0.5);
            expect(autoAlpha.value).toBe("#ff000080");

            autoAlpha.setChannel("alpha", 1);
            expect(autoAlpha.value).toBe("#ff0000");

            const alwaysAlpha = createColorState({
                defaultValue: "#ff0000",
                format: () => "auto",
                alphaFormat: () => "always",
            });
            expect(alwaysAlpha.value).toBe("#ff0000ff");

            const neverAlpha = createColorState({
                defaultValue: "#ff000080",
                format: () => "hex8",
                alphaFormat: () => "never",
            });
            expect(neverAlpha.value).toBe("#ff0000");
        });

        test("reacts to dynamic format() and gamut() getters inside $effect.root", () => {
            let format = $state<ColorFormat>("hex");
            let alphaFormat = $state<ColorAlphaFormat>("auto");
            let gamut = $state<ColorGamut | undefined>("p3");
            const onValueChange = vi.fn();

            const observedValues: string[] = [];
            const observedInGamut: boolean[] = [];

            const cleanup = $effect.root(() => {
                const state = createColorState({
                    defaultValue: "color(display-p3 1 0 0)",
                    format: () => format,
                    alphaFormat: () => alphaFormat,
                    gamut: () => gamut,
                    onValueChange,
                });

                $effect(() => {
                    observedValues.push(state.value);
                    observedInGamut.push(state.inGamut);
                });

                flushSync();
                expect(state.resolvedFormat).toBe("hex");
                expect(state.inGamut).toBe(true);

                format = "p3";
                flushSync();
                expect(state.resolvedFormat).toBe("p3");
                expect(state.value).toBe("color(display-p3 1 0 0)");

                alphaFormat = "always";
                flushSync();
                expect(state.value).toBe("color(display-p3 1 0 0 / 1)");

                // No-op edit after dynamic format() switch emits zero spurious onValueChange
                state.setChannel("alpha", 1);
                expect(onValueChange).not.toHaveBeenCalled();

                // Switching gamut to undefined keeps wide-gamut unclamped; inGamut checks sRGB by default
                gamut = undefined;
                flushSync();
                expect(state.value).toBe("color(display-p3 1 0 0 / 1)");
                expect(state.inGamut).toBe(false);

                // Tightening gamut to "srgb" clamps effective parsed, channels, and value into sRGB
                gamut = "srgb";
                flushSync();
                expect(state.inGamut).toBe(true);
                expect(isInGamut(state.parsed, "srgb")).toBe(true);
                expect(state.channels.rgb.r).toBeGreaterThanOrEqual(0);
                expect(state.channels.rgb.r).toBeLessThanOrEqual(255);
                expect(state.channels.rgb.g).toBeGreaterThanOrEqual(0);
                expect(state.channels.rgb.b).toBeGreaterThanOrEqual(0);
                expect(state.value).not.toBe("color(display-p3 1 0 0 / 1)");

                format = "rgb";
                flushSync();
                expect(isInGamut(state.value, "srgb")).toBe(true);
            });

            expect(observedValues).toHaveLength(6);
            expect(observedInGamut).toEqual([true, true, true, false, true, true]);
            cleanup();
        });

        test("constructor with format override + no-op setChannel emits zero onValueChange", () => {
            const onValueChange = vi.fn();
            const state = createColorState({
                defaultValue: "#ff0000",
                format: () => "rgb",
                onValueChange,
            });

            expect(state.value).toBe("rgb(255 0 0)");
            state.setChannel("red", 255);
            expect(onValueChange).not.toHaveBeenCalled();
        });
    });

    describe("Controlled external value() reactivity ($bindable & strict controlled)", () => {
        test("$bindable roundtrip syncs external changes and preserves hidden hue across setValue roundtrip", () => {
            let external = $state("#000000");
            const onValueChange = vi.fn();
            const onCommit = vi.fn();
            const snapshots: string[] = [];

            const cleanup = $effect.root(() => {
                const state = createColorState({
                    value: () => external,
                    setValue: (next) => {
                        external = next;
                    },
                    onValueChange,
                    onCommit,
                });

                $effect(() => {
                    snapshots.push(state.value);
                });

                flushSync();
                expect(state.value).toBe("#000000");

                // Set blue HSV hue + saturation while value=0, then raise value
                state.setChannel("hue", 210);
                state.setChannel("saturation", 80);
                state.setChannel("value", 50);
                flushSync();

                const blueHex = external;
                expect(state.value).toBe(blueHex);
                expect(state.channels.hsv.h).toBe(210);

                // Drop value back to 0 -> emits "#000000" through setValue back into external
                state.setChannel("value", 0);
                flushSync();
                expect(external).toBe("#000000");
                // Roundtrip equal to #lastEmittedValue must NOT clobber preserved hue/saturation
                expect(state.channels.hsv.h).toBe(210);
                expect(state.channels.hsv.s).toBe(80);

                // Raising value back restores blue hue
                state.setChannel("value", 50);
                flushSync();
                expect(external).toBe(blueHex);
                expect(state.channels.hsv.h).toBe(210);

                // Genuine external update overrides internal state and updates snapshot
                state.setChannel("red", 10, { commit: false });
                external = "hsl(120 100% 50%)";
                flushSync();

                expect(state.value).toBe("hsl(120 100% 50%)");
                expect(state.resolvedFormat).toBe("hsl");
                expect(state.getChannel("hue")).toBeCloseTo(120, 4);
                expect(state.parsed.rgb[1]).toBeCloseTo(1, 6);

                // Pending uncommitted change was cleared by external sync
                state.commit();
                expect(onCommit).not.toHaveBeenCalled();
            });

            expect(snapshots.at(-1)).toBe("hsl(120 100% 50%)");
            cleanup();
        });

        test("strict controlled mode (blocked setValue) keeps state.value and state.channels faithful to external prop", () => {
            let external = $state("#ff0000");
            const onValueChange = vi.fn();
            const onCommit = vi.fn();

            const cleanup = $effect.root(() => {
                const state = createColorState({
                    value: () => external,
                    setValue: () => {
                        // Intentionally blocked: parent rejects mutation
                    },
                    onValueChange,
                    onCommit,
                });

                flushSync();
                expect(state.value).toBe("#ff0000");
                expect(state.getChannel("hue")).toBe(0);

                // Attempt to mutate hue to green (120) with { commit: false } + commit()
                state.setChannel("hue", 120, { commit: false });
                flushSync();

                expect(onValueChange).toHaveBeenCalledTimes(1);
                expect(onValueChange).toHaveBeenLastCalledWith("#00ff00");
                expect(onCommit).not.toHaveBeenCalled();

                // Because parent kept external = "#ff0000", state stays faithful to external prop
                expect(state.value).toBe("#ff0000");
                expect(state.parsed.rgb).toEqual([1, 0, 0]);
                expect(state.getChannel("hue")).toBe(0);
                expect(state.getChannel("red")).toBe(255);

                state.commit();
                expect(onCommit).toHaveBeenCalledTimes(1);
                expect(onCommit).toHaveBeenLastCalledWith("#00ff00");
                // Post-commit resync keeps state faithful to parent's unchanged external value
                expect(state.value).toBe("#ff0000");
                expect(state.getChannel("hue")).toBe(0);

                // A second blocked mutation with { commit: true } computes from "#ff0000" and fires onCommit once
                state.setChannel("green", 255, { commit: true });
                flushSync();
                expect(onValueChange).toHaveBeenLastCalledWith("#ffff00");
                expect(onCommit).toHaveBeenCalledTimes(2);
                expect(onCommit).toHaveBeenLastCalledWith("#ffff00");
                expect(state.value).toBe("#ff0000");

                // When parent eventually updates external, state reflects it immediately
                external = "#0000ff";
                flushSync();
                expect(state.value).toBe("#0000ff");
                expect(state.getChannel("blue")).toBe(255);
            });

            cleanup();
        });

        test("controlled value() transitioning to invalid string or undefined degrades safely", () => {
            let external = $state<string | undefined>("#336699");

            const cleanup = $effect.root(() => {
                const state = createColorState({
                    value: () => external,
                });

                flushSync();
                expect(state.value).toBe("#336699");

                // Transitioning to invalid string retains last valid internal state
                external = "invalid-color";
                flushSync();
                expect(state.value).toBe("#336699");

                // Transitioning to undefined detaches external sync without throwing
                external = undefined;
                flushSync();
                expect(state.value).toBe("#336699");

                state.setChannel("red", 255);
                expect(state.getChannel("red")).toBe(255);
            });

            cleanup();
        });

        test("sync() pulls pending external value() into internal state", () => {
            let external = "#ff0000";
            const state = createColorState({
                value: () => external,
            });

            external = "#00ff00";
            state.sync();
            expect(state.value).toBe("#00ff00");
            expect(state.getChannel("green")).toBe(255);
        });
    });

    describe("Edge cases, bounds clamping, SSR & context helpers", () => {
        test("ignores NaN and Infinity channel inputs without mutating state or firing callbacks", () => {
            const onValueChange = vi.fn();
            const state = createColorState({
                defaultValue: "rgb(100 150 200)",
                onValueChange,
            });

            for (const bad of [NaN, Infinity, -Infinity]) {
                state.setChannel("red", bad);
                state.setChannel("hue", bad);
                state.setChannel("alpha", bad);
                state.setChannels({ green: bad, blue: bad });
            }

            expect(state.value).toBe("rgb(100 150 200)");
            expect(onValueChange).not.toHaveBeenCalled();

            // Mixed finite + non-finite in setChannels updates finite channels while keeping non-finite untouched
            state.setChannels({ red: 120, green: NaN });
            expect(state.value).toBe("rgb(120 150 200)");
            expect(state.getChannel("red")).toBe(120);
            expect(state.getChannel("green")).toBe(150);

            state.setChannels({ red: 50, alpha: NaN });
            expect(state.getChannel("red")).toBe(50);
            expect(state.getChannel("alpha")).toBe(1);
        });

        test("clamps out-of-range channel values to valid bounds", () => {
            const state = createColorState({ defaultValue: "rgb(10 20 30)" });

            state.setChannels({ red: 999, green: -50, blue: 128, alpha: 2.5 });
            expect(state.getChannel("red")).toBe(255);
            expect(state.getChannel("green")).toBe(0);
            expect(state.getChannel("blue")).toBe(128);
            expect(state.getChannel("alpha")).toBe(1);

            state.setChannels({ hue: 500, saturation: -10, value: 150 });
            expect(state.getChannel("hue")).toBe(360);
            expect(state.getChannel("saturation")).toBe(0);
            expect(state.getChannel("value")).toBe(100);

            state.setChannels({ "oklch-lightness": 2, chroma: -0.5, "oklch-hue": -30 });
            expect(state.getChannel("oklch-lightness")).toBe(1);
            expect(state.getChannel("chroma")).toBe(0);
            expect(state.getChannel("oklch-hue")).toBe(0);
        });

        test("instantiates and mutates safely in SSR with window stubbed undefined", () => {
            vi.stubGlobal("window", undefined);

            const state = createColorState({ defaultValue: "#336699" });
            expect(state.value).toBe("#336699");

            state.setChannel("alpha", 0.5, { commit: true });
            expect(state.value).toBe("#33669980");
        });

        test("exports typed createContext helpers enforcing Svelte component lifecycle boundaries", () => {
            expect(typeof getColorPickerContext).toBe("function");
            expect(typeof setColorPickerContext).toBe("function");
            expect(typeof hasColorPickerContext).toBe("function");
            expect(typeof getColorSwatchGroupContext).toBe("function");
            expect(typeof setColorSwatchGroupContext).toBe("function");
            expect(typeof hasColorSwatchGroupContext).toBe("function");

            expect(() => hasColorPickerContext()).toThrow(/lifecycle_outside_component/);
            expect(() => getColorPickerContext()).toThrow(/lifecycle_outside_component/);
            expect(() => setColorPickerContext({} as ColorPickerContext)).toThrow(
                /lifecycle_outside_component/
            );

            expect(() => hasColorSwatchGroupContext()).toThrow(/lifecycle_outside_component/);
            expect(() => getColorSwatchGroupContext()).toThrow(/lifecycle_outside_component/);
            expect(() => setColorSwatchGroupContext({} as ColorSwatchGroupContext)).toThrow(
                /lifecycle_outside_component/
            );
        });
    });
});
