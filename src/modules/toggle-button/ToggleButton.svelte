<script lang="ts">
    import "../../shared/button-control/button-control.css";
    import { getToggleButtonGroupContext, hasToggleButtonGroupContext } from "./toggle-button.context.internal.ts";
    import type { ToggleButtonProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        color,
        size,
        iconOnly,
        disabled = false,
        value,
        pressed = $bindable(false),
        onPressedChange,
        class: className,
        onclick,
        children,
        ...rest
    }: ToggleButtonProps = $props();

    const group = hasToggleButtonGroupContext() ? getToggleButtonGroupContext() : undefined;
    const isDisabled = $derived(Boolean(disabled || group?.disabled));
    const isPressed = $derived(group ? (value !== undefined ? group.isSelected(value) : false) : Boolean(pressed));

    if (import.meta.env.DEV) {
        $effect(() => {
            if (group && value === undefined) {
                console.warn('<ToggleButton> inside <ToggleButtonGroup> must specify a "value" prop.');
            } else if (!group && value !== undefined) {
                console.warn('<ToggleButton> outside <ToggleButtonGroup> must not specify a "value" prop.');
            }
        });
    }

    function handleClick(
        event: MouseEvent & {
            currentTarget: EventTarget & HTMLButtonElement;
        }
    ): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;

        if (group) {
            if (value !== undefined) {
                group.toggle(value);
            }
            return;
        }

        const next = !pressed;
        pressed = next;
        onPressedChange?.(next);
    }
</script>

<button
    bind:this={ref}
    {...rest}
    type="button"
    aria-pressed={isPressed}
    disabled={isDisabled || undefined}
    onclick={handleClick}
    class={["cs-toggle-button", "cs-button-control", className]}
    data-variant={variant}
    data-color={color}
    data-size={size}
    data-icon-only={iconOnly ? "" : undefined}
>
    <span class="cs-toggle-button-fill" aria-hidden="true"></span>
    {@render children?.()}
</button>

<style>
    @layer components.primitive {
        .cs-toggle-button {
            /* When releasing (pressed -> unpressed), transform uses a slower exit curve
             * while opacity fades faster so .cs-toggle-button-fill settles at scale(0.55) invisibly,
             * giving the next press pop-in full distance without an abrupt visual collapse. */
            --cs-toggle-button-transition-pressed:
                transform var(--cs-dur-200) var(--cs-ease-exit), opacity var(--cs-dur-exit-sm) var(--cs-ease-effect);

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

            /* Pressed fill layer: `transform` drives pop-in, `scale` drives shared pointer squash.
             * Kept as a dedicated element so .cs-toggle-button::after remains free for group seam separators. */
            & > .cs-toggle-button-fill {
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
                    background-color var(--cs-dur-effect) var(--cs-ease-effect),
                    scale var(--cs-dur-squash) var(--cs-ease-squash);
                pointer-events: none;
            }

            @media (hover: hover) {
                &:hover,
                &[data-morph-hover] {
                    & > .cs-toggle-button-fill {
                        background-color: var(--cs-toggle-button-bg-pressed-hover);
                    }
                }

                &[data-morph-hover] > .cs-toggle-button-fill {
                    transition: none;
                }
            }

            &:active {
                & > .cs-toggle-button-fill {
                    background-color: var(--cs-toggle-button-bg-pressed-hover);
                    transition:
                        var(--cs-toggle-button-transition-pressed),
                        background-color var(--cs-dur-press) var(--cs-ease-press),
                        scale var(--cs-dur-press) var(--cs-ease-press);
                }

                &:not(:focus-visible) > .cs-toggle-button-fill {
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

            &[data-variant="elevated"] {
                --cs-toggle-button-bg: var(--cs-color-elevated);
                --cs-toggle-button-bg-hover: var(--cs-color-elevated-hover);
                --cs-toggle-button-shadow: var(--cs-shadow-elevated);
                --cs-toggle-button-shadow-hover: var(--cs-shadow-elevated-hover);
                --cs-toggle-button-shadow-active: var(--cs-shadow-elevated);

                &[aria-pressed="false"]:not(:disabled, [aria-disabled="true"], [data-disabled]) {
                    --cs-toggle-button-fg: var(--cs-color-text-strong);
                    --cs-toggle-button-fg-hover: var(--cs-color-text-strong);
                }
            }

            &[aria-pressed="false"] {
                --cs-toggle-button-fg: var(--cs-color-base-soft-fg);
                --cs-toggle-button-fg-hover: var(--cs-color-base-soft-fg-hover);
            }

            &[aria-pressed="true"] {
                --cs-toggle-button-fg: var(--cs-toggle-button-soft-fg);
                --cs-toggle-button-transition-pressed:
                    transform var(--cs-dur-enter-sm) var(--cs-ease-enter),
                    opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);

                & > .cs-toggle-button-fill {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            &:is(:disabled, [aria-disabled="true"], [data-disabled]) {
                --cs-toggle-button-fg: var(--cs-color-disabled-fg);
                --cs-toggle-button-fg-hover: var(--cs-color-disabled-fg);

                &[data-variant="soft"],
                &[data-variant="elevated"] {
                    --cs-toggle-button-bg: var(--cs-color-disabled-bg);
                    --cs-toggle-button-bg-hover: var(--cs-color-disabled-bg);
                    --cs-toggle-button-shadow: none;
                    --cs-toggle-button-shadow-hover: none;
                    --cs-toggle-button-shadow-active: none;
                }

                &[data-variant="ghost"] {
                    --cs-toggle-button-bg: transparent;
                    --cs-toggle-button-bg-hover: transparent;
                }

                &[aria-pressed="true"] {
                    --cs-toggle-button-fg: var(--cs-color-disabled-fg-active);
                    --cs-toggle-button-fg-hover: var(--cs-color-disabled-fg-active);
                    --cs-toggle-button-bg-pressed: var(--cs-color-disabled-bg-active);
                    --cs-toggle-button-bg-pressed-hover: var(--cs-color-disabled-bg-active);
                }
            }
        }
    }
</style>
