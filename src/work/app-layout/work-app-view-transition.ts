import { cubicIn, cubicOut, quadIn, quartOut } from "svelte/easing";
import type { TransitionConfig } from "svelte/transition";

export const WORK_APP_VIEW_TRANSITION_AXES = ["x", "y"] as const;
export type WorkAppViewTransitionAxis = (typeof WORK_APP_VIEW_TRANSITION_AXES)[number];

export const WORK_APP_VIEW_TRANSITION_DIRECTIONS = [1, -1] as const;
export type WorkAppViewTransitionDirection = (typeof WORK_APP_VIEW_TRANSITION_DIRECTIONS)[number];

export interface WorkAppViewTransitionOptions {
    axis?: WorkAppViewTransitionAxis;
    direction?: WorkAppViewTransitionDirection;
    distance?: number;
    duration?: number;
    delay?: number;
    easing?: (t: number) => number;
}

function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function workAppViewIn(
    node: HTMLElement,
    options: WorkAppViewTransitionOptions = {},
): TransitionConfig {
    // Clear exit locks on intro start so rapid reversals never leave a view stuck inert or offset.
    node.inert = false;
    node.style.pointerEvents = "";
    node.style.translate = "";
    delete node.dataset.exiting;

    if (prefersReducedMotion()) {
        return { duration: 0, delay: 0 };
    }

    const axis = options.axis ?? "y";
    const direction = options.direction ?? 1;
    const isY = axis === "y";

    const duration = options.duration ?? (isY ? 220 : 180);
    const delay = options.delay ?? (isY ? 70 : 60);
    const distance = options.distance ?? (isY ? 10 : 16);
    const easing = options.easing ?? (isY ? quartOut : cubicOut);

    return {
        duration,
        delay,
        easing,
        css: (t, u) => {
            const offset = distance * direction * u;
            if (isY) {
                const scale = 0.994 + 0.006 * t;
                return `opacity: ${t}; transform: translate3d(0, ${offset}px, 0) scale(${scale});`;
            }

            return `opacity: ${t}; transform: translate3d(${offset}px, 0, 0);`;
        },
    };
}

export function workAppViewOut(
    node: HTMLElement,
    options: WorkAppViewTransitionOptions = {},
): TransitionConfig {
    node.inert = true;
    node.style.pointerEvents = "none";
    node.dataset.exiting = "";

    if (prefersReducedMotion()) {
        return { duration: 0, delay: 0 };
    }

    const axis = options.axis ?? "y";
    const direction = options.direction ?? 1;
    const isY = axis === "y";

    const duration = options.duration ?? (isY ? 110 : 100);
    const delay = options.delay ?? 0;
    const distance = options.distance ?? (isY ? 6 : 12);
    const easing = options.easing ?? (isY ? cubicIn : quadIn);

    return {
        duration,
        delay,
        easing,
        css: (t, u) => {
            const offset = -distance * direction * u;
            if (isY) {
                const scale = 1 - 0.004 * u;
                return `opacity: ${t}; transform: translate3d(0, ${offset}px, 0) scale(${scale});`;
            }

            return `opacity: ${t}; transform: translate3d(${offset}px, 0, 0);`;
        },
    };
}
