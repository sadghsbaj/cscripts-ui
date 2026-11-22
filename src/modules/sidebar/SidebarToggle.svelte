<script lang="ts">
    import "./sidebar.css";

    import { PanelLeft, PanelRight } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "../button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { getSidebarContext, hasSidebarContext } from "./sidebar.context.ts";
    import type { SidebarToggleProps } from "./sidebar.types.ts";

    let {
        ref = $bindable<HTMLButtonElement | null>(null),
        open = $bindable<boolean | undefined>(),
        sidebarId,
        variant = "ghost",
        size,
        iconOnly = true,
        label,
        class: className,
        onclick,
        children,
        ...rest
    }: SidebarToggleProps = $props();

    const sidebar = hasSidebarContext() ? getSidebarContext() : null;

    const resolvedOpen = $derived(open !== undefined ? open : (sidebar?.open ?? true));
    const resolvedSize = $derived(
        size ?? (sidebar ? (sidebar.size === "sm" ? "xs" : sidebar.size === "lg" ? "md" : "sm") : "sm")
    );
    const resolvedControls = $derived(sidebarId ?? sidebar?.id);
    const resolvedLabel = $derived(
        label ??
            t(
                resolvedOpen
                    ? { de: "Seitenleiste einklappen", en: "Collapse sidebar" }
                    : { de: "Seitenleiste ausklappen", en: "Expand sidebar" }
            )
    );
    const needsHitArea = $derived(iconOnly && ["xs", "sm", "md"].includes(resolvedSize));

    function handleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
    ): void {
        onclick?.(event);
        if (event.defaultPrevented) return;

        if (open !== undefined) {
            open = !open;
            return;
        }
        sidebar?.toggle();
    }
</script>

<Button
    bind:ref
    {variant}
    size={resolvedSize}
    {iconOnly}
    aria-label={rest["aria-label"] ?? (iconOnly ? resolvedLabel : undefined)}
    aria-expanded={resolvedOpen ? "true" : "false"}
    aria-controls={resolvedControls}
    data-open={resolvedOpen ? "" : undefined}
    onclick={handleClick}
    {...rest}
    type="button"
    class={["cs-sidebar-toggle", className]}
>
    {#if needsHitArea}
        <HitArea size="sm" />
    {/if}

    {#if children}
        {@render children()}
    {:else}
        <ButtonIcon icon={sidebar?.side === "end" ? PanelRight : PanelLeft} />
        {#if !iconOnly}
            <ButtonLabel>{resolvedLabel}</ButtonLabel>
        {/if}
    {/if}
</Button>
