<!--
@component
Cockpit status indicator pill (`<WorkAppStatusPill />`) for displaying connection,
filesystem, or system state in `<WorkAppHeader>`.

Architectural Notes:
- Geometry: 48px height matching the tool identity and brand badges (`rounded-full squircle bg-elevation-1`).
- Vertical Hierarchy: Centered semantic pulse dot stacked above compact micro-typography (11px).
- Interactivity: Operates as an accessible button with tactile spring squash on press, ready for directory chooser or connection dialog triggers.
-->
<script lang="ts">
    import type { WorkAppStatusPillProps } from "./index.ts";

    let {
        status = "success",
        label = "Verbunden",
        pulse = true,
        "aria-label": ariaLabel,
        class: className,
        ...rest
    }: WorkAppStatusPillProps = $props();
</script>

<button
    type="button"
    aria-label={ariaLabel ?? `${label} (${status})`}
    class={["cs-work-app-status-pill", className]}
    data-status={status}
    {...rest}
>
    <span class="cs-work-app-status-dot" data-pulse={pulse ? "" : undefined}></span>
    <span class="cs-work-app-status-label text-trim-truncate">{label}</span>
</button>

<style>
    @layer components.composite {
        .cs-work-app-status-pill {
            display: inline-flex;
            flex-shrink: 0;
            flex-direction: column;
            gap: 4px;
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
            cursor: pointer;

            @media (hover: hover) {
                &:hover {
                    box-shadow: var(--cs-shadow-elevation-1-hover);

                    .cs-work-app-status-label {
                        color: var(--cs-color-text-main);
                    }
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
            width: 7px;
            height: 7px;
            background-color: var(--_dot-color, var(--cs-color-success-solid));
            border-radius: var(--cs-radius-full);

            &[data-pulse]::after {
                content: "";
                position: absolute;
                inset: 0;
                background-color: inherit;
                border-radius: inherit;
                opacity: 0.75;
                animation: cs-status-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                pointer-events: none;
            }
        }

        .cs-work-app-status-label {
            color: var(--cs-color-text-weak);
            font-size: 11px;
            font-weight: 600;
            line-height: 1;
            letter-spacing: 0.02em;
            white-space: nowrap;
            transition: color 200ms var(--cs-ease-quad-out);
        }

        @keyframes cs-status-ping {
            0% {
                opacity: 0.75;
                transform: scale(1);
            }

            75%,
            100% {
                opacity: 0;
                transform: scale(2.4);
            }
        }
    }
</style>
