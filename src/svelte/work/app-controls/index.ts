import type { Component } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";

import type { ButtonIconComponentProps } from "../../components/button/index.ts";

export { default as WorkAppThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppHeaderThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppHelpButton } from "./WorkAppHelpButton.svelte";
export { default as WorkAppDocsButton } from "./WorkAppHelpButton.svelte";
export { default as WorkAppStatusDot } from "./WorkAppStatusDot.svelte";
export { default as WorkAppStatusPill } from "./WorkAppStatusDot.svelte";
export { default as WorkAppStatusButton } from "./WorkAppStatusDot.svelte";

export const WORK_APP_STATUS_COLORS = ["success", "warning", "danger", "base"] as const;
export type WorkAppStatusColor = (typeof WORK_APP_STATUS_COLORS)[number];

export const WORK_APP_STATUS_DEFAULTS: Record<WorkAppStatusColor, string> = {
    success: "Verbunden",
    warning: "Wartend",
    danger: "Getrennt",
    base: "Inaktiv",
};

export interface WorkAppStatusDotProps extends Omit<HTMLButtonAttributes, "color" | "aria-label"> {
    status?: WorkAppStatusColor;
    label?: string;
    pulse?: boolean;
}

export type WorkAppStatusPillProps = WorkAppStatusDotProps;
export type WorkAppStatusButtonProps = WorkAppStatusDotProps;

export interface WorkAppThemeButtonProps extends Omit<HTMLButtonAttributes, "color" | "children"> {
    "aria-label"?: string;
}

export interface WorkAppHelpButtonProps extends Omit<HTMLButtonAttributes, "color" | "children"> {
    "aria-label"?: string;
    icon?: Component<ButtonIconComponentProps>;
}

export type WorkAppDocsButtonProps = WorkAppHelpButtonProps;
