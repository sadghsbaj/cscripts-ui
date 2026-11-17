<script lang="ts">
    import type { ModalActionsProps } from "./index.ts";

    let {
        ref = $bindable(null),
        align = "end",
        orientation = "horizontal",
        class: className,
        children,
        ...rest
    }: ModalActionsProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-modal-actions", className]}
    data-align={align}
    data-orientation={orientation}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-modal-actions {
            display: flex;
            flex-wrap: wrap;
            gap: var(--cs-modal-gap);
            align-items: center;
            min-inline-size: 0;

            &[data-orientation="vertical"] {
                flex-direction: column;
                align-items: stretch;
            }

            &[data-align="start"] {
                justify-content: flex-start;

                &[data-orientation="vertical"] {
                    align-items: flex-start;
                }
            }

            &[data-align="end"] {
                justify-content: flex-end;
                margin-inline-start: auto;

                &[data-orientation="vertical"] {
                    align-items: flex-end;
                }
            }

            &[data-align="stretch"] {
                inline-size: 100%;

                &:not([data-orientation="vertical"]) > :global(*) {
                    flex: 1 1 0%;
                }

                &[data-orientation="vertical"] {
                    align-items: stretch;

                    & > :global(*) {
                        inline-size: 100%;
                    }
                }
            }
        }
    }
</style>
