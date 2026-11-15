<script lang="ts">
    import { getSwitchGroupContext, hasSwitchGroupContext } from "../switch-group/switch-group.context.ts";
    import { type SwitchProps } from ".";

    let {
        ref = $bindable(null),
        size,
        value,
        name,
        disabled,
        checked = $bindable(),
        onCheckedChange,
        class: className,
        onchange,
        ...rest
    }: SwitchProps = $props();

    const group = hasSwitchGroupContext() ? getSwitchGroupContext() : undefined;
    const isGroupItem = $derived(Boolean(group && value !== undefined));

    $effect(() => {
        if (!group || value === undefined) return;
        return group.registerItem({
            value: () => String(value),
            disabled: () => Boolean(disabled),
        });
    });

    const resolvedChecked = $derived(isGroupItem && group ? group.isSelected(String(value)) : Boolean(checked));
    const resolvedDisabled = $derived(Boolean(disabled || group?.disabled));
    const resolvedName = $derived(name ?? (isGroupItem ? group?.name : undefined));

    function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        const prevChecked = resolvedChecked;

        // Run consumer onchange before syncing bindable state so handlers can inspect/adjust target.checked.
        onchange?.(event);

        if (isGroupItem && group) {
            const itemValue = String(value);
            group.setSelected(itemValue, event.currentTarget.checked);
            const committedChecked = group.isSelected(itemValue);
            // Keep native DOM state aligned if a controlled group rejects the change.
            event.currentTarget.checked = committedChecked;
            if (committedChecked !== prevChecked) {
                onCheckedChange?.(committedChecked);
            }
            return;
        }

        const nextChecked = event.currentTarget.checked;
        checked = nextChecked;

        if (nextChecked !== prevChecked) {
            onCheckedChange?.(nextChecked);
        }

        // Keep native DOM state aligned if a controlled bind:checked={get, set} rejects the change.
        event.currentTarget.checked = Boolean(checked);
    }
</script>

<input
    bind:this={ref}
    {...rest}
    {value}
    name={resolvedName}
    disabled={resolvedDisabled}
    type="checkbox"
    role="switch"
    checked={resolvedChecked}
    onchange={handleChange}
    class={["cs-switch", className]}
    data-size={size}
/>

<style>
    @layer components.primitive {
        .cs-switch {
            --cs-switch-bg: var(--cs-color-base-soft);
            --cs-switch-bg-hover: var(--cs-color-base-soft-hover);
            --cs-switch-bg-checked: var(--cs-color-accent-solid);
            --cs-switch-bg-checked-hover: var(--cs-color-accent-solid-hover);
            --cs-switch-radius: calc(var(--cs-switch-height) / 2);
            --cs-switch-thumb-bg: #fff;
            --cs-switch-thumb-shadow: 0 1px 3px rgb(0 0 0 / 0.18), 0 1px 1px rgb(0 0 0 / 0.08);
            --cs-switch-thumb-dur: var(--cs-dur-180);
            --cs-switch-thumb-ease: var(--cs-ease-quart-out);
            --cs-switch-dir: 1;

            position: relative;
            display: inline-block;
            flex-shrink: 0;
            width: var(--cs-switch-width);
            height: var(--cs-switch-height);
            appearance: none;
            background-color: var(--cs-switch-bg);
            border-radius: var(--cs-switch-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-switch-shadow, none);
            cursor: default;

            transition:
                background-color var(--cs-dur-press) var(--cs-ease-press),
                box-shadow var(--cs-dur-press) var(--cs-ease-press);

            &:dir(rtl) {
                --cs-switch-dir: -1;
            }

            /* =========================================================
             * SIZES
             * ========================================================= */
            &[data-size="xs"] {
                --cs-switch-height: 14px;
                --cs-switch-width: 26px;
                --cs-switch-pad: 2px;
                --cs-switch-thumb-width: 14px;
            }

            &[data-size="sm"] {
                --cs-switch-height: 18px;
                --cs-switch-width: 34px;
                --cs-switch-pad: 2px;
                --cs-switch-thumb-width: 20px;
            }

            &[data-size="md"] {
                --cs-switch-height: 22px;
                --cs-switch-width: 42px;
                --cs-switch-pad: 2.5px;
                --cs-switch-thumb-width: 24px;
            }

            &[data-size="lg"] {
                --cs-switch-height: 26px;
                --cs-switch-width: 48px;
                --cs-switch-pad: 3px;
                --cs-switch-thumb-width: 28px;
            }

            &[data-size="xl"] {
                --cs-switch-height: 30px;
                --cs-switch-width: 56px;
                --cs-switch-pad: 3px;
                --cs-switch-thumb-width: 34px;
            }

            /* =========================================================
             * THUMB
             * ========================================================= */
            &::after {
                content: "";
                position: absolute;
                inset-block: var(--cs-switch-pad);
                inset-inline-start: var(--cs-switch-pad);
                width: var(--cs-switch-thumb-width);
                background-color: var(--cs-switch-thumb-bg);
                border-radius: var(--cs-radius-full);
                corner-shape: var(--cs-squircle-soft);
                box-shadow: var(--cs-switch-thumb-shadow);
                /* Pin inset-inline-start so horizontal travel stays on compositor translate while width stretches */
                translate: calc(var(--cs-switch-thumb-x, 0px) * var(--cs-switch-dir)) 0;
                pointer-events: none;
                transition:
                    translate var(--cs-switch-thumb-dur) var(--cs-switch-thumb-ease),
                    width var(--cs-dur-press) var(--cs-ease-press),
                    background-color var(--cs-dur-press) var(--cs-ease-press),
                    box-shadow var(--cs-dur-press) var(--cs-ease-press),
                    opacity var(--cs-dur-press) var(--cs-ease-press);
            }

            /* =========================================================
             * STATES
             * ========================================================= */
            @media (hover: hover) {
                &:hover:not(:disabled) {
                    background-color: var(--cs-switch-bg-hover);
                    box-shadow: var(--cs-switch-shadow-hover, none);
                }
            }

            &:checked {
                --cs-switch-bg: var(--cs-switch-bg-checked);
                --cs-switch-bg-hover: var(--cs-switch-bg-checked-hover);
                --cs-switch-shadow: var(--cs-shadow-solid);
                --cs-switch-shadow-hover: var(--cs-switch-shadow);
                --cs-switch-thumb-x: calc(
                    var(--cs-switch-width) - var(--cs-switch-pad) * 2 - var(--cs-switch-thumb-width)
                );
            }

            /* Scope press anticipation to fine hover pointers: on touch devices (Android Chrome),
               :active latches ~64ms past touchend/click, causing thumb width to settle after the 180ms translate finishes */
            @media (hover: hover) and (pointer: fine) {
                &:active:not(:disabled) {
                    /* Match translate timing to width press timing so :checked:active stays edge-locked */
                    --cs-switch-thumb-dur: var(--cs-dur-press);
                    --cs-switch-thumb-ease: var(--cs-ease-press);

                    &::after {
                        width: calc(var(--cs-switch-thumb-width) * 1.14);
                    }

                    &:checked {
                        --cs-switch-thumb-x: calc(
                            var(--cs-switch-width) - var(--cs-switch-pad) * 2 - var(--cs-switch-thumb-width) * 1.14
                        );
                    }
                }
            }

            &:disabled {
                --cs-disabled-opacity: 1;
                --cs-switch-bg: var(--cs-color-disabled-bg);
                --cs-switch-shadow: none;
                --cs-switch-thumb-bg: light-dark(rgb(255 255 255 / 0.75), rgb(255 255 255 / 0.5));
                --cs-switch-thumb-shadow: 0 1px 2px rgb(0 0 0 / 0.08);

                &:checked {
                    --cs-switch-bg: var(--cs-color-disabled-bg-strong);
                    --cs-switch-shadow: none;
                }
            }
        }
    }
</style>
