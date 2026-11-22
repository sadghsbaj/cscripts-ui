import { createContext } from "svelte";

import type { ColorChannel, ColorFormat } from "./color.utils.ts";
import type { ColorState } from "./color-state.svelte.ts";

export const COLOR_SWATCH_GROUP_ORIENTATIONS = ["horizontal", "vertical", "both"] as const;
export type ColorSwatchGroupOrientation = (typeof COLOR_SWATCH_GROUP_ORIENTATIONS)[number];

export interface ColorPickerContext {
    readonly state: ColorState;
    readonly value: string;
    readonly format: ColorFormat;
    readonly space: "hsv" | "hsl" | "oklch";
    readonly disabled: boolean;
    readonly readonly: boolean;
    readonly invalid: boolean;
    getChannel: (channel: ColorChannel) => number;
    setChannel: (channel: ColorChannel, next: number, options?: { commit?: boolean }) => void;
    setChannels: (partial: Partial<Record<ColorChannel, number>>, options?: { commit?: boolean }) => void;
    setString: (raw: string, options?: { commit?: boolean }) => boolean;
    commit: () => void;
}

export interface ColorSwatchGroupContext {
    readonly orientation: ColorSwatchGroupOrientation;
    readonly disabled: boolean;
    readonly tabStop: HTMLElement | null;
    isSelected: (swatchColor: string) => boolean;
    select: (swatchColor: string) => void;
    registerItem: (element: HTMLElement, getColor: () => string | undefined) => () => void;
}

export const [getColorPickerContext, setColorPickerContext, hasColorPickerContext] =
    createContext<ColorPickerContext>();

export const [getColorSwatchGroupContext, setColorSwatchGroupContext, hasColorSwatchGroupContext] =
    createContext<ColorSwatchGroupContext>();
