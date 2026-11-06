<script lang="ts">
    import type { ButtonGroupProps } from "./index.ts";

    let {
        orientation = "horizontal",
        separators = false,
        class: className,
        children,
        ...rest
    }: ButtonGroupProps = $props();
</script>

<div
    role="group"
    {...rest}
    class={["cs-button-group", className]}
    data-orientation={orientation}
    data-separators={separators}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-button-group {
            display: inline-flex;

            &[data-orientation="horizontal"] {
                flex-direction: row;
                align-items: center;
            }

            &[data-orientation="vertical"] {
                flex-direction: column;
                align-items: stretch;
            }

            > :global(.cs-button) {
                border-radius: var(--cs-radius-none);
            }

            > :global(.cs-button):first-child {
                border-top-left-radius: var(--cs-radius-full);
                border-bottom-left-radius: var(--cs-radius-full);
            }

            > :global(.cs-button):last-child {
                border-top-right-radius: var(--cs-radius-full);
                border-bottom-right-radius: var(--cs-radius-full);
            }
        }
    }
</style>
