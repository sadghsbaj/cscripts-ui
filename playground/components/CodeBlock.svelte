<script lang="ts">
    import { Button } from "cs/svelte/button";
    import { CopyIcon, copyOnClick } from "cs/svelte/clipboard";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";
    import { highlightCode, type HighlightLanguage } from "./highlight.ts";

    interface Props {
        code: string;
        lang?: HighlightLanguage;
        embedded?: boolean;
        class?: string;
    }

    let { code, lang = "svelte", embedded = false, class: className = "" }: Props = $props();

    let trimmedCode = $derived(code.trim());
    let highlightedHtml = $state<string | null>(null);

    $effect(() => {
        const currentCode = trimmedCode;
        const currentLang = lang;
        let cancelled = false;

        async function renderHighlight(): Promise<void> {
            try {
                const html = await highlightCode(currentCode, currentLang);
                if (!cancelled) {
                    highlightedHtml = html;
                }
            } catch {
                if (!cancelled) {
                    highlightedHtml = null;
                }
            }
        }

        void renderHighlight();

        return () => {
            cancelled = true;
        };
    });
</script>

<div
    class="cs-playground-code relative bg-sunken {embedded
        ? 'border-t border-base-soft'
        : 'rounded-2xl squircle-soft border border-base-soft'} {className}"
>
    <div class="absolute right-3 top-3 z-10">
        <Button
            variant="ghost"
            size="xs"
            iconOnly
            aria-label="Code kopieren"
            {@attach copyOnClick(trimmedCode)}
            {@attach tooltip("Code kopieren")}
        >
            <CopyIcon />
            <HitArea size="md" />
        </Button>
    </div>

    <div class="cs-playground-code-scroll overflow-x-auto px-5 py-4 pr-14">
        {#if highlightedHtml}
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- Shiki produces trusted static syntax HTML -->
            {@html highlightedHtml}
        {:else}
            <pre class="shiki"><code>{trimmedCode}</code></pre>
        {/if}
    </div>
</div>

<style>
    .cs-playground-code {
        --cs-shiki-foreground: var(--cs-color-text-main);
        --cs-shiki-background: transparent;
        --cs-shiki-token-comment: var(--cs-color-text-weaker);
        --cs-shiki-token-punctuation: var(--cs-color-text-weak);
        --cs-shiki-token-string: var(--cs-color-text-strong);
        --cs-shiki-token-string-expression: var(--cs-color-text-strong);
        --cs-shiki-token-keyword: var(--cs-color-accent-soft-fg);
        --cs-shiki-token-function: var(--cs-color-text-strong);
        --cs-shiki-token-constant: var(--cs-color-text-main);
        --cs-shiki-token-parameter: var(--cs-color-text-main);
        --cs-shiki-token-link: var(--cs-color-accent-soft-fg);
    }

    .cs-playground-code-scroll :global(pre.shiki) {
        margin: 0;
        background-color: transparent !important;
        font-family: var(--cs-font-mono);
        font-size: 0.8125rem;
        line-height: 1.65;
        tab-size: 4;
    }

    .cs-playground-code-scroll :global(code) {
        font-family: inherit;
    }
</style>
