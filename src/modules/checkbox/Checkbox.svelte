<script lang="ts">
    import { getCheckboxGroupContext, hasCheckboxGroupContext } from "../checkbox-group/checkbox-group.context.ts";
    import { type CheckboxProps } from ".";

    let {
        ref = $bindable(null),
        variant,
        size,
        value,
        name,
        disabled,
        checked = $bindable(),
        onCheckedChange,
        indeterminate = $bindable(),
        onIndeterminateChange,
        invalid,
        class: className,
        onchange,
        ...rest
    }: CheckboxProps = $props();

    const group = hasCheckboxGroupContext() ? getCheckboxGroupContext() : undefined;
    const isGroupItem = $derived(Boolean(group && value !== undefined));

    $effect(() => {
        if (!group || value === undefined) return;
        return group.registerItem({
            value: () => String(value),
            disabled: () => Boolean(disabled),
        });
    });

    const resolvedChecked = $derived(isGroupItem && group ? group.isSelected(String(value)) : Boolean(checked));
    const resolvedIndeterminate = $derived(isGroupItem ? false : Boolean(indeterminate));
    const resolvedDisabled = $derived(Boolean(disabled || (isGroupItem && group?.disabled)));
    const resolvedName = $derived(name ?? (isGroupItem ? group?.name : undefined));
    const resolvedInvalid = $derived(invalid ?? (isGroupItem ? group?.invalid : undefined));

    const uid = $props.id();
    const anchorName = `--cs-checkbox-${uid}`;

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
        resolvedIndeterminate ? "indeterminate" : resolvedChecked ? "checked" : "unchecked",
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
    function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        const prevChecked = resolvedChecked;
        const prevIndeterminate = resolvedIndeterminate;

        // Run consumer onchange before syncing bindable state so tri-state handlers can
        // update target.checked/indeterminate without an intermediate checked microtask.
        onchange?.(event);

        if (isGroupItem && group) {
            const itemValue = String(value);
            group.setSelected(itemValue, event.currentTarget.checked);
            const committedChecked = group.isSelected(itemValue);
            // Keep native DOM state aligned if a controlled group rejects the change.
            event.currentTarget.checked = committedChecked;
            if (committedChecked !== prevChecked) {
                onCheckedChange?.(committedChecked);
            }
            return;
        }

        const nextChecked = event.currentTarget.checked;
        const nextIndeterminate = event.currentTarget.indeterminate;

        checked = nextChecked;
        indeterminate = nextIndeterminate;

        if (nextChecked !== prevChecked) {
            onCheckedChange?.(nextChecked);
        }
        if (nextIndeterminate !== prevIndeterminate) {
            onIndeterminateChange?.(nextIndeterminate);
        }
    }
</script>

<input
    bind:this={ref}
    type="checkbox"
    {...rest}
    {value}
    name={resolvedName}
    disabled={resolvedDisabled}
    checked={resolvedChecked}
    indeterminate={resolvedIndeterminate}
    onchange={handleChange}
    aria-invalid={resolvedInvalid ? "true" : undefined}
    class={["cs-checkbox", className]}
    data-variant={variant}
    data-size={size}
    data-morph={morphActive ? "" : undefined}
    data-dash-enter={dashEnter ? "" : undefined}
    data-settled={settled ? "" : undefined}
    style:anchor-name={anchorName}
/>

<svg
    class="cs-checkbox-icon"
    style:position-anchor={anchorName}
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
>
    <path class="cs-checkbox-check" d="M4 12l5 5L20 6" pathLength="1" />
    <path class="cs-checkbox-dash" d="M5 12H19" pathLength="1" />
    <path bind:this={morphPath} class="cs-checkbox-morph" d="M5 12L12 12L19 12" />
</svg>

<style>
    @layer components.primitive {
        .cs-checkbox {
            /* =========================================================
            * CHECKED INTENT (Accent by default, overridden by [aria-invalid])
            * ========================================================= */
            --cs-checkbox-bg-checked: var(--cs-color-accent-solid);
            --cs-checkbox-bg-checked-hover: var(--cs-color-accent-solid-hover);
            position: relative;
            width: var(--cs-checkbox-width);
            height: var(--cs-checkbox-width);
            appearance: none;
            background-color: var(--cs-checkbox-bg);
            border-radius: var(--cs-checkbox-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-checkbox-shadow, none);

            transition:
                background-color var(--cs-dur-press) var(--cs-ease-press),
                box-shadow var(--cs-dur-press) var(--cs-ease-press),
                scale var(--cs-dur-120) var(--cs-ease-press);

            /* =========================================================
            * SIZES
            * ========================================================= */
            &[data-size="xs"] {
                --cs-checkbox-width: 12px;
                --cs-checkbox-radius: 4px;
            }

            &[data-size="sm"] {
                --cs-checkbox-width: 16px;
                --cs-checkbox-radius: 5px;
            }

            &[data-size="md"] {
                --cs-checkbox-width: 20px;
                --cs-checkbox-radius: 6px;
            }

            &[data-size="lg"] {
                --cs-checkbox-width: 24px;
                --cs-checkbox-radius: 7px;
            }

            &[data-size="xl"] {
                --cs-checkbox-width: 28px;
                --cs-checkbox-radius: 8px;
            }

            /* =========================================================
            * VARIANTS
            * ========================================================= */
            &[data-variant="soft"] {
                --cs-checkbox-bg: var(--cs-color-base-soft);
                --cs-checkbox-bg-hover: var(--cs-color-base-soft-hover);
            }

            &[data-variant="elevated"] {
                --cs-checkbox-bg: var(--cs-color-elevated);
                --cs-checkbox-bg-hover: var(--cs-color-elevated-hover);
                --cs-checkbox-shadow: var(--cs-shadow-elevated);
                --cs-checkbox-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            &::before {
                content: "";
                position: absolute;
                inset: 0;
            }

            @media (hover: hover) {
                &:hover:not(:disabled) {
                    background-color: var(--cs-checkbox-bg-hover);
                    box-shadow: var(--cs-checkbox-shadow-hover, none);
                }
            }

            &:active:not(:disabled) {
                scale: 0.9;

                &::before {
                    /* Net hit-area = 0.9 / 0.85 = ~1.06 (+6% safety margin against subpixel mouse jitter) */
                    scale: calc(1 / 0.85);
                }
            }

            &:is(:checked, :indeterminate) {
                --cs-checkbox-bg: var(--cs-checkbox-bg-checked);
                --cs-checkbox-bg-hover: var(--cs-checkbox-bg-checked-hover);
                --cs-checkbox-shadow: var(--cs-shadow-solid);
                --cs-checkbox-shadow-hover: var(--cs-checkbox-shadow);
            }

            &[aria-invalid="true"] {
                --cs-checkbox-bg-checked: var(--cs-color-negative-solid);
                --cs-checkbox-bg-checked-hover: var(--cs-color-negative-solid-hover);

                /* Error ring & soft tint apply only when inactive so checked states inherit the top-lit solid highlight */
                &:not(:checked, :indeterminate) {
                    --cs-checkbox-shadow: inset 0 0 0 1px color-mix(in oklab, var(--cs-color-negative-solid) 25%, transparent);
                    --cs-checkbox-shadow-hover: inset 0 0 0 1px color-mix(in oklab, var(--cs-color-negative-solid) 36%, transparent);
                    --cs-checkbox-bg: var(--cs-color-negative-soft);
                    --cs-checkbox-bg-hover: var(--cs-color-negative-soft-hover);
                }
            }

            /* =========================================================
             * DISABLED
             * ========================================================= */
            &:disabled {
                --cs-disabled-opacity: 1;
                --cs-checkbox-bg: var(--cs-color-disabled-bg);
                --cs-checkbox-shadow: none;

                &[data-variant="elevated"] {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-checkbox-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                }

                &[aria-invalid="true"]:not(:checked, :indeterminate) {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg);
                    --cs-checkbox-shadow: none;
                }

                &:is(:checked, :indeterminate) {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg-strong);
                    --cs-checkbox-shadow: none;
                }
            }
        }

        .cs-checkbox-icon {
            position: absolute;
            top: anchor(center);
            left: anchor(center);
            width: calc(anchor-size(width) * 0.7);
            height: calc(anchor-size(height) * 0.7);
            color: white;
            opacity: 0;
            translate: -50% -50%;
            scale: 0.7;
            transition:
                opacity var(--cs-dur-80) var(--cs-ease-effect),
                scale var(--cs-dur-80) var(--cs-ease-effect);
            pointer-events: none;

            & path {
                opacity: 0;
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
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
                opacity: 0;
                stroke-dasharray: none;
                stroke-dashoffset: 0;
                transition: opacity 0s var(--cs-dur-80);
            }
        }

        /* =========================================================
         * VECTOR DRAWING (Checked & Indeterminate Transitions)
         * ========================================================= */
        /* 1. Indeterminate: Draws horizontal dash while checkmark fades out first (40ms sequential handoff) */
        .cs-checkbox:indeterminate + .cs-checkbox-icon .cs-checkbox-dash {
            opacity: 1;
            stroke-dasharray: 1 0;
            stroke-dashoffset: 0;
            transition: opacity 0s var(--cs-dur-40);
        }

        .cs-checkbox[data-dash-enter]:indeterminate + .cs-checkbox-icon .cs-checkbox-dash {
            animation: cs-checkbox-dash-in var(--cs-dur-140) var(--cs-ease-quart-out) var(--cs-dur-40) backwards;
        }

        /* 2. Checked: Draws checkmark while dash fades out first (40ms sequential handoff) */
        .cs-checkbox:checked:not(:indeterminate) + .cs-checkbox-icon .cs-checkbox-check {
            opacity: 1;
            stroke-dashoffset: 0;
            transition:
                opacity 0s var(--cs-dur-40),
                stroke-dashoffset var(--cs-dur-140) var(--cs-ease-quart-out) var(--cs-dur-40);
        }

        /* 3. Active Icon Container: Snaps visibility immediately to prioritize vector drawing */
        .cs-checkbox:is(:checked, :indeterminate) + .cs-checkbox-icon {
            opacity: 1;
            scale: 1;
            transition: none;
        }

        .cs-checkbox:is(:checked, :indeterminate):not([data-morph]) + .cs-checkbox-icon .cs-checkbox-morph {
            opacity: 0;
            transition: none;
        }

        /* 4. Single-path morph overrides check/dash during indeterminate <-> checked */
        .cs-checkbox[data-morph] + .cs-checkbox-icon {
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

        /* Mirrors global disabled state (disabled.css only targets the input host, not its anchor sibling) */
        .cs-checkbox:disabled:is(:checked, :indeterminate) + .cs-checkbox-icon {
            opacity: 0.5;
        }

        /* Suppress mount-flush transitions (e.g. SelectAll flipping to indeterminate) until first paint settles */
        .cs-checkbox:not([data-settled]) {
            transition: none;

            & + .cs-checkbox-icon,
            & + .cs-checkbox-icon path {
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
