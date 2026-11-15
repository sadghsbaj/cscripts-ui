<script lang="ts">
    import { Check, Copy, X } from "@lucide/svelte";

    import Sparkle from "./Sparkle.internal.svelte";
    import type { CopyIconProps } from "./index.ts";

    let {
        ref = $bindable(null),
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
    bind:this={ref}
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

    <Sparkle preset="copy" />
</span>

<style>
    @layer components.primitive {
        .cs-copy-icon {
            --cs-copy-icon-status-fg-positive: var(--cs-copy-icon-fg-positive, var(--cs-color-positive-500));
            --cs-copy-icon-status-fg-negative: var(--cs-copy-icon-fg-negative, var(--cs-color-negative-500));

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
                --cs-copy-icon-status-fg-positive: var(--cs-copy-icon-fg-positive, currentColor);
                --cs-copy-icon-status-fg-negative: var(--cs-copy-icon-fg-negative, currentColor);
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
                color: var(--cs-copy-icon-status-fg-positive);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--cs-copy-icon-status-fg-positive) 40%, transparent));
            }

            > :global(.cs-copy-icon-error) {
                color: var(--cs-copy-icon-status-fg-negative);
                filter: drop-shadow(0 0 4px color-mix(in oklch, var(--cs-copy-icon-status-fg-negative) 40%, transparent));
            }

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

                > :global(.cs-sparkle) {
                    display: block;
                }
            }

            &:is([data-copied], :global([data-copied]) &) {
                --cs-sparkle-fg: var(--cs-copy-icon-status-fg-positive);

                > :global(.cs-copy-icon-check) {
                    transform: scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }

            &:is([data-copy-error], :global([data-copy-error]) &) {
                --cs-sparkle-fg: var(--cs-copy-icon-status-fg-negative);

                > :global(.cs-copy-icon-error) {
                    transform: scale(1) rotate(0deg);
                    opacity: 1;
                    transition:
                        transform 260ms var(--cs-ease-back-out),
                        opacity 180ms var(--cs-ease-sine-out);
                }
            }
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
    }
</style>
