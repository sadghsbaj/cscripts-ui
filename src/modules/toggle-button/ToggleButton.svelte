<!--
@component
Two-state toggle button primitive (`<ToggleButton />`) supporting controlled and uncontrolled
state via `bind:pressed` or `pressed`, semantic color themes, and spring-physics press feedback.
-->
<script lang="ts">
    import "../../css/shared/button-control.css";
    import { getToggleButtonGroupContext, hasToggleButtonGroupContext } from "../toggle-button-group/index.ts";
    import type { ToggleButtonProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        color,
        size,
        iconOnly,
        value,
        pressed = $bindable(false),
        class: className,
        onclick,
        children,
        ...rest
    }: ToggleButtonProps = $props();

    const group = hasToggleButtonGroupContext() ? getToggleButtonGroupContext() : undefined;
    const isPressed = $derived(group ? group.isSelected(value) : Boolean(pressed));

    function handleClick(
        event: MouseEvent & {
            currentTarget: EventTarget & HTMLButtonElement;
        }
    ): void {
        onclick?.(event);
        if (event.defaultPrevented) return;

        if (group) {
            group.toggle(value);
            return;
        }

        pressed = !pressed;
    }
</script>

<button
    bind:this={ref}
    {...rest}
    type="button"
    aria-pressed={isPressed}
    onclick={handleClick}
    class={["cs-toggle-button", "cs-button-control", className]}
    data-variant={variant}
    data-color={color}
    data-size={size}
    data-icon-only={iconOnly ? "" : undefined}
>
    {@render children?.()}
</button>

<style>
    @layer components.primitive {
        .cs-toggle-button {
            /* When releasing (pressed -> unpressed), transform uses a slower 300ms quad-in curve
             * while opacity fades in 140ms so ::after settles at scale(0.55) invisibly, giving
             * the next press pop-in full spring distance without an abrupt visual collapse. */
            --cs-toggle-button-transition-pressed: transform 300ms var(--cs-ease-quad-in), opacity 140ms linear;

            /* Bridge module hooks to shared button-control variables */
            --cs-button-control-height: var(--cs-toggle-button-height, var(--cs-button-control-size-height));
            --cs-button-control-fg: var(--cs-toggle-button-fg);
            --cs-button-control-fg-hover: var(--cs-toggle-button-fg-hover, var(--cs-toggle-button-fg));
            --cs-button-control-bg: var(--cs-toggle-button-bg);
            --cs-button-control-bg-hover: var(--cs-toggle-button-bg-hover);
            --cs-button-control-border: var(--cs-toggle-button-border, none);
            --cs-button-control-shadow: var(--cs-toggle-button-shadow, none);
            --cs-button-control-shadow-hover: var(--cs-toggle-button-shadow-hover, var(--cs-toggle-button-shadow, none));
            --cs-button-control-shadow-active: var(--cs-toggle-button-shadow-active, none);
            --cs-button-control-squash-active: var(
                --cs-toggle-button-squash-active,
                var(--cs-button-control-default-squash, var(--cs-squash-subtle))
            );
            --cs-button-control-focus-scale-active: var(--cs-toggle-button-focus-scale-active, 0.97);

            /* Pressed fill layer (::after): `transform` drives pop-in, `scale` drives shared pointer squash. */
            &::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                background-color: var(--cs-toggle-button-bg-pressed);
                border-radius: inherit;
                corner-shape: inherit;
                opacity: 0;
                transform: scale(0.55);
                transition:
                    var(--cs-toggle-button-transition-pressed),
                    background-color 200ms var(--cs-ease-quad-out),
                    scale 600ms var(--cs-spring-release);
                pointer-events: none;
            }

            @media (hover: hover) {
                &:hover,
                &[data-morph-hover] {
                    &::after {
                        background-color: var(--cs-toggle-button-bg-pressed-hover);
                    }
                }

                &[data-morph-hover]::after {
                    transition: none;
                }
            }

            &:active {
                &::after {
                    background-color: var(--cs-toggle-button-bg-pressed-hover);
                    transition:
                        var(--cs-toggle-button-transition-pressed),
                        background-color 140ms var(--cs-ease-quad-out),
                        scale 140ms var(--cs-ease-quad-out);
                }

                &:not(:focus-visible)::after {
                    scale: var(--cs-button-control-squash-active);
                }
            }

            &[data-color="accent"] {
                --cs-toggle-button-bg-pressed: var(--cs-color-accent-soft);
                --cs-toggle-button-bg-pressed-hover: var(--cs-color-accent-soft-hover);
                --cs-toggle-button-soft-fg: var(--cs-color-accent-soft-fg);
            }

            &[data-color="positive"] {
                --cs-toggle-button-bg-pressed: var(--cs-color-positive-soft);
                --cs-toggle-button-bg-pressed-hover: var(--cs-color-positive-soft-hover);
                --cs-toggle-button-soft-fg: var(--cs-color-positive-soft-fg);
            }

            &[data-color="caution"] {
                --cs-toggle-button-bg-pressed: var(--cs-color-caution-soft);
                --cs-toggle-button-bg-pressed-hover: var(--cs-color-caution-soft-hover);
                --cs-toggle-button-soft-fg: var(--cs-color-caution-soft-fg);
            }

            &[data-color="negative"] {
                --cs-toggle-button-bg-pressed: var(--cs-color-negative-soft);
                --cs-toggle-button-bg-pressed-hover: var(--cs-color-negative-soft-hover);
                --cs-toggle-button-soft-fg: var(--cs-color-negative-soft-fg);
            }

            &[data-variant="soft"] {
                --cs-toggle-button-bg: var(--cs-color-base-soft);
                --cs-toggle-button-bg-hover: var(--cs-color-base-soft-hover);
            }

            &[data-variant="ghost"] {
                --cs-toggle-button-bg: transparent;
                --cs-toggle-button-bg-hover: var(--cs-color-base-soft);

                &[aria-pressed="true"] {
                    --cs-toggle-button-bg-hover: transparent;
                }
            }

            &[aria-pressed="false"] {
                --cs-toggle-button-fg: var(--cs-color-base-soft-fg);
                --cs-toggle-button-fg-hover: var(--cs-color-base-soft-fg-hover);
            }

            &[aria-pressed="true"] {
                --cs-toggle-button-fg: var(--cs-toggle-button-soft-fg);
                --cs-toggle-button-transition-pressed: transform 550ms var(--cs-spring-snappy), opacity 90ms linear;

                &::after {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            &:is(:disabled, [aria-disabled="true"], [data-disabled]) {
                --cs-toggle-button-fg: var(--cs-color-disabled-fg);

                &[data-variant="soft"] {
                    --cs-toggle-button-bg: var(--cs-color-disabled-bg);
                }

                &[data-variant="ghost"] {
                    --cs-toggle-button-bg: transparent;
                }

                &[aria-pressed="true"] {
                    --cs-toggle-button-fg: var(--cs-color-disabled-fg-active);
                    --cs-toggle-button-bg-pressed: var(--cs-color-disabled-bg-active);
                }
            }
        }
    }
</style>
