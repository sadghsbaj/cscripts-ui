<script lang="ts">
    import { Check, Clipboard, X } from "@lucide/svelte";

    import Sparkle from "./Sparkle.internal.svelte";
    import type { PasteIconProps } from "./index.ts";

    let {
        ref = $bindable(null),
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
    bind:this={ref}
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

    <Sparkle preset="paste" />
</span>

<style>
    @layer components.primitive {
        .cs-paste-icon {
            --cs-paste-icon-status-fg-positive: var(--cs-paste-icon-fg-positive, var(--cs-color-positive-500));
            --cs-paste-icon-status-fg-negative: var(--cs-paste-icon-fg-negative, var(--cs-color-negative-500));

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
                --cs-paste-icon-status-fg-positive: var(--cs-paste-icon-fg-positive, currentColor);
                --cs-paste-icon-status-fg-negative: var(--cs-paste-icon-fg-negative, currentColor);
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
                color: var(--cs-paste-icon-status-fg-positive);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--cs-paste-icon-status-fg-positive) 40%, transparent));
            }

            > :global(.cs-paste-icon-error) {
                color: var(--cs-paste-icon-status-fg-negative);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--cs-paste-icon-status-fg-negative) 40%, transparent));
            }

            &:is([data-paste-pending], :global([data-paste-pending]) &) {
                > :global(.cs-paste-icon-glyph) {
                    animation: cs-paste-icon-pulse 1.2s var(--cs-ease-sine-in-out) infinite;
                }
            }

            /* Empty clipboard: keep the clipboard glyph visible and shake its head ("nothing to paste") */
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

                > :global(.cs-sparkle) {
                    display: block;
                }
            }

            &:is([data-pasted], :global([data-pasted]) &) {
                --cs-sparkle-fg: var(--cs-paste-icon-status-fg-positive);

                > :global(.cs-paste-icon-check) {
                    transform: translateY(0) scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }

            &:is([data-paste-error], :global([data-paste-error]) &) {
                --cs-sparkle-fg: var(--cs-paste-icon-status-fg-negative);

                > :global(.cs-paste-icon-error) {
                    transform: translateY(0) scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }
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
    }
</style>
