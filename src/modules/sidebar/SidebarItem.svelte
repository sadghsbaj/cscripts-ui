<script lang="ts">
    import { HitArea } from "../hit-area/index.ts";
    import { tooltip as attachTooltip } from "../tooltip/index.ts";
    import { getSidebarContext, hasSidebarContext } from "./sidebar.context.ts";
    import {
        extractSidebarItemLabel,
        setSidebarItemContext,
    } from "./sidebar-context.internal.ts";
    import type { SidebarItemProps } from "./sidebar.types.ts";
    import SidebarItemIcon from "./SidebarItemIcon.svelte";

    let {
        ref = $bindable(null),
        href,
        current = false,
        negative = false,
        disabled = false,
        icon: Icon,
        badge,
        tooltip,
        class: className,
        onclick,
        children,
        ...rest
    }: SidebarItemProps = $props();

    const sidebar = hasSidebarContext() ? getSidebarContext() : null;

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

    const element = $derived(href !== undefined ? "a" : "button");
    const isDisabled = $derived(Boolean(disabled));
    const isCurrent = $derived(Boolean(current));
    const resolvedAriaCurrent = $derived(
        current === true ? (href !== undefined ? "page" : "true") : current || undefined
    );

    const tooltipPlacement = $derived.by(() => {
        const isRtl =
            typeof getComputedStyle === "function" &&
            ref !== null &&
            getComputedStyle(ref).direction === "rtl";
        const side = sidebar?.side ?? "start";
        if (side === "start") {
            return isRtl ? "left" : "right";
        }
        return isRtl ? "right" : "left";
    });

    const resolvedTooltipText = $derived(
        typeof tooltip === "string" ? tooltip : extractSidebarItemLabel(labelEl, ref)
    );
    const isRailCollapsed = $derived(sidebar?.isRailCollapsed ?? false);
    const tooltipEnabled = $derived(
        tooltip !== false && (Boolean(tooltip) || isRailCollapsed) && Boolean(resolvedTooltipText)
    );

    const railHitAreaSize = $derived(
        isRailCollapsed && sidebar
            ? sidebar.size === "sm"
                ? "sm"
                : sidebar.size === "md"
                  ? "md"
                  : null
            : null
    );

    function handleClick(
        event: MouseEvent & {
            currentTarget: EventTarget & (HTMLAnchorElement | HTMLButtonElement);
        }
    ): void {
        if (isDisabled) {
            event.preventDefault();
            return;
        }
        (onclick as ((e: typeof event) => void) | undefined)?.(event);
    }
</script>

<svelte:element
    this={element}
    bind:this={ref}
    {...rest}
    type={element === "button" ? "button" : undefined}
    role={element === "a" && isDisabled ? "link" : rest.role}
    href={element === "a" ? (isDisabled ? undefined : href) : undefined}
    disabled={element === "button" ? isDisabled || undefined : undefined}
    aria-disabled={element === "a" && isDisabled ? "true" : rest["aria-disabled"]}
    tabindex={element === "a" && isDisabled ? -1 : rest.tabindex}
    aria-current={resolvedAriaCurrent}
    data-current={isCurrent ? "" : undefined}
    data-negative={negative ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    onclick={handleClick}
    {@attach attachTooltip({
        text: resolvedTooltipText,
        placement: tooltipPlacement,
        enabled: tooltipEnabled,
    })}
    class={["cs-sidebar-item", className]}
>
    {#if railHitAreaSize}
        <HitArea size={railHitAreaSize} />
    {/if}

    {#if Icon}
        <SidebarItemIcon icon={Icon} />
    {/if}

    {@render children?.()}

    {#if badge}
        <span class="cs-sidebar-item-badge">
            {@render badge()}
        </span>
    {/if}
</svelte:element>
