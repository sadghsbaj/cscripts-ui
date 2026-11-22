<script lang="ts" generics="T extends string = string">
    import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

    import { getTabsContext } from "./tabs.context.ts";
    import type { TabsTriggerProps } from "./tabs.types.ts";

    let {
        ref = $bindable(null),
        value,
        href,
        disabled = false,
        class: className,
        children,
        onpointerdown,
        onclick,
        ...rest
    }: TabsTriggerProps<T> = $props();

    const tabs = getTabsContext();
    const uid = $props.id();

    const triggerId = $derived(`${tabs.rootId}-tab-${uid}`);
    const isSelected = $derived(tabs.isSelected(value));
    const isDisabled = $derived(Boolean(tabs.disabled || disabled));
    const panelId = $derived(tabs.getPanelId(value));

    $effect(() => {
        if (!ref) return;
        return tabs.registerTrigger(value, triggerId, ref);
    });

    function handleButtonPointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        const handler = onpointerdown as HTMLButtonAttributes["onpointerdown"] | undefined;
        handler?.(event);
        if (event.defaultPrevented || isDisabled) return;
        // Activate immediately on desktop primary press; touch defers to click to avoid scroll-swipe misfires.
        if (event.button === 0 && event.pointerType !== "touch") {
            tabs.select(value);
        }
    }

    function handleButtonClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        const handler = onclick as HTMLButtonAttributes["onclick"] | undefined;
        handler?.(event);
        if (event.defaultPrevented || isDisabled) return;
        tabs.select(value);
    }

    function handleLinkClick(event: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement }): void {
        const handler = onclick as HTMLAnchorAttributes["onclick"] | undefined;
        handler?.(event);
        if (isDisabled) {
            event.preventDefault();
            return;
        }
        if (event.defaultPrevented) return;
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            tabs.select(value);
        }
    }
</script>

{#if href !== undefined}
    <a
        bind:this={ref as HTMLAnchorElement | null}
        {...(rest as Omit<HTMLAnchorAttributes, "href">)}
        href={isDisabled ? undefined : href}
        id={triggerId}
        aria-current={isSelected ? "page" : undefined}
        aria-disabled={isDisabled ? "true" : undefined}
        tabindex={isDisabled ? -1 : (rest.tabindex ?? undefined)}
        class={["cs-tabs-trigger", className]}
        data-value={value}
        data-selected={isSelected ? "" : undefined}
        data-disabled={isDisabled ? "" : undefined}
        onpointerdown={onpointerdown as HTMLAnchorAttributes["onpointerdown"]}
        onclick={handleLinkClick}
    >
        <span class="cs-tabs-trigger-content">
            {@render children?.()}
        </span>
    </a>
{:else}
    <button
        bind:this={ref as HTMLButtonElement | null}
        {...(rest as Omit<HTMLButtonAttributes, "value" | "type">)}
        type="button"
        id={triggerId}
        role="tab"
        aria-selected={isSelected ? "true" : "false"}
        aria-controls={panelId}
        disabled={isDisabled}
        class={["cs-tabs-trigger", className]}
        data-value={value}
        data-selected={isSelected ? "" : undefined}
        data-disabled={isDisabled ? "" : undefined}
        onpointerdown={handleButtonPointerDown}
        onclick={handleButtonClick}
    >
        <span class="cs-tabs-trigger-content">
            {@render children?.()}
        </span>
    </button>
{/if}
