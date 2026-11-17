<script lang="ts">
    import { Plus } from "@lucide/svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { getNumberStepperContext, type NumberStepperIncrementProps } from "./index.ts";
    import { createRepeatHold } from "./number-stepper-repeat.internal.ts";

    let {
        ref = $bindable(null),
        icon: Icon = Plus,
        disabled = false,
        class: className,
        children,
        onclick,
        onpointerdown,
        onpointerup,
        onpointercancel,
        onpointerleave,
        ...rest
    }: NumberStepperIncrementProps = $props();

    const ctx = getNumberStepperContext();
    const isDisabled = $derived(Boolean(disabled) || ctx.disabled || !ctx.canIncrement);
    const defaultAriaLabel = t({ de: "Erhöhen", en: "Increase" });

    const repeat = createRepeatHold(() => {
        if (isDisabled) {
            repeat.stop();
            return;
        }
        ctx.increment();
    });

    $effect(() => {
        if (isDisabled) {
            repeat.cancel();
        }
        return repeat.cancel;
    });

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointerdown?.(event);
        repeat.handlePointerDown(event, isDisabled);
    }

    function handlePointerUp(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointerup?.(event);
        repeat.stop();
    }

    function handlePointerCancel(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointercancel?.(event);
        repeat.cancel();
    }

    function handlePointerLeave(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onpointerleave?.(event);
        repeat.cancel();
    }

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        if (repeat.consumeClick()) return;
        ctx.increment();
    }
</script>

<button
    bind:this={ref}
    aria-label={defaultAriaLabel}
    {...rest}
    type="button"
    disabled={isDisabled}
    class={["cs-number-stepper-btn", className]}
    data-direction="increment"
    onclick={handleClick}
    onpointerdown={handlePointerDown}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerCancel}
    onpointerleave={handlePointerLeave}
>
    {#if children}
        <span class="cs-number-stepper-icon" aria-hidden="true">
            {@render children()}
        </span>
    {:else}
        <Icon class="cs-number-stepper-icon" strokeWidth={2.35} aria-hidden="true" />
    {/if}
</button>
