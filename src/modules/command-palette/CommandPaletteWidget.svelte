<script lang="ts">
    import { getInternalCommandPaletteContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteWidgetProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteWidgetProps = $props();

    const palette = getInternalCommandPaletteContext();
    const widgetId = $props.id();

    $effect(() => {
        return palette.registerWidget(widgetId);
    });
</script>

<div bind:this={ref} {...rest} class={["cs-command-palette-widget", className]}>
    {@render children?.()}
</div>
