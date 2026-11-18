<script lang="ts">
    import type { ComboboxGroupProps } from "./index.ts";
    import { setComboboxGroupContext } from "./combobox.context.internal.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ComboboxGroupProps = $props();

    let labelId = $state<string | undefined>();

    setComboboxGroupContext({
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
    class={["cs-combobox-group", "cs-listbox-group", className]}
>
    {@render children?.()}
</div>
