<script lang="ts">
    import type { Snippet } from "svelte";
    import CodeBlock from "./CodeBlock.svelte";
    import type { HighlightLanguage } from "./highlight.ts";

    interface Props {
        title: string;
        description?: string;
        code?: string;
        lang?: HighlightLanguage;
        align?: "center" | "start";
        children: Snippet;
        class?: string;
    }

    let {
        title,
        description,
        code,
        lang = "svelte",
        align = "center",
        children,
        class: className = "",
    }: Props = $props();
</script>

<section class="flex flex-col gap-3 w-full {className}">
    <header class="flex flex-col gap-1 px-1">
        <h2 class="title-xl text-strong">{title}</h2>
        {#if description}
            <p class="text-sm text-weak">{description}</p>
        {/if}
    </header>

    <div class="bg-elevated shadow-elevated border border-base-soft rounded-3xl squircle-soft overflow-hidden">
        <div
            class="p-8 md:p-10 min-h-140px flex flex-wrap gap-4 items-center {align === 'center'
                ? 'justify-center'
                : 'justify-start'}"
        >
            {@render children()}
        </div>

        {#if code}
            <CodeBlock {code} {lang} embedded />
        {/if}
    </div>
</section>
