<!--
@component
Primary application layout frame (`<WorkAppFrame />`) for internal desktop-first work tools.

Architectural Notes:
- Single-Element Centering: Avoids an inner wrapper `<div>` by computing dynamic horizontal
    padding via `max()`, keeping a single flex/scroll container where external utility classes
    (e.g. `gap-*`, `overflow-*`) apply directly while the scrollbar stays anchored to the viewport edge.
- Pure Layout Primitive: Intentionally omits `background-color` so the root canvas surface
    (`--cs-color-elevation-0` defined on `html` in `reset.css`) or underlying background patterns shine through.
- Built-In Signature: Automatically renders `<WorkAppSignature />` unless `showSignature={false}` is passed.
-->
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
            padding-inline: max(24px, calc((100% - var(--cs-container-7xl)) / 2));
        }
    }
</style>
