<script lang="ts">
    import { ChevronDown } from "@lucide/svelte";
    import type { Attachment } from "svelte/attachments";
    import {
        getSidebarSectionContext,
        hasSidebarSectionContext,
        hasSidebarSectionHeaderContext,
    } from "./sidebar-context.internal.ts";
    import type { SidebarSectionLabelProps } from "./sidebar.types.ts";

    const fallbackId = $props.id();

    let {
        ref = $bindable<HTMLElement | null>(null),
        as = "div",
        id,
        class: className,
        onclick,
        children,
        ...rest
    }: SidebarSectionLabelProps = $props();

    const section = hasSidebarSectionContext() ? getSidebarSectionContext() : null;
    const insideHeader = hasSidebarSectionHeaderContext();
    const resolvedId = $derived(id ?? fallbackId);

    $effect(() => {
        if (!section) return;
        return section.registerLabelId(resolvedId);
    });

    const attachStandaloneToHeaderSlot: Attachment<HTMLDivElement> = (node) => {
        if (!section?.collapsible || insideHeader) return;
        const slot = section.getHeaderSlot();
        if (!slot || node.parentElement === slot) return;
        slot.append(node);
    };

    function handleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
    ): void {
        (onclick as ((e: typeof event) => void) | undefined)?.(event);
        if (event.defaultPrevented) return;
        section?.toggle();
    }
</script>

{#snippet labelElement()}
    {#if section?.collapsible}
        <button
            bind:this={ref}
            id={resolvedId}
            aria-expanded={section.open ? "true" : "false"}
            aria-controls={section.contentId}
            data-collapsible=""
            data-open={section.open ? "" : undefined}
            onclick={handleClick}
            {...rest}
            type="button"
            class={["cs-sidebar-section-label", className]}
        >
            <span class="cs-sidebar-section-label-text">
                {@render children?.()}
            </span>
            <ChevronDown class="cs-sidebar-section-chevron" strokeWidth={2} aria-hidden="true" />
        </button>
    {:else}
        <svelte:element
            this={as}
            bind:this={ref}
            {...rest}
            id={resolvedId}
            class={["cs-sidebar-section-label", className]}
        >
            {@render children?.()}
        </svelte:element>
    {/if}
{/snippet}

{#if insideHeader}
    {@render labelElement()}
{:else}
    <div class="cs-sidebar-section-fold" {@attach attachStandaloneToHeaderSlot}>
        <div class="cs-sidebar-section-fold-inner">
            {@render labelElement()}
        </div>
    </div>
{/if}
