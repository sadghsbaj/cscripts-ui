import {
    ACHROMATIC_EPSILON,
    buildParsedColorFromOklab,
    buildParsedColorFromSrgb,
    clamp,
    clamp01,
    clampParsedToGamut,
    formatParsedColor,
    hslToSrgb,
    hsvToSrgb,
    isParsedInGamut,
    oklabToOklch,
    oklchToOklab,
    parseCssColor,
    srgbToHsl,
    srgbToHsv,
    type Vec3,
} from "./color-math.internal.ts";
import type {
    ColorAlphaFormat,
    ColorChannel,
    ColorFormat,
    ColorGamut,
    ConcreteColorFormat,
    ParsedColor,
} from "./color.utils.ts";

export interface ColorChannelSnapshot {
    readonly hsv: { h: number; s: number; v: number };
    readonly hsl: { h: number; s: number; l: number };
    readonly oklch: { l: number; c: number; h: number };
    readonly rgb: { r: number; g: number; b: number };
    readonly p3: { r: number; g: number; b: number };
    readonly alpha: number;
}

export interface ColorChannelMutationOptions {
    /** When `true`, fires `onCommit` with the updated formatted value. */
    commit?: boolean;
}

export interface CreateColorStateOptions {
    value?: () => string | undefined;
    setValue?: (next: string) => void;
    defaultValue?: string;
    format?: () => ColorFormat | undefined;
    alphaFormat?: () => ColorAlphaFormat | undefined;
    gamut?: () => ColorGamut | undefined;
    onValueChange?: (value: string) => void;
    onCommit?: (value: string) => void;
}

interface EffectiveState {
    parsed: ParsedColor;
    snapshot: ColorChannelSnapshot;
    sourceFormat: ConcreteColorFormat;
}

const DEFAULT_COLOR_STRING = "#000000";
const FALLBACK_PARSED: ParsedColor = buildParsedColorFromSrgb([0, 0, 0], 1, "srgb", "hex");

function createEmptySnapshot(): ColorChannelSnapshot {
    return {
        hsv: { h: 0, s: 0, v: 0 },
        hsl: { h: 0, s: 0, l: 0 },
        oklch: { l: 0, c: 0, h: 0 },
        rgb: { r: 0, g: 0, b: 0 },
        p3: { r: 0, g: 0, b: 0 },
        alpha: 1,
    };
}

function buildSnapshotFromParsed(parsed: ParsedColor, prev?: ColorChannelSnapshot): ColorChannelSnapshot {
    const fallback = prev ?? createEmptySnapshot();
    const srgbInGamut = isParsedInGamut(parsed, "srgb") ? parsed : clampParsedToGamut(parsed, "srgb");
    const srgb01: Vec3 = [
        clamp01(srgbInGamut.rgb[0]),
        clamp01(srgbInGamut.rgb[1]),
        clamp01(srgbInGamut.rgb[2]),
    ];

    const [hsvH, hsvS, hsvV] = srgbToHsv(srgb01);
    const isHsvBlack = hsvV <= 1e-5;
    const isHsvAchromatic = hsvS <= 1e-5;

    const [hslH, hslS, hslL] = srgbToHsl(srgb01);
    const isHslExtreme = hslL <= 1e-5 || hslL >= 100 - 1e-5;
    const isHslAchromatic = hslS <= 1e-5;

    const [oklchL, oklchC, oklchH] = oklabToOklch(parsed.oklab);
    const isOklchAchromatic = oklchC <= ACHROMATIC_EPSILON;

    return {
        hsv: {
            h: isHsvBlack || isHsvAchromatic ? fallback.hsv.h : hsvH,
            s: isHsvBlack ? fallback.hsv.s : hsvS,
            v: hsvV,
        },
        hsl: {
            h: isHslExtreme || isHslAchromatic ? fallback.hsl.h : hslH,
            s: isHslExtreme ? fallback.hsl.s : hslS,
            l: hslL,
        },
        oklch: {
            l: clamp01(oklchL),
            c: Math.max(0, oklchC),
            h: isOklchAchromatic ? fallback.oklch.h : oklchH,
        },
        rgb: {
            r: clamp(parsed.rgb[0] * 255, 0, 255),
            g: clamp(parsed.rgb[1] * 255, 0, 255),
            b: clamp(parsed.rgb[2] * 255, 0, 255),
        },
        p3: {
            r: parsed.p3[0],
            g: parsed.p3[1],
            b: parsed.p3[2],
        },
        alpha: parsed.alpha,
    };
}

function cloneSnapshot(snapshot: ColorChannelSnapshot): ColorChannelSnapshot {
    return {
        hsv: { ...snapshot.hsv },
        hsl: { ...snapshot.hsl },
        oklch: { ...snapshot.oklch },
        rgb: { ...snapshot.rgb },
        p3: { ...snapshot.p3 },
        alpha: snapshot.alpha,
    };
}

type ColorModelGroup = "oklch" | "hsl" | "hsv" | "rgb";

const HSL_AXIS_CHANNELS = new Set<ColorChannel>(["hsl-saturation", "lightness"]);
const HSV_AXIS_CHANNELS = new Set<ColorChannel>(["saturation", "value"]);
const RGB_CHANNELS = new Set<ColorChannel>(["red", "green", "blue"]);
const OKLCH_CHANNELS = new Set<ColorChannel>(["oklch-lightness", "chroma", "oklch-hue"]);

function resolveModelGroups(keys: readonly ColorChannel[]): ColorModelGroup[] {
    const hasHslAxis = keys.some((k) => HSL_AXIS_CHANNELS.has(k));
    const hasHsvAxis = keys.some((k) => HSV_AXIS_CHANNELS.has(k));
    const hueGroup: ColorModelGroup = hasHslAxis && !hasHsvAxis ? "hsl" : "hsv";

    const groups: ColorModelGroup[] = [];
    for (const key of keys) {
        if (key === "alpha") continue;
        let group: ColorModelGroup;
        if (OKLCH_CHANNELS.has(key)) {
            group = "oklch";
        } else if (HSL_AXIS_CHANNELS.has(key)) {
            group = "hsl";
        } else if (HSV_AXIS_CHANNELS.has(key)) {
            group = "hsv";
        } else if (RGB_CHANNELS.has(key)) {
            group = "rgb";
        } else {
            group = hueGroup;
        }
        if (!groups.includes(group)) {
            groups.push(group);
        }
    }
    return groups;
}

function applyModelGroup(
    group: ColorModelGroup,
    currentParsed: ParsedColor,
    currentSnapshot: ColorChannelSnapshot,
    finitePartial: Partial<Record<ColorChannel, number>>,
    sourceFormat: ConcreteColorFormat,
    gamut: ColorGamut | undefined
): { parsed: ParsedColor; snapshot: ColorChannelSnapshot } {
    switch (group) {
        case "oklch": {
            const l = clamp01(finitePartial["oklch-lightness"] ?? currentSnapshot.oklch.l);
            const c = Math.max(0, finitePartial.chroma ?? currentSnapshot.oklch.c);
            const h = clamp(finitePartial["oklch-hue"] ?? currentSnapshot.oklch.h, 0, 360);

            const lab = oklchToOklab([l, c, h]);
            let candidate = buildParsedColorFromOklab(lab, currentSnapshot.alpha, currentParsed.space, sourceFormat);
            if (gamut) {
                candidate = clampParsedToGamut(candidate, gamut);
            }

            const derived = buildSnapshotFromParsed(candidate, currentSnapshot);
            derived.oklch.l = l;
            derived.oklch.h = h;
            if (!gamut) {
                derived.oklch.c = c;
            }
            return { parsed: candidate, snapshot: derived };
        }
        case "hsl": {
            const h = clamp(finitePartial.hue ?? currentSnapshot.hsl.h, 0, 360);
            const s = clamp(finitePartial["hsl-saturation"] ?? currentSnapshot.hsl.s, 0, 100);
            const l = clamp(finitePartial.lightness ?? currentSnapshot.hsl.l, 0, 100);

            const rgb01 = hslToSrgb(h, s, l);
            let candidate = buildParsedColorFromSrgb(rgb01, currentSnapshot.alpha, currentParsed.space, sourceFormat);
            if (gamut) {
                candidate = clampParsedToGamut(candidate, gamut);
            }

            const derived = buildSnapshotFromParsed(candidate, currentSnapshot);
            derived.hsl.h = h;
            derived.hsl.s = s;
            derived.hsl.l = l;
            derived.hsv.h = h;
            return { parsed: candidate, snapshot: derived };
        }
        case "hsv": {
            const h = clamp(finitePartial.hue ?? currentSnapshot.hsv.h, 0, 360);
            const s = clamp(finitePartial.saturation ?? currentSnapshot.hsv.s, 0, 100);
            const v = clamp(finitePartial.value ?? currentSnapshot.hsv.v, 0, 100);

            const rgb01 = hsvToSrgb(h, s, v);
            let candidate = buildParsedColorFromSrgb(rgb01, currentSnapshot.alpha, currentParsed.space, sourceFormat);
            if (gamut) {
                candidate = clampParsedToGamut(candidate, gamut);
            }

            const derived = buildSnapshotFromParsed(candidate, currentSnapshot);
            derived.hsv.h = h;
            derived.hsv.s = s;
            derived.hsv.v = v;
            derived.hsl.h = h;
            return { parsed: candidate, snapshot: derived };
        }
        case "rgb": {
            const r = clamp(finitePartial.red ?? currentSnapshot.rgb.r, 0, 255);
            const g = clamp(finitePartial.green ?? currentSnapshot.rgb.g, 0, 255);
            const b = clamp(finitePartial.blue ?? currentSnapshot.rgb.b, 0, 255);

            let candidate = buildParsedColorFromSrgb(
                [r / 255, g / 255, b / 255],
                currentSnapshot.alpha,
                currentParsed.space,
                sourceFormat
            );
            if (gamut) {
                candidate = clampParsedToGamut(candidate, gamut);
            }

            const derived = buildSnapshotFromParsed(candidate, currentSnapshot);
            derived.rgb.r = r;
            derived.rgb.g = g;
            derived.rgb.b = b;
            return { parsed: candidate, snapshot: derived };
        }
    }
}

/**
 * Reactive dual-layer color state for Svelte 5 components and standalone usage.
 * Preserves editing-space polar channels (`hsv`, `hsl`, `oklch`) across zero-saturation,
 * zero-value, zero-chroma, and zero-alpha edits.
 */
export class ColorState {
    readonly #options: CreateColorStateOptions;
    #parsed = $state<ParsedColor>(FALLBACK_PARSED);
    #snapshot = $state<ColorChannelSnapshot>(createEmptySnapshot());
    #sourceFormat = $state<ConcreteColorFormat>("hex");
    #lastSyncedExternal: string | undefined;
    #lastObservedExternal: string | undefined;
    #lastEmittedValue = "";
    #hasUncommittedChange = false;

    constructor(options: CreateColorStateOptions = {}) {
        this.#options = options;

        const external = options.value?.();
        const initialRaw = external ?? options.defaultValue ?? DEFAULT_COLOR_STRING;
        const parsed = parseCssColor(initialRaw) ?? parseCssColor(options.defaultValue ?? DEFAULT_COLOR_STRING) ?? FALLBACK_PARSED;

        const gamut = options.gamut?.();
        const initialParsed = gamut ? clampParsedToGamut(parsed, gamut) : parsed;

        this.#parsed = initialParsed;
        this.#sourceFormat = initialParsed.sourceFormat;
        this.#snapshot = buildSnapshotFromParsed(initialParsed);
        this.#lastSyncedExternal = external;
        this.#lastObservedExternal = external;
        this.#lastEmittedValue = this.#formatParsed(initialParsed, this.#resolveFormat(initialParsed.sourceFormat));
    }

    get value(): string {
        const effective = this.#resolveEffective();
        const format = this.#resolveFormat(effective.sourceFormat);
        return this.#formatParsed(effective.parsed, format);
    }

    get parsed(): ParsedColor {
        return this.#resolveEffective().parsed;
    }

    get channels(): ColorChannelSnapshot {
        return this.#resolveEffective().snapshot;
    }

    get resolvedFormat(): ConcreteColorFormat {
        const effective = this.#resolveEffective();
        return this.#resolveFormat(effective.sourceFormat);
    }

    get inGamut(): boolean {
        const targetGamut = this.#options.gamut?.() ?? "srgb";
        return isParsedInGamut(this.parsed, targetGamut);
    }

    /**
     * Returns the current numeric value for a single channel in its canonical unit range.
     */
    getChannel(channel: ColorChannel): number {
        const ch = this.channels;
        switch (channel) {
            case "hue": {
                return ch.hsv.h;
            }
            case "saturation": {
                return ch.hsv.s;
            }
            case "value": {
                return ch.hsv.v;
            }
            case "hsl-saturation": {
                return ch.hsl.s;
            }
            case "lightness": {
                return ch.hsl.l;
            }
            case "red": {
                return ch.rgb.r;
            }
            case "green": {
                return ch.rgb.g;
            }
            case "blue": {
                return ch.rgb.b;
            }
            case "oklch-lightness": {
                return ch.oklch.l;
            }
            case "chroma": {
                return ch.oklch.c;
            }
            case "oklch-hue": {
                return ch.oklch.h;
            }
            case "alpha": {
                return ch.alpha;
            }
        }
    }

    /**
     * Mutates a single color channel while preserving achromatic hue/saturation axes in other spaces.
     */
    setChannel(channel: ColorChannel, next: number, options?: ColorChannelMutationOptions): void {
        if (!Number.isFinite(next)) return;
        this.setChannels({ [channel]: next }, options);
    }

    /**
     * Mutates one or more channels atomically while preserving hidden axes across achromatic transitions.
     */
    setChannels(partial: Partial<Record<ColorChannel, number>>, options?: ColorChannelMutationOptions): void {
        this.#syncExternal();

        const finitePartial: Partial<Record<ColorChannel, number>> = {};
        const keys: ColorChannel[] = [];
        for (const [key, val] of Object.entries(partial) as [ColorChannel, unknown][]) {
            if (typeof val !== "number" || !Number.isFinite(val)) continue;
            finitePartial[key] = val;
            keys.push(key);
        }

        if (keys.length === 0) {
            if (options?.commit) this.commit();
            return;
        }

        const prev = this.#snapshot;
        let nextAlpha = prev.alpha;
        let workingParsed = this.#parsed;

        if (finitePartial.alpha !== undefined) {
            nextAlpha = clamp01(finitePartial.alpha);
            workingParsed = {
                ...workingParsed,
                alpha: nextAlpha,
            };
        }

        let workingSnapshot: ColorChannelSnapshot = {
            ...cloneSnapshot(prev),
            alpha: nextAlpha,
        };

        const gamut = this.#options.gamut?.();
        const modelGroups = resolveModelGroups(keys);

        for (const group of modelGroups) {
            const result = applyModelGroup(
                group,
                workingParsed,
                workingSnapshot,
                finitePartial,
                this.#sourceFormat,
                gamut
            );
            workingParsed = result.parsed;
            workingSnapshot = result.snapshot;
        }

        this.#applyState(workingParsed, workingSnapshot, this.#sourceFormat, options);
    }

    /**
     * Parses a CSS color string and applies it if valid; returns `false` without mutating on invalid input.
     */
    setString(raw: string, options?: ColorChannelMutationOptions): boolean {
        this.#syncExternal();

        const parsed = parseCssColor(raw);
        if (!parsed) return false;

        const gamut = this.#options.gamut?.();
        const nextParsed = gamut ? clampParsedToGamut(parsed, gamut) : parsed;
        const nextSnapshot = buildSnapshotFromParsed(nextParsed, this.#snapshot);
        const nextSourceFormat = nextParsed.sourceFormat;

        this.#applyState(nextParsed, nextSnapshot, nextSourceFormat, options);
        return true;
    }

    /**
     * Flushes any pending uncommitted edits and fires `onCommit` once.
     */
    commit(): void {
        this.#syncExternal();
        if (!this.#hasUncommittedChange) return;

        this.#hasUncommittedChange = false;
        const current = this.#formatParsed(this.#parsed, this.#resolveFormat(this.#sourceFormat));
        this.#lastEmittedValue = current;
        this.#options.onCommit?.(current);
        const postCommitExt = this.#options.value?.();
        if (postCommitExt !== undefined && postCommitExt !== current) {
            this.#syncExternalTo(postCommitExt);
        }
    }

    /**
     * Synchronizes any pending external `value()` change into internal state.
     */
    sync(): void {
        this.#syncExternal();
    }

    #resolveFormat(sourceFormat: ConcreteColorFormat): ConcreteColorFormat {
        const formatOpt = this.#options.format?.();
        if (!formatOpt || formatOpt === "auto") {
            return sourceFormat;
        }
        return formatOpt;
    }

    #formatParsed(parsed: ParsedColor, format: ConcreteColorFormat): string {
        return formatParsedColor(parsed, format, {
            alpha: this.#options.alphaFormat?.(),
            gamut: this.#options.gamut?.(),
        });
    }

    #resolveEffective(): EffectiveState {
        const external = this.#options.value?.();
        if (external !== undefined && external !== this.#lastSyncedExternal) {
            const parsedExternal = parseCssColor(external);
            if (parsedExternal) {
                const gamut = this.#options.gamut?.();
                const effectiveParsed = gamut ? clampParsedToGamut(parsedExternal, gamut) : parsedExternal;
                return {
                    parsed: effectiveParsed,
                    snapshot: buildSnapshotFromParsed(effectiveParsed, this.#snapshot),
                    sourceFormat: effectiveParsed.sourceFormat,
                };
            }
        }

        const gamut = this.#options.gamut?.();
        if (gamut && !isParsedInGamut(this.#parsed, gamut)) {
            const effectiveParsed = clampParsedToGamut(this.#parsed, gamut);
            return {
                parsed: effectiveParsed,
                snapshot: buildSnapshotFromParsed(effectiveParsed, this.#snapshot),
                sourceFormat: this.#sourceFormat,
            };
        }

        return {
            parsed: this.#parsed,
            snapshot: this.#snapshot,
            sourceFormat: this.#sourceFormat,
        };
    }

    #syncExternal(): void {
        const external = this.#options.value?.();
        if (external === undefined) {
            this.#lastSyncedExternal = undefined;
            this.#lastObservedExternal = undefined;
            return;
        }
        if (external === this.#lastObservedExternal) return;

        this.#lastObservedExternal = external;
        if (external === this.#lastSyncedExternal) return;

        if (external === this.#lastEmittedValue) {
            this.#lastSyncedExternal = external;
            return;
        }

        this.#syncExternalTo(external);
    }

    #syncExternalTo(external: string): void {
        this.#lastSyncedExternal = external;
        this.#lastObservedExternal = external;
        const parsedExternal = parseCssColor(external);
        if (!parsedExternal) return;

        const gamut = this.#options.gamut?.();
        const effectiveParsed = gamut ? clampParsedToGamut(parsedExternal, gamut) : parsedExternal;
        this.#parsed = effectiveParsed;
        this.#sourceFormat = effectiveParsed.sourceFormat;
        this.#snapshot = buildSnapshotFromParsed(effectiveParsed, this.#snapshot);
        this.#lastEmittedValue = this.#formatParsed(effectiveParsed, this.#resolveFormat(effectiveParsed.sourceFormat));
        this.#hasUncommittedChange = false;
    }

    #applyState(
        nextParsed: ParsedColor,
        nextSnapshot: ColorChannelSnapshot,
        nextSourceFormat: ConcreteColorFormat,
        options?: ColorChannelMutationOptions
    ): void {
        const prevFormatted = this.#formatParsed(this.#parsed, this.#resolveFormat(this.#sourceFormat));
        const nextFormatted = this.#formatParsed(nextParsed, this.#resolveFormat(nextSourceFormat));

        this.#parsed = nextParsed;
        this.#snapshot = nextSnapshot;
        this.#sourceFormat = nextSourceFormat;

        const changed = nextFormatted !== prevFormatted;
        const shouldCommit = options?.commit ?? false;

        if (changed) {
            this.#lastEmittedValue = nextFormatted;
            if (this.#options.value !== undefined) {
                this.#lastSyncedExternal = nextFormatted;
            }
            this.#options.setValue?.(nextFormatted);
            this.#options.onValueChange?.(nextFormatted);
            this.#lastObservedExternal = this.#options.value?.();

            if (shouldCommit) {
                this.#hasUncommittedChange = false;
                this.#options.onCommit?.(nextFormatted);
                const postCommitExt = this.#options.value?.();
                if (postCommitExt !== undefined && postCommitExt !== nextFormatted) {
                    this.#syncExternalTo(postCommitExt);
                }
            } else {
                this.#hasUncommittedChange = true;
            }
            return;
        }

        if (shouldCommit && this.#hasUncommittedChange) {
            this.#hasUncommittedChange = false;
            this.#lastEmittedValue = nextFormatted;
            this.#options.onCommit?.(nextFormatted);
            const postCommitExt = this.#options.value?.();
            if (postCommitExt !== undefined && postCommitExt !== nextFormatted) {
                this.#syncExternalTo(postCommitExt);
            }
        }
    }
}

/**
 * Factory helper creating a reactive `ColorState` instance.
 */
export function createColorState(options?: CreateColorStateOptions): ColorState {
    return new ColorState(options);
}
