import type { Component, Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes, SVGAttributes } from "svelte/elements";

export { default as Chip } from "./Chip.svelte";
export { default as ChipGroup } from "./ChipGroup.svelte";
export { default as ChipIcon } from "./ChipIcon.svelte";
export { default as ChipLabel } from "./ChipLabel.svelte";
export { default as ChipRemove } from "./ChipRemove.svelte";
export { default as ChipTrigger } from "./ChipTrigger.svelte";

export const CHIP_VARIANTS = ["soft", "elevated", "accent"] as const;
export const CHIP_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const CHIP_TRIGGER_ELEMENTS = ["button", "a"] as const;

export type ChipVariant = (typeof CHIP_VARIANTS)[number];
export type ChipSize = (typeof CHIP_SIZES)[number];
export type ChipTriggerElement = (typeof CHIP_TRIGGER_ELEMENTS)[number];

export type ChipProps = Omit<HTMLAttributes<HTMLSpanElement>, "size"> & {
    /** Bindable reference to the root `<span>`. Use `bind:ref` or `bind:ref={get, set}`. */
    ref?: HTMLSpanElement | null;
    /** Explicit surface treatment. Required standalone; inherited from `<ChipGroup>` when nested. */
    variant?: ChipVariant;
    /** Explicit T-shirt scale (`20px`–`36px`). Required standalone; inherited from `<ChipGroup>` when nested. */
    size?: ChipSize;
    /** Disables the chip and any child `<ChipTrigger>` / `<ChipRemove>`. */
    disabled?: boolean;
    /** Marks malformed input tokens (e.g., invalid email recipient) with `negative` semantic styling. */
    invalid?: boolean;
    /** Locks square 1:1 proportions when rendering an icon-only chip. */
    iconOnly?: boolean;
    children?: Snippet;
};

export type ChipGroupSelectionProps =
    | {
          multiple?: false;
          /** Bindable selected value in single-select mode. Use `bind:value` or `bind:value={get, set}`. */
          value?: string | undefined;
          onValueChange?: (value: string | undefined) => void;
      }
    | {
          multiple: true;
          /** Bindable selected values in multi-select mode. Use `bind:value` or `bind:value={get, set}`. */
          value?: string[];
          onValueChange?: (value: string[]) => void;
      };

export type ChipGroupProps = HTMLAttributes<HTMLDivElement> &
    ChipGroupSelectionProps & {
        /** Bindable reference to the root `<div>`. Use `bind:ref` or `bind:ref={get, set}`. */
        ref?: HTMLDivElement | null;
        /** Shared surface treatment inherited by child `<Chip>` items unless overridden. */
        variant?: ChipVariant;
        /** Shared T-shirt scale inherited by child `<Chip>` items unless overridden. */
        size?: ChipSize;
        /** Disables the group and all child `<Chip>`, `<ChipTrigger>`, and `<ChipRemove>` items. */
        disabled?: boolean;
        /** Whether chips wrap onto multiple rows (`true` by default). */
        wrap?: boolean;
        children?: Snippet;
    };

export type ChipTriggerStateProps =
    | {
          /** Item identifier inside `<ChipGroup>` selection. Forbidden standalone or on links. */
          value: string;
          pressed?: never;
          onPressedChange?: never;
      }
    | {
          value?: never;
          /**
           * Bindable pressed state for standalone filter/toggle chips.
           * Use `bind:pressed` or `bind:pressed={get, set}`; do not pass a plain expression.
           */
          pressed?: boolean;
          /** Fires with the next pressed state after a user toggle (standalone only). */
          onPressedChange?: (pressed: boolean) => void;
      };

export type ChipTriggerProps = (
    | (Omit<HTMLButtonAttributes, "size" | "type" | "value"> &
          ChipTriggerStateProps & {
              as?: "button";
              href?: never;
              ref?: HTMLButtonElement | HTMLAnchorElement | null;
          })
    | (Omit<HTMLAnchorAttributes, "size"> & {
          as?: "a";
          href: string;
          ref?: HTMLButtonElement | HTMLAnchorElement | null;
          value?: never;
          pressed?: never;
          onPressedChange?: never;
      })
) & {
    /** Per-trigger disabled override (combined with parent `Chip` / `ChipGroup` `disabled`). */
    disabled?: boolean;
    children?: Snippet;
};

export type ChipLabelProps = HTMLAttributes<HTMLSpanElement> & {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
};

export type ChipIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface ChipIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<ChipIconComponentProps>;
    color?: string;
    strokeWidth?: number | string;
}

export interface ChipRemoveProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    /** Per-button disabled override (combined with parent `Chip` / `ChipGroup` `disabled`). */
    disabled?: boolean;
    /** Optional custom icon/glyph override replacing the default `X` icon. */
    children?: Snippet;
}
