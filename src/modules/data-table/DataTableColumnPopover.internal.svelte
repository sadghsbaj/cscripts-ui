<script lang="ts">
    import { untrack } from "svelte";
    import { SvelteSet } from "svelte/reactivity";
    import { ArrowDown, ArrowUp, Search, X } from "@lucide/svelte";

    import "../../shared/listbox/listbox.css";

    import { t } from "../../shared/lang.internal.ts";
    import { Button, ButtonLabel } from "../button/index.ts";
    import { Checkbox, CheckboxMark } from "../checkbox/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { Popover } from "../popover/index.ts";
    import { ScrollArea, ScrollAreaContent } from "../scroll-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "../segmented-control/index.ts";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select/index.ts";
    import { TextInput, TextInputField } from "../text-input/index.ts";
    import { createVirtualScroll } from "../virtual-scroll/index.ts";
    import {
        ADAPTIVE_DEBOUNCE_MS,
        ADAPTIVE_DEBOUNCE_ROW_THRESHOLD,
        FACET_SEARCH_HIDE_THRESHOLD,
        FACET_VIRTUALIZE_THRESHOLD,
        getDefaultConditionOperators,
        isDateLikeType,
        isFilterActive,
        isNumberLikeType,
        resolveColumnAlign,
    } from "./data-table-engine.internal.ts";
    import { getDataTableContext } from "./data-table.context.ts";
    import type {
        DataTableColumn,
        DataTableColumnType,
        DataTableConditionOperator,
        DataTableFacetItem,
        DataTableSortDirection,
    } from "./data-table.svelte.ts";

    type ActiveTab = "values" | "condition";

    const ctx = getDataTableContext();

    let popoverRef = $state<HTMLDivElement | null>(null);
    let searchInputRef = $state<HTMLInputElement | null>(null);
    let conditionValueInputRef = $state<HTMLInputElement | null>(null);
    let checklistViewportRef = $state<HTMLDivElement | null>(null);

    let activeTab = $state<ActiveTab>("values");
    let searchQuery = $state("");
    let appliedSearchQuery = $state("");
    let pinnedCheckedKeys = $state.raw<ReadonlySet<string>>(new SvelteSet());

    let conditionOperator = $state<DataTableConditionOperator>("contains");
    let conditionValue = $state("");
    let conditionValueTo = $state("");

    let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let conditionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let suppressItemClickTimer: ReturnType<typeof setTimeout> | null = null;
    let suppressNextItemClick = false;
    let outsidePointerDownInteractive = false;

    const table = $derived(ctx.table);
    const activeColumnId = $derived(table?.openPopoverColumnId ?? null);

    const activeColumn = $derived.by<DataTableColumn<unknown> | null>(() => {
        if (!table || !activeColumnId) return null;
        return table.columns.find((col) => col.id === activeColumnId) ?? null;
    });

    const placement = $derived.by(() => {
        if (!activeColumn) return "bottom-start" as const;
        return resolveColumnAlign(activeColumn) === "end" ? ("bottom-end" as const) : ("bottom-start" as const);
    });

    const columnFilterCapabilities = $derived.by(() => {
        if (!activeColumn) {
            return { supportsValues: false, supportsCondition: false };
        }
        const mode = activeColumn.filterMode ?? "auto";
        if (mode === "values") {
            return { supportsValues: true, supportsCondition: false };
        }
        if (mode === "condition") {
            return { supportsValues: false, supportsCondition: true };
        }
        if (mode === "both") {
            return { supportsValues: true, supportsCondition: true };
        }
        // "auto": boolean defaults to values-only; other types support both values and condition.
        return {
            supportsValues: true,
            supportsCondition: activeColumn.type !== "boolean",
        };
    });

    const showModeSwitch = $derived(
        Boolean(activeColumn?.filterable) &&
            columnFilterCapabilities.supportsValues &&
            columnFilterCapabilities.supportsCondition
    );

    const facetsResult = $derived(
        table && activeColumn ? table.openPopoverFacets : { items: [], totalDistinct: 0, truncated: false }
    );

    const currentSort = $derived(table && activeColumn ? table.getColumnSort(activeColumn.id) : null);
    const currentFilter = $derived(table && activeColumn ? table.filters[activeColumn.id] : undefined);
    const hasActiveColumnFilter = $derived(isFilterActive(currentFilter));

    const selectedValueSet = $derived.by<ReadonlySet<string>>(() => {
        if (currentFilter?.kind !== "values") return new SvelteSet();
        return new SvelteSet(currentFilter.selected);
    });

    const showSearch = $derived(facetsResult.totalDistinct > FACET_SEARCH_HIDE_THRESHOLD);

    // Pin initially-checked items to top on open without jumping mid-click during toggling.
    const orderedFacets = $derived.by<readonly DataTableFacetItem[]>(() => {
        const items = facetsResult.items;
        if (pinnedCheckedKeys.size === 0) return items;

        const pinned: DataTableFacetItem[] = [];
        const rest: DataTableFacetItem[] = [];
        for (const item of items) {
            if (pinnedCheckedKeys.has(item.key)) {
                pinned.push(item);
            } else {
                rest.push(item);
            }
        }
        return [...pinned, ...rest];
    });

    const filteredFacets = $derived.by<readonly DataTableFacetItem[]>(() => {
        const q = appliedSearchQuery.trim().toLowerCase();
        if (q === "") return orderedFacets;
        return orderedFacets.filter((item) => item.label.toLowerCase().includes(q));
    });

    const shouldVirtualizeChecklist = $derived(filteredFacets.length > FACET_VIRTUALIZE_THRESHOLD);

    const checklistVirtual = createVirtualScroll({
        count: () => (shouldVirtualizeChecklist ? filteredFacets.length : 0),
        estimateSize: 30,
        gap: 2,
        fixed: true,
        overscan: 6,
        initialViewportSize: 204,
        initialRenderCount: 10,
        getItemKey: (index) => filteredFacets[index]?.key ?? index,
    });

    const allowedOperators = $derived.by<readonly DataTableConditionOperator[]>(() => {
        if (!activeColumn) return [];
        if (activeColumn.conditionOperators && activeColumn.conditionOperators.length > 0) {
            return activeColumn.conditionOperators;
        }
        return getDefaultConditionOperators(activeColumn.type);
    });

    const isSearchingValues = $derived(activeTab === "values" && showSearch && searchQuery.trim() !== "");
    const showFooter = $derived(isSearchingValues || hasActiveColumnFilter);

    const popoverTitle = $derived.by(() => {
        if (!activeColumn) return "";
        const label = activeColumn.label;
        return t({
            de: `Spaltenoptionen: ${label}`,
            en: `Column options: ${label}`,
        });
    });

    function getSortLabels(type?: DataTableColumnType): { asc: string; desc: string } {
        if (isNumberLikeType(type)) {
            return {
                asc: t({ de: "Kleinste", en: "Lowest" }),
                desc: t({ de: "Größte", en: "Highest" }),
            };
        }
        if (isDateLikeType(type)) {
            return {
                asc: t({ de: "Älteste", en: "Oldest" }),
                desc: t({ de: "Neueste", en: "Newest" }),
            };
        }
        if ((type ?? "text") === "text") {
            return {
                asc: t({ de: "A bis Z", en: "A to Z" }),
                desc: t({ de: "Z bis A", en: "Z to A" }),
            };
        }
        return {
            asc: t({ de: "Aufsteigend", en: "Ascending" }),
            desc: t({ de: "Absteigend", en: "Descending" }),
        };
    }

    function getOperatorLabel(operator: DataTableConditionOperator): string {
        switch (operator) {
            case "contains": {
                return t({ de: "Enthält", en: "Contains" });
            }
            case "notContains": {
                return t({ de: "Enthält nicht", en: "Does not contain" });
            }
            case "equals": {
                return t({ de: "Ist gleich", en: "Equals" });
            }
            case "notEquals": {
                return t({ de: "Ist ungleich", en: "Does not equal" });
            }
            case "startsWith": {
                return t({ de: "Beginnt mit", en: "Starts with" });
            }
            case "endsWith": {
                return t({ de: "Endet mit", en: "Ends with" });
            }
            case "gt": {
                return t({ de: "Größer als", en: "Greater than" });
            }
            case "gte": {
                return t({ de: "Größer oder gleich", en: "Greater or equal" });
            }
            case "lt": {
                return t({ de: "Kleiner als", en: "Less than" });
            }
            case "lte": {
                return t({ de: "Kleiner oder gleich", en: "Less or equal" });
            }
            case "between": {
                return t({ de: "Zwischen", en: "Between" });
            }
            case "isEmpty": {
                return t({ de: "Ist leer", en: "Is empty" });
            }
            case "isNotEmpty": {
                return t({ de: "Ist nicht leer", en: "Is not empty" });
            }
        }
    }

    const sortLabels = $derived(getSortLabels(activeColumn?.type));
    const isUnaryOperator = $derived(conditionOperator === "isEmpty" || conditionOperator === "isNotEmpty");
    const isRangeOperator = $derived(conditionOperator === "between");
    const conditionInputMode = $derived(isNumberLikeType(activeColumn?.type) ? ("decimal" as const) : undefined);

    function clearPendingTimers(): void {
        if (searchDebounceTimer !== null) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }
        if (conditionDebounceTimer !== null) {
            clearTimeout(conditionDebounceTimer);
            conditionDebounceTimer = null;
        }
        if (suppressItemClickTimer !== null) {
            clearTimeout(suppressItemClickTimer);
            suppressItemClickTimer = null;
        }
        suppressNextItemClick = false;
    }

    function armSuppressNextItemClick(): void {
        suppressNextItemClick = true;
        if (suppressItemClickTimer !== null) {
            clearTimeout(suppressItemClickTimer);
        }
        suppressItemClickTimer = setTimeout(() => {
            suppressItemClickTimer = null;
            suppressNextItemClick = false;
        }, 0);
    }

    function handleDocumentPointerDown(event: PointerEvent): void {
        const target = event.target;
        if (target instanceof Node && popoverRef?.contains(target)) {
            outsidePointerDownInteractive = false;
            return;
        }
        outsidePointerDownInteractive =
            target instanceof Element
                ? target.closest(
                      'a, button, input, select, textarea, label, [tabindex], [role="button"], [role="checkbox"]'
                  ) !== null
                : false;
    }

    // Register popover DOM element with parent DataTable.
    $effect(() => {
        return ctx.registerColumnPopoverEl(popoverRef);
    });

    // Track outside pointer interactions while open so Escape restores header focus
    // while clicking outside onto another control does not steal focus back.
    $effect(() => {
        if (!activeColumnId || typeof document === "undefined") {
            outsidePointerDownInteractive = false;
            return;
        }

        document.addEventListener("pointerdown", handleDocumentPointerDown, { capture: true });
        return () => {
            document.removeEventListener("pointerdown", handleDocumentPointerDown, { capture: true });
        };
    });

    // Initialize draft state & focus whenever activeColumnId opens or switches.
    $effect(() => {
        const colId = activeColumnId;
        clearPendingTimers();

        if (!colId) {
            searchQuery = "";
            appliedSearchQuery = "";
            pinnedCheckedKeys = new SvelteSet();
            return;
        }

        untrack(() => {
            const col = table?.columns.find((c) => c.id === colId) ?? null;
            if (!col || !table) return;

            searchQuery = "";
            appliedSearchQuery = "";

            const existing = table.filters[col.id];
            const facets = table.openPopoverFacets;
            const caps = columnFilterCapabilities;

            pinnedCheckedKeys = existing?.kind === "values" ? new SvelteSet(existing.selected) : new SvelteSet();

            // Pick initial tab
            if (existing?.kind === "condition" && caps.supportsCondition) {
                activeTab = "condition";
            } else if (existing?.kind === "values" && caps.supportsValues) {
                activeTab = "values";
            } else if (!caps.supportsValues) {
                activeTab = "condition";
            } else if (!caps.supportsCondition) {
                activeTab = "values";
            } else if (facets.totalDistinct > table.highCardinalityThreshold) {
                activeTab = "condition";
            } else {
                activeTab = "values";
            }

            // Hydrate condition draft
            const ops =
                col.conditionOperators && col.conditionOperators.length > 0
                    ? col.conditionOperators
                    : getDefaultConditionOperators(col.type);
            if (existing?.kind === "condition") {
                conditionOperator = existing.operator;
                conditionValue = existing.value ?? "";
                conditionValueTo = existing.valueTo ?? "";
            } else {
                conditionOperator = ops[0] ?? "contains";
                conditionValue = "";
                conditionValueTo = "";
            }

            if (checklistViewportRef) {
                checklistViewportRef.scrollTop = 0;
            }

            // Focus primary control on next frame after popover mounts into top layer.
            if (typeof requestAnimationFrame !== "undefined") {
                requestAnimationFrame(() => {
                    if (table.openPopoverColumnId !== colId) return;
                    if (activeTab === "values" && searchInputRef) {
                        searchInputRef.focus({ preventScroll: true });
                        return;
                    }
                    const firstControl = popoverRef?.querySelector<HTMLElement>(
                        'input:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])'
                    );
                    firstControl?.focus({ preventScroll: true });
                });
            }
        });

        return () => {
            clearPendingTimers();
        };
    });

    function handleToggle(event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        if (event.newState !== "closed") return;
        if (ctx.isSwitchingPopover()) return;
        const shouldRestore = !outsidePointerDownInteractive;
        outsidePointerDownInteractive = false;
        ctx.markPopoverClosedFromNative(shouldRestore);
    }

    function handleSortClick(direction: DataTableSortDirection): void {
        if (!table || !activeColumn) return;
        const next = currentSort?.direction === direction ? null : direction;
        table.setColumnSort(activeColumn.id, next);
    }

    function handleSearchInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        const next = event.currentTarget.value;
        searchQuery = next;

        if (searchDebounceTimer !== null) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }

        if (facetsResult.totalDistinct < ADAPTIVE_DEBOUNCE_ROW_THRESHOLD) {
            appliedSearchQuery = next;
            if (checklistViewportRef) checklistViewportRef.scrollTop = 0;
            return;
        }

        searchDebounceTimer = setTimeout(() => {
            searchDebounceTimer = null;
            appliedSearchQuery = next;
            if (checklistViewportRef) checklistViewportRef.scrollTop = 0;
        }, ADAPTIVE_DEBOUNCE_MS);
    }

    function handleClearSearch(): void {
        if (searchDebounceTimer !== null) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }
        searchQuery = "";
        appliedSearchQuery = "";
        if (checklistViewportRef) checklistViewportRef.scrollTop = 0;
        searchInputRef?.focus({ preventScroll: true });
    }

    function handleToggleFacet(key: string): void {
        if (!table || !activeColumn) return;
        const next = new SvelteSet(selectedValueSet);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }

        if (next.size === 0) {
            table.setColumnFilter(activeColumn.id, null);
            return;
        }
        table.setColumnFilter(activeColumn.id, {
            kind: "values",
            selected: [...next],
        });
    }

    function handleSelectMatches(): void {
        if (!table || !activeColumn || filteredFacets.length === 0) return;
        const next = new SvelteSet(selectedValueSet);
        for (const item of filteredFacets) {
            next.add(item.key);
        }
        table.setColumnFilter(activeColumn.id, {
            kind: "values",
            selected: [...next],
        });
    }

    function applyConditionFilterNow(operator: DataTableConditionOperator, value: string, valueTo: string): void {
        if (!table || !activeColumn) return;
        if (operator === "isEmpty" || operator === "isNotEmpty") {
            table.setColumnFilter(activeColumn.id, {
                kind: "condition",
                operator,
            });
            return;
        }
        if (operator === "between") {
            if (value.trim() === "" && valueTo.trim() === "") {
                table.setColumnFilter(activeColumn.id, null);
                return;
            }
            table.setColumnFilter(activeColumn.id, {
                kind: "condition",
                operator,
                value,
                valueTo,
            });
            return;
        }
        if (value.trim() === "") {
            table.setColumnFilter(activeColumn.id, null);
            return;
        }
        table.setColumnFilter(activeColumn.id, {
            kind: "condition",
            operator,
            value,
        });
    }

    function scheduleConditionApply(operator: DataTableConditionOperator, value: string, valueTo: string): void {
        if (conditionDebounceTimer !== null) {
            clearTimeout(conditionDebounceTimer);
            conditionDebounceTimer = null;
        }

        if (!table || table.totalRowCount < ADAPTIVE_DEBOUNCE_ROW_THRESHOLD) {
            applyConditionFilterNow(operator, value, valueTo);
            return;
        }

        conditionDebounceTimer = setTimeout(() => {
            conditionDebounceTimer = null;
            applyConditionFilterNow(operator, value, valueTo);
        }, ADAPTIVE_DEBOUNCE_MS);
    }

    function handleOperatorChange(nextOperator: DataTableConditionOperator): void {
        conditionOperator = nextOperator;
        if (conditionDebounceTimer !== null) {
            clearTimeout(conditionDebounceTimer);
            conditionDebounceTimer = null;
        }
        applyConditionFilterNow(nextOperator, conditionValue, conditionValueTo);
    }

    function handleConditionValueChange(nextValue: string): void {
        conditionValue = nextValue;
        scheduleConditionApply(conditionOperator, nextValue, conditionValueTo);
    }

    function handleConditionValueToChange(nextValueTo: string): void {
        conditionValueTo = nextValueTo;
        scheduleConditionApply(conditionOperator, conditionValue, nextValueTo);
    }

    function handleClearColumnFilter(): void {
        if (!table || !activeColumn) return;
        clearPendingTimers();
        conditionValue = "";
        conditionValueTo = "";
        pinnedCheckedKeys = new SvelteSet();
        table.clearColumnFilter(activeColumn.id);
    }

    function handleModeChange(nextMode: ActiveTab): void {
        activeTab = nextMode;
        if (nextMode === "condition" && typeof requestAnimationFrame !== "undefined") {
            requestAnimationFrame(() => {
                if (conditionOperator !== "isEmpty" && conditionOperator !== "isNotEmpty") {
                    conditionValueInputRef?.focus({ preventScroll: true });
                }
            });
        }
    }
</script>

<Popover
    bind:ref={popoverRef}
    id={ctx.popoverId}
    popover="auto"
    {placement}
    width="content"
    offset="6px"
    role="dialog"
    aria-modal="false"
    aria-label={popoverTitle}
    class={["cs-data-table-column-popover", "cs-listbox"]}
    data-size="sm"
    ontoggle={handleToggle}
>
    {#if activeColumn}
        {#if activeColumn.sortable}
            <div class="cs-listbox-group cs-data-table-popover-sort-group">
                <button
                    type="button"
                    class="cs-listbox-item cs-data-table-popover-sort-item"
                    aria-pressed={currentSort?.direction === "asc" ? "true" : "false"}
                    data-selected={currentSort?.direction === "asc" ? "" : undefined}
                    onpointerup={(event) => {
                        if (!ctx.shouldCommitPointerRelease(event)) return;
                        handleSortClick("asc");
                        ctx.clearPointerOpen();
                        armSuppressNextItemClick();
                        event.preventDefault();
                    }}
                    onclick={(event) => {
                        if (suppressNextItemClick) {
                            suppressNextItemClick = false;
                            event.preventDefault();
                            event.stopPropagation();
                            return;
                        }
                        handleSortClick("asc");
                    }}
                >
                    <ArrowUp class="cs-listbox-item-icon" aria-hidden="true" />
                    <span class="cs-listbox-item-content">{sortLabels.asc}</span>
                    <span class="cs-listbox-item-check" aria-hidden="true">
                        <CheckboxMark
                            checked={currentSort?.direction === "asc"}
                            class="cs-listbox-item-check-icon"
                            stroke-width="3"
                        />
                    </span>
                </button>
                <button
                    type="button"
                    class="cs-listbox-item cs-data-table-popover-sort-item"
                    aria-pressed={currentSort?.direction === "desc" ? "true" : "false"}
                    data-selected={currentSort?.direction === "desc" ? "" : undefined}
                    onpointerup={(event) => {
                        if (!ctx.shouldCommitPointerRelease(event)) return;
                        handleSortClick("desc");
                        ctx.clearPointerOpen();
                        armSuppressNextItemClick();
                        event.preventDefault();
                    }}
                    onclick={(event) => {
                        if (suppressNextItemClick) {
                            suppressNextItemClick = false;
                            event.preventDefault();
                            event.stopPropagation();
                            return;
                        }
                        handleSortClick("desc");
                    }}
                >
                    <ArrowDown class="cs-listbox-item-icon" aria-hidden="true" />
                    <span class="cs-listbox-item-content">{sortLabels.desc}</span>
                    <span class="cs-listbox-item-check" aria-hidden="true">
                        <CheckboxMark
                            checked={currentSort?.direction === "desc"}
                            class="cs-listbox-item-check-icon"
                            stroke-width="3"
                        />
                    </span>
                </button>
            </div>
        {/if}

        {#if activeColumn.filterable}
            {#if activeColumn.sortable}
                <div class="cs-listbox-separator" aria-hidden="true"></div>
            {/if}

            {#if showModeSwitch}
                <div class="cs-data-table-popover-mode">
                    <SegmentedControl size="xs" width="equal" bind:value={() => activeTab, handleModeChange}>
                        <SegmentedControlItem value="values">
                            <SegmentedControlLabel>{t({ de: "Werte", en: "Values" })}</SegmentedControlLabel>
                        </SegmentedControlItem>
                        <SegmentedControlItem value="condition">
                            <SegmentedControlLabel>{t({ de: "Bedingung", en: "Condition" })}</SegmentedControlLabel>
                        </SegmentedControlItem>
                    </SegmentedControl>
                </div>
            {/if}

            {#if activeTab === "values" && columnFilterCapabilities.supportsValues}
                {#if showSearch}
                    <div class="cs-data-table-popover-search-wrap">
                        <div class="cs-data-table-popover-search">
                            <Search class="cs-data-table-popover-search-icon" aria-hidden="true" />
                            <input
                                bind:this={searchInputRef}
                                type="text"
                                class="cs-data-table-popover-search-input"
                                value={searchQuery}
                                placeholder={t({ de: "Suchen", en: "Search" })}
                                aria-label={t({ de: "Werte durchsuchen", en: "Search values" })}
                                oninput={handleSearchInput}
                            />
                            <button
                                type="button"
                                tabindex={-1}
                                class="cs-data-table-popover-search-clear"
                                aria-label={t({ de: "Suche leeren", en: "Clear search" })}
                                aria-hidden={searchQuery === "" ? "true" : undefined}
                                data-visible={searchQuery !== "" ? "" : "false"}
                                onpointerdown={(event) => event.preventDefault()}
                                onclick={handleClearSearch}
                            >
                                <HitArea size="sm" />
                                <X aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                {/if}

                <ScrollArea size="sm" direction="vertical" class="cs-data-table-popover-scroll">
                    {#if shouldVirtualizeChecklist}
                        <ScrollAreaContent
                            bind:ref={checklistViewportRef}
                            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
                            {@attach checklistVirtual.attachViewport}
                        >
                            <div class="cs-listbox-list" {@attach checklistVirtual.attachList}>
                                {#each checklistVirtual.items as vItem (vItem.key)}
                                    {const item = $derived(filteredFacets[vItem.index])}
                                    {#if item}
                                        {const isChecked = $derived(selectedValueSet.has(item.key))}
                                        <label
                                            class="cs-data-table-popover-option cs-listbox-item"
                                            data-checked={isChecked ? "" : undefined}
                                            data-empty={item.isEmpty ? "" : undefined}
                                            onpointerup={(event) => {
                                                if (!ctx.shouldCommitPointerRelease(event)) return;
                                                handleToggleFacet(item.key);
                                                ctx.clearPointerOpen();
                                                armSuppressNextItemClick();
                                                event.preventDefault();
                                            }}
                                            onclickcapture={(event) => {
                                                if (!suppressNextItemClick) return;
                                                suppressNextItemClick = false;
                                                event.preventDefault();
                                                event.stopPropagation();
                                            }}
                                        >
                                            <span class="cs-data-table-checkbox-wrap">
                                                <Checkbox
                                                    variant="soft"
                                                    size="sm"
                                                    bind:checked={() => isChecked, () => handleToggleFacet(item.key)}
                                                />
                                            </span>
                                            <span class="cs-data-table-popover-option-label">{item.label}</span>
                                            <span class="cs-data-table-popover-option-count">
                                                {item.count.toLocaleString()}
                                            </span>
                                        </label>
                                    {/if}
                                {/each}
                            </div>
                            {#if facetsResult.truncated}
                                <div class="cs-data-table-popover-truncated">
                                    {t({
                                        de: `Erste ${table?.maxChecklistValues.toLocaleString()} Werte angezeigt`,
                                        en: `Showing first ${table?.maxChecklistValues.toLocaleString()} values`,
                                    })}
                                </div>
                            {/if}
                        </ScrollAreaContent>
                    {:else}
                        <ScrollAreaContent
                            bind:ref={checklistViewportRef}
                            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
                        >
                            {#if filteredFacets.length === 0}
                                <div class="cs-listbox-empty">
                                    {t({ de: "Keine passenden Werte", en: "No matching values" })}
                                </div>
                            {:else}
                                <div class="cs-listbox-list">
                                    {#each filteredFacets as item (item.key)}
                                        {const isChecked = $derived(selectedValueSet.has(item.key))}
                                        <label
                                            class="cs-data-table-popover-option cs-listbox-item"
                                            data-checked={isChecked ? "" : undefined}
                                            data-empty={item.isEmpty ? "" : undefined}
                                            onpointerup={(event) => {
                                                if (!ctx.shouldCommitPointerRelease(event)) return;
                                                handleToggleFacet(item.key);
                                                ctx.clearPointerOpen();
                                                armSuppressNextItemClick();
                                                event.preventDefault();
                                            }}
                                            onclickcapture={(event) => {
                                                if (!suppressNextItemClick) return;
                                                suppressNextItemClick = false;
                                                event.preventDefault();
                                                event.stopPropagation();
                                            }}
                                        >
                                            <span class="cs-data-table-checkbox-wrap">
                                                <Checkbox
                                                    variant="soft"
                                                    size="sm"
                                                    bind:checked={() => isChecked, () => handleToggleFacet(item.key)}
                                                />
                                            </span>
                                            <span class="cs-data-table-popover-option-label">{item.label}</span>
                                            <span class="cs-data-table-popover-option-count">
                                                {item.count.toLocaleString()}
                                            </span>
                                        </label>
                                    {/each}
                                </div>
                                {#if facetsResult.truncated}
                                    <div class="cs-data-table-popover-truncated">
                                        {t({
                                            de: `Erste ${table?.maxChecklistValues.toLocaleString()} Werte angezeigt`,
                                            en: `Showing first ${table?.maxChecklistValues.toLocaleString()} values`,
                                        })}
                                    </div>
                                {/if}
                            {/if}
                        </ScrollAreaContent>
                    {/if}
                </ScrollArea>
            {:else if columnFilterCapabilities.supportsCondition}
                <div class="cs-data-table-popover-condition">
                    <Select variant="soft" size="xs" bind:value={() => conditionOperator, handleOperatorChange}>
                        <SelectTrigger aria-label={t({ de: "Filteroperator", en: "Filter operator" })}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {#each allowedOperators as op (op)}
                                <SelectItem value={op} label={getOperatorLabel(op)}>
                                    {getOperatorLabel(op)}
                                </SelectItem>
                            {/each}
                        </SelectContent>
                    </Select>

                    {#if isRangeOperator}
                        <div class="cs-data-table-popover-condition-range">
                            <TextInput variant="soft" size="xs">
                                <TextInputField
                                    bind:ref={conditionValueInputRef}
                                    bind:value={() => conditionValue, handleConditionValueChange}
                                    inputmode={conditionInputMode}
                                    placeholder={t({ de: "Min", en: "Min" })}
                                    aria-label={t({ de: "Minimalwert", en: "Minimum value" })}
                                />
                            </TextInput>
                            <TextInput variant="soft" size="xs">
                                <TextInputField
                                    bind:value={() => conditionValueTo, handleConditionValueToChange}
                                    inputmode={conditionInputMode}
                                    placeholder={t({ de: "Max", en: "Max" })}
                                    aria-label={t({ de: "Maximalwert", en: "Maximum value" })}
                                />
                            </TextInput>
                        </div>
                    {:else if !isUnaryOperator}
                        <TextInput variant="soft" size="xs">
                            <TextInputField
                                bind:ref={conditionValueInputRef}
                                bind:value={() => conditionValue, handleConditionValueChange}
                                inputmode={conditionInputMode}
                                placeholder={t({ de: "Wert", en: "Value" })}
                                aria-label={t({ de: "Filterwert", en: "Filter value" })}
                            />
                        </TextInput>
                    {/if}
                </div>
            {/if}

            {#if showFooter}
                <div class="cs-data-table-popover-footer">
                    {#if isSearchingValues}
                        <Button
                            variant="ghost"
                            size="xs"
                            disabled={filteredFacets.length === 0}
                            onclick={handleSelectMatches}
                        >
                            <ButtonLabel>{t({ de: "Treffer wählen", en: "Select matches" })}</ButtonLabel>
                        </Button>
                        <span class="cs-data-table-popover-footer-count">
                            {t({
                                de: `${filteredFacets.length.toLocaleString()} Treffer`,
                                en: `${filteredFacets.length.toLocaleString()} matches`,
                            })}
                        </span>
                    {:else}
                        <Button variant="ghost" size="xs" onclick={handleClearColumnFilter}>
                            <ButtonLabel>{t({ de: "Filter zurücksetzen", en: "Clear filter" })}</ButtonLabel>
                        </Button>
                    {/if}
                </div>
            {/if}
        {/if}
    {/if}
</Popover>
