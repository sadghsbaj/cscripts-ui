<script lang="ts">
    import { type TooltipProps } from ".";
    import { Popover } from "../popover";
    import TooltipIcon from "./TooltipIcon.svelte";
    import TooltipText from "./TooltipText.svelte";

    let { ref = $bindable(null), id, text, icon, class: className, children, ...rest }: TooltipProps = $props();

    const resolvedIcon = $derived(
        typeof icon === "function"
            ? { component: icon, position: "start" as const }
            : icon
              ? { component: icon.component, position: icon.position ?? ("start" as const) }
              : null
    );
</script>

<Popover bind:ref {...rest} {id} popover="manual" width="content" placement="top" role="tooltip" class={["cs-tooltip", className]}>
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
    {/if}
</Popover>

<style>
    @layer components.composite {
        :global(.cs-tooltip) {
            --cs-tooltip-font-size: 13px;

            /* Micro-surface motion overrides for Popover[data-animate] */
            --cs-popover-anim-distance: 5px;
            --cs-popover-anim-scale-start: 0.88;
            --cs-popover-anim-blur-start: 2.5px;
            --cs-popover-anim-blur-exit: 1.5px;
            --cs-popover-anim-dur-in: var(--cs-dur-enter-sm);
            --cs-popover-anim-dur-fade-in: var(--cs-dur-effect-fast);
            --cs-popover-anim-dur-blur-in: var(--cs-dur-120);
            --cs-popover-anim-dur-out: var(--cs-dur-exit-sm);

            gap: 6px;
            align-items: center;
            justify-content: center;
            max-inline-size: min(320px, 80vw);
            block-size: 26px;
            padding-inline: 8px;
            background-color: var(--cs-color-elevated);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-shadow-floating);
        }

        :global(.cs-tooltip:popover-open) {
            display: inline-flex;
        }

        :global(.cs-tooltip:has(> :is(.cs-kbd, .cs-kbd-group)[data-variant="soft"]:last-child)) {
            padding-inline-end: 4px;
        }
    }
</style>
