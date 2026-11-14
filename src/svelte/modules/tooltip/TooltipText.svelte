<!--
@component
Text label wrapper (`<TooltipText />`) for `<Tooltip />` overlays.

Architectural Notes:
- Optical Trimming & Truncation: Applies optical cap-height trimming (`text-box: trim-both cap alphabetic`)
  with `overflow-x: clip; overflow-y: visible;` for vertical alignment without clipping descenders.
-->
<script lang="ts">
    import type { TooltipTextProps } from "./index.ts";

    let { text, class: className, children, ...rest }: TooltipTextProps = $props();
</script>

<span {...rest} class={["cs-tooltip-text", className]}>
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
            font-size: var(--_fs, var(--cs-text-xs));
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
