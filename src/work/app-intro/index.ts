import { createContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as WorkAppIntro } from "./WorkAppIntro.svelte";

export type WorkAppIntroPhase = "idle" | "cad" | "lock" | "brand" | "curtain";

export interface WorkAppIntroProps extends HTMLAttributes<HTMLDivElement> {
    /** High-level department or domain label displayed above the tool title. */
    toolCategory: string;
    /** Primary application title displayed at the top of the intro stage. */
    toolName: string;
    /**
     * Whether to persist the boot state in `sessionStorage` so direct reloads
     * within the same tab session skip the full intro animation (fresh tab/app
     * opens always play it).
     * Set to `false` in previews or tests to always force a cold boot.
     * @default true
     */
    persist?: boolean;
    /**
     * Bindable flag that becomes `true` once the intro reaches `"curtain"` or
     * resolves as an instant boot, and is `false` before mount and during `"cad"`, `"lock"`, `"brand"`.
     */
    settled?: boolean;
    /** Bindable current boot phase of the intro choreography. */
    phase?: WorkAppIntroPhase;
}

export interface WorkAppIdentityContext {
    readonly toolCategory: string;
    readonly toolName: string;
    readonly phase: WorkAppIntroPhase;
    readonly settled: boolean;
}

export const [getWorkAppIdentity, setWorkAppIdentity] = createContext<WorkAppIdentityContext>();
