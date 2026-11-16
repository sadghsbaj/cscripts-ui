<script lang="ts">
    import type { CardOrnamentProps } from "./index.ts";

    let {
        ref = $bindable(null),
        placement = "bottom-left",
        shape = "none",
        class: className,
        children,
        ...rest
    }: CardOrnamentProps = $props();
</script>

<div
    bind:this={ref}
    aria-hidden="true"
    {...rest}
    class={["cs-card-ornament", className]}
    data-placement={placement}
    data-shape={shape}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-card-ornament {
            position: absolute;
            z-index: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            pointer-events: none;

            &[data-placement="bottom-left"] {
                inset-block-end: 0;
                inset-inline-start: 0;
            }

            &[data-placement="bottom-right"] {
                inset-block-end: 0;
                inset-inline-end: 0;
            }

            &[data-placement="top-right"] {
                inset-block-start: 0;
                inset-inline-end: 0;
            }

            &[data-placement="inset"] {
                inset: 0;
            }

            &[data-shape="circle"] {
                --cs-card-ornament-tint: var(--cs-card-ornament-color, var(--cs-color-accent-500));

                inline-size: var(--cs-card-ornament-size, 104px);
                block-size: var(--cs-card-ornament-size, 104px);
                color: light-dark(
                    color-mix(in oklab, var(--cs-card-ornament-tint) 75%, black),
                    color-mix(in oklab, var(--cs-card-ornament-tint) 80%, white)
                );
                background-color: light-dark(
                    color-mix(in oklab, var(--cs-card-ornament-tint) 22%, white),
                    color-mix(in oklab, var(--cs-card-ornament-tint) 24%, var(--cs-color-base-900))
                );
                border-radius: var(--cs-radius-full);

                &[data-placement="bottom-left"] {
                    translate: -20% 20%;

                    & > :global(*) {
                        translate: 10% -10%;
                    }
                }

                &[data-placement="bottom-right"] {
                    translate: 20% 20%;

                    & > :global(*) {
                        translate: -10% -10%;
                    }
                }

                &[data-placement="top-right"] {
                    translate: 20% -20%;

                    & > :global(*) {
                        translate: -10% 10%;
                    }
                }

                &[data-placement="inset"] {
                    inline-size: auto;
                    block-size: auto;
                    border-radius: inherit;
                }

                & > :global(svg) {
                    inline-size: var(--cs-card-ornament-icon-size, 40%);
                    block-size: var(--cs-card-ornament-icon-size, 40%);
                }
            }
        }
    }
</style>
