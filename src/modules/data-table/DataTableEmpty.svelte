<script lang="ts">
    import { FilterX, Inbox } from "@lucide/svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { Button, ButtonLabel } from "../button/index.ts";
    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import type { DataTableEmptyProps } from "./index.ts";

    let {
        ref = $bindable(null),
        title,
        description,
        icon,
        hideReset = false,
        class: className,
        children,
        ...rest
    }: DataTableEmptyProps = $props();

    const ctx = hasDataTableContext() ? getDataTableContext() : undefined;
    const table = $derived(ctx?.table);

    const shouldRender = $derived(table ? table.rowCount === 0 : true);
    const isFiltered = $derived(Boolean(table?.isFiltered));

    const resolvedTitle = $derived.by(() => {
        if (title !== undefined) return title;
        return t(
            isFiltered
                ? { de: "Keine passenden Einträge", en: "No matching rows" }
                : { de: "Noch keine Einträge", en: "No rows yet" }
        );
    });

    const resolvedDescription = $derived.by(() => {
        if (description !== undefined) return description;
        return isFiltered
            ? t({
                  de: "Filter anpassen oder zurücksetzen, um Ergebnisse anzuzeigen.",
                  en: "Adjust or clear active filters to see results.",
              })
            : undefined;
    });

    const ResolvedIcon = $derived(icon ?? (isFiltered ? FilterX : Inbox));
</script>

{#if shouldRender}
    <div bind:this={ref} {...rest} class={["cs-data-table-empty", className]}>
        {#if children}
            {@render children()}
        {:else}
            <div class="cs-data-table-empty-inner">
                <ResolvedIcon class="cs-data-table-empty-icon" aria-hidden="true" />
                <p class="cs-data-table-empty-title">{resolvedTitle}</p>
                {#if resolvedDescription}
                    <p class="cs-data-table-empty-description">{resolvedDescription}</p>
                {/if}
                {#if isFiltered && !hideReset && table}
                    <div class="cs-data-table-empty-actions">
                        <Button variant="secondary" size="xs" onclick={() => table.clearAllFilters()}>
                            <ButtonLabel>{t({ de: "Filter zurücksetzen", en: "Reset filters" })}</ButtonLabel>
                        </Button>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}
