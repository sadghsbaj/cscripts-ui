<script lang="ts">
    import { ChevronDown } from "@lucide/svelte";

    import "./combobox-action.internal.css";
    import { HitArea } from "../hit-area/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import type { ComboboxTriggerProps } from "./index.ts";
    import { getComboboxContext } from "./combobox.context.internal.ts";

    let {
        ref = $bindable(null),
        disabled,
        class: className,
        children,
        onpointerdown,
        onclick,
        ...rest
    }: ComboboxTriggerProps = $props();

    const combobox = getComboboxContext();

    const resolvedDisabled = $derived(Boolean(disabled ?? combobox.disabled));

    let suppressNextClick = false;
    let suppressClickResetTimer: ReturnType<typeof setTimeout> | null = null;

    function clearSuppressClickTimer(): void {
        if (suppressClickResetTimer === null) return;
        clearTimeout(suppressClickResetTimer);
        suppressClickResetTimer = null;
    }

    function resetSuppressNextClick(): void {
        suppressNextClick = false;
        clearSuppressClickTimer();
        if (typeof window !== "undefined") {
            window.removeEventListener("pointerup", handleWindowPointerUp);
            window.removeEventListener("pointercancel", resetSuppressNextClick);
        }
    }

    function handleWindowPointerUp(event: PointerEvent): void {
        if (!(event.target instanceof Node && ref?.contains(event.target))) {
            resetSuppressNextClick();
            return;
        }
        clearSuppressClickTimer();
        suppressClickResetTimer = setTimeout(resetSuppressNextClick, 50);
    }

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointerdown?.(event);
        const consumerPrevented = event.defaultPrevented;
        // Keep DOM focus on ComboboxInput instead of blurring on trigger press.
        event.preventDefault();

        if (
            consumerPrevented ||
            event.pointerType !== "mouse" ||
            event.button !== 0 ||
            resolvedDisabled ||
            combobox.readonly
        ) {
            return;
        }

        suppressNextClick = true;
        clearSuppressClickTimer();
        if (typeof window !== "undefined") {
            window.removeEventListener("pointerup", handleWindowPointerUp);
            window.removeEventListener("pointercancel", resetSuppressNextClick);
            window.addEventListener("pointerup", handleWindowPointerUp, { once: true });
            window.addEventListener("pointercancel", resetSuppressNextClick, { once: true });
        }

        const nextOpen = !combobox.open;
        if (combobox.inputRef && document.activeElement !== combobox.inputRef) {
            combobox.inputRef.focus({ preventScroll: true });
        }
        if (combobox.open !== nextOpen) {
            combobox.setOpen(nextOpen, { filter: false, openFocus: "selected" });
        }
        if (nextOpen && combobox.open) {
            combobox.beginPointerOpen(event.clientX, event.clientY);
        } else {
            combobox.clearPointerOpen();
        }
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        const consumerPrevented = event.defaultPrevented;
        // Prevent native popovertarget click handling from double-toggling alongside controlled state.
        event.preventDefault();
        if (suppressNextClick) {
            resetSuppressNextClick();
            return;
        }
        if (consumerPrevented || resolvedDisabled || combobox.readonly) return;
        combobox.setOpen(!combobox.open, { filter: false, openFocus: "selected" });
        combobox.inputRef?.focus({ preventScroll: true });
    }

    $effect(() => {
        return resetSuppressNextClick;
    });
</script>

<button
    bind:this={ref}
    aria-label={rest["aria-label"] ?? t({ de: "Optionen umschalten", en: "Toggle options" })}
    {...rest}
    type="button"
    tabindex={-1}
    disabled={resolvedDisabled}
    popovertarget={combobox.listboxId}
    aria-expanded={combobox.open ? "true" : "false"}
    aria-controls={combobox.listboxId}
    data-open={combobox.open ? "" : undefined}
    data-state={combobox.open ? "open" : "closed"}
    class={["cs-combobox-trigger", "cs-combobox-action", className]}
    onpointerdown={handlePointerDown}
    onclick={handleClick}
>
    <HitArea size="sm" />
    {#if children}
        {@render children()}
    {:else}
        <ChevronDown aria-hidden="true" class="cs-combobox-trigger-chevron" />
    {/if}
</button>

<style>
    @layer components.composite {
        .cs-combobox-trigger {
            &[data-open] > :global(.cs-combobox-trigger-chevron) {
                rotate: 180deg;
                transition:
                    rotate var(--cs-dur-200) var(--cs-ease-quart-out),
                    color var(--cs-dur-effect) var(--cs-ease-effect);
            }

            > :global(.cs-combobox-trigger-chevron) {
                width: var(--cs-combobox-icon-size, 16px);
                height: var(--cs-combobox-icon-size, 16px);
                stroke-width: 2.25;
                pointer-events: none;
                rotate: 0deg;
                transition:
                    rotate var(--cs-dur-exit-md) var(--cs-ease-exit),
                    color var(--cs-dur-effect) var(--cs-ease-effect);
            }
        }
    }
</style>
