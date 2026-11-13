<!--
@component
Animated clipboard paste feedback icon (`<PasteIcon />`) with clipboard-to-checkmark/error
morphing, empty-clipboard headshake feedback, and micro-sparkle burst particles.

Architectural Notes:
- Zero-Boilerplate Attachment Integration: Automatically reacts to `data-pasted`,
  `data-paste-empty`, `data-paste-error`, and `data-paste-pending` attributes placed on any
  parent trigger by the `pasteOnClick` attachment, while also supporting explicit state props.
- Tactile Empty State: When the clipboard is empty (`data-paste-empty`), the clipboard glyph
  remains in place and performs a crisp horizontal "no" headshake without shifting into a
  confusing third icon or color.
-->
<script lang="ts">
    import { Check, Clipboard, X } from "@lucide/svelte";

    import type { PasteIconProps } from "./index.ts";

    let {
        status,
        pasted,
        empty,
        error,
        pending,
        class: className,
        ...rest
    }: PasteIconProps = $props();

    const resolvedPasted = $derived(status === "pasted" || Boolean(pasted));
    const resolvedEmpty = $derived(status === "empty" || Boolean(empty));
    const resolvedError = $derived(status === "error" || Boolean(error));
    const resolvedPending = $derived(status === "pending" || Boolean(pending));
</script>

<span
    {...rest}
    aria-hidden="true"
    class={["cs-paste-icon", className]}
    data-pasted={resolvedPasted ? "" : undefined}
    data-paste-empty={resolvedEmpty ? "" : undefined}
    data-paste-error={resolvedError ? "" : undefined}
    data-paste-pending={resolvedPending ? "" : undefined}
>
    <Clipboard aria-hidden="true" class="cs-paste-icon-glyph" />
    <Check aria-hidden="true" class="cs-paste-icon-status cs-paste-icon-check" />
    <X aria-hidden="true" class="cs-paste-icon-status cs-paste-icon-error" />

    <span class="cs-paste-icon-particles" aria-hidden="true">
        <svg viewBox="0 0 16 16" class="cs-paste-icon-particle cs-paste-icon-star-1">
            <path d="M8 0C8 4.4 11.6 8 16 8C11.6 8 8 11.6 8 16C8 11.6 4.4 8 0 8C4.4 8 8 4.4 8 0Z" />
        </svg>
        <svg viewBox="0 0 16 16" class="cs-paste-icon-particle cs-paste-icon-star-2">
            <path d="M8 0C8 4.4 11.6 8 16 8C11.6 8 8 11.6 8 16C8 11.6 4.4 8 0 8C4.4 8 8 4.4 8 0Z" />
        </svg>

        <span class="cs-paste-icon-particle cs-paste-icon-dot-1"></span>
        <span class="cs-paste-icon-particle cs-paste-icon-dot-2"></span>
        <span class="cs-paste-icon-particle cs-paste-icon-dot-3"></span>
        <span class="cs-paste-icon-particle cs-paste-icon-dot-4"></span>
    </span>
</span>

<style>
    @layer components.primitive {
        .cs-paste-icon {
            --_check-color: var(--cs-paste-icon-check-color, var(--cs-color-success-500));
            --_error-color: var(--cs-paste-icon-error-color, var(--cs-color-danger-500));

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
                --_check-color: var(--cs-paste-icon-check-color, currentColor);
                --_error-color: var(--cs-paste-icon-error-color, currentColor);
            }

            > :global(svg) {
                width: 100%;
                height: 100%;
                display: block;
                stroke-width: inherit;
                pointer-events: none;
            }

            > :global(.cs-paste-icon-glyph) {
                transform: translateY(0) scale(1) rotate(0deg);
                opacity: 1;
                transition:
                    transform 200ms var(--cs-ease-cubic-out),
                    opacity 180ms var(--cs-ease-sine-out);
            }

            /* Status icons start slightly elevated so pasting feels like dropping content in */
            > :global(.cs-paste-icon-status) {
                position: absolute;
                inset: 0;
                transform: translateY(-3px) scale(0.5) rotate(-15deg);
                opacity: 0;
                transition:
                    transform 200ms var(--cs-ease-cubic-out),
                    opacity 150ms var(--cs-ease-sine-out);
            }

            > :global(.cs-paste-icon-check) {
                color: var(--_check-color);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--_check-color) 40%, transparent));
            }

            > :global(.cs-paste-icon-error) {
                color: var(--_error-color);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--_error-color) 40%, transparent));
            }

            /* =========================================================
             * STATE TRIGGERS (Direct Props OR Ancestor Attachment)
             * ========================================================= */
            &:is([data-paste-pending], :global([data-paste-pending]) &) {
                > :global(.cs-paste-icon-glyph) {
                    animation: cs-paste-icon-pulse 1.2s var(--cs-ease-sine-in-out) infinite;
                }
            }

            /* Empty clipboard: Keep the clipboard glyph visible and shake its head ("nothing to paste") */
            &:is([data-paste-empty], :global([data-paste-empty]) &) {
                > :global(.cs-paste-icon-glyph) {
                    animation: cs-paste-empty-shake 380ms var(--cs-ease-cubic-out);
                }
            }

            &:is([data-pasted], [data-paste-error], :global([data-pasted]) &, :global([data-paste-error]) &) {
                > :global(.cs-paste-icon-glyph) {
                    transform: translateY(2px) scale(0.6) rotate(-12deg);
                    opacity: 0;
                    transition:
                        transform 200ms var(--cs-ease-cubic-out),
                        opacity 150ms var(--cs-ease-sine-out);
                }

                > .cs-paste-icon-particles {
                    display: block;
                }
            }

            &:is([data-pasted], :global([data-pasted]) &) {
                --_sparkle-color: var(--_check-color);

                > :global(.cs-paste-icon-check) {
                    transform: translateY(0) scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }

            &:is([data-paste-error], :global([data-paste-error]) &) {
                --_sparkle-color: var(--_error-color);

                > :global(.cs-paste-icon-error) {
                    transform: translateY(0) scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }
        }

        /* =========================================================
         * MICRO-SPARKLES BURST
         * ========================================================= */
        .cs-paste-icon-particles {
            display: none;
            position: absolute;
            inset: 0;
            pointer-events: none;
        }

        .cs-paste-icon-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            opacity: 0;
            pointer-events: none;
        }

        .cs-paste-icon-star-1,
        .cs-paste-icon-star-2 {
            fill: currentColor;
            color: var(--_sparkle-color);
        }

        .cs-paste-icon-dot-1,
        .cs-paste-icon-dot-2,
        .cs-paste-icon-dot-3,
        .cs-paste-icon-dot-4 {
            border-radius: var(--cs-radius-full);
            background-color: var(--_sparkle-color);
        }

        .cs-paste-icon-star-1 {
            width: 6.5px;
            height: 6.5px;
            animation: cs-paste-star-burst-1 460ms var(--cs-ease-quart-out) forwards;
        }

        .cs-paste-icon-star-2 {
            width: 5px;
            height: 5px;
            animation: cs-paste-star-burst-2 420ms var(--cs-ease-quart-out) 35ms forwards;
        }

        .cs-paste-icon-dot-1 {
            width: 2.2px;
            height: 2.2px;
            animation: cs-paste-dot-burst-1 380ms var(--cs-ease-quart-out) 15ms forwards;
        }

        .cs-paste-icon-dot-2 {
            width: 2px;
            height: 2px;
            animation: cs-paste-dot-burst-2 400ms var(--cs-ease-quart-out) 40ms forwards;
        }

        .cs-paste-icon-dot-3 {
            width: 1.8px;
            height: 1.8px;
            animation: cs-paste-dot-burst-3 360ms var(--cs-ease-quart-out) 20ms forwards;
        }

        .cs-paste-icon-dot-4 {
            width: 2.2px;
            height: 2.2px;
            animation: cs-paste-dot-burst-4 410ms var(--cs-ease-quart-out) 50ms forwards;
        }

        @keyframes cs-paste-icon-pulse {
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

        @keyframes cs-paste-empty-shake {
            0%,
            100% {
                translate: 0 0;
                rotate: 0deg;
                opacity: 1;
            }
            20% {
                translate: -2.5px 0;
                rotate: -6deg;
                opacity: 0.55;
            }
            45% {
                translate: 2.5px 0;
                rotate: 6deg;
                opacity: 0.55;
            }
            70% {
                translate: -1.5px 0;
                rotate: -3deg;
                opacity: 0.75;
            }
            85% {
                translate: 1px 0;
                rotate: 2deg;
            }
        }

        @keyframes cs-paste-star-burst-1 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(calc(-50% - 9px), calc(-50% - 7px)) scale(1.3) rotate(-45deg);
                opacity: 1;
            }
            60% {
                transform: translate(calc(-50% - 12px), calc(-50% - 9px)) scale(0.9) rotate(-70deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(calc(-50% - 14px), calc(-50% - 10px)) scale(0) rotate(-90deg);
                opacity: 0;
            }
        }

        @keyframes cs-paste-star-burst-2 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            30% {
                transform: translate(calc(-50% + 8px), calc(-50% + 6px)) scale(1.15) rotate(30deg);
                opacity: 1;
            }
            65% {
                transform: translate(calc(-50% + 11px), calc(-50% + 8px)) scale(0.85) rotate(50deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(calc(-50% + 12px), calc(-50% + 9px)) scale(0) rotate(65deg);
                opacity: 0;
            }
        }

        @keyframes cs-paste-dot-burst-1 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 8px), calc(-50% - 9px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 10px), calc(-50% - 11px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-paste-dot-burst-2 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 5px), calc(-50% - 12px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 7px), calc(-50% - 14px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-paste-dot-burst-3 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 11px), calc(-50% + 2px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 14px), calc(-50% + 3px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-paste-dot-burst-4 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 7px), calc(-50% + 9px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 9px), calc(-50% + 12px)) scale(0);
                opacity: 0;
            }
        }
    }
</style>
