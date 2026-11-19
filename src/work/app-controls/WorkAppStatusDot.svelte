<script lang="ts">
    import { tooltip } from "../../modules/tooltip/tooltip.attach.svelte.ts";
    import { WORK_APP_STATUS_DEFAULTS, type WorkAppStatusDotProps } from "./index.ts";

    let {
        status = "positive",
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
    {@attach tooltip({ text: displayLabel, placement: "bottom", offset: "24px" })}
>
    <span class="cs-work-app-status-dot-core" aria-hidden="true"></span>
    <!-- Important so that we can use HitArea -->
    {@render children?.()}
</button>

<style>
    @layer components.composite {
        .cs-work-app-status-dot {
            position: relative;
            display: block;
            width: 10px;
            height: 10px;
            padding: 0;
            background: transparent;
            border: none;
            border-radius: var(--cs-radius-full);
            cursor: default;

            &[data-status="positive"] {
                --cs-work-app-status-dot-bg: var(--cs-color-positive-solid);
            }

            &[data-status="caution"] {
                --cs-work-app-status-dot-bg: var(--cs-color-caution-solid);
            }

            &[data-status="negative"] {
                --cs-work-app-status-dot-bg: var(--cs-color-negative-solid);
            }

            &[data-status="base"] {
                --cs-work-app-status-dot-bg: var(--cs-color-base-400);
            }
        }

        /* Keep scale/pulse on the inner core so the outer button anchor never shifts. */
        .cs-work-app-status-dot-core {
            position: relative;
            display: block;
            width: 100%;
            height: 100%;
            background-color: var(--cs-work-app-status-dot-bg);
            border-radius: var(--cs-radius-full);
            transition:
                scale var(--cs-dur-effect) var(--cs-ease-effect),
                background-color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        @media (hover: hover) {
            .cs-work-app-status-dot:hover .cs-work-app-status-dot-core {
                scale: 1.18;
            }
        }

        .cs-work-app-status-dot:active .cs-work-app-status-dot-core {
            scale: 0.92;
        }

        .cs-work-app-status-dot[data-pulse] .cs-work-app-status-dot-core::before,
        .cs-work-app-status-dot[data-pulse] .cs-work-app-status-dot-core::after {
            content: "";
            position: absolute;
            inset: 0;
            background-color: inherit;
            border-radius: inherit;
            transition: background-color var(--cs-dur-effect) var(--cs-ease-effect);
            pointer-events: none;
        }

        /* Inner pulse ring: closer to core dot, softer */
        .cs-work-app-status-dot[data-pulse] .cs-work-app-status-dot-core::after {
            opacity: 0.6;
            animation: cs-status-ping-inner 2.4s var(--cs-ease-cubic-out) infinite;
        }

        /* Outer pulse ring: further out, even more delicate and faint */
        .cs-work-app-status-dot[data-pulse] .cs-work-app-status-dot-core::before {
            opacity: 0.3;
            animation: cs-status-ping-outer 2.4s var(--cs-ease-cubic-out) infinite;
        }

        @keyframes cs-status-ping-inner {
            0% {
                opacity: 0.6;
                transform: scale(1);
            }

            65%,
            100% {
                opacity: 0;
                transform: scale(1.75);
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
                transform: scale(2.2);
            }
        }
    }
</style>
