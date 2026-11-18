import type {
    ColorAlphaFormat,
    ColorGamut,
    ColorSpace,
    ConcreteColorFormat,
    FormatColorOptions,
    ParsedColor,
} from "./color.utils.ts";

export type Vec3 = readonly [number, number, number];
type Mat3 = readonly [Vec3, Vec3, Vec3];

export const GAMUT_EPSILON = 1e-5;
export const ACHROMATIC_EPSILON = 1e-5;

// Björn Ottosson OKLab linear-sRGB <-> LMS <-> OKLab matrices (M1, M2 and exact inverses)
const OKLAB_M1: Mat3 = [
    [0.4122214708, 0.5363325363, 0.0514459929],
    [0.2119034982, 0.6806995451, 0.1073969566],
    [0.0883024619, 0.2817188376, 0.6299787005],
];

const OKLAB_M2: Mat3 = [
    [0.2104542553, 0.793617785, -0.0040720468],
    [1.9779984951, -2.428592205, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.808675766],
];

const OKLAB_INV_M1: Mat3 = [
    [4.076741661347994, -3.3077115904081933, 0.23096992872942784],
    [-1.268438004092176, 2.6097574006633715, -0.34131939631021946],
    [-0.004196086541837046, -0.7034186144594494, 1.7076147009309446],
];

const OKLAB_INV_M2: Mat3 = [
    [0.9999999984505199, 0.39633779217376786, 0.2158037580607588],
    [1.0000000088817607, -0.10556134232365634, -0.0638541747717059],
    [1.000000054672411, -0.08948418209496577, -1.291485537864092],
];

// Exact CIE D65 chromaticity-derived linear sRGB <-> linear Display P3 matrices (CSS Color Level 4)
const LINEAR_SRGB_TO_LINEAR_P3: Mat3 = [
    [0.8224619687143625, 0.17753803128563805, 0],
    [0.03319419885096158, 0.9668058011490385, 0],
    [0.017082630721120033, 0.07239744066396339, 0.9105199286149165],
];

const LINEAR_P3_TO_LINEAR_SRGB: Mat3 = [
    [1.2249401762805596, -0.22494017628055984, 0],
    [-0.042056954709688066, 1.042056954709688, 0],
    [-0.019637554590334436, -0.07863604555063179, 1.0982736001409663],
];

// All 148 standard CSS Color Level 4 named colors + "transparent"
const CSS_NAMED_COLORS: Readonly<Record<string, readonly [number, number, number, number]>> = {
    aliceblue: [240, 248, 255, 1],
    antiquewhite: [250, 235, 215, 1],
    aqua: [0, 255, 255, 1],
    aquamarine: [127, 255, 212, 1],
    azure: [240, 255, 255, 1],
    beige: [245, 245, 220, 1],
    bisque: [255, 228, 196, 1],
    black: [0, 0, 0, 1],
    blanchedalmond: [255, 235, 205, 1],
    blue: [0, 0, 255, 1],
    blueviolet: [138, 43, 226, 1],
    brown: [165, 42, 42, 1],
    burlywood: [222, 184, 135, 1],
    cadetblue: [95, 158, 160, 1],
    chartreuse: [127, 255, 0, 1],
    chocolate: [210, 105, 30, 1],
    coral: [255, 127, 80, 1],
    cornflowerblue: [100, 149, 237, 1],
    cornsilk: [255, 248, 220, 1],
    crimson: [220, 20, 60, 1],
    cyan: [0, 255, 255, 1],
    darkblue: [0, 0, 139, 1],
    darkcyan: [0, 139, 139, 1],
    darkgoldenrod: [184, 134, 11, 1],
    darkgray: [169, 169, 169, 1],
    darkgreen: [0, 100, 0, 1],
    darkgrey: [169, 169, 169, 1],
    darkkhaki: [189, 183, 107, 1],
    darkmagenta: [139, 0, 139, 1],
    darkolivegreen: [85, 107, 47, 1],
    darkorange: [255, 140, 0, 1],
    darkorchid: [153, 50, 204, 1],
    darkred: [139, 0, 0, 1],
    darksalmon: [233, 150, 122, 1],
    darkseagreen: [143, 188, 143, 1],
    darkslateblue: [72, 61, 139, 1],
    darkslategray: [47, 79, 79, 1],
    darkslategrey: [47, 79, 79, 1],
    darkturquoise: [0, 206, 209, 1],
    darkviolet: [148, 0, 211, 1],
    deeppink: [255, 20, 147, 1],
    deepskyblue: [0, 191, 255, 1],
    dimgray: [105, 105, 105, 1],
    dimgrey: [105, 105, 105, 1],
    dodgerblue: [30, 144, 255, 1],
    firebrick: [178, 34, 34, 1],
    floralwhite: [255, 250, 240, 1],
    forestgreen: [34, 139, 34, 1],
    fuchsia: [255, 0, 255, 1],
    gainsboro: [220, 220, 220, 1],
    ghostwhite: [248, 248, 255, 1],
    gold: [255, 215, 0, 1],
    goldenrod: [218, 165, 32, 1],
    gray: [128, 128, 128, 1],
    green: [0, 128, 0, 1],
    greenyellow: [173, 255, 47, 1],
    grey: [128, 128, 128, 1],
    honeydew: [240, 255, 240, 1],
    hotpink: [255, 105, 180, 1],
    indianred: [205, 92, 92, 1],
    indigo: [75, 0, 130, 1],
    ivory: [255, 255, 240, 1],
    khaki: [240, 230, 140, 1],
    lavender: [230, 230, 250, 1],
    lavenderblush: [255, 240, 245, 1],
    lawngreen: [124, 252, 0, 1],
    lemonchiffon: [255, 250, 205, 1],
    lightblue: [173, 216, 230, 1],
    lightcoral: [240, 128, 128, 1],
    lightcyan: [224, 255, 255, 1],
    lightgoldenrodyellow: [250, 250, 210, 1],
    lightgray: [211, 211, 211, 1],
    lightgreen: [144, 238, 144, 1],
    lightgrey: [211, 211, 211, 1],
    lightpink: [255, 182, 193, 1],
    lightsalmon: [255, 160, 122, 1],
    lightseagreen: [32, 178, 170, 1],
    lightskyblue: [135, 206, 250, 1],
    lightslategray: [119, 136, 153, 1],
    lightslategrey: [119, 136, 153, 1],
    lightsteelblue: [176, 196, 222, 1],
    lightyellow: [255, 255, 224, 1],
    lime: [0, 255, 0, 1],
    limegreen: [50, 205, 50, 1],
    linen: [250, 240, 230, 1],
    magenta: [255, 0, 255, 1],
    maroon: [128, 0, 0, 1],
    mediumaquamarine: [102, 205, 170, 1],
    mediumblue: [0, 0, 205, 1],
    mediumorchid: [186, 85, 211, 1],
    mediumpurple: [147, 112, 219, 1],
    mediumseagreen: [60, 179, 113, 1],
    mediumslateblue: [123, 104, 238, 1],
    mediumspringgreen: [0, 250, 154, 1],
    mediumturquoise: [72, 209, 204, 1],
    mediumvioletred: [199, 21, 133, 1],
    midnightblue: [25, 25, 112, 1],
    mintcream: [245, 255, 250, 1],
    mistyrose: [255, 228, 225, 1],
    moccasin: [255, 228, 181, 1],
    navajowhite: [255, 222, 173, 1],
    navy: [0, 0, 128, 1],
    oldlace: [253, 245, 230, 1],
    olive: [128, 128, 0, 1],
    olivedrab: [107, 142, 35, 1],
    orange: [255, 165, 0, 1],
    orangered: [255, 69, 0, 1],
    orchid: [218, 112, 214, 1],
    palegoldenrod: [238, 232, 170, 1],
    palegreen: [152, 251, 152, 1],
    paleturquoise: [175, 238, 238, 1],
    palevioletred: [219, 112, 147, 1],
    papayawhip: [255, 239, 213, 1],
    peachpuff: [255, 218, 185, 1],
    peru: [205, 133, 63, 1],
    pink: [255, 192, 203, 1],
    plum: [221, 160, 221, 1],
    powderblue: [176, 224, 230, 1],
    purple: [128, 0, 128, 1],
    rebeccapurple: [102, 51, 153, 1],
    red: [255, 0, 0, 1],
    rosybrown: [188, 143, 143, 1],
    royalblue: [65, 105, 225, 1],
    saddlebrown: [139, 69, 19, 1],
    salmon: [250, 128, 114, 1],
    sandybrown: [244, 164, 96, 1],
    seagreen: [46, 139, 87, 1],
    seashell: [255, 245, 238, 1],
    sienna: [160, 82, 45, 1],
    silver: [192, 192, 192, 1],
    skyblue: [135, 206, 235, 1],
    slateblue: [106, 90, 205, 1],
    slategray: [112, 128, 144, 1],
    slategrey: [112, 128, 144, 1],
    snow: [255, 250, 250, 1],
    springgreen: [0, 255, 127, 1],
    steelblue: [70, 130, 180, 1],
    tan: [210, 180, 140, 1],
    teal: [0, 128, 128, 1],
    thistle: [216, 191, 216, 1],
    tomato: [255, 99, 71, 1],
    transparent: [0, 0, 0, 0],
    turquoise: [64, 224, 208, 1],
    violet: [238, 130, 238, 1],
    wheat: [245, 222, 179, 1],
    white: [255, 255, 255, 1],
    whitesmoke: [245, 245, 245, 1],
    yellow: [255, 255, 0, 1],
    yellowgreen: [154, 205, 50, 1],
};

const NUMBER_RE = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i;
const PERCENT_RE = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)%$/i;
const ANGLE_RE = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(deg|rad|grad|turn)?$/i;

export function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
    return clamp(value, 0, 1);
}

export function normalizeHue(hue: number): number {
    if (!Number.isFinite(hue)) return 0;
    const mod = hue % 360;
    const positive = mod < 0 ? mod + 360 : mod;
    return normalizeZero(positive === 360 ? 0 : positive);
}

function normalizeZero(value: number): number {
    return Object.is(value, -0) || value === 0 ? 0 : value;
}

function mulMat3(m: Mat3, v: Vec3): Vec3 {
    return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ];
}

// Symmetric sRGB OETF/EOTF extension handles out-of-gamut negative/over-1 coordinates cleanly per CSS Color 4
export function srgbToLinear(c: number): number {
    const sign = c < 0 ? -1 : 1;
    const abs = Math.abs(c);
    if (abs <= 0.04045) {
        return c / 12.92;
    }
    return sign * ((abs + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c: number): number {
    const sign = c < 0 ? -1 : 1;
    const abs = Math.abs(c);
    if (abs > 0.0031308) {
        return sign * (1.055 * abs ** (1 / 2.4) - 0.055);
    }
    return 12.92 * c;
}

function srgbTupleToLinear(rgb: Vec3): Vec3 {
    return [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])];
}

function linearTupleToSrgb(rgb: Vec3): Vec3 {
    return [linearToSrgb(rgb[0]), linearToSrgb(rgb[1]), linearToSrgb(rgb[2])];
}

export function linearSrgbToOklab(rgb: Vec3): Vec3 {
    const lms = mulMat3(OKLAB_M1, rgb);
    const lmsCbrt: Vec3 = [Math.cbrt(lms[0]), Math.cbrt(lms[1]), Math.cbrt(lms[2])];
    return mulMat3(OKLAB_M2, lmsCbrt);
}

export function oklabToLinearSrgb(lab: Vec3): Vec3 {
    const lmsCbrt = mulMat3(OKLAB_INV_M2, lab);
    const lms: Vec3 = [lmsCbrt[0] ** 3, lmsCbrt[1] ** 3, lmsCbrt[2] ** 3];
    return mulMat3(OKLAB_INV_M1, lms);
}

export function linearSrgbToLinearP3(rgb: Vec3): Vec3 {
    return mulMat3(LINEAR_SRGB_TO_LINEAR_P3, rgb);
}

export function linearP3ToLinearSrgb(p3: Vec3): Vec3 {
    return mulMat3(LINEAR_P3_TO_LINEAR_SRGB, p3);
}

export function oklabToOklch(lab: Vec3): Vec3 {
    const [l, a, b] = lab;
    const c = Math.hypot(a, b);
    if (c <= ACHROMATIC_EPSILON) {
        return [l, 0, 0];
    }
    const h = normalizeHue((Math.atan2(b, a) * 180) / Math.PI);
    return [l, c, h];
}

export function oklchToOklab(lch: Vec3): Vec3 {
    const [l, c, h] = lch;
    if (c <= 0) {
        return [l, 0, 0];
    }
    const rad = (h * Math.PI) / 180;
    return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

export function srgbToHsl(rgb: Vec3): Vec3 {
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;

    if (d <= 1e-7) {
        return [0, 0, l * 100];
    }

    const denom = 1 - Math.abs(2 * l - 1);
    const s = denom <= 1e-7 ? 0 : d / denom;

    let h: number;
    if (max === r) {
        h = ((g - b) / d) % 6;
    } else if (max === g) {
        h = (b - r) / d + 2;
    } else {
        h = (r - g) / d + 4;
    }

    return [normalizeHue(h * 60), s * 100, l * 100];
}

export function hslToSrgb(h: number, s: number, l: number): Vec3 {
    const hue = normalizeHue(h);
    const sat = Math.max(0, s) / 100;
    const light = l / 100;

    if (sat === 0) {
        return [light, light, light];
    }

    const a = sat * Math.min(light, 1 - light);
    const f = (n: number): number => {
        const k = (n + hue / 30) % 12;
        return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0), f(8), f(4)];
}

export function srgbToHsv(rgb: Vec3): Vec3 {
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b);

    if (max <= 1e-7) {
        return [0, 0, 0];
    }
    const min = Math.min(r, g, b);
    const d = max - min;
    const v = max;
    if (d <= 1e-7) {
        return [0, 0, v * 100];
    }

    const s = d / max;
    let h: number;
    if (max === r) {
        h = ((g - b) / d) % 6;
    } else if (max === g) {
        h = (b - r) / d + 2;
    } else {
        h = (r - g) / d + 4;
    }

    return [normalizeHue(h * 60), s * 100, v * 100];
}

export function hsvToSrgb(h: number, s: number, v: number): Vec3 {
    const hue = normalizeHue(h);
    const sat = clamp(s, 0, 100) / 100;
    const val = clamp(v, 0, 100) / 100;

    if (sat === 0) {
        return [val, val, val];
    }

    const c = val * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = val - c;

    let r = 0;
    let g = 0;
    let b = 0;
    if (hue < 60) {
        r = c;
        g = x;
    } else if (hue < 120) {
        r = x;
        g = c;
    } else if (hue < 180) {
        g = c;
        b = x;
    } else if (hue < 240) {
        g = x;
        b = c;
    } else if (hue < 300) {
        r = x;
        b = c;
    } else {
        r = c;
        b = x;
    }

    return [r + m, g + m, b + m];
}

function hwbToSrgb(h: number, wPercent: number, bPercent: number): Vec3 {
    const w = wPercent / 100;
    const b = bPercent / 100;
    if (w + b >= 1) {
        const gray = w / (w + b);
        return [gray, gray, gray];
    }
    const pure = hslToSrgb(h, 100, 50);
    const scale = 1 - w - b;
    return [pure[0] * scale + w, pure[1] * scale + w, pure[2] * scale + w];
}

export function buildParsedColorFromSrgb(
    rgb: Vec3,
    alpha: number,
    space: ColorSpace,
    sourceFormat: ConcreteColorFormat
): ParsedColor {
    const linearSrgb = srgbTupleToLinear(rgb);
    const linearP3 = linearSrgbToLinearP3(linearSrgb);
    const p3 = linearTupleToSrgb(linearP3);
    const oklab = linearSrgbToOklab(linearSrgb);
    return {
        space,
        sourceFormat,
        rgb,
        p3,
        oklab,
        alpha: clamp01(alpha),
    };
}

export function buildParsedColorFromP3(
    p3: Vec3,
    alpha: number,
    space: ColorSpace,
    sourceFormat: ConcreteColorFormat
): ParsedColor {
    const linearP3 = srgbTupleToLinear(p3);
    const linearSrgb = linearP3ToLinearSrgb(linearP3);
    const rgb = linearTupleToSrgb(linearSrgb);
    const oklab = linearSrgbToOklab(linearSrgb);
    return {
        space,
        sourceFormat,
        rgb,
        p3,
        oklab,
        alpha: clamp01(alpha),
    };
}

export function buildParsedColorFromOklab(
    oklab: Vec3,
    alpha: number,
    space: ColorSpace,
    sourceFormat: ConcreteColorFormat
): ParsedColor {
    const linearSrgb = oklabToLinearSrgb(oklab);
    const rgb = linearTupleToSrgb(linearSrgb);
    const linearP3 = linearSrgbToLinearP3(linearSrgb);
    const p3 = linearTupleToSrgb(linearP3);
    return {
        space,
        sourceFormat,
        rgb,
        p3,
        oklab,
        alpha: clamp01(alpha),
    };
}

function isNoneToken(token: string): boolean {
    return token.toLowerCase() === "none";
}

function parseNumberToken(token: string, allowNone: boolean): number | null {
    if (allowNone && isNoneToken(token)) return 0;
    if (!NUMBER_RE.test(token)) return null;
    const value = Number(token);
    return Number.isFinite(value) ? value : null;
}

function parsePercentToken(token: string, allowNone: boolean): number | null {
    if (allowNone && isNoneToken(token)) return 0;
    const match = PERCENT_RE.exec(token);
    if (!match?.[1]) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
}

function parseNumberOrPercent(token: string, percentScale: number, allowNone: boolean): { value: number; isPercent: boolean } | null {
    if (allowNone && isNoneToken(token)) {
        return { value: 0, isPercent: false };
    }
    const pct = parsePercentToken(token, false);
    if (pct !== null) {
        return { value: (pct / 100) * percentScale, isPercent: true };
    }
    const num = parseNumberToken(token, false);
    if (num !== null) {
        return { value: num, isPercent: false };
    }
    return null;
}

function parseAngleToken(token: string, allowNone: boolean): number | null {
    if (allowNone && isNoneToken(token)) return 0;
    const match = ANGLE_RE.exec(token);
    if (!match?.[1]) return null;
    const num = Number(match[1]);
    if (!Number.isFinite(num)) return null;
    const unit = (match[2] ?? "deg").toLowerCase();
    switch (unit) {
        case "deg": {
            return normalizeHue(num);
        }
        case "rad": {
            return normalizeHue((num * 180) / Math.PI);
        }
        case "grad": {
            return normalizeHue(num * 0.9);
        }
        case "turn": {
            return normalizeHue(num * 360);
        }
        default: {
            return null;
        }
    }
}

function parseAlphaToken(token: string, allowNone: boolean): number | null {
    const parsed = parseNumberOrPercent(token, 1, allowNone);
    if (!parsed) return null;
    return clamp01(parsed.value);
}

interface ParsedFnBody {
    args: string[];
    alphaToken: string | null;
    isComma: boolean;
}

function splitFunctionalBody(body: string): ParsedFnBody | null {
    const trimmed = body.trim();
    if (!trimmed) return null;

    if (trimmed.includes(",")) {
        if (trimmed.includes("/")) return null;
        const parts = trimmed.split(",").map((part) => part.trim());
        if (parts.some((part) => part.length === 0)) return null;
        return { args: parts, alphaToken: null, isComma: true };
    }

    const slashIdx = trimmed.indexOf("/");
    if (slashIdx !== -1) {
        if (trimmed.slice(slashIdx + 1).includes("/")) return null;
        const left = trimmed.slice(0, slashIdx).trim();
        const right = trimmed.slice(slashIdx + 1).trim();
        if (!left || !right || /\s/.test(right)) return null;
        const args = left.split(/\s+/);
        return { args, alphaToken: right, isComma: false };
    }

    const args = trimmed.split(/\s+/);
    return { args, alphaToken: null, isComma: false };
}

function parseHexColor(trimmed: string): ParsedColor | null {
    const hex = trimmed.slice(1);
    if (!/^[\da-f]+$/i.test(hex)) return null;

    if (hex.length === 3 || hex.length === 4) {
        const r = Number.parseInt((hex[0] ?? "0") + (hex[0] ?? "0"), 16) / 255;
        const g = Number.parseInt((hex[1] ?? "0") + (hex[1] ?? "0"), 16) / 255;
        const b = Number.parseInt((hex[2] ?? "0") + (hex[2] ?? "0"), 16) / 255;
        const a = hex.length === 4 ? Number.parseInt((hex[3] ?? "f") + (hex[3] ?? "f"), 16) / 255 : 1;
        return buildParsedColorFromSrgb([r, g, b], a, "srgb", hex.length === 4 ? "hex8" : "hex");
    }

    if (hex.length === 6 || hex.length === 8) {
        const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
        const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
        const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
        const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return buildParsedColorFromSrgb([r, g, b], a, "srgb", hex.length === 8 ? "hex8" : "hex");
    }

    return null;
}

function parseRgbFn(body: string): ParsedColor | null {
    const split = splitFunctionalBody(body);
    if (!split) return null;

    const allowNone = !split.isComma;
    let alpha = 1;
    let channelTokens = split.args;

    if (split.isComma) {
        if (channelTokens.length === 4) {
            const aToken = channelTokens[3];
            if (aToken === undefined) return null;
            const parsedAlpha = parseAlphaToken(aToken, false);
            if (parsedAlpha === null) return null;
            alpha = parsedAlpha;
            channelTokens = channelTokens.slice(0, 3);
        } else if (channelTokens.length !== 3) {
            return null;
        }
    } else {
        if (channelTokens.length !== 3) return null;
        if (split.alphaToken !== null) {
            const parsedAlpha = parseAlphaToken(split.alphaToken, true);
            if (parsedAlpha === null) return null;
            alpha = parsedAlpha;
        }
    }

    const t0 = channelTokens[0];
    const t1 = channelTokens[1];
    const t2 = channelTokens[2];
    if (t0 === undefined || t1 === undefined || t2 === undefined) return null;

    const c0 = parseNumberOrPercent(t0, 255, allowNone);
    const c1 = parseNumberOrPercent(t1, 255, allowNone);
    const c2 = parseNumberOrPercent(t2, 255, allowNone);
    if (!c0 || !c1 || !c2) return null;

    // Legacy comma syntax forbids mixing numbers and percentages
    if (split.isComma && (c0.isPercent !== c1.isPercent || c1.isPercent !== c2.isPercent)) {
        return null;
    }

    return buildParsedColorFromSrgb([c0.value / 255, c1.value / 255, c2.value / 255], alpha, "srgb", "rgb");
}

function parseHslFn(body: string): ParsedColor | null {
    const split = splitFunctionalBody(body);
    if (!split) return null;

    const allowNone = !split.isComma;
    let alpha = 1;
    let channelTokens = split.args;

    if (split.isComma) {
        if (channelTokens.length === 4) {
            const aToken = channelTokens[3];
            if (aToken === undefined) return null;
            const parsedAlpha = parseAlphaToken(aToken, false);
            if (parsedAlpha === null) return null;
            alpha = parsedAlpha;
            channelTokens = channelTokens.slice(0, 3);
        } else if (channelTokens.length !== 3) {
            return null;
        }
    } else {
        if (channelTokens.length !== 3) return null;
        if (split.alphaToken !== null) {
            const parsedAlpha = parseAlphaToken(split.alphaToken, true);
            if (parsedAlpha === null) return null;
            alpha = parsedAlpha;
        }
    }

    const t0 = channelTokens[0];
    const t1 = channelTokens[1];
    const t2 = channelTokens[2];
    if (t0 === undefined || t1 === undefined || t2 === undefined) return null;

    const h = parseAngleToken(t0, allowNone);
    const s = split.isComma ? parsePercentToken(t1, false) : parseNumberOrPercent(t1, 100, allowNone)?.value ?? null;
    const l = split.isComma ? parsePercentToken(t2, false) : parseNumberOrPercent(t2, 100, allowNone)?.value ?? null;
    if (h === null || s === null || l === null) return null;

    const rgb = hslToSrgb(h, s, l);
    return buildParsedColorFromSrgb(rgb, alpha, "hsl", "hsl");
}

function parseHwbFn(body: string): ParsedColor | null {
    const split = splitFunctionalBody(body);
    if (!split || split.isComma || split.args.length !== 3) return null;

    const t0 = split.args[0];
    const t1 = split.args[1];
    const t2 = split.args[2];
    if (t0 === undefined || t1 === undefined || t2 === undefined) return null;

    const h = parseAngleToken(t0, true);
    const w = parseNumberOrPercent(t1, 100, true)?.value ?? null;
    const b = parseNumberOrPercent(t2, 100, true)?.value ?? null;
    if (h === null || w === null || b === null) return null;

    let alpha = 1;
    if (split.alphaToken !== null) {
        const parsedAlpha = parseAlphaToken(split.alphaToken, true);
        if (parsedAlpha === null) return null;
        alpha = parsedAlpha;
    }

    const rgb = hwbToSrgb(h, w, b);
    return buildParsedColorFromSrgb(rgb, alpha, "srgb", "rgb");
}

function parseOklabFn(body: string): ParsedColor | null {
    const split = splitFunctionalBody(body);
    if (!split || split.isComma || split.args.length !== 3) return null;

    const t0 = split.args[0];
    const t1 = split.args[1];
    const t2 = split.args[2];
    if (t0 === undefined || t1 === undefined || t2 === undefined) return null;

    const lParsed = parseNumberOrPercent(t0, 1, true);
    const aParsed = parseNumberOrPercent(t1, 0.4, true);
    const bParsed = parseNumberOrPercent(t2, 0.4, true);
    if (!lParsed || !aParsed || !bParsed) return null;

    let alpha = 1;
    if (split.alphaToken !== null) {
        const parsedAlpha = parseAlphaToken(split.alphaToken, true);
        if (parsedAlpha === null) return null;
        alpha = parsedAlpha;
    }

    const l = clamp01(lParsed.value);
    return buildParsedColorFromOklab([l, aParsed.value, bParsed.value], alpha, "oklab", "oklch");
}

function parseOklchFn(body: string): ParsedColor | null {
    const split = splitFunctionalBody(body);
    if (!split || split.isComma || split.args.length !== 3) return null;

    const t0 = split.args[0];
    const t1 = split.args[1];
    const t2 = split.args[2];
    if (t0 === undefined || t1 === undefined || t2 === undefined) return null;

    const lParsed = parseNumberOrPercent(t0, 1, true);
    const cParsed = parseNumberOrPercent(t1, 0.4, true);
    const h = parseAngleToken(t2, true);
    if (!lParsed || !cParsed || h === null) return null;

    let alpha = 1;
    if (split.alphaToken !== null) {
        const parsedAlpha = parseAlphaToken(split.alphaToken, true);
        if (parsedAlpha === null) return null;
        alpha = parsedAlpha;
    }

    const l = clamp01(lParsed.value);
    const c = Math.max(0, cParsed.value);
    const oklab = oklchToOklab([l, c, h]);
    return buildParsedColorFromOklab(oklab, alpha, "oklch", "oklch");
}

function parseColorFn(body: string): ParsedColor | null {
    const split = splitFunctionalBody(body);
    if (!split || split.isComma || split.args.length !== 4) return null;

    const csToken = split.args[0];
    const t0 = split.args[1];
    const t1 = split.args[2];
    const t2 = split.args[3];
    if (csToken === undefined || t0 === undefined || t1 === undefined || t2 === undefined) return null;

    const spaceName = csToken.toLowerCase();
    if (spaceName !== "srgb" && spaceName !== "display-p3") return null;

    const c0 = parseNumberOrPercent(t0, 1, true);
    const c1 = parseNumberOrPercent(t1, 1, true);
    const c2 = parseNumberOrPercent(t2, 1, true);
    if (!c0 || !c1 || !c2) return null;

    let alpha = 1;
    if (split.alphaToken !== null) {
        const parsedAlpha = parseAlphaToken(split.alphaToken, true);
        if (parsedAlpha === null) return null;
        alpha = parsedAlpha;
    }

    const tuple: Vec3 = [c0.value, c1.value, c2.value];
    if (spaceName === "display-p3") {
        return buildParsedColorFromP3(tuple, alpha, "p3", "p3");
    }
    return buildParsedColorFromSrgb(tuple, alpha, "srgb", "rgb");
}

export function parseCssColor(input: string): ParsedColor | null {
    if (typeof input !== "string") return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("#")) {
        return parseHexColor(trimmed);
    }

    const lower = trimmed.toLowerCase();
    if (Object.hasOwn(CSS_NAMED_COLORS, lower)) {
        const named = CSS_NAMED_COLORS[lower];
        if (named) {
            return buildParsedColorFromSrgb([named[0] / 255, named[1] / 255, named[2] / 255], named[3], "srgb", "hex");
        }
    }

    const openIdx = lower.indexOf("(");
    if (openIdx <= 0 || !lower.endsWith(")")) return null;

    const fnName = lower.slice(0, openIdx);
    const body = trimmed.slice(openIdx + 1, -1);

    switch (fnName) {
        case "rgb":
        case "rgba": {
            return parseRgbFn(body);
        }
        case "hsl":
        case "hsla": {
            return parseHslFn(body);
        }
        case "hwb": {
            return parseHwbFn(body);
        }
        case "oklab": {
            return parseOklabFn(body);
        }
        case "oklch": {
            return parseOklchFn(body);
        }
        case "color": {
            return parseColorFn(body);
        }
        default: {
            return null;
        }
    }
}

export function isParsedInGamut(parsed: ParsedColor, gamut: ColorGamut): boolean {
    const channels = gamut === "p3" ? parsed.p3 : parsed.rgb;
    return (
        channels[0] >= -GAMUT_EPSILON &&
        channels[0] <= 1 + GAMUT_EPSILON &&
        channels[1] >= -GAMUT_EPSILON &&
        channels[1] <= 1 + GAMUT_EPSILON &&
        channels[2] >= -GAMUT_EPSILON &&
        channels[2] <= 1 + GAMUT_EPSILON
    );
}

function isStrictUnitCube(channels: Vec3): boolean {
    return (
        channels[0] >= 0 &&
        channels[0] <= 1 &&
        channels[1] >= 0 &&
        channels[1] <= 1 &&
        channels[2] >= 0 &&
        channels[2] <= 1
    );
}

export function clampParsedToGamut(parsed: ParsedColor, gamut: ColorGamut): ParsedColor {
    if (isParsedInGamut(parsed, gamut)) {
        if (gamut === "p3") {
            const clampedP3: Vec3 = [clamp01(parsed.p3[0]), clamp01(parsed.p3[1]), clamp01(parsed.p3[2])];
            if (
                clampedP3[0] === parsed.p3[0] &&
                clampedP3[1] === parsed.p3[1] &&
                clampedP3[2] === parsed.p3[2]
            ) {
                return parsed;
            }
            return buildParsedColorFromP3(clampedP3, parsed.alpha, parsed.space, parsed.sourceFormat);
        }
        const clampedRgb: Vec3 = [clamp01(parsed.rgb[0]), clamp01(parsed.rgb[1]), clamp01(parsed.rgb[2])];
        if (
            clampedRgb[0] === parsed.rgb[0] &&
            clampedRgb[1] === parsed.rgb[1] &&
            clampedRgb[2] === parsed.rgb[2]
        ) {
            return parsed;
        }
        return buildParsedColorFromSrgb(clampedRgb, parsed.alpha, parsed.space, parsed.sourceFormat);
    }

    const [l, a, b] = parsed.oklab;
    if (l >= 1) {
        return gamut === "p3"
            ? buildParsedColorFromP3([1, 1, 1], parsed.alpha, parsed.space, parsed.sourceFormat)
            : buildParsedColorFromSrgb([1, 1, 1], parsed.alpha, parsed.space, parsed.sourceFormat);
    }
    if (l <= 0) {
        return gamut === "p3"
            ? buildParsedColorFromP3([0, 0, 0], parsed.alpha, parsed.space, parsed.sourceFormat)
            : buildParsedColorFromSrgb([0, 0, 0], parsed.alpha, parsed.space, parsed.sourceFormat);
    }

    const cMax = Math.hypot(a, b);
    if (cMax <= ACHROMATIC_EPSILON) {
        const gray = linearToSrgb(oklabToLinearSrgb([l, 0, 0])[0]);
        const clampedGray = clamp01(gray);
        return gamut === "p3"
            ? buildParsedColorFromP3([clampedGray, clampedGray, clampedGray], parsed.alpha, parsed.space, parsed.sourceFormat)
            : buildParsedColorFromSrgb([clampedGray, clampedGray, clampedGray], parsed.alpha, parsed.space, parsed.sourceFormat);
    }

    const cosH = a / cMax;
    const sinH = b / cMax;

    // Binary search OKLCH chroma in [0, cMax] with L and H held fixed per CSS Color Level 4
    let low = 0;
    let high = cMax;
    for (let i = 0; i < 28; i += 1) {
        const mid = (low + high) / 2;
        const candidateLab: Vec3 = [l, mid * cosH, mid * sinH];
        const linearSrgb = oklabToLinearSrgb(candidateLab);
        const targetChannels = linearTupleToSrgb(gamut === "p3" ? linearSrgbToLinearP3(linearSrgb) : linearSrgb);

        if (isStrictUnitCube(targetChannels)) {
            low = mid;
        } else {
            high = mid;
        }
    }

    const mappedLab: Vec3 = [l, low * cosH, low * sinH];
    const mappedSrgb = oklabToLinearSrgb(mappedLab);
    if (gamut === "p3") {
        const rawP3 = linearTupleToSrgb(linearSrgbToLinearP3(mappedSrgb));
        const clampedP3: Vec3 = [clamp01(rawP3[0]), clamp01(rawP3[1]), clamp01(rawP3[2])];
        return buildParsedColorFromP3(clampedP3, parsed.alpha, parsed.space, parsed.sourceFormat);
    }

    const rawRgb = linearTupleToSrgb(mappedSrgb);
    const clampedRgb: Vec3 = [clamp01(rawRgb[0]), clamp01(rawRgb[1]), clamp01(rawRgb[2])];
    return buildParsedColorFromSrgb(clampedRgb, parsed.alpha, parsed.space, parsed.sourceFormat);
}

function formatNumber(value: number, precision: number): string {
    const p = clamp(Math.round(precision), 0, 10);
    const factor = 10 ** p;
    const rounded = normalizeZero(Math.round(value * factor) / factor);
    if (p === 0) {
        return String(rounded);
    }
    const fixed = rounded.toFixed(p);
    // Strip trailing decimal zeros without producing scientific notation
    return fixed.replace(/\.?0+$/, "");
}

function toHexByte(channel01: number): string {
    const byte = clamp(Math.round(channel01 * 255), 0, 255);
    return byte.toString(16).padStart(2, "0");
}

function shouldEmitAlpha(alpha: number, mode: ColorAlphaFormat, isHex8: boolean): boolean {
    if (mode === "never") return false;
    if (mode === "always") return true;
    if (isHex8) return true;
    return alpha < 1 - 1e-6;
}

const SRGB_BOUNDED_FORMATS = new Set<ConcreteColorFormat>(["hex", "hex8", "rgb", "hsl"]);

export function formatParsedColor(
    parsed: ParsedColor,
    format?: ConcreteColorFormat,
    options?: FormatColorOptions
): string {
    const targetFormat = format ?? parsed.sourceFormat;
    const alphaMode: ColorAlphaFormat = options?.alpha ?? "auto";
    const explicitPrecision = options?.precision;

    let working = options?.gamut ? clampParsedToGamut(parsed, options.gamut) : parsed;

    if (SRGB_BOUNDED_FORMATS.has(targetFormat) && !isParsedInGamut(working, "srgb")) {
        working = clampParsedToGamut(working, "srgb");
    } else if (targetFormat === "p3" && !isParsedInGamut(working, "p3")) {
        working = clampParsedToGamut(working, "p3");
    }

    const alphaPrecision = explicitPrecision ?? 3;
    const emitAlpha = shouldEmitAlpha(working.alpha, alphaMode, targetFormat === "hex8");
    const alphaSuffix = emitAlpha ? ` / ${formatNumber(working.alpha, alphaPrecision)}` : "";

    switch (targetFormat) {
        case "hex":
        case "hex8": {
            const r = toHexByte(working.rgb[0]);
            const g = toHexByte(working.rgb[1]);
            const b = toHexByte(working.rgb[2]);
            if (emitAlpha) {
                const a = toHexByte(working.alpha);
                return `#${r}${g}${b}${a}`;
            }
            return `#${r}${g}${b}`;
        }
        case "rgb": {
            const p = explicitPrecision ?? 0;
            const r = formatNumber(clamp01(working.rgb[0]) * 255, p);
            const g = formatNumber(clamp01(working.rgb[1]) * 255, p);
            const b = formatNumber(clamp01(working.rgb[2]) * 255, p);
            return `rgb(${r} ${g} ${b}${alphaSuffix})`;
        }
        case "hsl": {
            const p = explicitPrecision ?? 1;
            const [h, s, l] = srgbToHsl([
                clamp01(working.rgb[0]),
                clamp01(working.rgb[1]),
                clamp01(working.rgb[2]),
            ]);
            return `hsl(${formatNumber(h, p)} ${formatNumber(s, p)}% ${formatNumber(l, p)}%${alphaSuffix})`;
        }
        case "oklch": {
            const lcPrecision = explicitPrecision ?? 4;
            const hPrecision = explicitPrecision ?? 2;
            const [l, c, h] = oklabToOklch(working.oklab);
            return `oklch(${formatNumber(clamp01(l), lcPrecision)} ${formatNumber(Math.max(0, c), lcPrecision)} ${formatNumber(h, hPrecision)}${alphaSuffix})`;
        }
        case "p3": {
            const p = explicitPrecision ?? 4;
            const r = formatNumber(clamp01(working.p3[0]), p);
            const g = formatNumber(clamp01(working.p3[1]), p);
            const b = formatNumber(clamp01(working.p3[2]), p);
            return `color(display-p3 ${r} ${g} ${b}${alphaSuffix})`;
        }
    }
}

export function computeRelativeLuminance(rgb: Vec3): number {
    const r = srgbToLinear(clamp01(rgb[0]));
    const g = srgbToLinear(clamp01(rgb[1]));
    const b = srgbToLinear(clamp01(rgb[2]));
    return clamp01(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

export function computeContrastRatio(fg: ParsedColor, bg: ParsedColor): number {
    const bgAlpha = bg.alpha;
    const flatBg: Vec3 = [
        clamp01(bg.rgb[0]) * bgAlpha + (1 - bgAlpha),
        clamp01(bg.rgb[1]) * bgAlpha + (1 - bgAlpha),
        clamp01(bg.rgb[2]) * bgAlpha + (1 - bgAlpha),
    ];

    const fgAlpha = fg.alpha;
    const flatFg: Vec3 =
        fgAlpha < 1
            ? [
                  clamp01(fg.rgb[0]) * fgAlpha + flatBg[0] * (1 - fgAlpha),
                  clamp01(fg.rgb[1]) * fgAlpha + flatBg[1] * (1 - fgAlpha),
                  clamp01(fg.rgb[2]) * fgAlpha + flatBg[2] * (1 - fgAlpha),
              ]
            : [clamp01(fg.rgb[0]), clamp01(fg.rgb[1]), clamp01(fg.rgb[2])];

    const lumFg = computeRelativeLuminance(flatFg);
    const lumBg = computeRelativeLuminance(flatBg);
    const lighter = Math.max(lumFg, lumBg);
    const darker = Math.min(lumFg, lumBg);
    return (lighter + 0.05) / (darker + 0.05);
}
