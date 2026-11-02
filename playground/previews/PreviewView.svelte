<script lang="ts">
    import type { Component } from "svelte";
    import { PanelLeftClose } from "@lucide/svelte";

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

    const modules = import.meta.glob<SvelteModule>("./css/*.svelte", { eager: true });

    const previews: PreviewItem[] = Object.entries(modules).map(([path, module]) => {
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
            error;
        }
    }

    let sidebarIsOpen = $state(false);
</script>

<div class="size-full flex gap-8 relative">
    <button
        class="cs-button absolute right-8 top-8"
        data-size="md"
        data-variant="elevated"
        onclick={() => (sidebarIsOpen = !sidebarIsOpen)}><PanelLeftClose /></button
    >

    <aside
        class="h-full sidebar {sidebarIsOpen ? '' : 'hidden'} w-280px flex flex-col gap-3 shrink-0 py-16 px-4 lg:px-8"
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
    {let isActive = $derived(preview.preview === activePreview)}

    {#if isActive}
        <button
            onclick={() => changeActivePreview(preview)}
            class="cs-button w-full"
            data-size="lg"
            data-variant="soft"
            data-color="accent">{preview.label}</button
        >
    {:else}
        <button
            onclick={() => changeActivePreview(preview)}
            class="cs-button w-full"
            data-size="lg"
            data-variant="elevated">{preview.label}</button
        >
    {/if}
{/snippet}
