<script lang="ts" generics="T extends string = string">
    import { getSegmentedControlContext, type SegmentedControlItemProps } from "./index.ts";

    let {
        ref = $bindable(null),
        value,
        disabled = false,
        class: className,
        onclick,
        children,
        ...rest
    }: SegmentedControlItemProps<T> = $props();

    const group = getSegmentedControlContext();
    const isActive = $derived(group.isSelected(value));
    const isDisabled = $derived(Boolean(group.disabled || disabled));

    $effect(() => {
        if (!ref) return;
        return group.registerItem(value, ref);
    });

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        group.select(value);
    }
</script>

<button
    bind:this={ref}
    {...rest}
    type="button"
    role="radio"
    aria-checked={isActive ? "true" : "false"}
    disabled={isDisabled}
    class={["cs-segmented-control-item", className]}
    data-state={isActive ? "active" : "inactive"}
    data-value={value}
    data-disabled={isDisabled ? "" : undefined}
    onclick={handleClick}
>
    <span class="cs-segmented-control-item-content">
        {@render children?.()}
    </span>
</button>

<style>
    @layer components.composite {
        .cs-segmented-control-item {
            position: relative;
            z-index: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
            height: 100%;
            padding-inline: var(--cs-segmented-control-item-px);
            color: var(--cs-segmented-control-fg);
            font-weight: 600;
            white-space: nowrap;
            background: transparent;
            border: none;
            border-radius: calc((var(--cs-segmented-control-height) - var(--cs-segmented-control-pad) * 2) / 2);
            corner-shape: var(--cs-squircle-soft);
            cursor: default;
            transition: color var(--cs-dur-effect-fast) var(--cs-ease-effect);

            &[data-state="active"] {
                color: var(--cs-segmented-control-fg-active);
            }

            @media (hover: hover) {
                &:hover:not(:disabled, [aria-disabled="true"], [data-disabled]) {
                    color: var(--cs-segmented-control-fg-hover);
                }
            }

            &:focus-visible {
                outline: 2px solid var(--cs-color-accent-solid);
                outline-offset: -1px;
            }

            &:is(:disabled, [aria-disabled="true"], [data-disabled]) {
                --cs-disabled-opacity: 1;
                color: var(--cs-color-disabled-fg);

                &[data-state="active"] {
                    color: var(--cs-color-disabled-fg-active);
                }
            }
        }

        .cs-segmented-control-item-content {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--cs-segmented-control-gap);
            min-width: 0;
            transition: scale var(--cs-dur-press) var(--cs-ease-press);

            .cs-segmented-control-item[data-state="inactive"]:not(:disabled, [aria-disabled="true"], [data-disabled]):active
                > & {
                scale: 0.95;
            }
        }
    }
</style>
