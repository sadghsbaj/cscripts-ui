<script lang="ts">
    import { HitArea } from "../hit-area/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { getInternalCommandPaletteContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteBarProps } from "./index.ts";

    let {
        ref = $bindable(null),
        showScope = true,
        class: className,
        children,
        onmousedown,
        ...rest
    }: CommandPaletteBarProps = $props();

    const palette = getInternalCommandPaletteContext();

    const showAutoScope = $derived(showScope && !palette.hasManualScope && Boolean(palette.activeScopeLabel));

    function handleMouseDown(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onmousedown?.(event);
        if (event.defaultPrevented) return;

        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("input, button, a, select, textarea")) return;

        // Clicking empty bar padding focuses the input without triggering blur/refocus flicker.
        event.preventDefault();
        palette.focusInput();
    }

    function handleAutoScopePointerDown(event: PointerEvent): void {
        // Keep DOM focus on CommandPaletteInput when popping scope.
        event.preventDefault();
    }

    function handleAutoScopeClick(): void {
        palette.clearScope();
    }
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-command-palette-bar", className]}
    onmousedown={handleMouseDown}
>
    {@render children?.()}

    {#if showAutoScope}
        <button
            type="button"
            tabindex={-1}
            aria-label={t({ de: "Bereich verlassen", en: "Exit scope" })}
            class="cs-command-palette-scope"
            data-auto-scope=""
            onpointerdown={handleAutoScopePointerDown}
            onclick={handleAutoScopeClick}
        >
            <HitArea size="sm" />
            <span class="cs-command-palette-scope-label">{palette.activeScopeLabel}</span>
        </button>
    {/if}
</div>
