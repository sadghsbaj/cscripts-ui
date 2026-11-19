<script lang="ts">
    import type { Attachment } from "svelte/attachments";
    import { X } from "@lucide/svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { Button, ButtonIcon, ButtonLabel } from "../button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { tooltip } from "../tooltip/index.ts";
    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import type { DataTableStatusBarProps } from "./index.ts";

    let {
        ref = $bindable(null),
        selectionActions,
        filterActions,
        class: className,
        children,
        ...rest
    }: DataTableStatusBarProps = $props();

    const ctx = hasDataTableContext() ? getDataTableContext() : undefined;
    const table = $derived(ctx?.table);

    const isSelectionMode = $derived(Boolean(table && table.selectedCount > 0));
    const isFilterMode = $derived(Boolean(table && !isSelectionMode && table.activeFilterCount > 0));
    const isOpen = $derived(Boolean(children || isSelectionMode || isFilterMode));
    const mode = $derived<"selection" | "filter">(isSelectionMode ? "selection" : "filter");

    $effect(() => {
        if (!ctx) return;
        ctx.setStatusBarVisible(isOpen);
        return () => {
            ctx.setStatusBarVisible(false);
        };
    });

    // Move status bar into the bottom dock below ScrollArea when authored inside <DataTable> children.
    const dockAtBottom: Attachment<HTMLElement> = (node) => {
        const dock = ctx?.statusBarDockEl;
        if (!dock || node.parentElement === dock) return;

        dock.append(node);
        return () => {
            if (node.parentElement === dock) {
                node.remove();
            }
        };
    };
</script>

<div
    bind:this={ref}
    {...rest}
    {@attach dockAtBottom}
    class={["cs-data-table-status-bar-shell", className]}
    data-open={isOpen ? "" : undefined}
    data-mode={mode}
    inert={!isOpen ? true : undefined}
>
    <div class="cs-data-table-status-bar-clip">
        <div class="cs-data-table-status-bar" data-mode={mode}>
            {#if children}
                {@render children()}
            {:else if table && isSelectionMode}
                <div class="cs-data-table-status-bar-start">
                    <span class="cs-data-table-status-bar-summary" role="status" aria-live="polite">
                        <span class="cs-data-table-status-bar-count-pill">
                            {table.selectedCount.toLocaleString()}
                        </span>
                        <span class="cs-data-table-status-bar-count-label">
                            {t({ de: "ausgewählt", en: "selected" })}
                        </span>
                    </span>
                    {#if !table.allVisibleSelected && table.rowCount > 0}
                        <span class="cs-data-table-status-bar-divider" data-height="sm" aria-hidden="true"></span>
                        <Button variant="ghost" size="xs" onclick={() => table.selectAllMatching()}>
                            <ButtonLabel>
                                {t({
                                    de: `Alle ${table.rowCount.toLocaleString()} auswählen`,
                                    en: `Select all ${table.rowCount.toLocaleString()}`,
                                })}
                            </ButtonLabel>
                        </Button>
                    {/if}
                </div>
                <div class="cs-data-table-status-bar-end">
                    {#if selectionActions}
                        {@render selectionActions({
                            selectedCount: table.selectedCount,
                            clearSelection: table.clearSelection,
                        })}
                        <span class="cs-data-table-status-bar-divider" data-height="md" aria-hidden="true"></span>
                    {/if}
                    <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        aria-label={t({ de: "Auswahl aufheben", en: "Clear selection" })}
                        onclick={() => table.clearSelection()}
                        {@attach tooltip({ text: t({ de: "Auswahl aufheben", en: "Clear selection" }) })}
                    >
                        <HitArea size="sm" />
                        <ButtonIcon icon={X} />
                    </Button>
                </div>
            {:else if table && isFilterMode}
                <div class="cs-data-table-status-bar-start">
                    <span class="cs-data-table-status-bar-summary" role="status" aria-live="polite">
                        {t({
                            de: `${table.rowCount.toLocaleString()} von ${table.totalRowCount.toLocaleString()} Zeilen`,
                            en: `${table.rowCount.toLocaleString()} of ${table.totalRowCount.toLocaleString()} rows`,
                        })}
                    </span>
                </div>
                <div class="cs-data-table-status-bar-end">
                    {#if filterActions}
                        {@render filterActions({
                            activeFilterCount: table.activeFilterCount,
                            clearAllFilters: table.clearAllFilters,
                        })}
                    {:else}
                        <Button variant="ghost" size="xs" onclick={() => table.clearAllFilters()}>
                            <ButtonLabel>{t({ de: "Filter zurücksetzen", en: "Reset filters" })}</ButtonLabel>
                        </Button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
