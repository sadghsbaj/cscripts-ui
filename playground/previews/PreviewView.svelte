<script lang="ts">
    import type { Component } from "svelte";
    import { PanelLeftClose } from "@lucide/svelte";
    import { getLocalStorage, setLocalStorage } from "cs/svelte/browser-storage";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";
    import { tooltip } from "cs/svelte/tooltip";

    interface SvelteModule {
        default: Component;
        id: string;
        label: string;
    }

    interface PreviewItem {
        id: string;
        label: string;
        preview: Component;
    }

    const SAVED_PREVIEW_KEY = "saved-preview";

    const modules = import.meta.glob<SvelteModule>("./svelte/*.svelte", { eager: true });

    const previews: PreviewItem[] = Object.values(modules).map((module) => {
        return {
            id: module.id,
            label: module.label,
            preview: module.default,
        };
    });

    const savedId = getLocalStorage(SAVED_PREVIEW_KEY);
    let selectedId = $state<string | undefined>(
        previews.some((p) => p.id === savedId) ? (savedId ?? undefined) : previews[0]?.id
    );

    let activePreviewItem = $derived(previews.find((p) => p.id === selectedId));
    let activePreview = $derived(activePreviewItem?.preview);

    $effect(() => {
        if (selectedId) {
            setLocalStorage(SAVED_PREVIEW_KEY, selectedId);
        }
    });

    let sidebarIsOpen = $state(false);
</script>

<div class="size-full flex gap-8 relative">
    <Button
        size="md"
        variant="elevated"
        iconOnly
        class="absolute right-8 top-8 z-100"
        aria-label="Sidebar umschalten"
        onclick={() => (sidebarIsOpen = !sidebarIsOpen)}
        {@attach tooltip("Sidebar umschalten")}
    >
        <ButtonIcon icon={PanelLeftClose} />
        <HitArea size="md" />
    </Button>

    <aside
        class="relative z-100 h-full sidebar {sidebarIsOpen
            ? ''
            : 'hidden'} w-280px flex flex-col gap-3 shrink-0 py-16 px-4 lg:px-8"
    >
        <h2 class="title-xl">Previews:</h2>

        <ScrollArea size="sm" direction="vertical" class="w-full flex-1 min-h-0">
            <ScrollAreaContent
                class="flex flex-col gap-1 py-1"
                {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
            >
                <ToggleButtonGroup
                    type="single"
                    orientation="vertical"
                    class="w-full gap-1"
                    bind:value={selectedId}
                >
                    {#each previews as preview (preview.id)}
                        {@render sidebarOption(preview)}
                    {/each}
                </ToggleButtonGroup>
            </ScrollAreaContent>
        </ScrollArea>
    </aside>

    <ScrollArea size="lg" direction="vertical" class="size-full">
        <ScrollAreaContent
            class="flex flex-col gap-8 p-8 lg:p-16"
            {@attach scrollFade({ size: "lg", direction: "vertical", edges: "both" })}
        >
            <div class="flex gap-1 items-center">
                <h1 class="title-4xl">{activePreviewItem?.label}</h1>
            </div>

            {#if activePreview}
                {let PreviewComponent = $derived(activePreview)}
                <PreviewComponent />
            {/if}
        </ScrollAreaContent>
    </ScrollArea>
</div>

{#snippet sidebarOption(preview: (typeof previews)[number])}
    <ToggleButton
        variant="soft"
        color="accent"
        size="md"
        value={preview.id}
    >
        <ToggleButtonLabel>
            {preview.label}
        </ToggleButtonLabel>
    </ToggleButton>
{/snippet}
