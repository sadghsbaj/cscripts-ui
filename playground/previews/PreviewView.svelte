<script lang="ts">
    import type { Component } from "svelte";
    import { PanelLeftClose, PanelLeftOpen } from "@lucide/svelte";
    import { getLocalStorage, setLocalStorage } from "cs/svelte/browser-storage";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import { theme, THEME_ICONS, type ThemeMode } from "cs/svelte/theme";
    import { tooltip } from "cs/svelte/tooltip";
    import {
        PREVIEW_CATEGORIES,
        PREVIEW_CATEGORY_LABELS,
        type PreviewCategory,
    } from "../components/index.ts";

    const THEME_LABELS: Record<ThemeMode, string> = {
        system: "System",
        light: "Light",
        dark: "Dark",
    };

    interface SvelteModule {
        default: Component;
        id: string;
        label: string;
        category?: PreviewCategory;
    }

    interface PreviewItem {
        id: string;
        label: string;
        category?: PreviewCategory;
        preview: Component;
    }

    interface PreviewGroup {
        id: string;
        label?: string;
        items: PreviewItem[];
    }

    const SAVED_PREVIEW_KEY = "saved-preview";
    const SAVED_SIDEBAR_KEY = "saved-sidebar-open";
    const CONTROLS_IDLE_MS = 2200;

    const modules = import.meta.glob<SvelteModule>("./svelte/*.svelte", { eager: true });

    const previews: PreviewItem[] = Object.values(modules)
        .map((module) => ({
            id: module.id,
            label: module.label,
            category: module.category,
            preview: module.default,
        }))
        .toSorted((a, b) => a.label.localeCompare(b.label, "en"));

    const hasExplicitCategories = previews.some((item) => item.category !== undefined);

    const previewGroups: PreviewGroup[] = (() => {
        if (!hasExplicitCategories) {
            return [{ id: "all", items: previews }];
        }

        const groups: PreviewGroup[] = [];
        for (const cat of PREVIEW_CATEGORIES) {
            const items = previews.filter((item) => item.category === cat);
            if (items.length > 0) {
                groups.push({
                    id: cat,
                    label: PREVIEW_CATEGORY_LABELS[cat],
                    items,
                });
            }
        }

        const uncategorized = previews.filter((item) => !item.category);
        if (uncategorized.length > 0) {
            groups.push({
                id: "other",
                label: "Other",
                items: uncategorized,
            });
        }

        return groups;
    })();

    const savedId = getLocalStorage(SAVED_PREVIEW_KEY);
    let selectedId = $state<string | undefined>(
        previews.some((p) => p.id === savedId) ? (savedId ?? undefined) : previews[0]?.id
    );

    const savedSidebar = getLocalStorage(SAVED_SIDEBAR_KEY);
    let sidebarIsOpen = $state(savedSidebar === null ? true : savedSidebar === "true");

    let controlsIdleHidden = $state(false);
    let isHoveringControls = $state(false);
    let isFocusedControls = $state(false);
    let controlsVisible = $derived(!controlsIdleHidden || isHoveringControls || isFocusedControls);

    let activePreviewItem = $derived(previews.find((p) => p.id === selectedId));
    let activePreview = $derived(activePreviewItem?.preview);

    $effect(() => {
        if (selectedId) {
            setLocalStorage(SAVED_PREVIEW_KEY, selectedId);
        }
    });

    $effect(() => {
        setLocalStorage(SAVED_SIDEBAR_KEY, String(sidebarIsOpen));
    });

    $effect(() => {
        let timerId: number | undefined;

        function scheduleHide(): void {
            controlsIdleHidden = false;
            window.clearTimeout(timerId);
            timerId = window.setTimeout(() => {
                controlsIdleHidden = true;
            }, CONTROLS_IDLE_MS);
        }

        scheduleHide();

        window.addEventListener("pointermove", scheduleHide, { passive: true });
        window.addEventListener("pointerdown", scheduleHide, { passive: true });
        window.addEventListener("keydown", scheduleHide, { passive: true });

        return () => {
            window.clearTimeout(timerId);
            window.removeEventListener("pointermove", scheduleHide);
            window.removeEventListener("pointerdown", scheduleHide);
            window.removeEventListener("keydown", scheduleHide);
        };
    });
</script>

<div class="size-full flex relative bg-canvas">
    <!-- Floating Top-Right Controls -->
    <div
        class="cs-playground-controls fixed right-6 top-6 z-100 flex items-center gap-2.5"
        data-visible={controlsVisible ? "" : undefined}
        onpointerenter={() => (isHoveringControls = true)}
        onpointerleave={() => (isHoveringControls = false)}
        onfocusin={() => (isFocusedControls = true)}
        onfocusout={() => (isFocusedControls = false)}
    >
        <Button
            size="md"
            variant="elevated"
            iconOnly
            aria-label="Switch theme ({THEME_LABELS[theme.mode]})"
            onclick={() => theme.cycle()}
            {@attach tooltip(`Theme: ${THEME_LABELS[theme.mode]}`)}
        >
            <ButtonIcon icon={THEME_ICONS[theme.mode]} />
            <HitArea size="md" />
        </Button>

        <Button
            size="md"
            variant="elevated"
            iconOnly
            aria-label={sidebarIsOpen ? "Close sidebar" : "Open sidebar"}
            onclick={() => (sidebarIsOpen = !sidebarIsOpen)}
            {@attach tooltip(sidebarIsOpen ? "Close sidebar" : "Open sidebar")}
        >
            <ButtonIcon icon={sidebarIsOpen ? PanelLeftClose : PanelLeftOpen} />
            <HitArea size="md" />
        </Button>
    </div>

    <!-- Animated Sidebar -->
    <aside
        class="cs-playground-sidebar shrink-0 h-full overflow-hidden border-r border-base-soft bg-canvas"
        data-open={sidebarIsOpen ? "" : undefined}
        inert={!sidebarIsOpen}
        aria-hidden={!sidebarIsOpen}
    >
        <div class="w-260px h-full flex flex-col gap-4 py-7 px-4">
            <div class="px-3 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-weak">
                    Playground
                </span>
            </div>

            <ScrollArea size="sm" direction="vertical" class="w-full flex-1 min-h-0">
                <ScrollAreaContent
                    class="flex flex-col gap-5 py-1 pr-1"
                    {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
                >
                    {#each previewGroups as group (group.id)}
                        <div class="flex flex-col gap-1">
                            {#if group.label}
                                <div class="px-3 pb-1 text-xs font-medium text-weaker">
                                    {group.label}
                                </div>
                            {/if}

                            {#each group.items as preview (preview.id)}
                                {const isActive = preview.id === selectedId}
                                <button
                                    type="button"
                                    class="cs-sidebar-item w-full text-left px-3 py-2 rounded-xl squircle-soft text-sm transition-colors duration-150 cursor-pointer {isActive
                                        ? 'bg-base-soft-hover text-strong font-medium'
                                        : 'text-main hover:bg-base-soft hover:text-strong'}"
                                    aria-current={isActive ? "page" : undefined}
                                    onclick={() => (selectedId = preview.id)}
                                >
                                    {preview.label}
                                </button>
                            {/each}
                        </div>
                    {/each}
                </ScrollAreaContent>
            </ScrollArea>
        </div>
    </aside>

    <!-- Main Preview Stage -->
    <ScrollArea size="lg" direction="vertical" class="flex-1 min-w-0 h-full">
        <ScrollAreaContent
            class="px-6 py-10 md:px-12 md:py-14"
            {@attach scrollFade({ size: "lg", direction: "vertical", edges: "both" })}
        >
            <div class="w-full max-w-4xl mx-auto flex flex-col gap-10">
                {#if activePreview}
                    {const PreviewComponent = activePreview}
                    <PreviewComponent />
                {/if}
            </div>
        </ScrollAreaContent>
    </ScrollArea>
</div>

<style>
    .cs-playground-sidebar {
        width: 0;
        opacity: 0;
        border-right-width: 0;
        transition:
            width 280ms var(--cs-ease-cubic-out),
            opacity 200ms var(--cs-ease-cubic-out),
            border-right-width 280ms var(--cs-ease-cubic-out);
    }

    .cs-playground-sidebar[data-open] {
        width: 260px;
        opacity: 1;
        border-right-width: 1px;
    }

    .cs-sidebar-item:focus-visible {
        outline: 2px solid var(--cs-color-accent-solid);
        outline-offset: -2px;
    }

    .cs-playground-controls {
        opacity: 0;
        transform: translateY(-4px);
        pointer-events: none;
        transition:
            opacity 260ms var(--cs-ease-cubic-out),
            transform 260ms var(--cs-ease-cubic-out);
    }

    .cs-playground-controls[data-visible] {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
    }
</style>
