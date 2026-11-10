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

    let { id, text, icon, shortcut, class: className, children, ...rest }: TooltipProps = $props();

    const resolvedIcon = $derived(
        typeof icon === "function"
            ? { component: icon, position: "start" as const }
            : icon
              ? { component: icon.component, position: icon.position ?? ("start" as const) }
              : null
    );

    const shortcuts = $derived(Array.isArray(shortcut) ? shortcut : shortcut ? [shortcut] : []);
</script>

<Popover {...rest} {id} popover="hint" size="content" placement="top" role="tooltip" class={["cs-tooltip", className]}>
    {#if children}
        {@render children()}
    {:else}
        {#if resolvedIcon && resolvedIcon.position === "start"}
            <resolvedIcon.component class="cs-tooltip-icon" aria-hidden="true" />
        {/if}

        {#if text}
            <span class="cs-tooltip-text">{text}</span>
        {/if}

        {#if resolvedIcon && resolvedIcon.position === "end"}
            <resolvedIcon.component class="cs-tooltip-icon" aria-hidden="true" />
        {/if}

        {#if shortcuts.length > 0}
            <span class="cs-tooltip-shortcuts">
                {#each shortcuts as key (key)}
                    <kbd class="cs-tooltip-kbd">{key}</kbd>
                {/each}
            </span>
        {/if}
    {/if}
</Popover>

<style>
    @layer components.composite {
        :global(.cs-tooltip:popover-open) {
            display: inline-flex;
        }

        :global(.cs-tooltip) {
            --_fs: 13px;

            gap: 4px;
            align-items: center;
            justify-content: center;
            max-inline-size: min(320px, 80vw);
            block-size: 26px;
            padding-inline: 8px;
            background-color: var(--cs-color-elevation-1);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-elevation-1);
        }

        :global(.cs-tooltip-text) {
            min-inline-size: 0;
            overflow-x: clip;
            overflow-y: visible;
            color: var(--cs-color-text-strong);
            font-size: var(--_fs);
            font-weight: 600;
            line-height: var(--cs-leading-none);
            text-overflow: ellipsis;
            letter-spacing: var(--cs-tracking-tight);
            white-space: nowrap;
            text-box-trim: trim-both;
            text-box-edge: cap alphabetic;
            text-box: trim-both cap alphabetic;
        }

        :global(.cs-tooltip-icon) {
            flex-shrink: 0;
            inline-size: calc(var(--_fs) + 1px);
            block-size: calc(var(--_fs) + 1px);
            color: var(--cs-color-text-strong, currentColor);
            stroke-width: 2.25;
        }

        :global(.cs-tooltip-shortcuts) {
            display: inline-flex;
            gap: 2px;
            align-items: center;
            margin-inline-start: 2px;
        }

        :global(.cs-tooltip-kbd) {
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
            line-height: var(--cs-leading-tight);
            text-box-trim: trim-both;
            text-box-edge: cap alphabetic;
            text-box: trim-both cap alphabetic;
            background-color: var(--cs-color-elevation-2);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-smooth);
        }
    }
</style>
