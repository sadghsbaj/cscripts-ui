<!--
@component
Application header bar (`<WorkAppHeader />`) for internal work tools.

Architectural Notes:
- Context Integration: Automatically reads `toolName` from the parent `<WorkAppIntro />` context
  via `getWorkAppIdentity()`, while still allowing an explicit `toolName` prop override.
- Built-In Brand Badge: Automatically renders `<WorkAppBrand />` on the right edge unless `showBrand={false}` is passed.
-->
<script lang="ts">
    import { getWorkAppIdentity } from "../app-intro/index.ts";
    import type { WorkAppHeaderProps } from "./index.ts";
    import WorkAppBrand from "./WorkAppBrand.svelte";

    let { toolName, showBrand = true, children, class: className, ...rest }: WorkAppHeaderProps = $props();

    const identity = getWorkAppIdentity();
</script>

<header {...rest} class={["cs-work-app-header", className]}>
    <div class="cs-work-app-tool-identity">
        <span class="cs-work-app-tool-name text-trim-truncate">{toolName ?? identity.toolName}</span>
    </div>

    <div class="cs-work-app-header-spacer" aria-hidden="true"></div>

    {@render children?.()}

    {#if showBrand}
        <WorkAppBrand />
    {/if}
</header>

<style>
    @layer components.composite {
        .cs-work-app-header {
            position: relative;
            display: flex;
            flex-shrink: 0;
            gap: 12px;
            align-items: center;
            width: 100%;
            height: 48px;
        }

        .cs-work-app-tool-identity {
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            order: 10;
            height: 100%;
            padding-inline: 20px;
            background-color: var(--cs-color-elevation-1);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-elevation-1);
            user-select: none;
        }

        .cs-work-app-header-spacer {
            flex: 1 1 auto;
            order: 30;
            min-width: 0;
            pointer-events: none;
        }

        :global(.cs-work-app-header-segment[data-alignment="start"]) {
            order: 20;
        }

        :global(.cs-work-app-header-segment[data-alignment="center"]) {
            position: absolute;
            left: 50%;
            z-index: 1;
            transform: translateX(-50%);
        }

        :global(.cs-work-app-header-segment[data-alignment="end"]) {
            order: 40;
        }

        :global(.cs-work-app-brand) {
            order: 50;
        }

        /* Backward compatibility for un-segmented child nodes */
        :global(
            .cs-work-app-header
                > :not(.cs-work-app-tool-identity):not(.cs-work-app-header-spacer):not(.cs-work-app-header-segment):not(
                    .cs-work-app-brand
                )
        ) {
            order: 25;
        }

        .cs-work-app-tool-name {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-base);
            font-weight: 700;
            letter-spacing: var(--cs-tracking-tight);
        }
    }
</style>
