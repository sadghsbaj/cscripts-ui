import type { Component } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";

import type { ButtonIconComponentProps } from "../../components/button/index.ts";

export { default as WorkAppThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppHeaderThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppHelpButton } from "./WorkAppHelpButton.svelte";
export { default as WorkAppDocsButton } from "./WorkAppHelpButton.svelte";
export { default as WorkAppStatusPill } from "./WorkAppStatusPill.svelte";
export { default as WorkAppStatusButton } from "./WorkAppStatusPill.svelte";

export const WORK_APP_STATUS_COLORS = ["success", "warning", "danger", "base"] as const;
export type WorkAppStatusColor = (typeof WORK_APP_STATUS_COLORS)[number];

export interface WorkAppStatusPillProps extends Omit<HTMLButtonAttributes, "color" | "children"> {
    status?: WorkAppStatusColor;
    label?: string;
    pulse?: boolean;
}

export type WorkAppStatusButtonProps = WorkAppStatusPillProps;

export interface WorkAppThemeButtonProps extends Omit<HTMLButtonAttributes, "color" | "children"> {
    "aria-label"?: string;
}

export interface WorkAppHelpButtonProps extends Omit<HTMLButtonAttributes, "color" | "children"> {
    "aria-label"?: string;
    icon?: Component<ButtonIconComponentProps>;
}

export type WorkAppDocsButtonProps = WorkAppHelpButtonProps;
