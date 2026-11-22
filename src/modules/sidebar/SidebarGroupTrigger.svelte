<script lang="ts">
    import { ChevronRight } from "@lucide/svelte";
    import { HitArea } from "../hit-area/index.ts";
    import { tooltip as attachTooltip } from "../tooltip/index.ts";
    import { getSidebarContext, getSidebarGroupContext } from "./sidebar.context.ts";
    import {
        extractSidebarItemLabel,
        setSidebarItemContext,
    } from "./sidebar-context.internal.ts";
    import type { SidebarGroupTriggerProps } from "./sidebar.types.ts";
    import SidebarItemIcon from "./SidebarItemIcon.svelte";

    let {
        ref = $bindable<HTMLButtonElement | null>(null),
        icon: Icon,
        indicator,
        tooltip,
        iconOnly = false,
        current = false,
        disabled = false,
        id,
        class: className,
        onclick,
        children,
        ...rest
    }: SidebarGroupTriggerProps = $props();

    const sidebar = getSidebarContext();
    const group = getSidebarGroupContext();

    let labelEl = $state<HTMLElement | null>(null);

    setSidebarItemContext({
        registerLabelElement(element: HTMLElement | null): () => void {
            labelEl = element;
            return () => {
                if (labelEl === element) {
                    labelEl = null;
                }
            };
        },
    });

    const isDisabled = $derived(Boolean(disabled || group.disabled));
    const isCurrent = $derived(Boolean(current));
    const resolvedAriaCurrent = $derived(
        current === true ? "true" : current || undefined
    );
    const resolvedId = $derived(id ?? group.triggerId);

    const tooltipPlacement = $derived.by(() => {
        const isRtl =
            typeof getComputedStyle === "function" &&
            ref !== null &&
            getComputedStyle(ref).direction === "rtl";
        if (sidebar.side === "start") {
            return isRtl ? "left" : "right";
        }
        return isRtl ? "right" : "left";
    });

    const resolvedTooltipText = $derived(
        typeof tooltip === "string" ? tooltip : extractSidebarItemLabel(labelEl, ref)
    );
    const tooltipEnabled = $derived(
        tooltip !== false &&
            (Boolean(tooltip) || sidebar.isRailCollapsed) &&
            Boolean(resolvedTooltipText)
    );

    const railHitAreaSize = $derived(
        !iconOnly && sidebar.isRailCollapsed
            ? sidebar.size === "sm"
                ? "sm"
                : sidebar.size === "md"
                  ? "md"
                  : null
            : null
    );

    function handleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
    ): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        group.toggle();
    }
</script>

<button
    bind:this={ref}
    id={resolvedId}
    aria-expanded={group.effectiveOpen ? "true" : "false"}
    aria-controls={group.contentId}
    aria-current={resolvedAriaCurrent}
    disabled={isDisabled}
    data-current={isCurrent ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    data-icon-only={iconOnly ? "" : undefined}
    onclick={handleClick}
    {@attach attachTooltip({
        text: resolvedTooltipText,
        placement: tooltipPlacement,
        enabled: tooltipEnabled,
    })}
    {...rest}
    type="button"
    class={["cs-sidebar-item", "cs-sidebar-group-trigger", className]}
>
    {#if railHitAreaSize}
        <HitArea size={railHitAreaSize} />
    {/if}

    {#if Icon}
        <SidebarItemIcon icon={Icon} />
    {/if}

    {@render children?.()}

    {#if indicator !== false}
        <span class="cs-sidebar-group-chevron" aria-hidden="true">
            {#if indicator}
                {@render indicator({ open: group.effectiveOpen })}
            {:else}
                <ChevronRight strokeWidth={2} aria-hidden="true" />
            {/if}
        </span>
    {/if}
</button>
