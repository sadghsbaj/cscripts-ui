import type { WorkLocationId } from "../locations";

const SESSION_STORAGE_KEY = "cs-pfleiderer-boot-session";
const LOCAL_STORAGE_KEY = "cs-pfleiderer-boot-last-ts";
const FAST_BOOT_WINDOW_MS = 30 * 60 * 1000;

/**
 * Ordered sequence in which the five plant locations draw and lock in.
 * Matches the `--_index` stagger order defined in `WorkAppIntro.svelte`.
 */
export const BOOT_SEQUENCE: readonly WorkLocationId[] = ["neumarkt", "baruth", "guetersloh", "arnsberg", "leutkirch"];

type BootPhase = "idle" | "cad" | "lock" | "brand" | "curtain";
type BootMode = "cold" | "instant";

/**
 * Reactive state machine orchestrating the 4-act `WorkAppIntro` choreography.
 *
 * Architectural Note:
 * Individual plant staggering and progress bar interpolation are delegated entirely
 * to CSS via `data-phase` and per-location `--_index` custom properties, keeping
 * the JavaScript timer schedule minimal (one timer per phase transition).
 */
class WorkAppIntroManager {
    phase: BootPhase = $state("idle");
    bootMode: BootMode = $state("cold");
    timers: Array<ReturnType<typeof setTimeout>> = [];

    clearBootTimers(): void {
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers = [];
    }

    destroy(): void {
        this.clearBootTimers();
    }

    schedule(fn: () => void, delayMs: number): void {
        this.timers.push(setTimeout(fn, delayMs));
    }

    startBoot(mode: BootMode = "cold"): void {
        this.clearBootTimers();
        this.bootMode = mode;

        if (mode === "instant") {
            this.phase = "idle";
            return;
        }

        // Act 1 (0ms - 550ms): SVG region outlines self-draw with a 55ms CSS stagger
        this.phase = "cad";

        // Act 2 (550ms - 1450ms): Plant fills, spring pins, sonar rings, and labels lock in at 85ms CSS intervals
        this.schedule(() => {
            this.phase = "lock";
        }, 550);

        // Act 3 (1450ms - 2450ms): Map recedes into a blurred watermark while the brand logo takes focus
        this.schedule(() => {
            this.phase = "brand";
        }, 1450);

        // Act 4 (2450ms - 2770ms): Overlay zooms forward and fades out while the workspace scales to 1
        this.schedule(() => {
            this.phase = "curtain";
        }, 2450);

        this.schedule(() => {
            this.phase = "idle";
        }, 2770);

        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
            localStorage.setItem(LOCAL_STORAGE_KEY, String(Date.now()));
        } catch (error) {
            console.warn(error);
        }
    }

    /**
     * Skips the intro when an active tab session exists or the last cold boot
     * occurred within `FAST_BOOT_WINDOW_MS` (30 minutes).
     */
    triggerSmartBoot(): void {
        try {
            const hasSession = sessionStorage.getItem(SESSION_STORAGE_KEY) === "1";

            if (hasSession) {
                this.startBoot("instant");
                return;
            }

            const lastTimestamp = Number(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "0");
            const elapsed = Date.now() - lastTimestamp;

            if (lastTimestamp > 0 && elapsed < FAST_BOOT_WINDOW_MS) {
                this.startBoot("instant");
                return;
            }

            this.startBoot("cold");
        } catch {
            this.startBoot("cold");
        }
    }

    skipBoot = (): void => {
        if (this.phase === "idle" || this.phase === "curtain") return;
        this.clearBootTimers();
        this.phase = "curtain";
        this.schedule(() => {
            this.phase = "idle";
        }, 260);
    };

    handleKeyDown = (event: KeyboardEvent): void => {
        if (this.phase === "idle" || this.phase === "curtain") return;
        if ([" ", "Enter", "Escape"].includes(event.key)) {
            event.preventDefault();
            this.skipBoot();
        }
    };
}

export const workAppIntroState = new WorkAppIntroManager();
