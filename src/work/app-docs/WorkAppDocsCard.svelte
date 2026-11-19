<script lang="ts">
    import type { WorkAppDocsCardProps } from "./index.ts";

    let {
        ref = $bindable(null),
        title,
        description,
        icon: Icon,
        children,
        class: className,
        ...rest
    }: WorkAppDocsCardProps = $props();
</script>

<div {...rest} bind:this={ref} class={["cs-work-app-docs-card", className]}>
    {#if Icon}
        <span class="cs-work-app-docs-card-icon" aria-hidden="true">
            <Icon size={15} strokeWidth={2} />
        </span>
    {/if}

    <p class="cs-work-app-docs-card-title">{title}</p>

    {#if description}
        <p class="cs-work-app-docs-card-description">{description}</p>
    {/if}

    {#if children}
        <div class="cs-work-app-docs-card-body">
            {@render children()}
        </div>
    {/if}
</div>

<style>
    @layer components.composite {
        .cs-work-app-docs-card {
            padding: 16px;
            border-radius: var(--cs-radius-2xl);
            corner-shape: var(--cs-squircle);
            background-color: var(--cs-color-elevated);
            box-shadow: var(--cs-shadow-elevated);
        }

        .cs-work-app-docs-card-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            inline-size: 26px;
            block-size: 26px;
            margin-block-end: 10px;
            border-radius: 7px;
            corner-shape: var(--cs-squircle-soft);
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-weak);
        }

        .cs-work-app-docs-card-title {
            margin-block: 0 4px;
            color: var(--cs-color-text-strong);
            font-size: 14px;
            font-weight: 600;
            line-height: 1.4;
        }

        .cs-work-app-docs-card-description,
        .cs-work-app-docs-card-body :global(:where(p)) {
            margin-block: 0;
            max-inline-size: none;
            color: var(--cs-color-text-weak);
            font-size: 13px;
            line-height: 1.5;
        }

        .cs-work-app-docs-card-description + .cs-work-app-docs-card-body {
            margin-block-start: 8px;
        }
    }
</style>
