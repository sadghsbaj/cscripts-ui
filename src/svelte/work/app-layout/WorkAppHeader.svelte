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

    {@render children?.()}

    {#if showBrand}
        <WorkAppBrand />
    {/if}
</header>

<style>
    @layer components {
        .cs-work-app-header {
            display: flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 48px;
        }

        .cs-work-app-tool-identity {
            display: inline-flex;
            align-items: center;
            height: 100%;
            padding-inline: 20px;
            background-color: var(--cs-color-elevation-1);
            border: 1px solid var(--cs-color-elevation-1-border);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-sm);
            user-select: none;
        }

        .cs-work-app-tool-name {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-base);
            font-weight: 700;
            letter-spacing: var(--cs-tracking-tight);
        }
    }
</style>
