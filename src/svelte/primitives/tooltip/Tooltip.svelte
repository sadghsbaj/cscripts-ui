<!--
@component
Lightweight tooltip surface container primitive (`<Tooltip />`) built on top of `<Popover popover="hint">`.

Architectural Notes:
- Fixed Surface: Uses `size="content"` and default `placement="top"`. All dynamic positioning,
  offsets, delays, and trigger attachments are driven externally by the `tooltip` attachment
  (`tooltip.attach.svelte.ts`) to keep the container minimal and unopinionated.
- Styling: Renders an elevated squircle badge (`bg-elevation-1`, `squircle-smooth`, `text-xs font-500`)
  with discrete popover transition styling.
-->

<script lang="ts">
    import { type TooltipProps } from ".";
    import Popover from "../popover/Popover.svelte";

    let { id, text, class: className, children, ...rest }: TooltipProps = $props();
</script>

<Popover {...rest} {id} popover="hint" size="content" placement="top" role="tooltip" class={["cs-tooltip", className]}>
    {#if children}
        {@render children()}
    {:else if text}
        {text}
    {/if}
</Popover>

<style>
    @layer components.composite {
        :global(.cs-tooltip:popover-open) {
            display: inline-flex;
        }

        :global(.cs-tooltip) {
            gap: 6px;
            align-items: center;
            justify-content: center;
            padding: 4px 8px;
            color: var(--cs-color-text-main);
            font-size: var(--cs-text-xs);
            font-weight: 500;
            background-color: var(--cs-color-elevation-1);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-elevation-1);
        }
    }
</style>
