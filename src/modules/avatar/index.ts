import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";

export { default as Avatar } from "./Avatar.svelte";
export { default as AvatarGroup } from "./AvatarGroup.svelte";

export const AVATAR_VARIANTS = ["soft", "solid"] as const;
export const AVATAR_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const AVATAR_COLORS = ["auto", "base", "accent", "positive", "caution", "negative"] as const;
export const AVATAR_PATTERNS = ["diagonal", "none"] as const;
export const AVATAR_STATUSES = ["online", "busy", "away", "offline"] as const;

export type AvatarVariant = (typeof AVATAR_VARIANTS)[number];
export type AvatarSize = (typeof AVATAR_SIZES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];
export type AvatarPattern = (typeof AVATAR_PATTERNS)[number];
export type AvatarStatus = (typeof AVATAR_STATUSES)[number];

export type AvatarRef = HTMLSpanElement | HTMLButtonElement | HTMLAnchorElement;

export type AvatarCommonProps = {
    /** Bindable reference to the root `.cs-avatar` element. */
    ref?: AvatarRef | null;
    /** Surface treatment. Required standalone; inherited from `<AvatarGroup>` when nested. */
    variant?: AvatarVariant;
    /** T-shirt scale (`20px`–`56px`). Required standalone; inherited from `<AvatarGroup>` when nested. */
    size?: AvatarSize;
    /** Full name used for initials extraction, `auto` hue/pattern seeding, and default `aria-label`. */
    name?: string;
    /** Explicit initials override (trimmed, uppercased, capped to 1 char at `xs`, 2 chars at `sm`–`xl`). */
    initials?: string;
    /** Optional deterministic hash seed overriding `name` for `auto` color/pattern. */
    seed?: string;
    /** Color palette or `"auto"` deterministic OKLCH hue. */
    color?: AvatarColor;
    /** Micro-pattern overlay or `"auto"` deterministic pattern selection. */
    pattern?: AvatarPattern;
    /** Optional presence status indicator with a `2px` cutout ring. */
    status?: AvatarStatus;
    /** Disables interactive avatars (combined with `AvatarGroup` `disabled`). */
    disabled?: boolean;
    /** Custom inner content replacing extracted initials and the fallback glyph. */
    children?: Snippet;
};

export type AvatarProps =
    | (Omit<HTMLAnchorAttributes, "color" | "size" | "href"> &
          AvatarCommonProps & {
              href: string;
          })
    | (Omit<HTMLButtonAttributes, "color" | "size" | "type"> &
          AvatarCommonProps & {
              href?: never;
              onclick: NonNullable<HTMLButtonAttributes["onclick"]>;
          })
    | (Omit<HTMLAttributes<HTMLSpanElement>, "color" | "size"> &
          AvatarCommonProps & {
              href?: never;
              onclick?: never;
          });

export type AvatarGroupProps = Omit<HTMLAttributes<HTMLDivElement>, "color"> & {
    /** Bindable reference to the root `<div>`. */
    ref?: HTMLDivElement | null;
    /** Shared surface treatment inherited by child `<Avatar>` items and `+N` overflow. */
    variant: AvatarVariant;
    /** Shared T-shirt scale inherited by child `<Avatar>` items and `+N` overflow. */
    size: AvatarSize;
    /** Maximum visible avatars before collapsing excess items into a `+N` overflow squircle. */
    max?: number;
    /** Negative inline-start overlap with cutout ring (`true`) vs. spaced row (`false`). */
    overlap?: boolean;
    /** Propagated to all child `<Avatar>` items via `AvatarGroupContext`. */
    disabled?: boolean;
    children?: Snippet;
};
