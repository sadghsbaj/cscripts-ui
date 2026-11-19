<script lang="ts">
    import { Info, Lightbulb, TriangleAlert } from "@lucide/svelte";
    import type { Component } from "svelte";
    import type { WorkAppDocsCalloutProps, WorkAppDocsCalloutVariant } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        title,
        icon,
        children,
        class: className,
        ...rest
    }: WorkAppDocsCalloutProps = $props();

    const DEFAULT_ICONS: Record<WorkAppDocsCalloutVariant, Component<{ size?: number; strokeWidth?: number }>> = {
        note: Info,
        tip: Lightbulb,
        caution: TriangleAlert,
    };

    const ResolvedIcon = $derived(icon === null ? null : (icon ?? DEFAULT_ICONS[variant]));
</script>

<aside
    {...rest}
    bind:this={ref}
    class={["cs-work-app-docs-callout", className]}
    data-variant={variant}
    data-has-icon={ResolvedIcon ? "" : undefined}
>
    {#if ResolvedIcon}
        <span class="cs-work-app-docs-callout-badge" aria-hidden="true">
            <ResolvedIcon size={14} strokeWidth={2} />
        </span>
    {/if}

    <div class="cs-work-app-docs-callout-body">
        {#if title}
            <p class="cs-work-app-docs-callout-title">{title}</p>
        {/if}

        <div class="cs-work-app-docs-callout-text">
            {@render children?.()}
        </div>
    </div>
</aside>

<style>
    @layer components.composite {
        .cs-work-app-docs-callout {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
            align-items: start;
            margin-block: 20px;
            padding: 14px 16px;
            border-radius: var(--cs-radius-2xl);
            corner-shape: var(--cs-squircle);
            background-color: var(--cs-color-elevated);
            box-shadow: var(--cs-shadow-elevated);
        }

        .cs-work-app-docs-callout[data-has-icon] {
            grid-template-columns: auto minmax(0, 1fr);
        }

        .cs-work-app-docs-callout-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            inline-size: 24px;
            block-size: 24px;
            margin-block-start: 1px;
            border-radius: 7px;
            corner-shape: var(--cs-squircle-soft);
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-weak);
        }

        .cs-work-app-docs-callout[data-variant="tip"] .cs-work-app-docs-callout-badge {
            background-color: var(--cs-color-accent-soft);
            color: var(--cs-color-accent-soft-fg);
        }

        .cs-work-app-docs-callout[data-variant="caution"] .cs-work-app-docs-callout-badge {
            background-color: var(--cs-color-caution-soft);
            color: var(--cs-color-caution-soft-fg);
        }

        .cs-work-app-docs-callout-body {
            min-width: 0;
        }

        .cs-work-app-docs-callout-title {
            margin-block: 0 2px;
            color: var(--cs-color-text-strong);
            font-size: 14px;
            font-weight: 600;
            line-height: 1.4;
        }

        .cs-work-app-docs-callout-text,
        .cs-work-app-docs-callout-text :global(:where(p)) {
            color: var(--cs-color-text-main);
            font-size: 14px;
            line-height: 1.55;
        }

        .cs-work-app-docs-callout-text :global(:where(p)) {
            margin-block: 0 8px;
            max-inline-size: none;
        }

        .cs-work-app-docs-callout-text :global(:where(p:last-child)) {
            margin-block-end: 0;
        }
    }
</style>
