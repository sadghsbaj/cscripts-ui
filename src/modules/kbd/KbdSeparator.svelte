<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import type { KbdSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: KbdSeparatorProps = $props();
</script>

<span bind:this={ref} {...rest} aria-hidden="true" class={["cs-kbd-separator", className]}>
    {#if children}
        {@render children()}
    {:else}
        <Plus strokeWidth={2.25} aria-hidden="true" class="cs-kbd-separator-icon" />
    {/if}
</span>

<style>
    @layer components.primitive {
        .cs-kbd-separator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: var(--cs-color-text-weak);
            font-family: var(--cs-font-sans);
            font-size: var(--cs-kbd-separator-size);
            font-weight: 400;
            line-height: var(--cs-leading-none);
            margin-block-end: var(--cs-kbd-separator-offset, 0px);
            white-space: nowrap;
            user-select: none;

            & :global(.cs-kbd-separator-icon) {
                flex-shrink: 0;
                inline-size: var(--cs-kbd-separator-size);
                block-size: var(--cs-kbd-separator-size);
            }
        }
    }
</style>
