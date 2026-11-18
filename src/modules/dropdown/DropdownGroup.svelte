<script lang="ts">
    import { setDropdownGroupContext } from "./dropdown.context.internal.ts";
    import type { DropdownGroupProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: DropdownGroupProps = $props();

    let labelId = $state<string | undefined>();

    setDropdownGroupContext({
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
    class={["cs-dropdown-group", "cs-listbox-group", className]}
>
    {@render children?.()}
</div>
