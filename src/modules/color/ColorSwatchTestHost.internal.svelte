<script lang="ts">
    import { untrack } from "svelte";

    import {
        ColorSwatch,
        createColorState,
        setColorPickerContext,
        setColorSwatchGroupContext,
        type ColorSwatchProps,
        type ColorSwatchSize,
    } from "./index.ts";

    export interface ColorSwatchHostItem {
        id: string;
        size?: ColorSwatchSize;
        color?: string;
        label?: string;
        mode?: ColorSwatchProps["mode"];
        selected?: boolean;
        showCheck?: boolean;
        decorative?: boolean;
        disabled?: boolean;
        onclick?: ColorSwatchProps["onclick"];
        attrs?: Record<string, unknown>;
    }

    interface Props {
        withPicker?: boolean;
        pickerValue?: string;
        pickerDisabled?: boolean;
        withGroup?: boolean;
        groupDisabled?: boolean;
        groupSelectedColor?: string;
        onGroupSelect?: (color: string) => void;
        swatches?: ColorSwatchHostItem[];
        ref?: HTMLElement | null;
        size?: ColorSwatchSize;
        color?: string;
        label?: string;
        mode?: ColorSwatchProps["mode"];
        selected?: boolean;
        showCheck?: boolean;
        decorative?: boolean;
        disabled?: boolean;
        onclick?: ColorSwatchProps["onclick"];
        customChildText?: string;
        swatchAttrs?: Record<string, unknown>;
    }

    let {
        withPicker = false,
        pickerValue = "#3b82f6",
        pickerDisabled = false,
        withGroup = false,
        groupDisabled = false,
        groupSelectedColor = $bindable<string | undefined>(),
        onGroupSelect,
        swatches,
        ref = $bindable<HTMLElement | null>(null),
        size = "md",
        color,
        label,
        mode = "auto",
        selected,
        showCheck = true,
        decorative = false,
        disabled = false,
        onclick,
        customChildText,
        swatchAttrs = {},
    }: Props = $props();

    if (untrack(() => withPicker)) {
        const pickerState = createColorState({ value: () => pickerValue });
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
            readonly: false,
            invalid: false,
            getChannel: (channel) => pickerState.getChannel(channel),
            setChannel: (channel, next, options) => pickerState.setChannel(channel, next, options),
            setChannels: (partial, options) => pickerState.setChannels(partial, options),
            setString: (raw, options) => pickerState.setString(raw, options),
            commit: () => pickerState.commit(),
        });
    }

    if (untrack(() => withGroup)) {
        setColorSwatchGroupContext({
            orientation: "horizontal",
            get disabled() {
                return groupDisabled;
            },
            isSelected: (swatchColor) => swatchColor.toLowerCase() === groupSelectedColor?.toLowerCase(),
            select: (swatchColor) => {
                onGroupSelect?.(swatchColor);
                groupSelectedColor = swatchColor;
            },
        });
    }
</script>

{#if swatches}
    {#each swatches as item (item.id)}
        <ColorSwatch
            size={item.size ?? size}
            color={item.color}
            label={item.label}
            mode={item.mode ?? mode}
            selected={item.selected}
            showCheck={item.showCheck ?? showCheck}
            decorative={item.decorative ?? decorative}
            disabled={item.disabled ?? disabled}
            onclick={item.onclick}
            data-swatch-id={item.id}
            {...item.attrs}
        />
    {/each}
{:else if customChildText !== undefined}
    <ColorSwatch
        bind:ref
        {size}
        {color}
        {label}
        {mode}
        {selected}
        {showCheck}
        {decorative}
        {disabled}
        {onclick}
        {...swatchAttrs}
    >
        <span class="custom-swatch-child">{customChildText}</span>
    </ColorSwatch>
{:else}
    <ColorSwatch
        bind:ref
        {size}
        {color}
        {label}
        {mode}
        {selected}
        {showCheck}
        {decorative}
        {disabled}
        {onclick}
        {...swatchAttrs}
    />
{/if}
