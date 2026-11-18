<script lang="ts">
    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import type { DataTableRowProps } from "./index.ts";

    let {
        ref = $bindable(null),
        selected = false,
        even = false,
        interactive = false,
        tone,
        bg,
        fg,
        colorMode,
        class: className,
        children,
        ...rest
    }: DataTableRowProps = $props();

    const ctx = hasDataTableContext() ? getDataTableContext() : undefined;

    const isGrid = $derived(ctx?.role === "grid");
    const isSelectable = $derived(Boolean(ctx?.table?.selectable));
    const resolvedColorMode = $derived(colorMode ?? ctx?.colorMode ?? "tint");
</script>

<div
    bind:this={ref}
    role="row"
    aria-selected={isGrid && isSelectable ? (selected ? "true" : "false") : undefined}
    {...rest}
    class={["cs-data-table-row", className]}
    data-selected={selected ? "" : undefined}
    data-even={even ? "" : undefined}
    data-interactive={interactive ? "" : undefined}
    data-tone={tone}
    data-custom-bg={bg ? "" : undefined}
    data-custom-fg={fg ? "" : undefined}
    data-color-mode={bg ? resolvedColorMode : undefined}
    style:--cs-data-table-row-bg={bg}
    style:--cs-data-table-row-fg={fg}
>
    {@render children?.()}
</div>
