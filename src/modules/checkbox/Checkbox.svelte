<script lang="ts">
    import { CheckboxMark, type CheckboxProps } from ".";
    import { getCheckboxGroupContext, hasCheckboxGroupContext } from "../checkbox-group/checkbox-group.context.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        value,
        name,
        disabled,
        checked = $bindable(),
        onCheckedChange,
        indeterminate = $bindable(),
        onIndeterminateChange,
        invalid,
        class: className,
        onchange,
        ...rest
    }: CheckboxProps = $props();

    const group = hasCheckboxGroupContext() ? getCheckboxGroupContext() : undefined;
    const isGroupItem = $derived(Boolean(group && value !== undefined));

    $effect(() => {
        if (!group || value === undefined) return;
        return group.registerItem({
            value: () => String(value),
            disabled: () => Boolean(disabled),
        });
    });

    const resolvedChecked = $derived(isGroupItem && group ? group.isSelected(String(value)) : Boolean(checked));
    const resolvedIndeterminate = $derived(isGroupItem ? false : Boolean(indeterminate));
    const resolvedDisabled = $derived(Boolean(disabled || (isGroupItem && group?.disabled)));
    const resolvedName = $derived(name ?? (isGroupItem ? group?.name : undefined));
    const resolvedInvalid = $derived(invalid ?? (isGroupItem ? group?.invalid : undefined));

    const uid = $props.id();
    const anchorName = `--cs-checkbox-${uid}`;

    let settled = $state(false);
    let settleScheduled = false;

    $effect(() => {
        if (settleScheduled) return;
        settleScheduled = true;

        if (typeof requestAnimationFrame === "function") {
            const id = requestAnimationFrame(() => {
                settled = true;
            });
            return () => cancelAnimationFrame(id);
        }

        queueMicrotask(() => {
            settled = true;
        });
    });

    function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        const prevChecked = resolvedChecked;
        const prevIndeterminate = resolvedIndeterminate;

        // Run consumer onchange before syncing bindable state so tri-state handlers can
        // update target.checked/indeterminate without an intermediate checked microtask.
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
        const nextIndeterminate = event.currentTarget.indeterminate;

        checked = nextChecked;
        indeterminate = nextIndeterminate;

        if (nextChecked !== prevChecked) {
            onCheckedChange?.(nextChecked);
        }
        if (nextIndeterminate !== prevIndeterminate) {
            onIndeterminateChange?.(nextIndeterminate);
        }
    }
</script>

<input
    bind:this={ref}
    type="checkbox"
    {...rest}
    {value}
    name={resolvedName}
    disabled={resolvedDisabled}
    checked={resolvedChecked}
    indeterminate={resolvedIndeterminate}
    onchange={handleChange}
    aria-invalid={resolvedInvalid ? "true" : undefined}
    class={["cs-checkbox", className]}
    data-variant={variant}
    data-size={size}
    data-settled={settled ? "" : undefined}
    style:anchor-name={anchorName}
/>

<CheckboxMark
    checked={resolvedChecked}
    indeterminate={resolvedIndeterminate}
    class="cs-checkbox-icon"
    style={`position-anchor: ${anchorName}`}
/>

<style>
    @layer components.primitive {
        .cs-checkbox {
            /* =========================================================
            * CHECKED INTENT (Accent by default, overridden by [aria-invalid])
            * ========================================================= */
            --cs-checkbox-bg-checked: var(--cs-color-accent-solid);
            --cs-checkbox-bg-checked-hover: var(--cs-color-accent-solid-hover);
            position: relative;
            width: var(--cs-checkbox-width);
            height: var(--cs-checkbox-width);
            appearance: none;
            background-color: var(--cs-checkbox-bg);
            border-radius: var(--cs-checkbox-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-checkbox-shadow, none);

            transition:
                background-color var(--cs-dur-press) var(--cs-ease-press),
                box-shadow var(--cs-dur-press) var(--cs-ease-press),
                scale var(--cs-dur-120) var(--cs-ease-press);

            /* =========================================================
            * SIZES
            * ========================================================= */
            &[data-size="xs"] {
                --cs-checkbox-width: 12px;
                --cs-checkbox-radius: 4px;
            }

            &[data-size="sm"] {
                --cs-checkbox-width: 16px;
                --cs-checkbox-radius: 5px;
            }

            &[data-size="md"] {
                --cs-checkbox-width: 20px;
                --cs-checkbox-radius: 6px;
            }

            &[data-size="lg"] {
                --cs-checkbox-width: 24px;
                --cs-checkbox-radius: 7px;
            }

            &[data-size="xl"] {
                --cs-checkbox-width: 28px;
                --cs-checkbox-radius: 8px;
            }

            /* =========================================================
            * VARIANTS
            * ========================================================= */
            &[data-variant="soft"] {
                --cs-checkbox-bg: var(--cs-color-base-soft);
                --cs-checkbox-bg-hover: var(--cs-color-base-soft-hover);
            }

            &[data-variant="elevated"] {
                --cs-checkbox-bg: var(--cs-color-elevated);
                --cs-checkbox-bg-hover: var(--cs-color-elevated-hover);
                --cs-checkbox-shadow: var(--cs-shadow-elevated);
                --cs-checkbox-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            &::before {
                content: "";
                position: absolute;
                inset: 0;
            }

            @media (hover: hover) {
                &:hover:not(:disabled) {
                    background-color: var(--cs-checkbox-bg-hover);
                    box-shadow: var(--cs-checkbox-shadow-hover, none);
                }
            }

            &:active:not(:disabled) {
                scale: 0.9;

                &::before {
                    /* Net hit-area = 0.9 / 0.85 = ~1.06 (+6% safety margin against subpixel mouse jitter) */
                    scale: calc(1 / 0.85);
                }
            }

            &:is(:checked, :indeterminate) {
                --cs-checkbox-bg: var(--cs-checkbox-bg-checked);
                --cs-checkbox-bg-hover: var(--cs-checkbox-bg-checked-hover);
                --cs-checkbox-shadow: var(--cs-shadow-solid);
                --cs-checkbox-shadow-hover: var(--cs-checkbox-shadow);
            }

            &[aria-invalid="true"] {
                --cs-checkbox-bg-checked: var(--cs-color-negative-solid);
                --cs-checkbox-bg-checked-hover: var(--cs-color-negative-solid-hover);

                /* Error ring applies only when inactive & enabled so checked states keep solid highlight and disabled clears it */
                &:not(:checked, :indeterminate, :disabled) {
                    --cs-checkbox-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);
                    --cs-checkbox-shadow-hover: inset 0 0 0 2px var(--cs-color-negative-solid);

                    &[data-variant="elevated"] {
                        --cs-checkbox-shadow: var(--cs-shadow-elevated), inset 0 0 0 2px var(--cs-color-negative-solid);
                        --cs-checkbox-shadow-hover:
                            var(--cs-shadow-elevated-hover), inset 0 0 0 2px var(--cs-color-negative-solid);
                    }
                }
            }

            /* =========================================================
             * DISABLED
             * ========================================================= */
            &:disabled {
                --cs-disabled-opacity: 1;
                --cs-checkbox-bg: var(--cs-color-disabled-bg);
                --cs-checkbox-shadow: none;

                &[data-variant="elevated"] {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-checkbox-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                }

                &:is(:checked, :indeterminate) {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg-strong);
                    --cs-checkbox-shadow: none;
                }
            }
        }

        .cs-checkbox + :global(.cs-checkbox-icon) {
            position: absolute;
            top: anchor(center);
            left: anchor(center);
            width: calc(anchor-size(width) * 0.7);
            height: calc(anchor-size(height) * 0.7);
            color: var(--cs-color-accent-solid-fg);
            opacity: 0;
            translate: -50% -50%;
            scale: 0.7;
            transition:
                opacity var(--cs-dur-80) var(--cs-ease-effect),
                scale var(--cs-dur-80) var(--cs-ease-effect);
            pointer-events: none;
        }

        /* Active Icon Container: Snaps visibility immediately to prioritize vector drawing */
        .cs-checkbox:is(:checked, :indeterminate) + :global(.cs-checkbox-icon) {
            opacity: 1;
            scale: 1;
            transition: none;
        }

        /* Mirrors global disabled state (disabled.css only targets the input host, not its anchor sibling) */
        .cs-checkbox:disabled:is(:checked, :indeterminate) + :global(.cs-checkbox-icon) {
            opacity: 0.5;
        }

        /* Suppress mount-flush transitions (e.g. SelectAll flipping to indeterminate) until first paint settles */
        .cs-checkbox:not([data-settled]) {
            transition: none;

            & + :global(.cs-checkbox-icon) {
                transition: none !important;
            }
        }
    }
</style>
