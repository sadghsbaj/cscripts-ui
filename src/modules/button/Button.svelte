<script lang="ts">
    import "../../shared/button-control/button-control.css";
    import type { ButtonProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        negative,
        size,
        as = "button",
        iconOnly,
        class: className,
        children,
        ...rest
    }: ButtonProps = $props();
</script>

<svelte:element
    this={as}
    bind:this={ref}
    type={as === "button" ? "button" : undefined}
    {...rest}
    class={["cs-button", "cs-button-control", className]}
    data-variant={variant}
    data-negative={negative ? "" : undefined}
    data-size={size}
    data-icon-only={iconOnly ? "" : undefined}
>
    {@render children?.()}
</svelte:element>

<style>
    @layer components.primitive {
        .cs-button {
            /* Intent tokens (accent by default, overridden by [data-negative]) */
            --cs-button-solid-bg: var(--cs-color-accent-solid);
            --cs-button-solid-bg-hover: var(--cs-color-accent-solid-hover);
            --cs-button-solid-fg: var(--cs-color-accent-solid-fg);
            --cs-button-accent-fg: var(--cs-color-accent-soft-fg);

            /* Bridge module hooks to shared button-control variables */
            --cs-button-control-height: var(--cs-button-height, var(--cs-button-control-size-height));
            --cs-button-control-fg: var(--cs-button-fg);
            --cs-button-control-fg-hover: var(--cs-button-fg-hover, var(--cs-button-fg));
            --cs-button-control-bg: var(--cs-button-bg);
            --cs-button-control-bg-hover: var(--cs-button-bg-hover);
            --cs-button-control-shadow: var(--cs-button-shadow, none);
            --cs-button-control-shadow-hover: var(--cs-button-shadow-hover, var(--cs-button-shadow, none));
            --cs-button-control-shadow-active: var(--cs-button-shadow-active, none);
            --cs-button-control-squash-active: var(
                --cs-button-squash-active,
                var(--cs-button-control-default-squash, var(--cs-squash-subtle))
            );
            --cs-button-control-focus-scale-active: var(--cs-button-focus-scale-active, 0.97);

            &[data-negative] {
                --cs-button-solid-bg: var(--cs-color-negative-solid);
                --cs-button-solid-bg-hover: var(--cs-color-negative-solid-hover);
                --cs-button-solid-fg: var(--cs-color-negative-solid-fg);
                --cs-button-accent-fg: var(--cs-color-negative-soft-fg);
            }

            &[data-variant="primary"] {
                --cs-button-bg: var(--cs-button-solid-bg);
                --cs-button-bg-hover: var(--cs-button-solid-bg-hover);
                --cs-button-fg: var(--cs-button-solid-fg);
                --cs-button-shadow: var(--cs-shadow-solid);
                --cs-button-shadow-active: var(--cs-shadow-solid-active);
            }

            &[data-variant="secondary"] {
                --cs-button-bg: var(--cs-color-base-soft);
                --cs-button-bg-hover: var(--cs-color-base-soft-hover);
                --cs-button-fg: var(--cs-button-accent-fg);
            }

            &[data-variant="tertiary"] {
                --cs-button-bg: var(--cs-color-base-soft);
                --cs-button-bg-hover: var(--cs-color-base-soft-hover);
                --cs-button-fg: var(--cs-color-base-soft-fg);
                --cs-button-fg-hover: var(--cs-color-base-soft-fg-hover);
            }

            &[data-variant="ghost"] {
                --cs-button-bg: transparent;
                --cs-button-bg-hover: var(--cs-color-base-soft);
                --cs-button-fg: var(--cs-color-base-soft-fg);
                --cs-button-fg-hover: var(--cs-color-base-soft-fg-hover);
            }

            &[data-variant="elevated"] {
                --cs-button-bg: var(--cs-color-elevated);
                --cs-button-bg-hover: var(--cs-color-elevated-hover);
                --cs-button-fg: var(--cs-color-text-strong);
                --cs-button-shadow: var(--cs-shadow-elevated);
                --cs-button-shadow-hover: var(--cs-shadow-elevated-hover);
                --cs-button-shadow-active: var(--cs-shadow-elevated);
            }

            /* Monotone negative variants stay calm at rest and reveal negative intent on interaction */
            &:is([data-variant="tertiary"], [data-variant="ghost"], [data-variant="elevated"])[data-negative]:not(
                    :disabled,
                    [aria-disabled="true"],
                    [data-disabled]
                ) {
                --cs-button-fg-hover: var(--cs-button-accent-fg);

                &:is(:focus-visible, :active) {
                    --cs-button-fg: var(--cs-button-accent-fg);
                }
            }

            &:is(:disabled, [aria-disabled="true"], [data-disabled]) {
                --cs-button-fg: var(--cs-color-disabled-fg);
                --cs-button-fg-hover: var(--cs-color-disabled-fg);
                --cs-button-shadow: none;
                --cs-button-shadow-hover: none;
                --cs-button-shadow-active: none;

                &[data-variant="primary"],
                &[data-variant="secondary"],
                &[data-variant="tertiary"] {
                    --cs-button-bg: var(--cs-color-disabled-bg);
                    --cs-button-bg-hover: var(--cs-color-disabled-bg);
                }

                &[data-variant="ghost"] {
                    --cs-button-bg: transparent;
                    --cs-button-bg-hover: transparent;
                }

                &[data-variant="elevated"] {
                    --cs-button-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-button-bg-hover: var(--cs-color-disabled-bg-elevated);
                    --cs-button-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                    --cs-button-shadow-hover: 0 0 0 1px var(--cs-color-disabled-border);
                    --cs-button-shadow-active: 0 0 0 1px var(--cs-color-disabled-border);
                }
            }
        }
    }
</style>
