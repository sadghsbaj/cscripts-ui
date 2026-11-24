<script lang="ts">
    import {
        getInternalCommandPaletteContext,
        hasCommandPaletteListContext,
        setCommandPalettePageContext,
    } from "./command-palette.context.internal.ts";
    import type { CommandPalettePageProps } from "./index.ts";

    let {
        ref = $bindable(null),
        value,
        label,
        filter,
        class: className,
        children,
        ...rest
    }: CommandPalettePageProps = $props();

    const palette = getInternalCommandPaletteContext();
    const inList = hasCommandPaletteListContext();
    const isActive = $derived(palette.activePage === value);

    setCommandPalettePageContext({
        get value() {
            return value;
        },
        get filter() {
            return filter;
        },
    });

    $effect(() => {
        return palette.registerPage({
            value,
            label,
            filter,
            inList,
        });
    });
</script>

{#if isActive}
    <div bind:this={ref} {...rest} class={["cs-command-palette-page", className]} data-page={value}>
        {@render children?.()}
    </div>
{/if}
