<script lang="ts">
    import { setTextInputContext, type TextInputProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        invalid,
        disabled,
        readonly,
        class: className,
        children,
        onmousedown,
        ...rest
    }: TextInputProps = $props();

    let fieldEl: HTMLInputElement | null = null;

    setTextInputContext({
        get disabled() {
            return Boolean(disabled);
        },
        get readonly() {
            return Boolean(readonly);
        },
        get invalid() {
            return Boolean(invalid);
        },
        registerField(el: HTMLInputElement | null): () => void {
            fieldEl = el;
            return () => {
                if (fieldEl === el) {
                    fieldEl = null;
                }
            };
        },
    });

    function handleMouseDown(event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onmousedown?.(event);
        if (event.button !== 0 || event.target !== ref || disabled || !fieldEl || fieldEl.disabled) return;
        // Prevent shell mousedown from blurring an already-focused <input> or flickering the focus ring.
        event.preventDefault();
        fieldEl.focus();
    }
</script>

<!-- eslint-disable-next-line svelte/no-static-element-interactions -- Shell only delegates pointer focus to its registered <input> -->
<div
    bind:this={ref}
    {...rest}
    class={["cs-text-input", className]}
    data-variant={variant}
    data-size={size}
    data-invalid={invalid ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    data-readonly={readonly ? "" : undefined}
    onmousedown={handleMouseDown}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-text-input {
            --cs-text-input-fg: var(--cs-color-text-strong);
            --cs-text-input-placeholder-fg: var(--cs-color-text-weak);
            --cs-text-input-caret: auto;
            --cs-text-input-icon-fg: var(--cs-color-text-weak);
            --cs-text-input-shadow: none;
            --cs-text-input-shadow-hover: var(--cs-text-input-shadow);
            --cs-text-input-ring-shadow: inset 0 0 0 0px transparent;
            --cs-text-input-ring-shadow-hover: var(--cs-text-input-ring-shadow);

            position: relative;
            display: inline-flex;
            gap: var(--cs-text-input-gap);
            align-items: center;
            height: var(--cs-text-input-height);
            padding-inline-start: var(--cs-text-input-padding-inline);
            padding-inline-end: var(--cs-text-input-padding-inline);
            color: var(--cs-text-input-fg);
            font-size: var(--cs-text-input-font-size);
            line-height: 1;
            background-color: var(--cs-text-input-bg);
            border-radius: var(--cs-text-input-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-text-input-shadow);
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
                box-shadow: var(--cs-text-input-ring-shadow);
                transition: box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);
                pointer-events: none;
            }

            /* Optical edge compensation for SVG viewBox padding and concentric inline actions */
            &:has(> :global(.cs-text-input-action:not([data-visible="false"]) ~ .cs-text-input-field)) {
                padding-inline-start: var(--cs-text-input-action-inset);
            }

            &:has(> :global(.cs-text-input-field ~ .cs-text-input-action:not([data-visible="false"]))) {
                padding-inline-end: var(--cs-text-input-action-inset);
            }

            &:has(> :global(.cs-text-input-icon:first-child)) {
                padding-inline-start: calc(var(--cs-text-input-padding-inline) - 2px);
            }

            &:has(> :global(.cs-text-input-icon:last-child)) {
                padding-inline-end: calc(var(--cs-text-input-padding-inline) - 2px);
            }

            /* =========================================================
             * SIZES (xs - xl, matching Button heights 28-44px 1:1)
             * ========================================================= */
            &[data-size="xs"] {
                --cs-text-input-height: 28px;
                --cs-text-input-font-size: var(--cs-text-xs);
                --cs-text-input-radius: 9px;
                --cs-text-input-padding-inline: 8px;
                --cs-text-input-gap: 6px;
                --cs-text-input-icon-size: 14px;
                --cs-text-input-action-size: 20px;
                --cs-text-input-action-inset: 4px;
            }

            &[data-size="sm"] {
                --cs-text-input-height: 32px;
                --cs-text-input-font-size: var(--cs-text-xs);
                --cs-text-input-radius: 10px;
                --cs-text-input-padding-inline: 10px;
                --cs-text-input-gap: 6px;
                --cs-text-input-icon-size: 14px;
                --cs-text-input-action-size: 24px;
                --cs-text-input-action-inset: 4px;
            }

            &[data-size="md"] {
                --cs-text-input-height: 36px;
                --cs-text-input-font-size: var(--cs-text-sm);
                --cs-text-input-radius: 12px;
                --cs-text-input-padding-inline: 12px;
                --cs-text-input-gap: 8px;
                --cs-text-input-icon-size: 16px;
                --cs-text-input-action-size: 28px;
                --cs-text-input-action-inset: 4px;
            }

            &[data-size="lg"] {
                --cs-text-input-height: 40px;
                --cs-text-input-font-size: var(--cs-text-sm);
                --cs-text-input-radius: 13px;
                --cs-text-input-padding-inline: 14px;
                --cs-text-input-gap: 8px;
                --cs-text-input-icon-size: 16px;
                --cs-text-input-action-size: 30px;
                --cs-text-input-action-inset: 5px;
            }

            &[data-size="xl"] {
                --cs-text-input-height: 44px;
                --cs-text-input-font-size: var(--cs-text-base);
                --cs-text-input-radius: 14px;
                --cs-text-input-padding-inline: 16px;
                --cs-text-input-gap: 10px;
                --cs-text-input-icon-size: 18px;
                --cs-text-input-action-size: 32px;
                --cs-text-input-action-inset: 6px;
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="soft"] {
                --cs-text-input-bg: var(--cs-color-base-soft);
                --cs-text-input-bg-hover: var(--cs-color-base-soft-hover);
                --cs-text-input-shadow: none;
            }

            &[data-variant="elevated"] {
                --cs-text-input-bg: var(--cs-color-elevated);
                --cs-text-input-bg-hover: var(--cs-color-elevated-hover);
                --cs-text-input-shadow: var(--cs-shadow-elevated);
                --cs-text-input-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            /* =========================================================
             * STATES
             * ========================================================= */
            @media (hover: hover) {
                &:hover:not([data-disabled]) {
                    background-color: var(--cs-text-input-bg-hover);
                    box-shadow: var(--cs-text-input-shadow-hover);

                    &::after {
                        box-shadow: var(--cs-text-input-ring-shadow-hover);
                    }
                }
            }

            &:focus-within:not([data-disabled]) {
                --cs-text-input-ring-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);
                --cs-text-input-ring-shadow-hover: inset 0 0 0 2px var(--cs-color-accent-solid);
            }

            &[data-invalid]:not([data-disabled]) {
                --cs-text-input-icon-fg: var(--cs-color-negative-soft-fg);
                --cs-text-input-caret: var(--cs-color-negative-solid);
                --cs-text-input-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);
                --cs-text-input-ring-shadow-hover: inset 0 0 0 2px var(--cs-color-negative-solid);
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-text-input-fg: var(--cs-color-disabled-fg);
                --cs-text-input-placeholder-fg: var(--cs-color-disabled-fg);
                --cs-text-input-icon-fg: var(--cs-color-disabled-fg);
                --cs-text-input-ring-shadow: inset 0 0 0 0px transparent;
                --cs-text-input-ring-shadow-hover: inset 0 0 0 0px transparent;
                cursor: default;

                &[data-variant="soft"],
                &[data-variant="elevated"] {
                    --cs-text-input-bg: var(--cs-color-disabled-bg);
                    --cs-text-input-bg-hover: var(--cs-color-disabled-bg);
                    --cs-text-input-shadow: none;
                    --cs-text-input-shadow-hover: none;
                }
            }
        }
    }
</style>
