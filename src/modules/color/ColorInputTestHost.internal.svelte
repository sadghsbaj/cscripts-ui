<script lang="ts">
    import { untrack } from "svelte";

    import {
        ColorInput,
        createColorState,
        setColorPickerContext,
        type ColorAlphaFormat,
        type ColorChannel,
        type ColorFormat,
        type ColorInputSize,
        type ColorInputVariant,
    } from "./index.ts";

    interface Props {
        withPicker?: boolean;
        pickerValue?: string;
        pickerFormat?: ColorFormat;
        pickerDisabled?: boolean;
        pickerReadonly?: boolean;
        pickerInvalid?: boolean;
        onPickerSetString?: (raw: string, options?: { commit?: boolean }) => void;
        onPickerSetChannel?: (channel: ColorChannel, next: number, options?: { commit?: boolean }) => void;
        bindMode?: "none" | "bind" | "strict";
        value?: string | number;
        strictStringValue?: string;
        strictNumberValue?: number;
        ref?: HTMLDivElement | null;
        inputRef?: HTMLInputElement | null;
        variant?: ColorInputVariant;
        size?: ColorInputSize;
        channel?: ColorChannel;
        format?: ColorFormat;
        alpha?: ColorAlphaFormat;
        showSwatch?: boolean;
        showPrefix?: boolean;
        color?: string;
        showUnit?: boolean;
        placeholder?: string;
        label?: string;
        disabled?: boolean;
        readonly?: boolean;
        invalid?: boolean;
        onValueChange?: ((value: string) => void) | ((value: number) => void);
        onCommit?: ((value: string) => void) | ((value: number) => void);
        inputAttrs?: Record<string, unknown>;
    }

    let {
        withPicker = false,
        pickerValue = $bindable("#3b82f6"),
        pickerFormat = "hex",
        pickerDisabled = false,
        pickerReadonly = false,
        pickerInvalid = false,
        onPickerSetString,
        onPickerSetChannel,
        bindMode = "none",
        value = $bindable<string | number | undefined>(),
        strictStringValue = "#3b82f6",
        strictNumberValue = 180,
        ref = $bindable<HTMLDivElement | null>(null),
        inputRef = $bindable<HTMLInputElement | null>(null),
        variant = "soft",
        size = "md",
        channel,
        format,
        alpha,
        showSwatch,
        showPrefix,
        color,
        showUnit,
        placeholder,
        label,
        disabled = false,
        readonly = false,
        invalid = false,
        onValueChange,
        onCommit,
        inputAttrs = {},
    }: Props = $props();

    if (untrack(() => withPicker)) {
        const pickerState = createColorState({
            value: () => pickerValue,
            setValue: (next) => {
                pickerValue = next;
            },
            format: () => pickerFormat,
        });
        setColorPickerContext({
            state: pickerState,
            get value() {
                return pickerValue;
            },
            get format() {
                return pickerFormat;
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
            setChannel: (ch, next, options) => {
                onPickerSetChannel?.(ch, next, options);
                pickerState.setChannel(ch, next, options);
            },
            setChannels: (partial, options) => pickerState.setChannels(partial, options),
            setString: (raw, options) => {
                onPickerSetString?.(raw, options);
                return pickerState.setString(raw, options);
            },
            commit: () => pickerState.commit(),
        });
    }
</script>

{#if channel !== undefined}
    {#if bindMode === "bind"}
        <ColorInput
            bind:ref
            bind:inputRef
            bind:value={() => (typeof value === "number" ? value : undefined), (next) => (value = next)}
            {variant}
            {size}
            {channel}
            {color}
            {showUnit}
            {placeholder}
            {label}
            {disabled}
            {readonly}
            {invalid}
            onValueChange={onValueChange as ((value: number) => void) | undefined}
            onCommit={onCommit as ((value: number) => void) | undefined}
            {...inputAttrs}
        />
    {:else if bindMode === "strict"}
        <ColorInput
            bind:ref
            bind:inputRef
            bind:value={() => strictNumberValue, () => {}}
            {variant}
            {size}
            {channel}
            {color}
            {showUnit}
            {placeholder}
            {label}
            {disabled}
            {readonly}
            {invalid}
            onValueChange={onValueChange as ((value: number) => void) | undefined}
            onCommit={onCommit as ((value: number) => void) | undefined}
            {...inputAttrs}
        />
    {:else}
        <ColorInput
            bind:ref
            bind:inputRef
            {variant}
            {size}
            {channel}
            {color}
            {showUnit}
            {placeholder}
            {label}
            {disabled}
            {readonly}
            {invalid}
            onValueChange={onValueChange as ((value: number) => void) | undefined}
            onCommit={onCommit as ((value: number) => void) | undefined}
            {...inputAttrs}
        />
    {/if}
{:else if bindMode === "bind"}
    <ColorInput
        bind:ref
        bind:inputRef
        bind:value={() => (typeof value === "string" ? value : undefined), (next) => (value = next)}
        {variant}
        {size}
        {format}
        {alpha}
        {showSwatch}
        {showPrefix}
        {placeholder}
        {label}
        {disabled}
        {readonly}
        {invalid}
        onValueChange={onValueChange as ((value: string) => void) | undefined}
        onCommit={onCommit as ((value: string) => void) | undefined}
        {...inputAttrs}
    />
{:else if bindMode === "strict"}
    <ColorInput
        bind:ref
        bind:inputRef
        bind:value={() => strictStringValue, () => {}}
        {variant}
        {size}
        {format}
        {alpha}
        {showSwatch}
        {showPrefix}
        {placeholder}
        {label}
        {disabled}
        {readonly}
        {invalid}
        onValueChange={onValueChange as ((value: string) => void) | undefined}
        onCommit={onCommit as ((value: string) => void) | undefined}
        {...inputAttrs}
    />
{:else}
    <ColorInput
        bind:ref
        bind:inputRef
        {variant}
        {size}
        {format}
        {alpha}
        {showSwatch}
        {showPrefix}
        {placeholder}
        {label}
        {disabled}
        {readonly}
        {invalid}
        onValueChange={onValueChange as ((value: string) => void) | undefined}
        onCommit={onCommit as ((value: string) => void) | undefined}
        {...inputAttrs}
    />
{/if}
