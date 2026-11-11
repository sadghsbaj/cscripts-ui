import type { Component } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

export { default as Tooltip } from "./Tooltip.svelte";
export { default as TooltipText } from "./TooltipText.svelte";
export { default as TooltipIcon } from "./TooltipIcon.svelte";
export { default as TooltipKbd } from "./TooltipKbd.svelte";
export * from "./tooltip.attach.svelte";

export type TooltipIconConfig =
    | Component
    | {
          component: Component;
          position?: "start" | "end";
      };

/**
 * Props for the `<Tooltip />` surface container.
 *
 * Built on top of `<Popover popover="hint">`. Inherits automatic entry/exit motion, anchor positioning,
 * and global warmup acceleration (`:root[data-hint-warm]`).
 */
export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover" | "role"> {
    id: string;
    text?: string;
    icon?: TooltipIconConfig;
    shortcut?: string | string[];
}

export type TooltipTextProps = HTMLAttributes<HTMLSpanElement> & {
    text?: string;
};

export type TooltipIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface TooltipIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<TooltipIconComponentProps>;
    color?: string;
}

export type TooltipKbdProps = HTMLAttributes<HTMLElement> & {
    key?: string;
};
