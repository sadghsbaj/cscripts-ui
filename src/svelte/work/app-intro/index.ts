import type { HTMLAttributes } from "svelte/elements";

export { default as WorkAppIntro } from "./WorkAppIntro.svelte";
export * from "./workAppIntroState.svelte";

export interface WorkAppIntroProps extends HTMLAttributes<HTMLDivElement> {
    /** High-level department or domain label displayed above the tool title. */
    toolCategory: string;
    /** Primary application title displayed at the top of the intro stage. */
    toolName: string;
    /**
     * Whether to persist the boot timestamp in `sessionStorage` / `localStorage`
     * so reloads within the 30-minute window skip the full intro animation.
     * Set to `false` in previews or tests to always force a cold boot.
     * @default true
     */
    persist?: boolean;
}
