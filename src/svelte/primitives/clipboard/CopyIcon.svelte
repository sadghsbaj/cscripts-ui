<!--
@component
Animated clipboard feedback icon (`<CopyIcon />`) with copy-to-checkmark/error morphing
and micro-sparkle burst particles.

Architectural Notes:
- Zero-Boilerplate Attachment Integration: Automatically reacts to `data-copied`,
  `data-copy-error`, and `data-copy-pending` attributes placed on any parent trigger by the
  `copyOnClick` attachment, while also supporting explicit `status` / `copied` / `error` props.
- Compound Button Compatibility: Works standalone (`<CopyIcon />`) inside `<Button>`,
  `<ToggleButton>`, or custom triggers, and seamlessly accepts `<ButtonIcon icon={CopyIcon} />`
  props (`stroke-width` inheritance and `50%` icon-only scaling).
-->
<script lang="ts">
    import { Check, Copy, X } from "@lucide/svelte";

    import type { CopyIconProps } from "./index.ts";

    let {
        status,
        copied,
        error,
        pending,
        class: className,
        ...rest
    }: CopyIconProps = $props();

    const resolvedCopied = $derived(status === "copied" || Boolean(copied));
    const resolvedError = $derived(status === "error" || Boolean(error));
    const resolvedPending = $derived(status === "pending" || Boolean(pending));
</script>

<span
    {...rest}
    aria-hidden="true"
    class={["cs-copy-icon", className]}
    data-copied={resolvedCopied ? "" : undefined}
    data-copy-error={resolvedError ? "" : undefined}
    data-copy-pending={resolvedPending ? "" : undefined}
>
    <Copy aria-hidden="true" class="cs-copy-icon-glyph" />
    <Check aria-hidden="true" class="cs-copy-icon-status cs-copy-icon-check" />
    <X aria-hidden="true" class="cs-copy-icon-status cs-copy-icon-error" />

    <span class="cs-copy-icon-particles" aria-hidden="true">
        <svg viewBox="0 0 16 16" class="cs-copy-icon-particle cs-copy-icon-star-1">
            <path d="M8 0C8 4.4 11.6 8 16 8C11.6 8 8 11.6 8 16C8 11.6 4.4 8 0 8C4.4 8 8 4.4 8 0Z" />
        </svg>
        <svg viewBox="0 0 16 16" class="cs-copy-icon-particle cs-copy-icon-star-2">
            <path d="M8 0C8 4.4 11.6 8 16 8C11.6 8 8 11.6 8 16C8 11.6 4.4 8 0 8C4.4 8 8 4.4 8 0Z" />
        </svg>

        <span class="cs-copy-icon-particle cs-copy-icon-dot-1"></span>
        <span class="cs-copy-icon-particle cs-copy-icon-dot-2"></span>
        <span class="cs-copy-icon-particle cs-copy-icon-dot-3"></span>
        <span class="cs-copy-icon-particle cs-copy-icon-dot-4"></span>
    </span>
</span>

<style>
    @layer components.primitive {
        .cs-copy-icon {
            --_check-color: var(--cs-copy-icon-check-color, var(--cs-color-success-500));
            --_error-color: var(--cs-copy-icon-error-color, var(--cs-color-danger-500));

            isolation: isolate;
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            width: calc(1em + 2px);
            height: calc(1em + 2px);
            stroke-width: 2.25;
            user-select: none;
            pointer-events: none;

            /* Automatic 50% optical scaling when placed directly inside icon-only buttons */
            :global(:is(.cs-button, .cs-toggle-button)[data-icon-only]) > & {
                width: 50%;
                height: 50%;
            }

            /* Inherit high-contrast foreground color on primary solid button surfaces */
            :global(:is(.cs-button, .cs-toggle-button)[data-variant="primary"]) > & {
                --_check-color: var(--cs-copy-icon-check-color, currentColor);
                --_error-color: var(--cs-copy-icon-error-color, currentColor);
            }

            > :global(svg) {
                width: 100%;
                height: 100%;
                display: block;
                stroke-width: inherit;
                pointer-events: none;
            }

            > :global(.cs-copy-icon-glyph) {
                transform: scale(1) rotate(0deg);
                opacity: 1;
                transition:
                    transform 200ms var(--cs-ease-cubic-out),
                    opacity 180ms var(--cs-ease-sine-out);
            }

            > :global(.cs-copy-icon-status) {
                position: absolute;
                inset: 0;
                transform: scale(0.5) rotate(-15deg);
                opacity: 0;
                transition:
                    transform 200ms var(--cs-ease-cubic-out),
                    opacity 150ms var(--cs-ease-sine-out);
            }

            > :global(.cs-copy-icon-check) {
                color: var(--_check-color);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--_check-color) 40%, transparent));
            }

            > :global(.cs-copy-icon-error) {
                color: var(--_error-color);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--_error-color) 40%, transparent));
            }

            /* =========================================================
             * STATE TRIGGERS (Direct Props OR Ancestor Attachment)
             * ---------------------------------------------------------
             * Matches both explicit state attributes on `<CopyIcon />` and
             * `data-copied` / `data-copy-error` set on an ancestor element
             * by `{@attach copyOnClick(...)}`.
             * ========================================================= */
            &:is([data-copy-pending], :global([data-copy-pending]) &) {
                > :global(.cs-copy-icon-glyph) {
                    animation: cs-copy-icon-pulse 1.2s var(--cs-ease-sine-in-out) infinite;
                }
            }

            &:is([data-copied], [data-copy-error], :global([data-copied]) &, :global([data-copy-error]) &) {
                > :global(.cs-copy-icon-glyph) {
                    transform: scale(0.6) rotate(-12deg);
                    opacity: 0;
                    transition:
                        transform 200ms var(--cs-ease-cubic-out),
                        opacity 150ms var(--cs-ease-sine-out);
                }

                > .cs-copy-icon-particles {
                    display: block;
                }
            }

            &:is([data-copied], :global([data-copied]) &) {
                --_sparkle-color: var(--_check-color);

                > :global(.cs-copy-icon-check) {
                    transform: scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }

            &:is([data-copy-error], :global([data-copy-error]) &) {
                --_sparkle-color: var(--_error-color);

                > :global(.cs-copy-icon-error) {
                    transform: scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }
        }

        /* =========================================================
         * MICRO-SPARKLES BURST
         * ---------------------------------------------------------
         * Toggling `display: none` -> `display: block` on feedback state
         * automatically restarts keyframe animations without JS timers.
         * ========================================================= */
        .cs-copy-icon-particles {
            display: none;
            position: absolute;
            inset: 0;
            pointer-events: none;
        }

        .cs-copy-icon-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            opacity: 0;
            pointer-events: none;
        }

        .cs-copy-icon-star-1,
        .cs-copy-icon-star-2 {
            fill: currentColor;
            color: var(--_sparkle-color);
        }

        .cs-copy-icon-dot-1,
        .cs-copy-icon-dot-2,
        .cs-copy-icon-dot-3,
        .cs-copy-icon-dot-4 {
            border-radius: var(--cs-radius-full);
            background-color: var(--_sparkle-color);
        }

        .cs-copy-icon-star-1 {
            width: 6.5px;
            height: 6.5px;
            animation: cs-copy-star-burst-1 460ms var(--cs-ease-quart-out) forwards;
        }

        .cs-copy-icon-star-2 {
            width: 5px;
            height: 5px;
            animation: cs-copy-star-burst-2 420ms var(--cs-ease-quart-out) 35ms forwards;
        }

        .cs-copy-icon-dot-1 {
            width: 2.2px;
            height: 2.2px;
            animation: cs-copy-dot-burst-1 380ms var(--cs-ease-quart-out) 15ms forwards;
        }

        .cs-copy-icon-dot-2 {
            width: 2px;
            height: 2px;
            animation: cs-copy-dot-burst-2 400ms var(--cs-ease-quart-out) 40ms forwards;
        }

        .cs-copy-icon-dot-3 {
            width: 1.8px;
            height: 1.8px;
            animation: cs-copy-dot-burst-3 360ms var(--cs-ease-quart-out) 20ms forwards;
        }

        .cs-copy-icon-dot-4 {
            width: 2.2px;
            height: 2.2px;
            animation: cs-copy-dot-burst-4 410ms var(--cs-ease-quart-out) 50ms forwards;
        }

        @keyframes cs-copy-icon-pulse {
            0%,
            100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.45;
                transform: scale(0.96);
            }
        }

        @keyframes cs-copy-star-burst-1 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(calc(-50% + 9px), calc(-50% - 8px)) scale(1.3) rotate(45deg);
                opacity: 1;
            }
            60% {
                transform: translate(calc(-50% + 12px), calc(-50% - 10px)) scale(0.9) rotate(70deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(calc(-50% + 14px), calc(-50% - 11px)) scale(0) rotate(90deg);
                opacity: 0;
            }
        }

        @keyframes cs-copy-star-burst-2 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            30% {
                transform: translate(calc(-50% - 8px), calc(-50% + 5px)) scale(1.15) rotate(-30deg);
                opacity: 1;
            }
            65% {
                transform: translate(calc(-50% - 11px), calc(-50% + 7px)) scale(0.85) rotate(-50deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(calc(-50% - 12px), calc(-50% + 8px)) scale(0) rotate(-65deg);
                opacity: 0;
            }
        }

        @keyframes cs-copy-dot-burst-1 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 7px), calc(-50% - 10px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 9px), calc(-50% - 12px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-copy-dot-burst-2 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 5px), calc(-50% - 12px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 7px), calc(-50% - 15px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-copy-dot-burst-3 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 11px), calc(-50% + 1px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 14px), calc(-50% + 2px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-copy-dot-burst-4 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 7px), calc(-50% + 9px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 9px), calc(-50% + 12px)) scale(0);
                opacity: 0;
            }
        }
    }
</style>
