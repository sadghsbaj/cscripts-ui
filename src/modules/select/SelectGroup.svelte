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

<div
    bind:this={ref}
    {...rest}
    role="group"
    aria-labelledby={labelId}
    class={["cs-select-group", "cs-listbox-group", className]}
>
    {@render children?.()}
</div>
