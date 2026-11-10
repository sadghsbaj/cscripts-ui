import type { Component } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as Tooltip } from "./Tooltip.svelte";
export * from "./tooltip.attach.svelte";

export type TooltipIconConfig =
    | Component
    | {
          component: Component;
          position?: "start" | "end";
      };

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover" | "role"> {
    id: string;
    text?: string;
    icon?: TooltipIconConfig;
    shortcut?: string | string[];
}
