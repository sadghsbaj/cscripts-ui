import type { Component } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";

import type { ButtonIconComponentProps } from "../../components/button/index.ts";

export { default as WorkAppThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppHeaderThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppHelpButton } from "./WorkAppHelpButton.svelte";
export { default as WorkAppDocsButton } from "./WorkAppHelpButton.svelte";

export interface WorkAppThemeButtonProps extends Omit<HTMLButtonAttributes, "color" | "children"> {
    "aria-label"?: string;
}

export interface WorkAppHelpButtonProps extends Omit<HTMLButtonAttributes, "color" | "children"> {
    "aria-label"?: string;
    icon?: Component<ButtonIconComponentProps>;
}

export type WorkAppDocsButtonProps = WorkAppHelpButtonProps;
