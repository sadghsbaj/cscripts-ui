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
            background-color: var(--cs-work-app-status-dot-bg);
            border: none;
            border-radius: var(--cs-radius-full);
            transition:
                scale var(--cs-dur-effect) var(--cs-ease-effect),
                background-color var(--cs-dur-effect) var(--cs-ease-effect);
            cursor: default;

            @media (hover: hover) {
                &:hover {
                    scale: 1.25;
                }
            }

            &:active {
                scale: 0.92;
            }

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

            &[data-pulse]::before,
            &[data-pulse]::after {
                content: "";
                position: absolute;
                inset: 0;
                background-color: inherit;
                border-radius: inherit;
                transition: background-color var(--cs-dur-effect) var(--cs-ease-effect);
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
