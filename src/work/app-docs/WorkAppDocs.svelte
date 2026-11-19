<script lang="ts">
    import { untrack } from "svelte";

    import { setAppDocsContext, type AppDocsChapterRecord } from "./app-docs.context.internal.ts";
    import type { WorkAppDocsProps } from "./index.ts";

    let {
        ref = $bindable(null),
        activeChapter = $bindable(),
        defaultChapter,
        onChapterChange,
        children,
        class: className,
        ...rest
    }: WorkAppDocsProps = $props();

    let chapters = $state<AppDocsChapterRecord[]>([]);

    const resolvedActiveChapter = $derived(activeChapter ?? defaultChapter ?? chapters[0]?.id);

    function registerChapter(record: AppDocsChapterRecord): () => void {
        untrack(() => {
            const exists = chapters.some((item) => item.id === record.id);
            chapters = exists
                ? chapters.map((item) => (item.id === record.id ? record : item))
                : [...chapters, record];
        });

        return () => {
            untrack(() => {
                chapters = chapters.filter((item) => item.id !== record.id);
            });
        };
    }

    function selectChapter(id: string): void {
        if (resolvedActiveChapter === id) return;
        activeChapter = id;
        onChapterChange?.(id);
    }

    setAppDocsContext({
        get activeChapter() {
            return resolvedActiveChapter;
        },
        get chapters() {
            return chapters;
        },
        registerChapter,
        selectChapter,
    });
</script>

<div {...rest} bind:this={ref} class={["cs-work-app-docs", className]}>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-work-app-docs {
            --cs-work-app-docs-max-width: 760px;
            --cs-work-app-docs-divider: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 7%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 9%, transparent)
            );

            display: flex;
            flex-direction: column;
            gap: 24px;
            width: 100%;
            max-inline-size: var(--cs-work-app-docs-max-width);
            margin-inline: auto;
            min-width: 0;
        }
    }
</style>
