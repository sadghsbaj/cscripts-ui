<script lang="ts">
    import { untrack } from "svelte";

    import {
        ColorFormatSelect,
        createColorState,
        setColorPickerContext,
        type ColorFormat,
        type ColorFormatSelectSize,
        type ColorFormatSelectVariant,
    } from "./index.ts";

    interface Props {
        withPicker?: boolean;
        pickerFormat?: ColorFormat;
        pickerDisabled?: boolean;
        pickerReadonly?: boolean;
        pickerInvalid?: boolean;
        onPickerSetFormat?: (next: ColorFormat) => void;
        bindMode?: "none" | "bind" | "strict";
        value?: ColorFormat | undefined;
        strictValue?: ColorFormat;
        open?: boolean;
        ref?: HTMLButtonElement | null;
        variant?: ColorFormatSelectVariant;
        size?: ColorFormatSelectSize;
        formats?: readonly ColorFormat[];
        onValueChange?: (format: ColorFormat) => void;
        onOpenChange?: (open: boolean) => void;
        disabled?: boolean;
        invalid?: boolean;
        required?: boolean;
        name?: string;
        id?: string;
        label?: string;
        className?: string;
        ariaLabel?: string;
        ariaLabelledBy?: string;
        externalLabelText?: string;
        triggerAttrs?: Record<string, unknown>;
    }

    let {
        withPicker = false,
        pickerFormat = $bindable<ColorFormat>("hex"),
        pickerDisabled = false,
        pickerReadonly = false,
        pickerInvalid = false,
        onPickerSetFormat,
        bindMode = "none",
        value = $bindable<ColorFormat | undefined>(),
        strictValue = "hex",
        open = $bindable(false),
        ref = $bindable<HTMLButtonElement | null>(null),
        variant = "soft",
        size = "md",
        formats,
        onValueChange,
        onOpenChange,
        disabled = false,
        invalid = false,
        required = false,
        name,
        id,
        label,
        className,
        ariaLabel,
        ariaLabelledBy,
        externalLabelText,
        triggerAttrs = {},
    }: Props = $props();

    if (untrack(() => withPicker)) {
        const pickerState = createColorState({
            defaultValue: "#3b82f6",
        });
        setColorPickerContext({
            state: pickerState,
            get value() {
                return pickerState.value;
            },
            get format() {
                return pickerFormat;
            },
            setFormat: (next) => {
                onPickerSetFormat?.(next);
                pickerFormat = next;
            },
            space: "hsv",
            get disabled() {
                return pickerDisabled;
            },
            get readonly() {
                return pickerReadonly;
            },
            get invalid() {
                return pickerInvalid;
            },
            getChannel: (ch) => pickerState.getChannel(ch),
            setChannel: (ch, next, options) => pickerState.setChannel(ch, next, options),
            setChannels: (partial, options) => pickerState.setChannels(partial, options),
            setString: (raw, options) => pickerState.setString(raw, options),
            commit: () => pickerState.commit(),
        });
    }
</script>

{#if ariaLabelledBy && externalLabelText}
    <span id={ariaLabelledBy}>{externalLabelText}</span>
{/if}

{#if bindMode === "bind"}
    <ColorFormatSelect
        bind:ref
        bind:value
        bind:open
        {variant}
        {size}
        {formats}
        {onValueChange}
        {onOpenChange}
        {disabled}
        {invalid}
        {required}
        {name}
        {id}
        {label}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...triggerAttrs}
    />
{:else if bindMode === "strict"}
    <ColorFormatSelect
        bind:ref
        bind:value={() => strictValue, () => {}}
        bind:open
        {variant}
        {size}
        {formats}
        {onValueChange}
        {onOpenChange}
        {disabled}
        {invalid}
        {required}
        {name}
        {id}
        {label}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...triggerAttrs}
    />
{:else}
    <ColorFormatSelect
        bind:ref
        bind:open
        {variant}
        {size}
        {formats}
        {onValueChange}
        {onOpenChange}
        {disabled}
        {invalid}
        {required}
        {name}
        {id}
        {label}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...triggerAttrs}
    />
{/if}
