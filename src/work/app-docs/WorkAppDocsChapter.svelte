<script lang="ts">
    import { getAppDocsContext } from "./app-docs.context.internal.ts";
    import type { WorkAppDocsChapterProps } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        title,
        icon,
        lead,
        children,
        class: className,
        ...rest
    }: WorkAppDocsChapterProps = $props();

    const headingId = $props.id();
    const ctx = getAppDocsContext();
    const isActive = $derived(ctx.activeChapter === id);

    $effect(() => {
        return ctx.registerChapter({
            id,
            title,
            icon,
        });
    });
</script>

{#if isActive}
    <section
        {...rest}
        bind:this={ref}
        {id}
        role="tabpanel"
        aria-labelledby={headingId}
        class={["cs-work-app-docs-chapter", className]}
        data-chapter-id={id}
    >
        <h2 id={headingId} class="cs-work-app-docs-chapter-title">{title}</h2>

        {#if lead}
            <p class="cs-work-app-docs-chapter-lead">{lead}</p>
        {/if}

        {@render children?.()}
    </section>
{/if}

<style>
    @layer components.composite {
        .cs-work-app-docs-chapter {
            min-width: 0;
        }

        .cs-work-app-docs-chapter-title {
            margin-block: 0 12px;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-xl);
            font-weight: 700;
            letter-spacing: var(--cs-tracking-tight);
            line-height: 1.3;
        }

        .cs-work-app-docs-chapter-lead {
            margin-block: 0 20px;
            max-inline-size: 64ch;
            color: var(--cs-color-text-weak);
            font-size: 15px;
            line-height: 1.65;
        }
    }
</style>
