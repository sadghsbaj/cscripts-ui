<script lang="ts">
    import type { CardDescriptionProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: CardDescriptionProps = $props();
</script>

<p bind:this={ref} {...rest} class={["cs-card-description", className]}>
    {@render children?.()}
</p>

<style>
    @layer components.composite {
        .cs-card-description {
            margin: 0;
            min-inline-size: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-card-description-size, var(--cs-text-sm));
            line-height: var(--cs-leading-normal);
        }
    }
</style>
