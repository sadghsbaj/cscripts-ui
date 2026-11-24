<script lang="ts">
    import { HitArea } from "../hit-area/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { getInternalCommandPaletteContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteScopeProps } from "./index.ts";

    let {
        ref = $bindable(null),
        label,
        class: className,
        children,
        onpointerdown,
        onclick,
        ...rest
    }: CommandPaletteScopeProps = $props();

    const palette = getInternalCommandPaletteContext();
    const scopeId = $props.id();

    const resolvedLabel = $derived(label ?? palette.activeScopeLabel);
    const isVisible = $derived(Boolean(resolvedLabel || children));

    $effect(() => {
        return palette.registerManualScope(scopeId);
    });

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointerdown?.(event);
        if (event.defaultPrevented) return;
        // Preserve DOM focus on CommandPaletteInput when popping scope.
        event.preventDefault();
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented) return;
        palette.clearScope();
    }
</script>

{#if isVisible}
    <button
        bind:this={ref}
        aria-label={rest["aria-label"] ?? t({ de: "Bereich verlassen", en: "Exit scope" })}
        {...rest}
        type="button"
        tabindex={-1}
        class={["cs-command-palette-scope", className]}
        onpointerdown={handlePointerDown}
        onclick={handleClick}
    >
        <HitArea size="sm" />
        {#if children}
            {@render children()}
        {:else}
            <span class="cs-command-palette-scope-label">{resolvedLabel}</span>
        {/if}
    </button>
{/if}
