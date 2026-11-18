<script lang="ts">
    import { type CheckboxMarkProps } from ".";

    let {
        ref = $bindable<SVGSVGElement | null>(null),
        checked = false,
        indeterminate = false,
        class: className,
        ...rest
    }: CheckboxMarkProps = $props();

    type VisualState = "unchecked" | "indeterminate" | "checked";
    type Coords = [number, number, number, number, number, number];
    type ReadonlyCoords = readonly [number, number, number, number, number, number];

    const DASH_COORDS: ReadonlyCoords = [5, 12, 12, 12, 19, 12] as const;
    const CHECK_COORDS: ReadonlyCoords = [4, 12, 9, 17, 20, 6] as const;
    const MORPH_DURATION_MS = 160;
    const quartOut = (t: number): number => 1 - (1 - t) ** 4;

    function formatCoords([x0, y0, x1, y1, x2, y2]: ReadonlyCoords): string {
        return `M${x0} ${y0}L${x1} ${y1}L${x2} ${y2}`;
    }

    const visualState = $derived<VisualState>(
        indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"
    );

    let morphActive = $state(false);
    let dashEnter = $state(false);
    let settled = $state(false);
    let settleScheduled = false;
    let morphPath: SVGPathElement | null = null;
    let prevState: VisualState | undefined;
    let currentCoords: Coords = [...CHECK_COORDS];
    let rafId: number | null = null;

    function cancelMorph(): void {
        if (rafId === null) return;
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    $effect(() => {
        if (settleScheduled) return;
        settleScheduled = true;

        if (typeof requestAnimationFrame === "function") {
            const id = requestAnimationFrame(() => {
                settled = true;
            });
            return () => cancelAnimationFrame(id);
        }

        queueMicrotask(() => {
            settled = true;
        });
    });

    $effect(() => {
        const next = visualState;

        if (prevState === undefined) {
            prevState = next;
            dashEnter = false;
            currentCoords = [...(next === "indeterminate" ? DASH_COORDS : CHECK_COORDS)];
            return () => cancelMorph();
        }

        if (next === prevState) {
            return () => cancelMorph();
        }

        const prev = prevState;
        prevState = next;

        if (next === "unchecked" || prev === "unchecked") {
            cancelMorph();
            morphActive = false;
            dashEnter = prev === "unchecked" && next === "indeterminate" ? settled : false;
            currentCoords = [...(next === "indeterminate" ? DASH_COORDS : CHECK_COORDS)];
            return () => cancelMorph();
        }

        dashEnter = false;

        const reducedMotion =
            typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

        if (reducedMotion || !morphPath) {
            cancelMorph();
            morphActive = false;
            currentCoords = [...(next === "indeterminate" ? DASH_COORDS : CHECK_COORDS)];
            return () => cancelMorph();
        }

        cancelMorph();
        const pathEl = morphPath;
        const from: Coords = [...currentCoords];
        const to = next === "indeterminate" ? DASH_COORDS : CHECK_COORDS;

        // Set initial path geometry before activating data-morph to avoid a 1-frame flash
        pathEl.setAttribute("d", formatCoords(from));
        morphActive = true;

        const start = performance.now();
        const tick = (now: number): void => {
            const rawT = Math.min(1, (now - start) / MORPH_DURATION_MS);
            const eased = quartOut(rawT);

            currentCoords = [
                from[0] + (to[0] - from[0]) * eased,
                from[1] + (to[1] - from[1]) * eased,
                from[2] + (to[2] - from[2]) * eased,
                from[3] + (to[3] - from[3]) * eased,
                from[4] + (to[4] - from[4]) * eased,
                from[5] + (to[5] - from[5]) * eased,
            ];
            pathEl.setAttribute("d", formatCoords(currentCoords));

            if (rawT < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                currentCoords = [...to];
                rafId = null;
            }
        };

        rafId = requestAnimationFrame(tick);

        return () => cancelMorph();
    });
</script>

<svg
    bind:this={ref}
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
    {...rest}
    class={["cs-checkbox-mark", className]}
    data-state={visualState}
    data-morph={morphActive ? "" : undefined}
    data-dash-enter={dashEnter ? "" : undefined}
    data-settled={settled ? "" : undefined}
>
    <path class="cs-checkbox-check" d="M4 12l5 5L20 6" pathLength="1" />
    <path class="cs-checkbox-dash" d="M5 12H19" pathLength="1" />
    <path bind:this={morphPath} class="cs-checkbox-morph" d="M5 12L12 12L19 12" />
</svg>

<style>
    @layer components.primitive {
        .cs-checkbox-mark {
            display: block;
            width: 100%;
            height: 100%;
            pointer-events: none;

            & path {
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
                opacity: 0;
                transition:
                    opacity 0s var(--cs-dur-80),
                    stroke-dashoffset var(--cs-dur-effect-fast) var(--cs-ease-effect);
            }

            & .cs-checkbox-dash {
                stroke-dasharray: 0 1;
                stroke-dashoffset: -0.5;
                transition:
                    opacity 0s var(--cs-dur-80),
                    stroke-dasharray var(--cs-dur-effect-fast) var(--cs-ease-effect),
                    stroke-dashoffset var(--cs-dur-effect-fast) var(--cs-ease-effect);
            }

            & .cs-checkbox-morph {
                stroke-dasharray: none;
                stroke-dashoffset: 0;
                opacity: 0;
                transition: opacity 0s var(--cs-dur-80);
            }

            /* =========================================================
             * VECTOR DRAWING (Checked & Indeterminate Transitions)
             * ========================================================= */
            /* 1. Indeterminate: Draws horizontal dash while checkmark fades out first (40ms sequential handoff) */
            &[data-state="indeterminate"] .cs-checkbox-dash {
                stroke-dasharray: 1 0;
                stroke-dashoffset: 0;
                opacity: 1;
                transition: opacity 0s var(--cs-dur-40);
            }

            &[data-state="indeterminate"][data-dash-enter] .cs-checkbox-dash {
                animation: cs-checkbox-dash-in var(--cs-dur-140) var(--cs-ease-quart-out) var(--cs-dur-40) backwards;
            }

            /* 2. Checked: Draws checkmark while dash fades out first (40ms sequential handoff) */
            &[data-state="checked"] .cs-checkbox-check {
                stroke-dashoffset: 0;
                opacity: 1;
                transition:
                    opacity 0s var(--cs-dur-40),
                    stroke-dashoffset var(--cs-dur-140) var(--cs-ease-quart-out) var(--cs-dur-40);
            }

            &:is([data-state="checked"], [data-state="indeterminate"]):not([data-morph]) .cs-checkbox-morph {
                opacity: 0;
                transition: none;
            }

            /* 3. Single-path morph overrides check/dash during indeterminate <-> checked */
            &[data-morph] {
                & .cs-checkbox-check,
                & .cs-checkbox-dash {
                    opacity: 0;
                    transition: none;
                    animation: none;
                }

                & .cs-checkbox-morph {
                    opacity: 1;
                    transition: none;
                }
            }

            /* Suppress mount-flush transitions (e.g. SelectAll flipping to indeterminate) until first paint settles */
            &:not([data-settled]),
            &:not([data-settled]) path {
                transition: none !important;
            }
        }

        @keyframes cs-checkbox-dash-in {
            from {
                stroke-dasharray: 0 1;
                stroke-dashoffset: -0.5;
            }
            to {
                stroke-dasharray: 1 0;
                stroke-dashoffset: 0;
            }
        }
    }
</style>
