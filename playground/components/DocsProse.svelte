<script lang="ts">
    import { renderMarkdown } from "./markdown.ts";

    interface Props {
        markdown: string;
        class?: string;
    }

    let { markdown, class: className = "" }: Props = $props();

    let renderedHtml = $state<string>("");

    $effect(() => {
        const currentMarkdown = markdown;
        let cancelled = false;

        async function parseDocs(): Promise<void> {
            const html = await renderMarkdown(currentMarkdown);
            if (!cancelled) {
                renderedHtml = html;
            }
        }

        void parseDocs();

        return () => {
            cancelled = true;
        };
    });
</script>

<article class="cs-docs-prose {className}">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- Markdown HTML generated locally from co-located *.docs.md -->
    {@html renderedHtml}
</article>

<style>
    .cs-docs-prose {
        color: var(--cs-color-text-main);
        font-size: 0.9375rem;
        line-height: 1.68;
    }

    .cs-docs-prose :global(> :first-child) {
        margin-top: 0;
    }

    .cs-docs-prose :global(h1) {
        margin: 0 0 1.25rem;
        padding-bottom: 0.75rem;
        color: var(--cs-color-text-strong);
        font-size: 1.875rem;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.02em;
        border-bottom: 1px solid var(--cs-color-base-soft);
    }

    .cs-docs-prose :global(h2) {
        margin: 2.25rem 0 0.75rem;
        color: var(--cs-color-text-strong);
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.015em;
    }

    .cs-docs-prose :global(h3) {
        margin: 1.5rem 0 0.5rem;
        color: var(--cs-color-text-strong);
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.4;
    }

    .cs-docs-prose :global(p) {
        margin: 0.75rem 0;
    }

    .cs-docs-prose :global(ul),
    .cs-docs-prose :global(ol) {
        margin: 0.75rem 0;
        padding-left: 1.35rem;
    }

    .cs-docs-prose :global(li) {
        margin: 0.35rem 0;
    }

    .cs-docs-prose :global(strong) {
        color: var(--cs-color-text-strong);
        font-weight: 600;
    }

    .cs-docs-prose :global(a) {
        color: var(--cs-color-text-strong);
        text-decoration: underline;
        text-decoration-color: var(--cs-color-base-soft-border);
        text-underline-offset: 3px;
    }

    .cs-docs-prose :global(a:hover) {
        text-decoration-color: var(--cs-color-text-strong);
    }

    .cs-docs-prose :global(:not(pre) > code) {
        padding: 0.15em 0.4em;
        color: var(--cs-color-text-strong);
        font-family: var(--cs-font-mono);
        font-size: 0.84em;
        background: var(--cs-color-base-soft);
        border-radius: var(--cs-radius-sm);
    }

    .cs-docs-prose :global(blockquote) {
        margin: 1rem 0;
        padding: 0.5rem 1rem;
        color: var(--cs-color-text-weak);
        background: var(--cs-color-bg-sunken);
        border-left: 3px solid var(--cs-color-base-soft-border);
        border-radius: 0 var(--cs-radius-md) var(--cs-radius-md) 0;
    }

    .cs-docs-prose :global(table) {
        margin: 1rem 0 1.25rem;
        width: 100%;
        font-size: 0.875rem;
        border-collapse: collapse;
    }

    .cs-docs-prose :global(th),
    .cs-docs-prose :global(td) {
        padding: 0.625rem 0.75rem;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid var(--cs-color-base-soft);
    }

    .cs-docs-prose :global(th) {
        color: var(--cs-color-text-strong);
        font-weight: 600;
        border-bottom-color: var(--cs-color-base-soft-border);
    }

    .cs-docs-prose :global(hr) {
        margin: 2rem 0;
        border: 0;
        border-top: 1px solid var(--cs-color-base-soft);
    }

    .cs-docs-prose :global(.cs-docs-code) {
        margin: 1rem 0 1.25rem;
        overflow: hidden;
        background: var(--cs-color-bg-sunken);
        border: 1px solid var(--cs-color-base-soft);
        border-radius: var(--cs-radius-xl);
    }

    .cs-docs-prose :global(.cs-docs-code pre) {
        --cs-shiki-foreground: var(--cs-color-text-main);
        --cs-shiki-background: transparent;
        --cs-shiki-token-constant: var(--cs-color-text-strong);
        --cs-shiki-token-string: var(--cs-color-text-weak);
        --cs-shiki-token-comment: var(--cs-color-text-weaker);
        --cs-shiki-token-keyword: var(--cs-color-text-strong);
        --cs-shiki-token-parameter: var(--cs-color-text-main);
        --cs-shiki-token-function: var(--cs-color-text-strong);
        --cs-shiki-token-string-expression: var(--cs-color-text-weak);
        --cs-shiki-token-punctuation: var(--cs-color-text-weaker);
        --cs-shiki-token-link: var(--cs-color-text-strong);
        margin: 0;
        padding: 1rem 1.25rem;
        overflow-x: auto;
        font-family: var(--cs-font-mono);
        font-size: 0.8125rem;
        line-height: 1.6;
        background: transparent !important;
    }
</style>
