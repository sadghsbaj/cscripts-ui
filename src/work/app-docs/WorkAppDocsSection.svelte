<script lang="ts">
    import type { WorkAppDocsSectionProps } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        title,
        lead,
        level = 2,
        children,
        class: className,
        ...rest
    }: WorkAppDocsSectionProps = $props();

    const headingId = $props.id();
</script>

<section
    {...rest}
    bind:this={ref}
    {id}
    aria-labelledby={headingId}
    class={["cs-work-app-docs-section", className]}
    data-level={level}
>
    {#if level === 3}
        <h3 id={headingId} class="cs-work-app-docs-heading" data-level="3">{title}</h3>
    {:else}
        <h2 id={headingId} class="cs-work-app-docs-heading" data-level="2">{title}</h2>
    {/if}

    {#if lead}
        <p class="cs-work-app-docs-section-lead">{lead}</p>
    {/if}

    {@render children?.()}
</section>

<style>
    @layer components.composite {
        .cs-work-app-docs-section[data-level="2"] {
            margin-block-start: 32px;
            padding-block-start: 28px;
            box-shadow: inset 0 1px 0 0 var(--cs-work-app-docs-divider);
        }

        .cs-work-app-docs-section[data-level="2"]:first-child,
        :global(.cs-work-app-docs-chapter-title) + .cs-work-app-docs-section[data-level="2"],
        :global(.cs-work-app-docs-chapter-lead) + .cs-work-app-docs-section[data-level="2"] {
            margin-block-start: 0;
            padding-block-start: 0;
            box-shadow: none;
        }

        .cs-work-app-docs-section[data-level="3"] {
            margin-block-start: 26px;
        }

        .cs-work-app-docs-heading {
            margin-block: 0;
            color: var(--cs-color-text-strong);
            letter-spacing: var(--cs-tracking-tight);
        }

        .cs-work-app-docs-heading[data-level="2"] {
            margin-block-end: 12px;
            font-size: var(--cs-text-lg);
            font-weight: 600;
            line-height: 1.35;
        }

        .cs-work-app-docs-heading[data-level="3"] {
            margin-block-end: 8px;
            font-size: var(--cs-text-base);
            font-weight: 600;
            line-height: 1.4;
        }

        .cs-work-app-docs-section-lead {
            margin-block: 0 16px;
            max-inline-size: 64ch;
            color: var(--cs-color-text-weak);
            font-size: 15px;
            line-height: 1.65;
        }
    }
</style>
