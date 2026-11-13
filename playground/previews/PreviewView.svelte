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
    }

    interface PreviewItem {
        id: string;
        label: string;
        category: PreviewCategory;
        preview: Component;
    }

    interface PreviewGroup {
        id: PreviewCategory;
        label: string;
        items: PreviewItem[];
    }

    const SAVED_PREVIEW_KEY = "saved-preview";
    const SAVED_SIDEBAR_KEY = "saved-sidebar-open";
    const CONTROLS_IDLE_MS = 2200;

    const modules = import.meta.glob<SvelteModule>(
        ["./primitives/*.svelte", "./attachments/*.svelte", "./work/*.svelte"],
        { eager: true }
    );

    function categoryFromPath(path: string): PreviewCategory {
        const folder = path.split("/", 2)[1];
        if (folder === "attachments" || folder === "work") return folder;
        return "primitives";
    }

    const previews: PreviewItem[] = Object.entries(modules)
        .map(([path, module]) => ({
            id: module.id,
            label: module.label,
            category: categoryFromPath(path),
            preview: module.default,
        }))
        .toSorted((a, b) => a.label.localeCompare(b.label, "en"));

    const previewGroups: PreviewGroup[] = PREVIEW_CATEGORIES.map((category) => ({
        id: category,
        label: PREVIEW_CATEGORY_LABELS[category],
        items: previews.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);

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
    let mainScrollContainer = $state<HTMLDivElement>();

    let activePreviewItem = $derived(previews.find((p) => p.id === selectedId));
    let ActivePreview = $derived(activePreviewItem?.preview);

    $effect(() => {
        if (selectedId) {
            setLocalStorage(SAVED_PREVIEW_KEY, selectedId);
        }

        const viewport = mainScrollContainer?.querySelector<HTMLElement>(".cs-scroll-area-content");
        if (viewport) {
            viewport.scrollTop = 0;
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
                                <button
                                    type="button"
                                    class="cs-sidebar-item w-full text-left px-3 py-2 rounded-xl squircle-soft text-sm transition-colors duration-150 {preview.id ===
                                    selectedId
                                        ? 'bg-base-soft-hover text-strong font-medium'
                                        : 'text-main hover:bg-base-soft hover:text-strong'}"
                                    aria-current={preview.id === selectedId ? "page" : undefined}
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
    <div bind:this={mainScrollContainer} class="flex-1 min-w-0 h-full">
        <ScrollArea size="lg" direction="vertical" class="size-full">
            <ScrollAreaContent
                class="px-6 py-10 md:px-12 md:py-14"
                {@attach scrollFade({ size: "lg", direction: "vertical", edges: "both" })}
            >
                <div class="w-full max-w-4xl mx-auto flex flex-col gap-10">
                    {#if ActivePreview}
                        <ActivePreview />
                    {/if}
                </div>
            </ScrollAreaContent>
        </ScrollArea>
    </div>
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
