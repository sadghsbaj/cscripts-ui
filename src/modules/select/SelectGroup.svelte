<script lang="ts">
    import type { SelectGroupProps } from "./index.ts";
    import { setSelectGroupContext } from "./select.context.internal.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SelectGroupProps = $props();

    let labelId = $state<string | undefined>();

    setSelectGroupContext({
        registerLabel(id: string): () => void {
            labelId = id;
            return () => {
                if (labelId === id) {
                    labelId = undefined;
                }
            };
        },
    });
</script>

<div bind:this={ref} {...rest} role="group" aria-labelledby={labelId} class={["cs-select-group", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-select-group {
            display: flex;
            flex-direction: column;
            gap: var(--cs-select-list-gap);

            & + :global(.cs-select-group) {
                margin-block-start: var(--cs-select-group-gap);
            }
        }
    }
</style>
