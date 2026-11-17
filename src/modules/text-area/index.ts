import type { HTMLTextareaAttributes } from "svelte/elements";

export { default as TextArea } from "./TextArea.svelte";

export const TEXT_AREA_VARIANTS = ["soft", "elevated"] as const;
export const TEXT_AREA_SIZES = ["sm", "md", "lg"] as const;
export const TEXT_AREA_RESIZES = ["none", "vertical", "horizontal", "both"] as const;

export type TextAreaVariant = (typeof TEXT_AREA_VARIANTS)[number];
export type TextAreaSize = (typeof TEXT_AREA_SIZES)[number];
export type TextAreaResize = (typeof TEXT_AREA_RESIZES)[number];

export interface TextAreaProps extends Omit<HTMLTextareaAttributes, "children" | "value"> {
    variant: TextAreaVariant;
    size: TextAreaSize;
    resize?: TextAreaResize;
    rows?: number;
    cols?: number;
    /** Bindable textarea value. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
    value?: string;
    onValueChange?: (value: string) => void;
    invalid?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    /** Bindable reference to the `<textarea>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: HTMLTextAreaElement | null;
}
