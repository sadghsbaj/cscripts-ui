<script lang="ts">
    import { untrack } from "svelte";

    import {
        ColorSwatch,
        ColorSwatchGroup,
        createColorState,
        setColorPickerContext,
        type ColorSwatchGroupOrientation,
        type ColorSwatchGroupProps,
        type ColorSwatchSize,
    } from "./index.ts";

    export interface GroupSwatchItem {
        id: string;
        color: string;
        label?: string;
        disabled?: boolean;
        size?: ColorSwatchSize;
    }

    interface Props {
        withPicker?: boolean;
        pickerValue?: string;
        pickerDisabled?: boolean;
        pickerReadonly?: boolean;
        onPickerSetString?: (raw: string, options?: { commit?: boolean }) => void;
        ref?: HTMLDivElement | null;
        useBindValue?: boolean;
        value?: string;
        onValueChange?: (value: string) => void;
        orientation?: ColorSwatchGroupOrientation;
        columns?: number;
        disabled?: boolean;
        dir?: "ltr" | "rtl";
        onkeydown?: ColorSwatchGroupProps["onkeydown"];
        onfocusin?: ColorSwatchGroupProps["onfocusin"];
        onfocusout?: ColorSwatchGroupProps["onfocusout"];
        groupAttrs?: Record<string, unknown>;
        swatches: GroupSwatchItem[];
    }

    let {
        withPicker = false,
        pickerValue = $bindable("#3b82f6"),
        pickerDisabled = false,
        pickerReadonly = false,
        onPickerSetString,
        ref = $bindable<HTMLDivElement | null>(null),
        useBindValue = true,
        value = $bindable<string | undefined>(),
        onValueChange,
        orientation = "both",
        columns,
        disabled = false,
        dir,
        onkeydown,
        onfocusin,
        onfocusout,
        groupAttrs = {},
        swatches,
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
            get readonly() {
                return pickerReadonly;
            },
            invalid: false,
            getChannel: (channel) => pickerState.getChannel(channel),
            setChannel: (channel, next, options) => pickerState.setChannel(channel, next, options),
            setChannels: (partial, options) => pickerState.setChannels(partial, options),
            setString: (raw, options) => {
                onPickerSetString?.(raw, options);
                const updated = pickerState.setString(raw, options);
                if (updated) {
                    pickerValue = raw;
                }
                return updated;
            },
            commit: () => pickerState.commit(),
        });
    }
</script>

{#snippet swatchItems()}
    {#each swatches as item (item.id)}
        <ColorSwatch
            size={item.size ?? "md"}
            color={item.color}
            label={item.label}
            disabled={item.disabled}
            data-swatch-id={item.id}
        />
    {/each}
{/snippet}

{#if useBindValue}
    <ColorSwatchGroup
        bind:ref
        bind:value
        {onValueChange}
        {orientation}
        {columns}
        {disabled}
        {dir}
        {onkeydown}
        {onfocusin}
        {onfocusout}
        {...groupAttrs}
    >
        {@render swatchItems()}
    </ColorSwatchGroup>
{:else}
    <ColorSwatchGroup
        bind:ref
        {onValueChange}
        {orientation}
        {columns}
        {disabled}
        {dir}
        {onkeydown}
        {onfocusin}
        {onfocusout}
        {...groupAttrs}
    >
        {@render swatchItems()}
    </ColorSwatchGroup>
{/if}

<button type="button" data-testid="outside-focus">Outside</button>
