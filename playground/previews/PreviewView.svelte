<script lang="ts">
    import type { Component } from "svelte";
    import { PanelLeftClose } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel, HitArea, ToggleButton, ToggleButtonLabel } from "cs/svelte";

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

    const SAVED_PREVIEW_KEY = "cscripts-saved-preview";

    const modules = import.meta.glob<SvelteModule>("./svelte/*.svelte", { eager: true });

    const previews: PreviewItem[] = Object.values(modules).map((module) => {
        return {
            id: module.id,
            label: module.label,
            preview: module.default,
        };
    });

    let activePreview = $state<Component | undefined>(
        previews.find((p) => p.id === localStorage.getItem(SAVED_PREVIEW_KEY))?.preview
    );

    function changeActivePreview(preview: PreviewItem): void {
        activePreview = preview.preview;

        try {
            localStorage.setItem(SAVED_PREVIEW_KEY, preview.id);
        } catch (error) {
            console.warn(error);
        }
    }

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

        {#each previews as preview (preview.id)}
            {@render sidebarOption(preview)}
        {/each}
    </aside>

    <main class="size-full p-8 lg:p-16 flex flex-col gap-8 overflow-y-auto scrollbar-lg">
        <div class="flex gap-1 items-center">
            <h1 class="title-4xl">{previews.find((p) => p.preview === activePreview)?.label}</h1>
        </div>

        {#if activePreview}
            {let PreviewComponent = $derived(activePreview)}
            <PreviewComponent />
        {/if}
    </main>
</div>

{#snippet sidebarOption(preview: (typeof previews)[number])}
    <ToggleButton
        variant="soft"
        color="accent"
        size="lg"
        pressed={activePreview === preview.preview}
        onclick={() => changeActivePreview(preview)}
    >
        <ToggleButtonLabel>
            {preview.label}
        </ToggleButtonLabel>
    </ToggleButton>
{/snippet}
