<script lang="ts">
    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import type { DataTableCellProps } from "./index.ts";

    let {
        ref = $bindable(null),
        align = "start",
        numeric = false,
        wrap,
        emphasis,
        tone,
        bg,
        fg,
        colorMode,
        colBg,
        colFg,
        colTone,
        colColorMode,
        selection = false,
        pinned,
        bold = false,
        italic = false,
        class: className,
        children,
        ...rest
    }: DataTableCellProps = $props();

    const ctx = hasDataTableContext() ? getDataTableContext() : undefined;

    const resolvedRole = $derived(ctx?.role === "grid" ? ("gridcell" as const) : ("cell" as const));
    const resolvedWrap = $derived(wrap ?? ctx?.wrap ?? false);
    const resolvedPinned = $derived(pinned ?? (selection ? "start" : undefined));
    const resolvedColorMode = $derived(colorMode ?? ctx?.colorMode ?? "tint");
    const resolvedColColorMode = $derived(colColorMode ?? ctx?.colorMode ?? "tint");
</script>

<div
    bind:this={ref}
    role={resolvedRole}
    {...rest}
    class={["cs-data-table-cell", className]}
    data-align={align}
    data-numeric={numeric ? "" : undefined}
    data-wrap={resolvedWrap ? "" : undefined}
    data-emphasis={emphasis && emphasis !== "default" ? emphasis : undefined}
    data-tone={tone}
    data-custom-bg={bg ? "" : undefined}
    data-custom-fg={fg ? "" : undefined}
    data-color-mode={bg ? resolvedColorMode : undefined}
    data-col-tone={colTone}
    data-col-bg={colBg ? "" : undefined}
    data-col-fg={colFg ? "" : undefined}
    data-col-color-mode={colBg ? resolvedColColorMode : undefined}
    data-selection={selection ? "" : undefined}
    data-pinned={resolvedPinned}
    style:--cs-data-table-cell-bg={bg}
    style:--cs-data-table-cell-fg={fg}
    style:--cs-data-table-col-bg={colBg}
    style:--cs-data-table-col-fg={colFg}
    style:font-weight={bold ? "600" : undefined}
    style:font-style={italic ? "italic" : undefined}
>
    {#if selection}
        {@render children?.()}
    {:else}
        <div class="cs-data-table-cell-content">
            {@render children?.()}
        </div>
    {/if}
</div>
