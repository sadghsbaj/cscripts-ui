<script lang="ts">
    import { setBadgeContext } from "./badge.context.internal.ts";
    import type { BadgeProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        color,
        size,
        iconOnly = false,
        class: className,
        children,
        ...rest
    }: BadgeProps = $props();

    setBadgeContext({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
    });
</script>

<span
    bind:this={ref}
    {...rest}
    class={["cs-badge", className]}
    data-variant={variant}
    data-color={color}
    data-size={size}
    data-icon-only={iconOnly ? "" : undefined}
>
    {#if variant === "dot"}
        <span class="cs-badge-dot" aria-hidden="true"></span>
    {/if}
    {@render children?.()}
</span>

<style>
    @layer components.primitive {
        .cs-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--cs-badge-gap);
            width: fit-content;
            min-inline-size: var(--cs-badge-height);
            block-size: var(--cs-badge-height);
            padding-inline: var(--cs-badge-px);
            vertical-align: middle;
            font-family: var(--cs-font-sans);
            font-size: var(--cs-badge-font-size);
            font-weight: 500;
            font-variant-numeric: tabular-nums;
            line-height: var(--cs-leading-none);
            white-space: nowrap;
            color: var(--cs-badge-fg);
            background: var(--cs-badge-bg);
            box-shadow: var(--cs-badge-shadow, none);
            border-radius: calc(var(--cs-badge-height) / 2);
            corner-shape: var(--cs-squircle-soft);
            transition: none;

            &[data-size="xs"] {
                --cs-badge-height: 18px;
                --cs-badge-px: 5px;
                --cs-badge-font-size: 10px;
                --cs-badge-icon-size: 11px;
                --cs-badge-gap: 3px;
                --cs-badge-dot-size: 5px;
            }

            &[data-size="sm"] {
                --cs-badge-height: 20px;
                --cs-badge-px: 6px;
                --cs-badge-font-size: 11px;
                --cs-badge-icon-size: 12px;
                --cs-badge-gap: 3px;
                --cs-badge-dot-size: 6px;
            }

            &[data-size="md"] {
                --cs-badge-height: 24px;
                --cs-badge-px: 8px;
                --cs-badge-font-size: var(--cs-text-xs);
                --cs-badge-icon-size: 14px;
                --cs-badge-gap: 4px;
                --cs-badge-dot-size: 6px;
            }

            &[data-size="lg"] {
                --cs-badge-height: 28px;
                --cs-badge-px: 10px;
                --cs-badge-font-size: 13px;
                --cs-badge-icon-size: 15px;
                --cs-badge-gap: 5px;
                --cs-badge-dot-size: 7px;
            }

            &[data-size="xl"] {
                --cs-badge-height: 32px;
                --cs-badge-px: 12px;
                --cs-badge-font-size: var(--cs-text-sm);
                --cs-badge-icon-size: 16px;
                --cs-badge-gap: 6px;
                --cs-badge-dot-size: 8px;
            }

            &[data-icon-only] {
                aspect-ratio: 1;
                padding-inline: 0;
            }

            /* Tighten padding on the icon/dot side by 1px for optical balance against flat text edges. */
            &:not([data-icon-only]) {
                &:has(> :is(:global(.cs-badge-icon), .cs-badge-dot):first-child) {
                    padding-inline-start: calc(var(--cs-badge-px) - 1px);
                }

                &:has(> :global(.cs-badge-icon):last-child) {
                    padding-inline-end: calc(var(--cs-badge-px) - 1px);
                }
            }

            &[data-variant="soft"] {
                --cs-badge-shadow: none;

                &:not([data-color="base"]) {
                    &::selection,
                    & :global(::selection) {
                        color: var(--cs-badge-selection-fg);
                        background-color: var(--cs-badge-selection-bg);
                    }
                }

                &[data-color="base"] {
                    --cs-badge-bg: var(--cs-color-base-soft);
                    --cs-badge-fg: var(--cs-color-base-soft-fg);
                }

                &[data-color="accent"] {
                    --cs-badge-bg: var(--cs-color-accent-soft);
                    --cs-badge-fg: var(--cs-color-accent-soft-fg);
                    --cs-badge-selection-bg: var(--cs-color-accent-solid);
                    --cs-badge-selection-fg: var(--cs-color-accent-solid-fg);
                }

                &[data-color="positive"] {
                    --cs-badge-bg: var(--cs-color-positive-soft);
                    --cs-badge-fg: var(--cs-color-positive-soft-fg);
                    --cs-badge-selection-bg: var(--cs-color-positive-solid);
                    --cs-badge-selection-fg: var(--cs-color-positive-solid-fg);
                }

                &[data-color="caution"] {
                    --cs-badge-bg: var(--cs-color-caution-soft);
                    --cs-badge-fg: var(--cs-color-caution-soft-fg);
                    --cs-badge-selection-bg: var(--cs-color-caution-solid);
                    --cs-badge-selection-fg: var(--cs-color-caution-solid-fg);
                }

                &[data-color="negative"] {
                    --cs-badge-bg: var(--cs-color-negative-soft);
                    --cs-badge-fg: var(--cs-color-negative-soft-fg);
                    --cs-badge-selection-bg: var(--cs-color-negative-solid);
                    --cs-badge-selection-fg: var(--cs-color-negative-solid-fg);
                }
            }

            &[data-variant="solid"] {
                --cs-badge-shadow: var(--cs-shadow-solid-active);

                &:is([data-size="xs"], [data-size="sm"]) {
                    font-weight: 600;
                }

                &::selection,
                & :global(::selection) {
                    color: var(--cs-badge-bg);
                    background-color: var(--cs-badge-fg);
                }

                &[data-color="base"] {
                    --cs-badge-bg: var(--cs-color-base-solid);
                    --cs-badge-fg: var(--cs-color-base-solid-fg);
                }

                &[data-color="accent"] {
                    --cs-badge-bg: var(--cs-color-accent-solid);
                    --cs-badge-fg: var(--cs-color-accent-solid-fg);
                }

                &[data-color="positive"] {
                    --cs-badge-bg: var(--cs-color-positive-solid);
                    --cs-badge-fg: var(--cs-color-positive-solid-fg);
                }

                &[data-color="caution"] {
                    --cs-badge-bg: var(--cs-color-caution-solid);
                    --cs-badge-fg: var(--cs-color-caution-solid-fg);
                }

                &[data-color="negative"] {
                    --cs-badge-bg: var(--cs-color-negative-solid);
                    --cs-badge-fg: var(--cs-color-negative-solid-fg);
                }
            }

            &[data-variant="dot"] {
                --cs-badge-bg: transparent;
                --cs-badge-fg: var(--cs-color-text-main);
                --cs-badge-shadow: none;

                &[data-color="base"] {
                    --cs-badge-dot-bg: var(--cs-color-text-weak);
                }

                &[data-color="accent"] {
                    --cs-badge-dot-bg: var(--cs-color-accent-solid);
                }

                &[data-color="positive"] {
                    --cs-badge-dot-bg: var(--cs-color-positive-solid);
                }

                &[data-color="caution"] {
                    --cs-badge-dot-bg: var(--cs-color-caution-solid);
                }

                &[data-color="negative"] {
                    --cs-badge-dot-bg: var(--cs-color-negative-solid);
                }
            }
        }

        .cs-badge-dot {
            flex-shrink: 0;
            inline-size: var(--cs-badge-dot-size);
            block-size: var(--cs-badge-dot-size);
            border-radius: var(--cs-radius-full);
            background-color: var(--cs-badge-dot-bg);
        }
    }
</style>
