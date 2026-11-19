<script lang="ts">
    import type { WorkAppDocsContentProps } from "./index.ts";

    let { ref = $bindable(null), children, class: className, ...rest }: WorkAppDocsContentProps = $props();
</script>

<article {...rest} bind:this={ref} class={["cs-work-app-docs-content", className]}>
    {@render children?.()}
</article>

<style>
    @layer components.composite {
        .cs-work-app-docs-content {
            width: 100%;
            min-width: 0;
        }

        .cs-work-app-docs-content :global(:where(p)) {
            margin-block: 0 14px;
            max-inline-size: 64ch;
            color: var(--cs-color-text-main);
            font-size: 15px;
            font-weight: 400;
            line-height: 1.65;
        }

        .cs-work-app-docs-content :global(:where(p:last-child)) {
            margin-block-end: 0;
        }

        .cs-work-app-docs-content :global(:where(strong, b)) {
            color: var(--cs-color-text-strong);
            font-weight: 600;
        }

        .cs-work-app-docs-content :global(:where(a:not(.cs-work-app-docs-heading-anchor))) {
            color: var(--cs-color-text-strong);
            font-weight: 500;
            text-decoration: underline;
            text-decoration-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 26%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 30%, transparent)
            );
            text-decoration-thickness: 1px;
            text-underline-offset: 3.5px;
            transition:
                color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                text-decoration-color var(--cs-dur-effect-fast) var(--cs-ease-effect);
        }

        .cs-work-app-docs-content :global(:where(a:not(.cs-work-app-docs-heading-anchor):hover)) {
            color: var(--cs-color-accent-soft-fg);
            text-decoration-color: var(--cs-color-accent-soft-fg);
        }

        .cs-work-app-docs-content :global(:where(ul)) {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-block: 0 18px;
            padding-inline-start: 0;
            max-inline-size: 64ch;
            list-style: none;
        }

        .cs-work-app-docs-content :global(:where(ul > li)) {
            position: relative;
            padding-inline-start: 18px;
            color: var(--cs-color-text-main);
            font-size: 15px;
            line-height: 1.65;
        }

        .cs-work-app-docs-content :global(:where(ul > li::before)) {
            content: "";
            position: absolute;
            inset-inline-start: 2px;
            inset-block-start: calc(1lh / 2 - 2.5px);
            inline-size: 5px;
            block-size: 5px;
            border-radius: var(--cs-radius-full);
            background-color: var(--cs-color-text-weaker);
        }

        .cs-work-app-docs-content :global(:where(ol)) {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-block: 0 20px;
            padding-inline-start: 0;
            max-inline-size: 64ch;
            list-style: none;
            counter-reset: cs-docs-step;
        }

        .cs-work-app-docs-content :global(:where(ol > li)) {
            position: relative;
            padding-inline-start: 30px;
            color: var(--cs-color-text-main);
            font-size: 15px;
            line-height: 1.65;
            counter-increment: cs-docs-step;
        }

        .cs-work-app-docs-content :global(:where(ol > li::before)) {
            content: counter(cs-docs-step);
            position: absolute;
            inset-inline-start: 0;
            inset-block-start: calc(1lh / 2 - 10px);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            inline-size: 20px;
            block-size: 20px;
            border-radius: 6px;
            corner-shape: var(--cs-squircle-soft);
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-strong);
            font-size: 11px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }

        .cs-work-app-docs-content :global(:where(code:not(.cs-work-app-docs-code))) {
            padding: 2px 6px;
            border-radius: 5px;
            corner-shape: var(--cs-squircle-soft);
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-strong);
            font-family: var(--cs-font-mono);
            font-size: 13px;
            font-weight: 500;
        }

        .cs-work-app-docs-content :global(:where(kbd:not(.cs-work-app-docs-kbd))) {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 5px;
            corner-shape: var(--cs-squircle-soft);
            background-color: var(--cs-color-elevated);
            box-shadow: var(--cs-shadow-2xs);
            color: var(--cs-color-text-strong);
            font-family: var(--cs-font-mono);
            font-size: 12px;
            font-weight: 500;
            line-height: 16px;
        }

        .cs-work-app-docs-content :global(:where(mark:not(.cs-work-app-docs-mark))) {
            padding: 1px 5px;
            border-radius: 4px;
            corner-shape: var(--cs-squircle-soft);
            background-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 4.5%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 8%, transparent)
            );
            box-shadow: inset 0 -1.5px 0 0
                light-dark(
                    color-mix(in oklch, var(--cs-color-base-900) 22%, transparent),
                    color-mix(in oklch, var(--cs-color-base-100) 28%, transparent)
                );
            color: var(--cs-color-text-strong);
            font-weight: 550;
            box-decoration-break: clone;
        }
    }
</style>
