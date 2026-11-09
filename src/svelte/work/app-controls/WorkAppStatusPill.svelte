<!--
@component
Cockpit status indicator pill (`<WorkAppStatusPill />`) for displaying connection,
filesystem, or system state in `<WorkAppHeader>`.

Architectural Notes:
- Geometry: 48px height matching the tool identity and brand badges (`rounded-full squircle bg-elevation-1`).
- Horizontal Flow: 10px live LED status dot with calm halo ping paired side-by-side with 13px typography.
- Managed Accessibility: Automatically generates a strict `aria-label` from status and label state.
- Interactivity: Operates as an indicator button with native default cursor and tactile spring squash on press.
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
    <span class="cs-work-app-status-label text-trim-truncate">{displayLabel}</span>
</button>

<style>
    @layer components.composite {
        .cs-work-app-status-pill {
            display: inline-flex;
            flex-shrink: 0;
            flex-direction: row;
            gap: 10px;
            align-items: center;
            justify-content: center;
            height: 48px;
            padding-inline: 16px;
            background-color: var(--cs-color-elevation-1);
            border: none;
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-elevation-1);
            user-select: none;
            transition:
                box-shadow 200ms var(--cs-ease-quad-out),
                scale 200ms var(--cs-ease-expo-out);
            cursor: default;

            @media (hover: hover) {
                &:hover {
                    box-shadow: var(--cs-shadow-elevation-1-hover);
                }
            }

            &:active {
                scale: var(--cs-squash-subtle, 0.98);
            }

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
            width: 10px;
            height: 10px;
            background-color: var(--_dot-color, var(--cs-color-success-solid));
            border-radius: var(--cs-radius-full);
            box-shadow: 0 0 0 1.5px var(--cs-color-elevation-1);

            &[data-pulse]::after {
                content: "";
                position: absolute;
                inset: 0;
                background-color: inherit;
                border-radius: inherit;
                opacity: 0.75;
                animation: cs-status-ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
                pointer-events: none;
            }
        }

        .cs-work-app-status-label {
            color: var(--cs-color-text-main);
            font-size: 13px;
            font-weight: 550;
            line-height: 1;
            letter-spacing: -0.01em;
            white-space: nowrap;
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
