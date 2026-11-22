<script lang="ts">
    import { popoverTrigger } from "../popover/index.ts";
    import type { ComboboxControlProps } from "./index.ts";
    import { getComboboxContext } from "./combobox.context.internal.ts";

    let {
        ref = $bindable(null),
        id,
        disabled,
        readonly,
        invalid,
        class: className,
        children,
        onmousedown,
        ...rest
    }: ComboboxControlProps = $props();

    const combobox = getComboboxContext();

    const resolvedId = $derived(id ?? combobox.controlId);
    const resolvedDisabled = $derived(Boolean(disabled ?? combobox.disabled));
    const resolvedReadonly = $derived(Boolean(readonly ?? combobox.readonly));
    const resolvedInvalid = $derived(Boolean(invalid ?? combobox.invalid));

    function handleMouseDown(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onmousedown?.(event);
        if (
            event.button !== 0 ||
            event.target !== ref ||
            resolvedDisabled ||
            !combobox.inputRef ||
            combobox.inputRef.disabled
        ) {
            return;
        }
        // Prevent shell mousedown from blurring an already-focused <input> or flickering the focus ring.
        event.preventDefault();
        combobox.inputRef.focus();
    }

    $effect(() => {
        return combobox.registerControl(ref);
    });
</script>

<!-- eslint-disable-next-line svelte/no-static-element-interactions -- Shell only delegates pointer focus to its registered <input> -->
<div
    bind:this={ref}
    {...rest}
    id={resolvedId}
    class={["cs-combobox-control", className]}
    data-variant={combobox.variant}
    data-size={combobox.size}
    data-state={combobox.open ? "open" : "closed"}
    data-open={combobox.open ? "" : undefined}
    data-disabled={resolvedDisabled ? "" : undefined}
    data-readonly={resolvedReadonly ? "" : undefined}
    data-invalid={resolvedInvalid ? "" : undefined}
    {@attach popoverTrigger({
        target: combobox.listboxId,
        triggerOn: "manual",
        enabled: () => !resolvedDisabled && !resolvedReadonly,
    })}
    onmousedown={handleMouseDown}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-combobox-control {
            --cs-combobox-fg: var(--cs-color-text-strong);
            --cs-combobox-placeholder-fg: var(--cs-color-text-weak);
            --cs-combobox-caret: auto;
            --cs-combobox-icon-fg: var(--cs-color-text-weak);
            --cs-combobox-indicator-fg: var(--cs-color-text-weak);
            --cs-combobox-shadow: none;
            --cs-combobox-shadow-hover: var(--cs-combobox-shadow);
            --cs-combobox-ring-shadow: inset 0 0 0 0px transparent;
            --cs-combobox-ring-shadow-hover: var(--cs-combobox-ring-shadow);

            position: relative;
            display: inline-flex;
            gap: var(--cs-combobox-gap);
            align-items: center;
            height: var(--cs-combobox-height);
            padding-inline-start: var(--cs-combobox-px);
            padding-inline-end: var(--cs-combobox-px);
            color: var(--cs-combobox-fg);
            font-size: var(--cs-combobox-font-size);
            line-height: 1;
            background-color: var(--cs-combobox-bg);
            border-radius: var(--cs-combobox-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-combobox-shadow);
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                box-shadow var(--cs-dur-effect) var(--cs-ease-effect),
                padding-inline var(--cs-dur-120) var(--cs-ease-quart-out);
            cursor: text;

            &::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 1;
                border-radius: inherit;
                corner-shape: inherit;
                box-shadow: var(--cs-combobox-ring-shadow);
                transition: box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);
                pointer-events: none;
            }

            /* Optical edge compensation for SVG viewBox padding and concentric inline actions */
            &:has(> :global(.cs-combobox-action:not([data-visible="false"]) ~ .cs-combobox-input)) {
                padding-inline-start: var(--cs-combobox-action-inset);
            }

            &:has(> :global(.cs-combobox-input ~ .cs-combobox-action:not([data-visible="false"]))) {
                padding-inline-end: var(--cs-combobox-action-inset);
            }

            &:has(> :global(.cs-combobox-icon:first-child)) {
                padding-inline-start: calc(var(--cs-combobox-px) - 2px);
            }

            &:has(> :global(.cs-combobox-icon:last-child)) {
                padding-inline-end: calc(var(--cs-combobox-px) - 2px);
            }

            /* =========================================================
             * SIZES (xs - xl, matching TextInput & Select 1:1)
             * ========================================================= */
            &[data-size="xs"] {
                --cs-combobox-height: 28px;
                --cs-combobox-font-size: var(--cs-text-xs);
                --cs-combobox-radius: 9px;
                --cs-combobox-px: 8px;
                --cs-combobox-gap: 6px;
                --cs-combobox-icon-size: 14px;
                --cs-combobox-action-size: 20px;
                --cs-combobox-action-inset: 4px;
            }

            &[data-size="sm"] {
                --cs-combobox-height: 32px;
                --cs-combobox-font-size: var(--cs-text-xs);
                --cs-combobox-radius: 10px;
                --cs-combobox-px: 10px;
                --cs-combobox-gap: 6px;
                --cs-combobox-icon-size: 14px;
                --cs-combobox-action-size: 24px;
                --cs-combobox-action-inset: 4px;
            }

            &[data-size="md"] {
                --cs-combobox-height: 36px;
                --cs-combobox-font-size: var(--cs-text-sm);
                --cs-combobox-radius: 12px;
                --cs-combobox-px: 12px;
                --cs-combobox-gap: 8px;
                --cs-combobox-icon-size: 16px;
                --cs-combobox-action-size: 28px;
                --cs-combobox-action-inset: 4px;
            }

            &[data-size="lg"] {
                --cs-combobox-height: 40px;
                --cs-combobox-font-size: var(--cs-text-sm);
                --cs-combobox-radius: 13px;
                --cs-combobox-px: 14px;
                --cs-combobox-gap: 8px;
                --cs-combobox-icon-size: 16px;
                --cs-combobox-action-size: 30px;
                --cs-combobox-action-inset: 5px;
            }

            &[data-size="xl"] {
                --cs-combobox-height: 44px;
                --cs-combobox-font-size: var(--cs-text-base);
                --cs-combobox-radius: 14px;
                --cs-combobox-px: 16px;
                --cs-combobox-gap: 10px;
                --cs-combobox-icon-size: 18px;
                --cs-combobox-action-size: 32px;
                --cs-combobox-action-inset: 6px;
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="soft"] {
                --cs-combobox-bg: var(--cs-color-base-soft);
                --cs-combobox-bg-hover: var(--cs-color-base-soft-hover);
                --cs-combobox-shadow: none;
            }

            &[data-variant="elevated"] {
                --cs-combobox-bg: var(--cs-color-elevated);
                --cs-combobox-bg-hover: var(--cs-color-elevated-hover);
                --cs-combobox-shadow: var(--cs-shadow-elevated);
                --cs-combobox-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            /* =========================================================
             * STATES
             * ========================================================= */
            @media (hover: hover) {
                &:hover:not([data-disabled]) {
                    background-color: var(--cs-combobox-bg-hover);
                    box-shadow: var(--cs-combobox-shadow-hover);

                    &::after {
                        box-shadow: var(--cs-combobox-ring-shadow-hover);
                    }
                }
            }

            &[data-open]:not([data-disabled]) {
                background-color: var(--cs-combobox-bg-hover);
                box-shadow: var(--cs-combobox-shadow-hover);
            }

            &:focus-within:not([data-disabled]) {
                --cs-combobox-ring-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);
                --cs-combobox-ring-shadow-hover: inset 0 0 0 2px var(--cs-color-accent-solid);
            }

            &[data-invalid]:not([data-disabled]) {
                --cs-combobox-icon-fg: var(--cs-color-negative-soft-fg);
                --cs-combobox-indicator-fg: var(--cs-color-negative-soft-fg);
                --cs-combobox-caret: var(--cs-color-negative-solid);
                --cs-combobox-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);
                --cs-combobox-ring-shadow-hover: inset 0 0 0 2px var(--cs-color-negative-solid);
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-combobox-fg: var(--cs-color-disabled-fg);
                --cs-combobox-placeholder-fg: var(--cs-color-disabled-fg);
                --cs-combobox-icon-fg: var(--cs-color-disabled-fg);
                --cs-combobox-indicator-fg: var(--cs-color-disabled-fg);
                --cs-combobox-ring-shadow: inset 0 0 0 0px transparent;
                --cs-combobox-ring-shadow-hover: inset 0 0 0 0px transparent;
                cursor: default;

                &[data-variant="soft"],
                &[data-variant="elevated"] {
                    --cs-combobox-bg: var(--cs-color-disabled-bg);
                    --cs-combobox-bg-hover: var(--cs-color-disabled-bg);
                    --cs-combobox-shadow: none;
                    --cs-combobox-shadow-hover: none;
                }
            }
        }
    }
</style>
