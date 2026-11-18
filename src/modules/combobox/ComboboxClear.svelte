<script lang="ts">
    import { X } from "@lucide/svelte";

    import "./combobox-action.internal.css";
    import { HitArea } from "../hit-area/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import type { ComboboxClearProps } from "./index.ts";
    import { getComboboxContext } from "./combobox.context.internal.ts";

    let {
        ref = $bindable(null),
        icon: Icon = X,
        disabled,
        class: className,
        onpointerdown,
        onclick,
        ...rest
    }: ComboboxClearProps = $props();

    const combobox = getComboboxContext();

    const resolvedDisabled = $derived(Boolean(disabled ?? combobox.disabled));
    const visible = $derived(combobox.inputValue !== "" && !resolvedDisabled && !combobox.readonly);

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointerdown?.(event);
        // Keep DOM focus on ComboboxInput instead of blurring on button press.
        event.preventDefault();
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || resolvedDisabled || combobox.readonly) return;
        combobox.clear();
    }
</script>

<button
    bind:this={ref}
    aria-label={rest["aria-label"] ?? t({ de: "Eingabe löschen", en: "Clear input" })}
    {...rest}
    type="button"
    tabindex={-1}
    disabled={resolvedDisabled}
    aria-hidden={visible ? undefined : "true"}
    data-visible={visible ? "" : "false"}
    class={["cs-combobox-clear", "cs-combobox-action", className]}
    onpointerdown={handlePointerDown}
    onclick={handleClick}
>
    <HitArea size="sm" />
    <Icon aria-hidden="true" class="cs-combobox-action-icon" />
</button>
