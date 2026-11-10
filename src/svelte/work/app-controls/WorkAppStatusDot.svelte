<!--
@component
Cockpit status indicator dot (`<WorkAppStatusDot />`) for displaying connection,
filesystem, or system state directly as an interactive telemetry dot.

Architectural Notes:
- Element Structure: The button element itself is the 12px dot (no wrapping span or container).
- Telemetry: 12px live LED dot with concentric dual-ring halo ping driven by `--cs-ease-cubic-out`.
- Managed Accessibility: Automatically generates a strict `aria-label` from status and label state.
- Standalone Primitiv: Place inside `<WorkAppHeaderSegment island>` or any custom container.
-->
<script lang="ts">
    import { tooltip } from "../../primitives/tooltip/tooltip.attach.svelte.ts";
    import { WORK_APP_STATUS_DEFAULTS, type WorkAppStatusDotProps } from "./index.ts";

    let {
        status = "success",
        label,
        pulse = true,
        class: className,
        children,
        ...rest
    }: WorkAppStatusDotProps = $props();

    const displayLabel = $derived(label ?? WORK_APP_STATUS_DEFAULTS[status]);
    const computedAriaLabel = $derived(`${displayLabel} (${status})`);
</script>

<button
    {...rest}
    type="button"
    class={["cs-work-app-status-dot", className]}
    data-status={status}
    data-pulse={pulse ? "" : undefined}
    aria-label={computedAriaLabel}
    {@attach tooltip({ text: WORK_APP_STATUS_DEFAULTS[status], placement: "bottom", offset: "24px" })}
>
    <!-- Important so that we can use HitArea -->
    {@render children?.()}
</button>

<style>
    @layer components.composite {
        .cs-work-app-status-dot {
            position: relative;
            display: block;
            width: 12px;
            height: 12px;
            padding: 0;
            background-color: var(--_dot-color);
            border: none;
            border-radius: var(--cs-radius-full);
            cursor: default;

            &[data-status="success"] {
                --_dot-color: var(--cs-color-success-solid);
            }

            &[data-status="warning"] {
                --_dot-color: var(--cs-color-warning-solid);
            }

            &[data-status="danger"] {
                --_dot-color: var(--cs-color-danger-solid);
            }

            &[data-status="base"] {
                --_dot-color: var(--cs-color-base-400);
            }

            &[data-pulse]::before,
            &[data-pulse]::after {
                content: "";
                position: absolute;
                inset: 0;
                background-color: inherit;
                border-radius: inherit;
                pointer-events: none;
            }

            /* Inner pulse ring: closer to core dot, softer */
            &[data-pulse]::after {
                opacity: 0.6;
                animation: cs-status-ping-inner 2.4s var(--cs-ease-cubic-out) infinite;
            }

            /* Outer pulse ring: further out, even more delicate and faint */
            &[data-pulse]::before {
                opacity: 0.3;
                animation: cs-status-ping-outer 2.4s var(--cs-ease-cubic-out) infinite;
            }
        }

        @keyframes cs-status-ping-inner {
            0% {
                opacity: 0.6;
                transform: scale(1);
            }

            65%,
            100% {
                opacity: 0;
                transform: scale(1.85);
            }
        }

        @keyframes cs-status-ping-outer {
            0% {
                opacity: 0.3;
                transform: scale(1);
            }

            75%,
            100% {
                opacity: 0;
                transform: scale(2.6);
            }
        }
    }
</style>
