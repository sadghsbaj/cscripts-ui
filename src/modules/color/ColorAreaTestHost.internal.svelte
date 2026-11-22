<script lang="ts">
    import { untrack } from "svelte";

    import {
        ColorArea,
        createColorState,
        setColorPickerContext,
        type ColorAreaSize,
        type ColorChannel,
    } from "./index.ts";

    interface Props {
        withPicker?: boolean;
        pickerValue?: string;
        pickerSpace?: "hsv" | "hsl" | "oklch";
        pickerDisabled?: boolean;
        pickerReadonly?: boolean;
        pickerInvalid?: boolean;
        onPickerSetChannel?: (channel: ColorChannel, next: number, options?: { commit?: boolean }) => void;
        onPickerSetChannels?: (
            partial: Partial<Record<ColorChannel, number>>,
            options?: { commit?: boolean }
        ) => void;
        bindMode?: "none" | "bind" | "strict";
        xValue?: number;
        yValue?: number;
        strictXValue?: number;
        strictYValue?: number;
        ref?: HTMLDivElement | null;
        size?: ColorAreaSize;
        xChannel?: ColorChannel;
        yChannel?: ColorChannel;
        onValueChange?: (x: number, y: number) => void;
        onCommit?: (x: number, y: number) => void;
        color?: string;
        label?: string;
        disabled?: boolean;
        readonly?: boolean;
        invalid?: boolean;
        areaAttrs?: Record<string, unknown>;
    }

    let {
        withPicker = false,
        pickerValue = $bindable("#3b82f6"),
        pickerSpace = "hsv",
        pickerDisabled = false,
        pickerReadonly = false,
        pickerInvalid = false,
        onPickerSetChannel,
        onPickerSetChannels,
        bindMode = "none",
        xValue = $bindable<number | undefined>(),
        yValue = $bindable<number | undefined>(),
        strictXValue = 0,
        strictYValue = 0,
        ref = $bindable<HTMLDivElement | null>(null),
        size = "md",
        xChannel,
        yChannel,
        onValueChange,
        onCommit,
        color,
        label,
        disabled = false,
        readonly = false,
        invalid = false,
        areaAttrs = {},
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
            get space() {
                return pickerSpace;
            },
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
            setChannels: (partial, options) => {
                onPickerSetChannels?.(partial, options);
                pickerState.setChannels(partial, options);
            },
            setString: (raw, options) => pickerState.setString(raw, options),
            commit: () => pickerState.commit(),
        });
    }
</script>

{#if bindMode === "bind"}
    <ColorArea
        bind:ref
        bind:xValue
        bind:yValue
        {size}
        {xChannel}
        {yChannel}
        {onValueChange}
        {onCommit}
        {color}
        {label}
        {disabled}
        {readonly}
        {invalid}
        {...areaAttrs}
    />
{:else if bindMode === "strict"}
    <ColorArea
        bind:ref
        bind:xValue={() => strictXValue, () => {}}
        bind:yValue={() => strictYValue, () => {}}
        {size}
        {xChannel}
        {yChannel}
        {onValueChange}
        {onCommit}
        {color}
        {label}
        {disabled}
        {readonly}
        {invalid}
        {...areaAttrs}
    />
{:else}
    <ColorArea
        bind:ref
        {size}
        {xChannel}
        {yChannel}
        {onValueChange}
        {onCommit}
        {color}
        {label}
        {disabled}
        {readonly}
        {invalid}
        {...areaAttrs}
    />
{/if}
