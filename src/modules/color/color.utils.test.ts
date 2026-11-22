import { afterEach, describe, expect, test, vi } from "vitest";

import * as colorBarrel from "./index.ts";
import {
    COLOR_SWATCH_PRESETS,
    clampToGamut,
    convertColor,
    formatColor,
    getContrastRatio,
    getRelativeLuminance,
    isEyeDropperSupported,
    isInGamut,
    parseColor,
} from "./color.utils.ts";

describe("color.utils", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe("parseColor", () => {
        test("parses #rgb, #rgba, #rrggbb, and #rrggbbaa hex formats", () => {
            const rgb3 = parseColor("  #f08  ");
            expect(rgb3).not.toBeNull();
            expect(rgb3?.space).toBe("srgb");
            expect(rgb3?.sourceFormat).toBe("hex");
            expect(rgb3?.rgb).toEqual([1, 0, 0x88 / 255]);
            expect(rgb3?.alpha).toBe(1);

            const rgba4 = parseColor("#F08C");
            expect(rgba4).not.toBeNull();
            expect(rgba4?.sourceFormat).toBe("hex8");
            expect(rgba4?.rgb).toEqual([1, 0, 0x88 / 255]);
            expect(rgba4?.alpha).toBeCloseTo(0xcc / 255, 6);

            const rgb6 = parseColor("#3a7bd5");
            expect(rgb6).not.toBeNull();
            expect(rgb6?.sourceFormat).toBe("hex");
            expect(rgb6?.rgb[0]).toBeCloseTo(0x3a / 255, 6);
            expect(rgb6?.rgb[1]).toBeCloseTo(0x7b / 255, 6);
            expect(rgb6?.rgb[2]).toBeCloseTo(0xd5 / 255, 6);
            expect(rgb6?.alpha).toBe(1);

            const rgba8 = parseColor("#3a7bd580");
            expect(rgba8).not.toBeNull();
            expect(rgba8?.sourceFormat).toBe("hex8");
            expect(rgba8?.alpha).toBeCloseTo(0x80 / 255, 6);
        });

        test("rejects invalid hex lengths and non-hex characters", () => {
            for (const bad of ["#", "#1", "#12", "#12345", "#1234567", "#123456789", "#gggggg", "#12z"]) {
                expect(parseColor(bad)).toBeNull();
            }
        });

        test("parses legacy comma and modern space/slash rgb() and rgba() syntax", () => {
            const legacy = parseColor("rgb(255, 128, 0)");
            expect(legacy?.sourceFormat).toBe("rgb");
            expect(legacy?.rgb[0]).toBeCloseTo(1, 6);
            expect(legacy?.rgb[1]).toBeCloseTo(128 / 255, 6);
            expect(legacy?.rgb[2]).toBe(0);
            expect(legacy?.alpha).toBe(1);

            const legacyAlpha = parseColor("rgba(100%, 0%, 50%, 0.25)");
            expect(legacyAlpha?.rgb).toEqual([1, 0, 0.5]);
            expect(legacyAlpha?.alpha).toBeCloseTo(0.25, 6);

            const legacyPctAlpha = parseColor("rgba(100%, 50%, 0%, 50%)");
            expect(legacyPctAlpha?.rgb).toEqual([1, 0.5, 0]);
            expect(legacyPctAlpha?.alpha).toBeCloseTo(0.5, 6);

            const modern = parseColor("rgb(255 0 128 / 0.4)");
            expect(modern?.rgb[0]).toBe(1);
            expect(modern?.rgb[1]).toBe(0);
            expect(modern?.rgb[2]).toBeCloseTo(128 / 255, 6);
            expect(modern?.alpha).toBeCloseTo(0.4, 6);

            const modernPct = parseColor("rgb(100% 0% 50% / 50%)");
            expect(modernPct?.rgb).toEqual([1, 0, 0.5]);
            expect(modernPct?.alpha).toBe(0.5);

            // Modern space syntax permits mixing percentage and numeric channels
            const modernMixed = parseColor("rgb(100% 127.5 0 / 1)");
            expect(modernMixed?.rgb[0]).toBe(1);
            expect(modernMixed?.rgb[1]).toBeCloseTo(0.5, 4);
            expect(modernMixed?.rgb[2]).toBe(0);
        });

        test("rejects mixed percentages/numbers and none keyword in legacy comma rgb()", () => {
            expect(parseColor("rgb(100%, 0, 0)")).toBeNull();
            expect(parseColor("rgba(255, 50%, 0, 0.5)")).toBeNull();
            expect(parseColor("rgb(none, 0, 0)")).toBeNull();
        });

        test("parses hsl() and hsla() with deg, rad, grad, turn units in comma and space syntax", () => {
            const commaHsl = parseColor("hsl(120, 100%, 50%)");
            expect(commaHsl?.space).toBe("hsl");
            expect(commaHsl?.sourceFormat).toBe("hsl");
            expect(commaHsl?.rgb[0]).toBeCloseTo(0, 6);
            expect(commaHsl?.rgb[1]).toBeCloseTo(1, 6);
            expect(commaHsl?.rgb[2]).toBeCloseTo(0, 6);

            const radBlue = parseColor(`hsla(${(4 * Math.PI) / 3}rad 100% 50% / 0.6)`);
            expect(radBlue?.rgb[0]).toBeCloseTo(0, 4);
            expect(radBlue?.rgb[1]).toBeCloseTo(0, 4);
            expect(radBlue?.rgb[2]).toBeCloseTo(1, 4);
            expect(radBlue?.alpha).toBeCloseTo(0.6, 6);

            const gradCyan = parseColor("hsl(200grad 100% 50%)");
            expect(gradCyan?.rgb[0]).toBeCloseTo(0, 6);
            expect(gradCyan?.rgb[1]).toBeCloseTo(1, 6);
            expect(gradCyan?.rgb[2]).toBeCloseTo(1, 6);

            const turnYellow = parseColor("hsl(-0.8333333turn 100 50 / 80%)");
            expect(turnYellow?.rgb[0]).toBeCloseTo(1, 3);
            expect(turnYellow?.rgb[1]).toBeCloseTo(1, 3);
            expect(turnYellow?.rgb[2]).toBeCloseTo(0, 3);
            expect(turnYellow?.alpha).toBeCloseTo(0.8, 6);

            // Legacy comma syntax requires percentages for S and L
            expect(parseColor("hsl(120, 100, 50)")).toBeNull();
            expect(parseColor("hsl(none, 100%, 50%)")).toBeNull();
        });

        test("parses hwb() including achromatic whiteness+blackness >= 100%", () => {
            const green = parseColor("hwb(120 0% 0%)");
            expect(green?.sourceFormat).toBe("rgb");
            expect(green?.rgb[0]).toBeCloseTo(0, 6);
            expect(green?.rgb[1]).toBeCloseTo(1, 6);
            expect(green?.rgb[2]).toBeCloseTo(0, 6);

            const translucent = parseColor("hwb(0.5turn 20% 20% / 0.5)");
            expect(translucent?.rgb[0]).toBeCloseTo(0.2, 6);
            expect(translucent?.rgb[1]).toBeCloseTo(0.8, 6);
            expect(translucent?.rgb[2]).toBeCloseTo(0.8, 6);
            expect(translucent?.alpha).toBe(0.5);

            // w + b >= 100% resolves to gray w / (w + b)
            const gray = parseColor("hwb(180 60% 60%)");
            expect(gray?.rgb[0]).toBeCloseTo(0.5, 6);
            expect(gray?.rgb[1]).toBeCloseTo(0.5, 6);
            expect(gray?.rgb[2]).toBeCloseTo(0.5, 6);

            expect(parseColor("hwb(120, 0%, 0%)")).toBeNull();
        });

        test("parses oklab() and oklch() with numeric/percentage channels, angle units, and alpha", () => {
            const labNum = parseColor("oklab(0.6 0.1 -0.1 / 0.75)");
            expect(labNum?.space).toBe("oklab");
            expect(labNum?.sourceFormat).toBe("oklch");
            expect(labNum?.oklab[0]).toBeCloseTo(0.6, 6);
            expect(labNum?.oklab[1]).toBeCloseTo(0.1, 6);
            expect(labNum?.oklab[2]).toBeCloseTo(-0.1, 6);
            expect(labNum?.alpha).toBe(0.75);

            const labPct = parseColor("oklab(60% 25% -25%)");
            expect(labPct?.oklab[0]).toBeCloseTo(0.6, 6);
            expect(labPct?.oklab[1]).toBeCloseTo(0.1, 6);
            expect(labPct?.oklab[2]).toBeCloseTo(-0.1, 6);

            const lch = parseColor("oklch(0.65 0.24 260 / 50%)");
            expect(lch?.space).toBe("oklch");
            expect(lch?.sourceFormat).toBe("oklch");
            expect(lch?.alpha).toBe(0.5);
            if (!lch) throw new Error("Expected oklch color to parse");
            const [l, c, h] = convertColor(lch, "oklch");
            expect(l).toBeCloseTo(0.65, 6);
            expect(c).toBeCloseTo(0.24, 6);
            expect(h).toBeCloseTo(260, 4);

            const lchPctTurn = parseColor("oklch(50% 50% 0.5turn)");
            if (!lchPctTurn) throw new Error("Expected oklch percentage color to parse");
            const [l2, c2, h2] = convertColor(lchPctTurn, "oklch");
            expect(l2).toBeCloseTo(0.5, 6);
            expect(c2).toBeCloseTo(0.2, 6);
            expect(h2).toBeCloseTo(180, 4);

            expect(parseColor("oklab(0.5, 0, 0)")).toBeNull();
            expect(parseColor("oklch(0.5, 0.1, 120)")).toBeNull();
        });

        test("parses color(srgb ...) and color(display-p3 ...)", () => {
            const srgb = parseColor("color(srgb 1 0.5 0 / 0.25)");
            expect(srgb?.space).toBe("srgb");
            expect(srgb?.sourceFormat).toBe("rgb");
            expect(srgb?.rgb).toEqual([1, 0.5, 0]);
            expect(srgb?.alpha).toBe(0.25);

            const p3 = parseColor("color(DISPLAY-P3 100% 0% 0% / 80%)");
            expect(p3?.space).toBe("p3");
            expect(p3?.sourceFormat).toBe("p3");
            expect(p3?.p3).toEqual([1, 0, 0]);
            expect(p3?.alpha).toBe(0.8);
            // Display P3 primary red lies outside sRGB (r > 1, g < 0)
            expect(p3?.rgb[0]).toBeGreaterThan(1);
            expect(p3?.rgb[1]).toBeLessThan(0);

            expect(parseColor("color(a98-rgb 1 0 0)")).toBeNull();
        });

        test("handles CSS 'none' keyword in modern color syntaxes", () => {
            const rgbNone = parseColor("rgb(none 128 none / none)");
            expect(rgbNone?.rgb[0]).toBe(0);
            expect(rgbNone?.rgb[1]).toBeCloseTo(128 / 255, 6);
            expect(rgbNone?.rgb[2]).toBe(0);
            expect(rgbNone?.alpha).toBe(0);

            const hslNone = parseColor("hsl(none 100% 50%)");
            expect(hslNone?.rgb[0]).toBeCloseTo(1, 6);
            expect(hslNone?.rgb[1]).toBeCloseTo(0, 6);
            expect(hslNone?.rgb[2]).toBeCloseTo(0, 6);

            const lchNone = parseColor("oklch(0.7 none none)");
            expect(lchNone?.oklab[0]).toBeCloseTo(0.7, 6);
            expect(lchNone?.oklab[1]).toBe(0);
            expect(lchNone?.oklab[2]).toBe(0);

            const p3None = parseColor("color(display-p3 none 1 none / 0.5)");
            expect(p3None?.p3).toEqual([0, 1, 0]);
            expect(p3None?.alpha).toBe(0.5);

            // Case-insensitive "none" and uppercase/scientific notation
            const rgbUpperNone = parseColor("rgb(NONE 0 0)");
            expect(rgbUpperNone?.rgb).toEqual([0, 0, 0]);

            const oklchMixedNone = parseColor("oklch(0.5 None 120)");
            expect(oklchMixedNone?.oklab).toEqual([0.5, 0, 0]);

            const rgbUpperFn = parseColor("RGB(255 0 0)");
            expect(rgbUpperFn?.rgb).toEqual([1, 0, 0]);

            const oklchSci = parseColor("OKLCH(5e-1 2e-1 180DEG)");
            expect(oklchSci).not.toBeNull();
            if (oklchSci) {
                const [l, c, h] = convertColor(oklchSci, "oklch");
                expect(l).toBeCloseTo(0.5, 6);
                expect(c).toBeCloseTo(0.2, 6);
                expect(h).toBeCloseTo(180, 4);
            }
        });

        test("parses out-of-range channel values cleanly", () => {
            const negL = parseColor("oklch(-0.2 0.2 120)");
            expect(negL).not.toBeNull();
            expect(convertColor(negL ?? "", "oklch")[0]).toBe(0);

            const overLNegC = parseColor("oklch(1.5 -0.1 120)");
            expect(overLNegC).not.toBeNull();
            expect(convertColor(overLNegC ?? "", "oklch")[0]).toBe(1);
            expect(convertColor(overLNegC ?? "", "oklch")[1]).toBe(0);

            const hsl360 = parseColor("hsl(360 100% 50%)");
            expect(hsl360?.rgb[0]).toBeCloseTo(1, 6);
            expect(hsl360?.rgb[1]).toBeCloseTo(0, 6);
            expect(hsl360?.rgb[2]).toBeCloseTo(0, 6);

            const outSrgb = parseColor("color(srgb 1.5 -0.2 0)");
            expect(outSrgb?.rgb).toEqual([1.5, -0.2, 0]);
        });

        test("parses CSS named colors case-insensitively including transparent", () => {
            const rebecca = parseColor("ReBeCcApUrPlE");
            expect(rebecca?.sourceFormat).toBe("hex");
            expect(rebecca?.rgb[0]).toBeCloseTo(102 / 255, 6);
            expect(rebecca?.rgb[1]).toBeCloseTo(51 / 255, 6);
            expect(rebecca?.rgb[2]).toBeCloseTo(153 / 255, 6);
            expect(rebecca?.alpha).toBe(1);

            const transparent = parseColor("TRANSPARENT");
            expect(transparent?.rgb).toEqual([0, 0, 0]);
            expect(transparent?.alpha).toBe(0);
        });

        test("returns null for malformed, empty, or non-string inputs without throwing", () => {
            const invalidInputs = [
                "",
                " ".repeat(3),
                "not-a-color",
                "constructor",
                "toString",
                "valueOf",
                "__proto__",
                "rgb (255 0 0)",
                "rgb()",
                "rgb(1, 2)",
                "rgb(1, 2, 3, 4, 5)",
                "rgb(1 2 3 / 0.5 / 0.5)",
                "rgb(1 2 3 / )",
                "rgb(1 2 3 / 0.5 0.5)",
                "rgb(255 0 0",
                "color(srgb 1 0)",
                "unknown(1 2 3)",
                null as unknown as string,
                undefined as unknown as string,
            ];

            for (const input of invalidInputs) {
                expect(parseColor(input)).toBeNull();
            }
        });
    });

    describe("convertColor & roundtrips", () => {
        test("converts primaries, black, white, and midtones across all color spaces accurately", () => {
            const samples = ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000", "#3a7bd5"];

            for (const hex of samples) {
                const srgb = convertColor(hex, "srgb");
                const hsl = convertColor(hex, "hsl");
                const hsv = convertColor(hex, "hsv");
                const oklch = convertColor(hex, "oklch");
                const oklab = convertColor(hex, "oklab");
                const p3 = convertColor(hex, "p3");

                expect(srgb).toHaveLength(3);
                expect(hsl).toHaveLength(3);
                expect(hsv).toHaveLength(3);
                expect(oklch).toHaveLength(3);
                expect(oklab).toHaveLength(3);
                expect(p3).toHaveLength(3);

                // Roundtrip via formatted OKLCH back into sRGB
                const formattedOklch = formatColor(hex, "oklch", { precision: 6 });
                const roundtripRgb = convertColor(formattedOklch, "srgb");
                expect(roundtripRgb[0]).toBeCloseTo(srgb[0], 2);
                expect(roundtripRgb[1]).toBeCloseTo(srgb[1], 2);
                expect(roundtripRgb[2]).toBeCloseTo(srgb[2], 2);

                // Roundtrip via formatted HSL back into sRGB
                const formattedHsl = formatColor(hex, "hsl", { precision: 4 });
                const hslRoundtrip = convertColor(formattedHsl, "srgb");
                expect(hslRoundtrip[0]).toBeCloseTo(srgb[0], 1);
                expect(hslRoundtrip[1]).toBeCloseTo(srgb[1], 1);
                expect(hslRoundtrip[2]).toBeCloseTo(srgb[2], 1);
            }

            expect(convertColor("#ff0000", "hsl")).toEqual([0, 100, 50]);
            expect(convertColor("#00ff00", "hsv")).toEqual([120, 100, 100]);
            expect(convertColor("#0000ff", "srgb")).toEqual([0, 0, 255]);

            const [negZeroHue] = convertColor("hsl(-0 100% 50%)", "hsl");
            expect(Object.is(negZeroHue, 0)).toBe(true);
        });

        test("handles wide-gamut colors across spaces and returns [0,0,0] on invalid input", () => {
            const p3Red = "color(display-p3 1 0 0)";
            expect(convertColor(p3Red, "p3")).toEqual([1, 0, 0]);

            const p3RedSrgb = convertColor(p3Red, "srgb");
            expect(p3RedSrgb[0]).toBeGreaterThan(255);
            expect(p3RedSrgb[1]).toBeLessThan(0);

            // HSL/HSV clamp wide-gamut colors into valid bounded ranges
            const [h, s, l] = convertColor(p3Red, "hsl");
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThan(360);
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(100);
            expect(l).toBeGreaterThanOrEqual(0);
            expect(l).toBeLessThanOrEqual(100);

            const wideOklch = "oklch(0.65 0.24 260)";
            const [lVal, cVal, hVal] = convertColor(wideOklch, "oklch");
            expect(lVal).toBeCloseTo(0.65, 6);
            expect(cVal).toBeCloseTo(0.24, 6);
            expect(hVal).toBeCloseTo(260, 4);

            expect(convertColor("not-a-color", "srgb")).toEqual([0, 0, 0]);
        });
    });

    describe("formatColor", () => {
        test("formats into all concrete output formats and respects default sourceFormat", () => {
            expect(formatColor("#3a7bd5", "hex")).toBe("#3a7bd5");
            expect(formatColor("#3a7bd5", "hex8")).toBe("#3a7bd5ff");
            expect(formatColor("#3a7bd5", "rgb")).toBe("rgb(58 123 213)");
            expect(formatColor("#3a7bd5", "hsl")).toMatch(/^hsl\(214\.\d+ 64\.\d+% 53\.\d+%\)$/);
            expect(formatColor("#3a7bd5", "oklch")).toMatch(/^oklch\(0\.\d+ 0\.\d+ 257\.\d+\)$/);
            expect(formatColor("#3a7bd5", "p3")).toMatch(/^color\(display-p3 0\.\d+ 0\.\d+ 0\.\d+\)$/);

            // Default format falls back to parsed sourceFormat
            expect(formatColor("rgb(10, 20, 30)")).toBe("rgb(10 20 30)");
            expect(formatColor("hsl(180, 50%, 50%)")).toBe("hsl(180 50% 50%)");
            expect(formatColor("invalid-color", "hex")).toBe("");
        });

        test("respects alpha options ('auto' | 'always' | 'never') and auto-promotes hex to hex8", () => {
            expect(formatColor("rgba(255, 0, 0, 0.5)", "hex", { alpha: "auto" })).toBe("#ff000080");
            expect(formatColor("rgba(255, 0, 0, 0.5)", "hex", { alpha: "never" })).toBe("#ff0000");
            expect(formatColor("#ff0000", "hex", { alpha: "always" })).toBe("#ff0000ff");
            expect(formatColor("#ff0000", "hex8", { alpha: "never" })).toBe("#ff0000");

            expect(formatColor("#ff0000", "rgb", { alpha: "auto" })).toBe("rgb(255 0 0)");
            expect(formatColor("#ff0000", "rgb", { alpha: "always" })).toBe("rgb(255 0 0 / 1)");
            expect(formatColor("rgb(255 0 0 / 0.5)", "rgb", { alpha: "never" })).toBe("rgb(255 0 0)");
            expect(formatColor("rgb(255 0 0 / 0.5)", "hsl", { alpha: "auto" })).toBe("hsl(0 100% 50% / 0.5)");
            expect(formatColor("rgb(255 0 0 / 0.5)", "oklch", { alpha: "always" })).toMatch(/\/ 0\.5\)$/);
            expect(formatColor("color(display-p3 1 0 0 / 0.25)", "p3", { alpha: "never" })).toBe(
                "color(display-p3 1 0 0)"
            );
        });

        test("applies precision option and prevents -0 formatting artifacts", () => {
            expect(formatColor("rgb(255 127.5 0)", "rgb", { precision: 1 })).toBe("rgb(255 127.5 0)");
            expect(formatColor("oklch(0.654321 0.123456 210.987)", "oklch", { precision: 2 })).toBe(
                "oklch(0.65 0.12 210.99)"
            );

            // -0 values must serialize as "0", never "-0"
            const negZeroP3 = formatColor("color(display-p3 -0 -0.00001 0)", "p3", { precision: 3 });
            expect(negZeroP3).not.toContain("-0");
            expect(negZeroP3).toBe("color(display-p3 0 0 0)");

            const negZeroOklch = formatColor("oklch(0.5 0 -0)", "oklch", { precision: 2 });
            expect(negZeroOklch).not.toContain("-0");
        });

        test("clamps wide-gamut colors for hex/rgb/hsl while preserving wide-gamut oklch/p3", () => {
            const wide = "color(display-p3 1 0 0)";
            expect(isInGamut(wide, "srgb")).toBe(false);

            const asHex = formatColor(wide, "hex");
            const asRgb = formatColor(wide, "rgb");
            const asHsl = formatColor(wide, "hsl");
            expect(isInGamut(asHex, "srgb")).toBe(true);
            expect(isInGamut(asRgb, "srgb")).toBe(true);
            expect(isInGamut(asHsl, "srgb")).toBe(true);

            // Wide-gamut outputs remain outside sRGB unless gamut="srgb" is explicitly requested
            const asP3 = formatColor(wide, "p3");
            const asOklch = formatColor(wide, "oklch");
            expect(asP3).toBe("color(display-p3 1 0 0)");
            expect(isInGamut(asOklch, "srgb")).toBe(false);

            const interiorWide = "color(display-p3 0.9 0.1 0.1)";
            const interiorOklch = formatColor(interiorWide, "oklch");
            expect(isInGamut(interiorOklch, "srgb")).toBe(false);
            expect(isInGamut(interiorOklch, "p3")).toBe(true);

            const clampedOklch = formatColor(wide, "oklch", { gamut: "srgb" });
            expect(isInGamut(clampedOklch, "srgb")).toBe(true);
        });
    });

    describe("isInGamut & clampToGamut", () => {
        test("distinguishes sRGB vs Display P3 membership", () => {
            expect(isInGamut("#ff0000", "srgb")).toBe(true);
            expect(isInGamut("#ff0000", "p3")).toBe(true);

            expect(isInGamut("color(display-p3 1 0 0)", "srgb")).toBe(false);
            expect(isInGamut("color(display-p3 1 0 0)", "p3")).toBe(true);

            expect(isInGamut("oklch(0.65 0.35 145)", "srgb")).toBe(false);
            expect(isInGamut("oklch(0.65 0.35 145)", "p3")).toBe(false);

            // Within 1e-5 epsilon
            expect(isInGamut("color(srgb 1.000005 0 0)", "srgb")).toBe(true);
            expect(isInGamut("color(srgb 1.01 0 0)", "srgb")).toBe(false);

            expect(isInGamut("invalid", "srgb")).toBe(false);
        });

        test("clamps out-of-gamut colors via OKLCH chroma binary search preserving L and H", () => {
            const source = parseColor("oklch(0.65 0.24 260)");
            if (!source) throw new Error("Expected source oklch color to parse");
            expect(isInGamut(source, "srgb")).toBe(false);

            const clamped = clampToGamut(source, "srgb");
            expect(isInGamut(clamped, "srgb")).toBe(true);
            expect(clamped.rgb[0]).toBeGreaterThanOrEqual(0);
            expect(clamped.rgb[0]).toBeLessThanOrEqual(1);
            expect(clamped.rgb[1]).toBeGreaterThanOrEqual(0);
            expect(clamped.rgb[1]).toBeLessThanOrEqual(1);
            expect(clamped.rgb[2]).toBeGreaterThanOrEqual(0);
            expect(clamped.rgb[2]).toBeLessThanOrEqual(1);

            const [origL, origC, origH] = convertColor(source, "oklch");
            const [clampedL, clampedC, clampedH] = convertColor(clamped, "oklch");
            expect(clampedC).toBeLessThan(origC);
            expect(clampedL).toBeCloseTo(origL, 2);
            expect(clampedH).toBeCloseTo(origH, 0);

            const p3Clamped = clampToGamut("oklch(0.65 0.35 145)", "p3");
            expect(isInGamut(p3Clamped, "p3")).toBe(true);
            expect(isInGamut(p3Clamped, "srgb")).toBe(false);
        });

        test("maps L >= 1 to white, L <= 0 to black, and invalid input to black", () => {
            const whiteFromOklch = clampToGamut("oklch(1 0.25 140)", "srgb");
            expect(whiteFromOklch.rgb).toEqual([1, 1, 1]);

            const whiteFromOverSrgb = clampToGamut("color(srgb 1.5 1.5 1.5)", "p3");
            expect(whiteFromOverSrgb.p3).toEqual([1, 1, 1]);

            const blackFromOklch = clampToGamut("oklch(0 0.25 140)", "srgb");
            expect(blackFromOklch.rgb).toEqual([0, 0, 0]);

            const blackFromNegativeSrgb = clampToGamut("color(srgb -0.5 -0.5 -0.5)", "p3");
            expect(blackFromNegativeSrgb.p3).toEqual([0, 0, 0]);

            const fallback = clampToGamut("not-valid", "srgb");
            expect(fallback.rgb).toEqual([0, 0, 0]);
        });
    });

    describe("getRelativeLuminance & getContrastRatio", () => {
        test("computes WCAG luminance and symmetric contrast ratios", () => {
            expect(getRelativeLuminance("#000000")).toBe(0);
            expect(getRelativeLuminance("#ffffff")).toBe(1);
            expect(getRelativeLuminance("#ff0000")).toBeCloseTo(0.2126, 4);

            expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 6);
            expect(getContrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 6);
            expect(getContrastRatio("#3a7bd5", "#3a7bd5")).toBe(1);
            expect(getContrastRatio("#3a7bd5", "#ffffff")).toBeCloseTo(
                getContrastRatio("#ffffff", "#3a7bd5"),
                6
            );
        });

        test("alpha-composites translucent foreground over background", () => {
            const halfBlackOverWhite = getContrastRatio("rgba(0, 0, 0, 0.5)", "#ffffff");
            expect(halfBlackOverWhite).toBeGreaterThan(3.5);
            expect(halfBlackOverWhite).toBeLessThan(4.5);

            // Fully transparent foreground matches background -> contrast 1
            expect(getContrastRatio("transparent", "#ffffff")).toBeCloseTo(1, 6);
            expect(getContrastRatio("transparent", "#3a7bd5")).toBeCloseTo(1, 6);

            // Translucent background composites over white backdrop before foreground compositing
            const whiteOverTranslucentBlack = getContrastRatio("#ffffff", "rgba(0, 0, 0, 0.5)");
            expect(whiteOverTranslucentBlack).toBeGreaterThan(3.5);
            expect(whiteOverTranslucentBlack).toBeLessThan(4.5);
            expect(getContrastRatio("#000000", "rgba(0, 0, 0, 0.5)")).toBeGreaterThan(5);
        });

        test("returns safe defaults on invalid inputs", () => {
            expect(getRelativeLuminance("invalid")).toBe(0);
            expect(getContrastRatio("invalid", "#ffffff")).toBe(1);
            expect(getContrastRatio("#000000", "invalid")).toBe(1);
        });
    });

    describe("isEyeDropperSupported", () => {
        test("returns false when window is undefined or EyeDropper is missing, true when present", () => {
            expect(isEyeDropperSupported()).toBe(false);

            Object.defineProperty(window, "EyeDropper", {
                value: class MockEyeDropper {},
                configurable: true,
                writable: true,
            });
            expect(isEyeDropperSupported()).toBe(true);

            Reflect.deleteProperty(window, "EyeDropper");
            expect(isEyeDropperSupported()).toBe(false);

            vi.stubGlobal("window", undefined);
            expect(isEyeDropperSupported()).toBe(false);
        });
    });

    describe("COLOR_SWATCH_PRESETS", () => {
        test("contains 14 unique, parseable presets with non-empty labels and is re-exported from index.ts", () => {
            expect(colorBarrel.COLOR_SWATCH_PRESETS).toBe(COLOR_SWATCH_PRESETS);
            expect(COLOR_SWATCH_PRESETS).toHaveLength(14);

            const uniqueColors = new Set<string>();
            for (const preset of COLOR_SWATCH_PRESETS) {
                expect(typeof preset.color).toBe("string");
                expect(preset.color.trim().length).toBeGreaterThan(0);
                expect(typeof preset.label).toBe("string");
                expect(preset.label.trim().length).toBeGreaterThan(0);
                expect(parseColor(preset.color)).not.toBeNull();
                uniqueColors.add(preset.color);
            }

            expect(uniqueColors.size).toBe(COLOR_SWATCH_PRESETS.length);
        });
    });

    describe("public barrel boundary", () => {
        test("exports headless API and does not leak color-math.internal helpers", () => {
            const exportedKeys = new Set(Object.keys(colorBarrel));

            for (const expectedPublic of [
                "parseColor",
                "formatColor",
                "convertColor",
                "isInGamut",
                "clampToGamut",
                "getRelativeLuminance",
                "getContrastRatio",
                "isEyeDropperSupported",
                "ColorState",
                "createColorState",
                "getColorPickerContext",
                "setColorPickerContext",
                "hasColorPickerContext",
                "getColorSwatchGroupContext",
                "setColorSwatchGroupContext",
                "hasColorSwatchGroupContext",
                "COLOR_FORMATS",
                "COLOR_ALPHA_FORMATS",
                "COLOR_SPACES",
                "COLOR_GAMUTS",
                "COLOR_CHANNELS",
                "COLOR_SWATCH_PRESETS",
            ]) {
                expect(exportedKeys.has(expectedPublic)).toBe(true);
            }

            for (const forbiddenInternal of [
                "parseCssColor",
                "formatParsedColor",
                "isParsedInGamut",
                "clampParsedToGamut",
                "buildParsedColorFromSrgb",
                "buildParsedColorFromP3",
                "buildParsedColorFromOklab",
                "srgbToLinear",
                "linearToSrgb",
                "oklabToLinearSrgb",
                "linearSrgbToOklab",
                "linearSrgbToLinearP3",
                "linearP3ToLinearSrgb",
                "oklabToOklch",
                "oklchToOklab",
                "srgbToHsl",
                "hslToSrgb",
                "srgbToHsv",
                "hsvToSrgb",
                "computeRelativeLuminance",
                "computeContrastRatio",
                "GAMUT_EPSILON",
                "ACHROMATIC_EPSILON",
                "clamp",
                "clamp01",
                "normalizeHue",
            ]) {
                expect(exportedKeys.has(forbiddenInternal)).toBe(false);
            }
        });
    });
});
