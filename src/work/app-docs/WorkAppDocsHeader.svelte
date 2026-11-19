<script lang="ts">
    import type { WorkAppDocsHeaderProps } from "./index.ts";

    let {
        ref = $bindable(null),
        title,
        lead,
        eyebrow,
        children,
        class: className,
        ...rest
    }: WorkAppDocsHeaderProps = $props();
</script>

<header {...rest} bind:this={ref} class={["cs-work-app-docs-header", className]}>
    {#if eyebrow}
        <p class="cs-work-app-docs-eyebrow">{eyebrow}</p>
    {/if}

    <h1 class="cs-work-app-docs-title">{title}</h1>

    {#if lead}
        <p class="cs-work-app-docs-lead">{lead}</p>
    {/if}

    {@render children?.()}
</header>

<style>
    @layer components.composite {
        .cs-work-app-docs-header {
            margin-block-end: 32px;
            padding-block-end: 24px;
            box-shadow: inset 0 -1px 0 0 var(--cs-work-app-docs-divider);
        }

        .cs-work-app-docs-eyebrow {
            margin-block: 0 8px;
            color: var(--cs-color-text-weak);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: var(--cs-tracking-wider);
            text-transform: uppercase;
        }

        .cs-work-app-docs-title {
            margin: 0;
            color: var(--cs-color-text-strong);
            font-size: 32px;
            font-weight: 700;
            letter-spacing: var(--cs-tracking-tight);
            line-height: 1.15;
        }

        .cs-work-app-docs-lead {
            margin-block: 10px 0;
            max-inline-size: 60ch;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-base);
            font-weight: 400;
            line-height: 1.6;
        }
    }
</style>
