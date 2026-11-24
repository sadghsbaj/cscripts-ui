<script lang="ts">
    import type { Snippet } from "svelte";

    import { setCommandPalettePageContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteFilterFn } from "./index.ts";

    let {
        pageValue,
        filter,
        isPrefixPlugin = false,
        children,
    }: {
        pageValue: string | undefined;
        filter: boolean | CommandPaletteFilterFn | undefined;
        isPrefixPlugin?: boolean;
        children?: Snippet;
    } = $props();

    setCommandPalettePageContext({
        get value() {
            return pageValue;
        },
        get filter() {
            return filter;
        },
        get isPrefixPlugin() {
            return isPrefixPlugin;
        },
    });
</script>

{@render children?.()}
