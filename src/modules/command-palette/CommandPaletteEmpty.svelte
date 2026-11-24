<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { getInternalCommandPaletteContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteEmptyProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CommandPaletteEmptyProps = $props();

    const palette = getInternalCommandPaletteContext();
</script>

{#if palette.visibleItemCount === 0 && palette.visibleWidgetCount === 0}
    <div bind:this={ref} {...rest} class={["cs-command-palette-empty", "cs-listbox-empty", className]}>
        {#if children}
            {@render children()}
        {:else}
            {t({ de: "Keine Ergebnisse.", en: "No results." })}
        {/if}
    </div>
{/if}
