<!--
@component
Lightweight tooltip surface container primitive (`<Tooltip />`) built on top of `<Popover popover="hint">`.

Architectural Notes:
- Fixed Surface: Uses `size="content"` and default `placement="top"`. All dynamic positioning,
  offsets, delays, and trigger attachments are driven externally by the `tooltip` attachment
  (`tooltip.attach.svelte.ts`) to keep the container minimal and unopinionated.
- Sizing & Centering: Enforces `block-size: 26px` with zero vertical padding, allowing flexbox
  to vertically align text, icons, and keyboard badges along the optical center axis.
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
        :global(.cs-tooltip:popover-open) {
            display: inline-flex;
        }

        :global(.cs-tooltip) {
            --_fs: 13px;
            --_tx: 0px;
            --_ty: 4px;
            --_origin: bottom center;

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

            /* --- CLOSED / EXIT STATE --- */
            opacity: 0;
            filter: blur(1.5px);
            translate: calc(var(--_tx) * 0.5) calc(var(--_ty) * 0.5);
            scale: 0.95;
            transform-origin: var(--_origin);

            /* Exit-Transition */
            transition:
                opacity 100ms var(--cs-ease-quad-in),
                scale 100ms var(--cs-ease-quad-in),
                translate 100ms var(--cs-ease-quad-in),
                filter 80ms var(--cs-ease-quad-in),
                display 100ms allow-discrete,
                overlay 100ms allow-discrete;
        }

        /* --- PLACEMENT: TOP --- */
        :global(.cs-tooltip[data-placement^="top"]) {
            --_tx: 0px;
            --_ty: 5px;
            --_origin: bottom center;
        }

        :global(.cs-tooltip[data-placement="top"]:popover-open:state(flipped)) {
            --_tx: 0px;
            --_ty: -5px;
            --_origin: top center;
        }

        /* --- PLACEMENT: BOTTOM --- */
        :global(.cs-tooltip[data-placement^="bottom"]) {
            --_tx: 0px;
            --_ty: -5px;
            --_origin: top center;
        }

        :global(.cs-tooltip[data-placement="bottom"]:popover-open:state(flipped)) {
            --_tx: 0px;
            --_ty: 5px;
            --_origin: bottom center;
        }

        /* --- PLACEMENT: LEFT --- */
        :global(.cs-tooltip[data-placement^="left"]),
        :global(.cs-tooltip[data-placement^="inline-start"]) {
            --_tx: 5px;
            --_ty: 0px;
            --_origin: center right;
        }

        :global(.cs-tooltip[data-placement^="left"]:popover-open:state(flipped)),
        :global(.cs-tooltip[data-placement^="inline-start"]:popover-open:state(flipped)) {
            --_tx: -5px;
            --_ty: 0px;
            --_origin: center left;
        }

        /* --- 4. PLACEMENT: RIGHT --- */
        :global(.cs-tooltip[data-placement^="right"]),
        :global(.cs-tooltip[data-placement^="inline-end"]) {
            --_tx: -5px;
            --_ty: 0px;
            --_origin: center left;
        }

        :global(.cs-tooltip[data-placement^="right"]:popover-open:state(flipped)),
        :global(.cs-tooltip[data-placement^="inline-end"]:popover-open:state(flipped)) {
            --_tx: 5px;
            --_ty: 0px;
            --_origin: center right;
        }

        /* --- OPEN STATE -- */
        :global(.cs-tooltip:popover-open) {
            display: inline-flex;
            opacity: 1;
            filter: blur(0px);
            translate: 0 0;
            scale: 1;

            transition:
                opacity 110ms var(--cs-ease-quart-out),
                filter 120ms var(--cs-ease-quart-out),
                scale 260ms var(--cs-spring-snappy),
                translate 260ms var(--cs-spring-snappy),
                display 260ms allow-discrete,
                overlay 260ms allow-discrete;
        }

        /* --- ENTRY KEYFRAME --- */
        @starting-style {
            :global(.cs-tooltip:popover-open) {
                opacity: 0;
                filter: blur(2.5px);
                translate: var(--_tx) var(--_ty);
                scale: 0.88;
            }
        }

        :global(.cs-tooltip-shortcuts) {
            display: inline-flex;
            gap: 2px;
            align-items: center;
            margin-inline-start: 2px;
        }
    }
</style>
