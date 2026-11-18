<script lang="ts">
    import type { ComboboxInputProps } from "./index.ts";
    import { getComboboxContext } from "./combobox.context.internal.ts";

    let {
        ref = $bindable(null),
        id,
        disabled,
        readonly,
        invalid,
        autocomplete = "off",
        class: className,
        oninput,
        onkeydown,
        onfocus,
        onblur,
        ...rest
    }: ComboboxInputProps = $props();

    const combobox = getComboboxContext();

    const resolvedId = $derived(id ?? combobox.inputId);
    const resolvedDisabled = $derived(Boolean(disabled ?? combobox.disabled));
    const resolvedReadonly = $derived(Boolean(readonly ?? combobox.readonly));
    const resolvedInvalid = $derived(Boolean(invalid ?? combobox.invalid));

    function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        oninput?.(event);
        if (event.defaultPrevented || resolvedDisabled || resolvedReadonly) return;
        combobox.setInputValue(event.currentTarget.value, { filter: true, open: true });
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || resolvedDisabled) return;

        if (event.key === "ArrowDown") {
            if (resolvedReadonly) return;
            event.preventDefault();
            if (!combobox.open) {
                combobox.setOpen(true, { filter: false, openFocus: "selected" });
            } else {
                combobox.moveHighlight(1);
            }
            return;
        }

        if (event.key === "ArrowUp") {
            if (resolvedReadonly) return;
            event.preventDefault();
            if (!combobox.open) {
                combobox.setOpen(true, { filter: false, openFocus: "last" });
            } else {
                combobox.moveHighlight(-1);
            }
            return;
        }

        if (event.key === "Enter") {
            if (event.isComposing || resolvedReadonly) return;
            if (!combobox.open) return;

            if (combobox.highlightedValue !== undefined) {
                event.preventDefault();
                combobox.select(combobox.highlightedValue);
                return;
            }

            if (combobox.allowCustomValue) {
                event.preventDefault();
                combobox.commitCustomValue();
                combobox.setOpen(false);
            }
            return;
        }

        if (event.key === "Escape") {
            if (event.isComposing) return;
            if (combobox.open) {
                event.preventDefault();
                event.stopPropagation();
                combobox.setOpen(false);
                if (!combobox.allowCustomValue) {
                    combobox.handleInputBlur();
                }
                return;
            }
            if (!combobox.allowCustomValue) {
                const targetLabel =
                    combobox.value !== undefined ? (combobox.selectedItem?.label ?? combobox.value) : "";
                if (combobox.inputValue !== targetLabel) {
                    event.preventDefault();
                    combobox.handleInputBlur();
                }
            }
            return;
        }

        if (event.key === "Tab" && combobox.open) {
            combobox.setOpen(false);
            combobox.handleInputBlur();
        }
    }

    function handleFocus(event: FocusEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        onfocus?.(event);
        if (event.defaultPrevented || resolvedDisabled || resolvedReadonly) return;
        if (combobox.openOnFocus && !combobox.open) {
            combobox.setOpen(true, { filter: false, openFocus: "selected" });
        }
    }

    function handleBlur(event: FocusEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        onblur?.(event);
        const related = event.relatedTarget;
        if (
            related instanceof Node &&
            (combobox.controlRef?.contains(related) || combobox.contentRef?.contains(related))
        ) {
            return;
        }
        if (combobox.open) {
            combobox.setOpen(false);
        }
        combobox.handleInputBlur();
    }

    $effect(() => {
        return combobox.registerInput(ref);
    });

    $effect(() => {
        return combobox.registerInputId(id ?? undefined);
    });
</script>

<input
    bind:this={ref}
    {...rest}
    id={resolvedId}
    type="text"
    role="combobox"
    {autocomplete}
    value={combobox.inputValue}
    disabled={resolvedDisabled}
    readonly={resolvedReadonly}
    aria-expanded={combobox.open ? "true" : "false"}
    aria-controls={combobox.listboxId}
    aria-autocomplete={combobox.filter === false ? "none" : "list"}
    aria-activedescendant={combobox.open ? combobox.highlightedItemId : undefined}
    aria-invalid={resolvedInvalid ? "true" : undefined}
    aria-required={combobox.required ? "true" : undefined}
    class={["cs-combobox-input", className]}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    onfocus={handleFocus}
    onblur={handleBlur}
/>

<style>
    @layer components.composite {
        .cs-combobox-input {
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
            font-weight: 400;
            color: inherit;
            caret-color: var(--cs-combobox-caret, var(--cs-color-accent-solid));
            transition: color var(--cs-dur-effect) var(--cs-ease-effect);
            cursor: inherit;

            &::placeholder {
                color: var(--cs-combobox-placeholder-fg, var(--cs-color-text-weak));
                opacity: 1;
                transition: color var(--cs-dur-effect) var(--cs-ease-effect);
            }

            /* Focus ring is rendered on the .cs-combobox-control::after shell layer */
            &:focus-visible {
                outline: none;
            }

            &:disabled {
                --cs-disabled-opacity: 1;
                color: var(--cs-color-disabled-fg);
            }

            &:-webkit-autofill,
            &:-webkit-autofill:hover,
            &:-webkit-autofill:focus {
                -webkit-text-fill-color: var(--cs-combobox-fg);
                caret-color: var(--cs-combobox-caret);
                transition: background-color 999999s ease-in-out 0s;
            }
        }
    }
</style>
