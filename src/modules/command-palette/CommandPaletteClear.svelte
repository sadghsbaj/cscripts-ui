<script lang="ts">
    import { X } from "@lucide/svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { getInternalCommandPaletteContext } from "./command-palette.context.internal.ts";
    import type { CommandPaletteClearProps } from "./index.ts";

    let {
        ref = $bindable(null),
        icon: Icon = X,
        disabled = false,
        class: className,
        onpointerdown,
        onclick,
        ...rest
    }: CommandPaletteClearProps = $props();

    const palette = getInternalCommandPaletteContext();
    const visible = $derived(palette.inputValue !== "" && !disabled);

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointerdown?.(event);
        if (event.defaultPrevented) return;
        // Keep DOM focus on CommandPaletteInput instead of blurring on button press.
        event.preventDefault();
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || disabled) return;
        palette.clearInput();
    }
</script>

<button
    bind:this={ref}
    aria-label={rest["aria-label"] ?? t({ de: "Eingabe löschen", en: "Clear input" })}
    {...rest}
    type="button"
    tabindex={-1}
    {disabled}
    aria-hidden={visible ? undefined : "true"}
    data-visible={visible ? "" : undefined}
    class={["cs-command-palette-clear", className]}
    onpointerdown={handlePointerDown}
    onclick={handleClick}
>
    <HitArea size="sm" />
    <Icon aria-hidden="true" class="cs-command-palette-clear-icon" />
</button>
