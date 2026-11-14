import { createContext } from "svelte";
import type { Attachment } from "svelte/attachments";
import type { HTMLAttributes } from "svelte/elements";

export { default as ButtonMorph } from "./ButtonMorph.svelte";
export { default as ButtonMorphItem } from "./ButtonMorphItem.svelte";
export {
    ButtonMorphManager,
    DEFAULT_GUARD_DELAY_MS,
    MORPH_TRANSITION_DURATION_MS,
    type ButtonMorphDimensions,
    type ButtonMorphStateOptions,
    type ButtonMorphSurface,
} from "./buttonMorphState.svelte.ts";

export const BUTTON_MORPH_DIRECTIONS = ["forward", "backward"] as const;
export const BUTTON_MORPH_ITEM_STATES = ["active", "exiting", "inactive"] as const;
export const BUTTON_MORPH_RESET_REASONS = ["timeout", "outside-click", "escape"] as const;

export type ButtonMorphDirection = (typeof BUTTON_MORPH_DIRECTIONS)[number];
export type ButtonMorphItemState = (typeof BUTTON_MORPH_ITEM_STATES)[number];
export type ButtonMorphResetReason = (typeof BUTTON_MORPH_RESET_REASONS)[number];

export interface ButtonMorphProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Currently active state key matching one of the child `<ButtonMorphItem value="...">` slots.
     */
    value: string;

    /**
     * Resting state key to return to when an automatic reset triggers.
     * Defaults to the initial `value` at mount time.
     */
    defaultValue?: string;

    /**
     * Duration in milliseconds after a state change during which click and keyboard
     * activations on the newly active button are suppressed to prevent accidental double-clicks.
     * Set to `0` to disable.
     * @default 250
     */
    guardDelay?: number;

    /**
     * Optional timeout in milliseconds after which `value` automatically resets back to `defaultValue`
     * whenever `value !== defaultValue`.
     */
    resetTimeout?: number;

    /**
     * Automatically reset `value` back to `defaultValue` when clicking outside the morph container.
     * @default false
     */
    resetOnOutsideClick?: boolean;

    /**
     * Automatically reset `value` back to `defaultValue` when pressing the `Escape` key.
     * @default false
     */
    resetOnEscape?: boolean;

    /**
     * Callback invoked whenever an automatic reset (`"timeout"`, `"outside-click"`, or `"escape"`) restores `defaultValue`.
     */
    onReset?: (reason: ButtonMorphResetReason) => void;
}

export interface ButtonMorphItemProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Unique state key identifying this morph slot.
     */
    value: string;
}

export interface ButtonMorphContext {
    getItemState(itemValue: string): ButtonMorphItemState;
    attachItem(itemValue: string): Attachment<HTMLElement>;
}

export const [getButtonMorphContext, setButtonMorphContext, hasButtonMorphContext] =
    createContext<ButtonMorphContext>();
