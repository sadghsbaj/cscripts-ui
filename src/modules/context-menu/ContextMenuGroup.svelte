<script lang="ts">
    import { setContextMenuGroupContext } from "./context-menu.context.internal.ts";
    import type { ContextMenuGroupProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ContextMenuGroupProps = $props();

    let labelId = $state<string | undefined>();

    setContextMenuGroupContext({
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
    class={["cs-context-menu-group", "cs-listbox-group", className]}
>
    {@render children?.()}
</div>
