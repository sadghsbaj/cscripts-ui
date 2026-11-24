<script lang="ts">
    import { setCommandPaletteGroupContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteGroupProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteGroupProps = $props();

    let labelId = $state<string | undefined>();
    let labelText = $state<string | undefined>();

    setCommandPaletteGroupContext({
        get label() {
            return labelText;
        },
        registerLabel(id: string, text: string | undefined): () => void {
            labelId = id;
            labelText = text;
            return () => {
                if (labelId !== id) return;
                labelId = undefined;
                labelText = undefined;
            };
        },
    });
</script>

<div
    bind:this={ref}
    {...rest}
    role="group"
    aria-labelledby={labelId}
    class={["cs-command-palette-group", "cs-listbox-group", className]}
>
    {@render children?.()}
</div>
