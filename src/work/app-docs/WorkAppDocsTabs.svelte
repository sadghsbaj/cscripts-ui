<script lang="ts">
    import {
        SegmentedControl,
        SegmentedControlIcon,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "../../modules/segmented-control/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { getAppDocsContext } from "./app-docs.context.internal.ts";
    import type { WorkAppDocsTabsProps } from "./index.ts";

    let {
        ref = $bindable(null),
        children,
        class: className,
        "aria-label": ariaLabel,
        ...rest
    }: WorkAppDocsTabsProps = $props();

    const ctx = getAppDocsContext();
    const defaultAriaLabel = t({ de: "Kapitel", en: "Chapters" });
</script>

<div {...rest} bind:this={ref} class={["cs-work-app-docs-tabs", className]}>
    <SegmentedControl
        size="md"
        width="content"
        aria-label={ariaLabel ?? defaultAriaLabel}
        bind:value={
            () => ctx.activeChapter,
            (next) => {
                if (next !== undefined) ctx.selectChapter(next);
            }
        }
    >
        {#if children}
            {@render children()}
        {:else}
            {#each ctx.chapters as chapter (chapter.id)}
                <SegmentedControlItem value={chapter.id}>
                    {#if chapter.icon}
                        <SegmentedControlIcon icon={chapter.icon} />
                    {/if}
                    <SegmentedControlLabel>{chapter.title}</SegmentedControlLabel>
                </SegmentedControlItem>
            {/each}
        {/if}
    </SegmentedControl>
</div>

<style>
    @layer components.composite {
        .cs-work-app-docs-tabs {
            display: flex;
            justify-content: flex-start;
            margin-block: -2px;
            min-width: 0;
            max-width: 100%;
            /* Prevent vertical clipping of focus rings inside horizontal scroll container */
            padding-block: 2px;
            overflow-x: auto;
            scrollbar-width: none;
        }

        .cs-work-app-docs-tabs::-webkit-scrollbar {
            display: none;
        }
    }
</style>
