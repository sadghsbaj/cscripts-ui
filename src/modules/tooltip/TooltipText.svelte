<script lang="ts">
    import type { TooltipTextProps } from "./index.ts";

    let { ref = $bindable(null), text, class: className, children, ...rest }: TooltipTextProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-tooltip-text", className]}>
    {#if children}
        {@render children()}
    {:else if text}
        {text}
    {/if}
</span>

<style>
    @layer components.composite {
        .cs-tooltip-text {
            min-inline-size: 0;
            overflow-x: clip;
            overflow-y: visible;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-tooltip-font-size, var(--cs-text-xs));
            font-weight: 600;
            line-height: var(--cs-leading-none);
            text-overflow: ellipsis;
            letter-spacing: var(--cs-tracking-tight);
            white-space: nowrap;
            text-box-trim: trim-both;
            text-box-edge: cap alphabetic;
            text-box: trim-both cap alphabetic;
        }
    }
</style>
