<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import type { ComboboxEmptyProps } from "./index.ts";
    import { getComboboxContext } from "./combobox.context.internal.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ComboboxEmptyProps = $props();

    const combobox = getComboboxContext();
</script>

{#if combobox.visibleItemCount === 0}
    <div bind:this={ref} {...rest} class={["cs-combobox-empty", "cs-listbox-empty", className]}>
        {#if children}
            {@render children()}
        {:else}
            {t({ de: "Keine Ergebnisse.", en: "No results." })}
        {/if}
    </div>
{/if}
