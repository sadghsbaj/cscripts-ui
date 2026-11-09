<!--
@component
Cockpit status indicator pill (`<WorkAppStatusPill />`) for displaying connection,
filesystem, or system state in `<WorkAppHeader>`.

Architectural Notes:
- Geometry: Perfectly sized 48x48 squircle pill matching the theme and help buttons (`rounded-full squircle bg-elevation-1`).
- Telemetry: 12px live LED status dot with calm halo ping driven by `--cs-ease-cubic-out`.
- Managed Accessibility: Automatically generates a strict `aria-label` from status and label state.
- Interactivity: Operates as an indicator button with native default cursor and tactile spring feedback.
-->
<script lang="ts">
    import { WORK_APP_STATUS_DEFAULTS, type WorkAppStatusPillProps } from "./index.ts";

    let { status = "success", label, pulse = true, class: className, ...rest }: WorkAppStatusPillProps = $props();

    const displayLabel = $derived(label ?? WORK_APP_STATUS_DEFAULTS[status]);
    const computedAriaLabel = $derived(`${displayLabel} (${status})`);
</script>

<button
    {...rest}
    type="button"
    class={["cs-work-app-status-pill", className]}
    data-status={status}
    aria-label={computedAriaLabel}
>
    <span class="cs-work-app-status-dot" data-pulse={pulse ? "" : undefined}></span>
</button>

<style>
    @layer components.composite {
        .cs-work-app-status-pill {
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            height: 48px;
            padding-inline: 16px;
            background-color: var(--cs-color-elevation-1);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-elevation-1);

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
        }

        .cs-work-app-status-dot {
            position: relative;
            display: block;
            width: 12px;
            height: 12px;
            background-color: var(--_dot-color, var(--cs-color-success-solid));
            border-radius: var(--cs-radius-full);

            &[data-pulse]::after {
                content: "";
                position: absolute;
                inset: 0;
                background-color: inherit;
                border-radius: inherit;
                opacity: 0.75;
                animation: cs-status-ping 2.2s var(--cs-ease-cubic-out) infinite;
                pointer-events: none;
            }
        }

        @keyframes cs-status-ping {
            0% {
                opacity: 0.75;
                transform: scale(1);
            }

            70%,
            100% {
                opacity: 0;
                transform: scale(2.2);
            }
        }
    }
</style>
