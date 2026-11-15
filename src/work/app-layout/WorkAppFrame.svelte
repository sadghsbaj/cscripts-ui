<script lang="ts">
    import type { WorkAppFrameProps } from "./index.ts";
    import WorkAppSignature from "./WorkAppSignature.svelte";

    let { showSignature = true, children, class: className, ...rest }: WorkAppFrameProps = $props();
</script>

<div {...rest} class={["cs-work-app-frame", className]}>
    {@render children?.()}

    {#if showSignature}
        <WorkAppSignature />
    {/if}
</div>

<style>
    @layer components.composite {
        .cs-work-app-frame {
            display: flex;
            flex-direction: column;
            gap: 32px;
            width: 100%;
            min-height: 100%;
            padding-block: 24px 64px;
            /* Enforces a minimum 24px gutter on smaller laptops while centering content to `--cs-container-7xl` (1280px) on wider monitors */
            padding-inline: max(48px, calc((100% - var(--cs-container-7xl)) / 2));
        }
    }
</style>
