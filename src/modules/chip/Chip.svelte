<script lang="ts">
    import { untrack } from "svelte";

    import "./chip.internal.css";

    import { getChipGroupContext, hasChipGroupContext, setChipContext } from "./chip.context.internal.ts";
    import type { ChipProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        disabled = false,
        invalid = false,
        iconOnly = false,
        class: className,
        children,
        ...rest
    }: ChipProps = $props();

    const group = hasChipGroupContext() ? getChipGroupContext() : undefined;
    const resolvedVariant = $derived(variant ?? group?.variant);
    const resolvedSize = $derived(size ?? group?.size);
    const isDisabled = $derived(Boolean(disabled || group?.disabled));

    let triggerCount = $state(0);
    let removeCount = $state(0);
    let triggerPressed = $state(false);

    const hasTrigger = $derived(triggerCount > 0);
    const hasRemove = $derived(removeCount > 0);

    $effect.pre(() => {
        if (!resolvedVariant || !resolvedSize) {
            throw new Error("<Chip> requires both `variant` and `size` (directly or via an enclosing <ChipGroup>).");
        }
    });

    setChipContext({
        get variant() {
            if (!resolvedVariant) {
                throw new Error("<Chip> requires `variant` (directly or via <ChipGroup>).");
            }
            return resolvedVariant;
        },
        get size() {
            if (!resolvedSize) {
                throw new Error("<Chip> requires `size` (directly or via <ChipGroup>).");
            }
            return resolvedSize;
        },
        get disabled() {
            return isDisabled;
        },
        get invalid() {
            return Boolean(invalid);
        },
        get pressed() {
            return triggerPressed;
        },
        get hasTrigger() {
            return hasTrigger;
        },
        get hasRemove() {
            return hasRemove;
        },
        registerTrigger(): () => void {
            untrack(() => {
                triggerCount += 1;
            });
            return () => {
                untrack(() => {
                    triggerCount = Math.max(0, triggerCount - 1);
                });
            };
        },
        registerRemove(): () => void {
            untrack(() => {
                removeCount += 1;
            });
            return () => {
                untrack(() => {
                    removeCount = Math.max(0, removeCount - 1);
                });
            };
        },
        setTriggerPressed(next: boolean): void {
            triggerPressed = next;
        },
    });
</script>

<span
    bind:this={ref}
    {...rest}
    class={["cs-chip", className]}
    data-variant={resolvedVariant}
    data-size={resolvedSize}
    data-invalid={invalid ? "" : undefined}
    data-icon-only={iconOnly ? "" : undefined}
    data-interactive={hasTrigger ? "" : undefined}
    data-split={hasTrigger && hasRemove ? "" : undefined}
    data-pressed={triggerPressed ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
>
    {#if hasTrigger && hasRemove}
        <span class="cs-chip-fill" aria-hidden="true"></span>
    {/if}
    {@render children?.()}
</span>
