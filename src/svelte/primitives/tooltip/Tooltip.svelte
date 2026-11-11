<!--
@component
Lightweight tooltip surface container primitive (`<Tooltip />`) built on top of `<Popover popover="hint">`.

Architectural Notes:
- Fixed Surface: Uses `size="content"` and default `placement="top"`. All dynamic positioning,
  offsets, delays, and trigger attachments are driven externally by the `tooltip` attachment
  (`tooltip.attach.svelte.ts`) to keep the container minimal and unopinionated.
- Sizing & Centering: Enforces `block-size: 26px` with zero vertical padding, allowing flexbox
  to vertically align text, icons, and keyboard badges along the optical center axis.
- Motion Delegation: Delegates directional entry/exit transitions and `@starting-style` spring choreography
  to underlying `<Popover animate>` (`[data-animate]`), purely tuning micro-surface feel via `--popover-anim-*` token overrides.
- Warmup Acceleration: Benefits from the global `:root[data-hint-warm]` acceleration window (300ms)
  managed by `popoverTrigger({ mode: "hint" })`. Once any tooltip is active or recently closed,
  subsequent tooltips open immediately (0ms delay) for frictionless toolbar scrubbing.
-->

<script lang="ts">
    import { type TooltipProps } from ".";
    import Popover from "../popover/Popover.svelte";
    import TooltipIcon from "./TooltipIcon.svelte";
    import TooltipKbd from "./TooltipKbd.svelte";
    import TooltipText from "./TooltipText.svelte";

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
            <TooltipIcon icon={resolvedIcon.component} />
        {/if}

        {#if text}
            <TooltipText>{text}</TooltipText>
        {/if}

        {#if resolvedIcon && resolvedIcon.position === "end"}
            <TooltipIcon icon={resolvedIcon.component} />
        {/if}

        {#if shortcuts.length > 0}
            <span class="cs-tooltip-shortcuts">
                {#each shortcuts as key (key)}
                    <TooltipKbd>{key}</TooltipKbd>
                {/each}
            </span>
        {/if}
    {/if}
</Popover>

<style>
    @layer components.composite {
        :global(.cs-tooltip) {
            --_fs: 13px;

            /* Micro-surface motion overrides for Popover[data-animate] */
            --popover-anim-distance: 5px;
            --popover-anim-scale-start: 0.88;
            --popover-anim-blur-start: 2.5px;
            --popover-anim-blur-exit: 1.5px;
            --popover-anim-dur-in: 260ms;
            --popover-anim-dur-fade-in: 110ms;
            --popover-anim-dur-blur-in: 120ms;
            --popover-anim-dur-out: 100ms;

            gap: 6px;
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

        :global(.cs-tooltip:popover-open) {
            display: inline-flex;
        }

        :global(.cs-tooltip-shortcuts) {
            display: inline-flex;
            gap: 2px;
            align-items: center;
            margin-inline-start: 2px;
        }
    }
</style>
