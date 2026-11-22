<script lang="ts">
    import { untrack } from "svelte";

    import {
        ColorSlider,
        createColorState,
        setColorPickerContext,
        type ColorChannel,
        type ColorSliderOrientation,
        type ColorSliderSize,
    } from "./index.ts";

    interface Props {
        withPicker?: boolean;
        pickerValue?: string;
        pickerDisabled?: boolean;
        pickerReadonly?: boolean;
        pickerInvalid?: boolean;
        onPickerSetChannel?: (channel: ColorChannel, next: number, options?: { commit?: boolean }) => void;
        bindMode?: "none" | "bind" | "strict";
        value?: number;
        strictValue?: number;
        ref?: HTMLDivElement | null;
        size?: ColorSliderSize;
        channel?: ColorChannel;
        orientation?: ColorSliderOrientation;
        onValueChange?: (value: number) => void;
        onCommit?: (value: number) => void;
        color?: string;
        label?: string;
        disabled?: boolean;
        readonly?: boolean;
        invalid?: boolean;
        inverted?: boolean;
        sliderAttrs?: Record<string, unknown>;
    }

    let {
        withPicker = false,
        pickerValue = $bindable("#3b82f6"),
        pickerDisabled = false,
        pickerReadonly = false,
        pickerInvalid = false,
        onPickerSetChannel,
        bindMode = "none",
        value = $bindable<number | undefined>(),
        strictValue = 0,
        ref = $bindable<HTMLDivElement | null>(null),
        size = "md",
        channel = "hue",
        orientation = "horizontal",
        onValueChange,
        onCommit,
        color,
        label,
        disabled = false,
        readonly = false,
        invalid = false,
        inverted = false,
        sliderAttrs = {},
    }: Props = $props();

    if (untrack(() => withPicker)) {
        const pickerState = createColorState({
            value: () => pickerValue,
            setValue: (next) => {
                pickerValue = next;
            },
        });
        setColorPickerContext({
            state: pickerState,
            get value() {
                return pickerValue;
            },
            format: "hex",
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
            setString: (raw, options) => pickerState.setString(raw, options),
            commit: () => pickerState.commit(),
        });
    }
</script>

{#if bindMode === "bind"}
    <ColorSlider
        bind:ref
        bind:value
        {size}
        {channel}
        {orientation}
        {onValueChange}
        {onCommit}
        {color}
        {label}
        {disabled}
        {readonly}
        {invalid}
        {inverted}
        {...sliderAttrs}
    />
{:else if bindMode === "strict"}
    <ColorSlider
        bind:ref
        bind:value={() => strictValue, () => {}}
        {size}
        {channel}
        {orientation}
        {onValueChange}
        {onCommit}
        {color}
        {label}
        {disabled}
        {readonly}
        {invalid}
        {inverted}
        {...sliderAttrs}
    />
{:else}
    <ColorSlider
        bind:ref
        {size}
        {channel}
        {orientation}
        {onValueChange}
        {onCommit}
        {color}
        {label}
        {disabled}
        {readonly}
        {invalid}
        {inverted}
        {...sliderAttrs}
    />
{/if}
