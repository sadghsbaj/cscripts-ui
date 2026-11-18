<script lang="ts">
    import "./chip.internal.css";

    import {
        getChipContext,
        getChipGroupContext,
        hasChipContext,
        hasChipGroupContext,
        setChipTriggerContext,
    } from "./chip.context.internal.ts";
    import type { ChipTriggerProps } from "./index.ts";

    let {
        ref = $bindable(null),
        as,
        href,
        disabled = false,
        value,
        pressed = $bindable(),
        onPressedChange,
        onclick,
        class: className,
        children,
        ...rest
    }: ChipTriggerProps = $props();

    const chip = hasChipContext() ? getChipContext() : undefined;
    const group = hasChipGroupContext() ? getChipGroupContext() : undefined;

    setChipTriggerContext({ insideTrigger: true });

    const element = $derived(as === "a" || href !== undefined ? "a" : "button");
    const isTriggerDisabled = $derived(Boolean(disabled || chip?.disabled));
    const isToggle = $derived(element === "button" && (value !== undefined || pressed !== undefined));
    const isPressed = $derived(group && value !== undefined ? group.isSelected(value) : Boolean(pressed));

    $effect.pre(() => {
        if (value !== undefined && !group) {
            throw new Error("<ChipTrigger> with a `value` prop must be used inside a <ChipGroup>.");
        }
        if (element === "a" && (value !== undefined || pressed !== undefined)) {
            throw new Error("<ChipTrigger> rendered as an <a> link cannot use `value` or `pressed`.");
        }
    });

    $effect.pre(() => {
        const unregister = chip?.registerTrigger();
        return () => {
            unregister?.();
            chip?.setTriggerPressed(false);
        };
    });

    $effect.pre(() => {
        chip?.setTriggerPressed(isToggle && isPressed);
    });

    function handleClick(
        event: MouseEvent & {
            currentTarget: EventTarget & (HTMLButtonElement | HTMLAnchorElement);
        }
    ): void {
        if (isTriggerDisabled) {
            event.preventDefault();
            return;
        }

        (onclick as ((e: typeof event) => void) | undefined)?.(event);
        if (event.defaultPrevented || element !== "button") return;

        if (value !== undefined) {
            group?.toggle(value);
            return;
        }

        if (pressed !== undefined) {
            const next = !pressed;
            pressed = next;
            onPressedChange?.(next);
        }
    }
</script>

<svelte:element
    this={element}
    bind:this={ref}
    {...rest}
    role={element === "a" && isTriggerDisabled ? "link" : rest.role}
    type={element === "button" ? "button" : undefined}
    href={element === "a" ? (isTriggerDisabled ? undefined : href) : undefined}
    aria-pressed={isToggle ? isPressed : undefined}
    disabled={element === "button" ? isTriggerDisabled || undefined : undefined}
    aria-disabled={element === "a" && isTriggerDisabled ? "true" : rest["aria-disabled"]}
    tabindex={element === "a" && isTriggerDisabled ? -1 : rest.tabindex}
    data-disabled={isTriggerDisabled ? "" : undefined}
    onclick={handleClick}
    class={["cs-chip-trigger", className]}
>
    <span class="cs-chip-trigger-content">
        {@render children?.()}
    </span>
    {#if !chip?.hasRemove}
        <span class="cs-chip-fill" aria-hidden="true"></span>
    {/if}
</svelte:element>
