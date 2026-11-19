<script lang="ts">
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
                ? { de: "Keine Treffer", en: "No matching rows" }
                : { de: "Keine Einträge", en: "No entries" }
        );
    });

    const resolvedDescription = $derived(description);
    const ResolvedIcon = $derived(icon);
</script>

{#if shouldRender}
    <div
        bind:this={ref}
        {...rest}
        class={["cs-data-table-empty", className]}
        data-filtered={isFiltered ? "" : undefined}
        data-has-description={resolvedDescription ? "" : undefined}
    >
        {#if children}
            {@render children()}
        {:else}
            <div class="cs-data-table-empty-inner">
                {#if ResolvedIcon}
                    <ResolvedIcon class="cs-data-table-empty-icon" aria-hidden="true" />
                {/if}
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
