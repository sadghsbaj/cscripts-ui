<script lang="ts">
    import { getTextInputContext, hasTextInputContext, type TextInputFieldProps } from "./index.ts";

    let {
        ref = $bindable(null),
        value = $bindable(""),
        onValueChange,
        disabled,
        readonly,
        invalid,
        class: className,
        oninput,
        ...rest
    }: TextInputFieldProps = $props();

    const ctx = hasTextInputContext() ? getTextInputContext() : undefined;

    const resolvedDisabled = $derived(Boolean(disabled || ctx?.disabled));
    const resolvedReadonly = $derived(Boolean(readonly || ctx?.readonly));
    const resolvedInvalid = $derived(invalid ?? ctx?.invalid);

    $effect(() => {
        if (!ctx) return;
        return ctx.registerField(ref);
    });

    function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        oninput?.(event);
        onValueChange?.(event.currentTarget.value);
    }
</script>

<input
    bind:this={ref}
    {...rest}
    bind:value
    class={["cs-text-input-field", className]}
    disabled={resolvedDisabled}
    readonly={resolvedReadonly}
    aria-invalid={resolvedInvalid ? "true" : undefined}
    oninput={handleInput}
/>

<style>
    @layer components.primitive {
        .cs-text-input-field {
            flex: 1;
            min-width: 0;
            height: 100%;
            padding: 0;
            margin: 0;
            appearance: none;
            background: transparent;
            border: none;
            outline: none;
            font: inherit;
            color: inherit;
            caret-color: var(--cs-text-input-caret, var(--cs-color-accent-solid));
            transition: color var(--cs-dur-effect) var(--cs-ease-effect);
            cursor: inherit;

            &::placeholder {
                color: var(--cs-text-input-placeholder-fg, var(--cs-color-text-weak));
                opacity: 1;
                transition: color var(--cs-dur-effect) var(--cs-ease-effect);
            }

            /* Focus ring is rendered on the .cs-text-input::after shell layer */
            &:focus-visible {
                outline: none;
            }

            &[data-auto-resize] {
                flex: 1 1 auto;
                width: auto;
                min-width: var(--cs-auto-resize-min-width, 0);
                max-width: var(--cs-auto-resize-max-width, 100%);
            }

            &:disabled {
                --cs-disabled-opacity: 1;
                color: var(--cs-color-disabled-fg);
            }

            /* Suppress native browser search/number chrome so TextInputAction controls never collide */
            &::-webkit-search-cancel-button,
            &::-webkit-search-decoration,
            &::-webkit-inner-spin-button,
            &::-webkit-outer-spin-button {
                -webkit-appearance: none;
                appearance: none;
                margin: 0;
            }

            &[type="number"] {
                -moz-appearance: textfield;
                appearance: textfield;
            }

            &:-webkit-autofill,
            &:-webkit-autofill:hover,
            &:-webkit-autofill:focus {
                -webkit-text-fill-color: var(--cs-text-input-fg);
                caret-color: var(--cs-text-input-caret);
                transition: background-color 999999s ease-in-out 0s;
            }
        }
    }
</style>
