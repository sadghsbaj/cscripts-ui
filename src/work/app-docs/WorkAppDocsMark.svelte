<script lang="ts">
    import type { WorkAppDocsMarkProps } from "./index.ts";

    let {
        ref = $bindable(null),
        tone = "accent",
        children,
        class: className,
        ...rest
    }: WorkAppDocsMarkProps = $props();
</script>

<mark {...rest} bind:this={ref} class={["cs-work-app-docs-mark", className]} data-tone={tone}>
    {@render children?.()}
</mark>

<style>
    @layer components.composite {
        .cs-work-app-docs-mark {
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

        .cs-work-app-docs-mark[data-tone="caution"] {
            background-color: light-dark(
                color-mix(in oklch, var(--cs-color-caution-500) 10%, transparent),
                color-mix(in oklch, var(--cs-color-caution-500) 16%, transparent)
            );
            box-shadow: inset 0 -1.5px 0 0 color-mix(in oklch, var(--cs-color-caution-500) 45%, transparent);
            color: var(--cs-color-text-strong);
        }
    }
</style>
