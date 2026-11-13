<!--
@component
Keyboard shortcut keycap badge (`<TooltipKbd />`) for `<Tooltip />` overlays.

Architectural Notes:
- Optical Trimming: Applies `text-box: trim-both cap alphabetic` with `line-height: var(--cs-leading-none)`
  for pixel-perfect optical vertical centering of key symbols.
- Styling: Renders an elevated surface squircle pill (`bg-elevation-2`, `radius-full`).
-->
<script lang="ts">
    import type { TooltipKbdProps } from "./index.ts";

    let { key, class: className, children, ...rest }: TooltipKbdProps = $props();
</script>

<kbd {...rest} class={["cs-tooltip-kbd", className]}>
    {#if children}
        {@render children()}
    {:else if key}
        {key}
    {/if}
</kbd>

<style>
    @layer components.composite {
        .cs-tooltip-kbd {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-inline-size: 16px;
            padding: 2px 4px;
            color: var(--cs-color-text-strong, currentColor);
            font-family: var(--cs-font-sans);
            font-size: 11px;
            font-weight: 500;
            line-height: var(--cs-leading-none);
            text-box-trim: trim-both;
            text-box-edge: cap alphabetic;
            text-box: trim-both cap alphabetic;
            background-color: var(--cs-color-base-soft);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
        }
    }
</style>
