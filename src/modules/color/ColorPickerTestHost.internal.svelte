<script lang="ts">
    import {
        ColorArea,
        ColorEyeDropper,
        ColorFormatSelect,
        ColorInput,
        ColorPicker,
        ColorSlider,
        ColorSwatch,
        ColorSwatchGroup,
        type ColorAlphaFormat,
        type ColorFormat,
        type ColorGamut,
        type ColorPickerContext,
        type ColorPickerSpace,
    } from "./index.ts";

    interface Props {
        bindMode?: "none" | "bind" | "strict";
        value?: string | undefined;
        strictValue?: string;
        defaultValue?: string;
        format?: ColorFormat | undefined;
        strictFormat?: ColorFormat;
        defaultFormat?: ColorFormat;
        space?: ColorPickerSpace;
        alphaFormat?: ColorAlphaFormat;
        gamut?: ColorGamut;
        onValueChange?: (value: string) => void;
        onCommit?: (value: string) => void;
        onFormatChange?: (format: ColorFormat) => void;
        disabled?: boolean;
        readonly?: boolean;
        invalid?: boolean;
        label?: string;
        className?: string;
        ariaLabel?: string;
        ariaLabelledBy?: string;
        externalLabelText?: string;
        ref?: HTMLDivElement | null;
        withChildren?: boolean;
        pickerAttrs?: Record<string, unknown>;
    }

    let {
        bindMode = "none",
        value = $bindable<string | undefined>(),
        strictValue = "#3b82f6",
        defaultValue,
        format = $bindable<ColorFormat | undefined>(),
        strictFormat = "hex",
        defaultFormat,
        space = "hsv",
        alphaFormat = "auto",
        gamut,
        onValueChange,
        onCommit,
        onFormatChange,
        disabled = false,
        readonly = false,
        invalid = false,
        label,
        className,
        ariaLabel,
        ariaLabelledBy,
        externalLabelText,
        ref = $bindable<HTMLDivElement | null>(null),
        withChildren = true,
        pickerAttrs = {},
    }: Props = $props();
</script>

{#if ariaLabelledBy && externalLabelText}
    <span id={ariaLabelledBy}>{externalLabelText}</span>
{/if}

{#snippet pickerContent(ctx: ColorPickerContext)}
    {#if withChildren}
        <div
            data-testid="ctx-probe"
            data-value={ctx.value}
            data-format={ctx.format}
            data-space={ctx.space}
            data-in-gamut={ctx.state.inGamut ? "true" : "false"}
            data-disabled={ctx.disabled ? "true" : "false"}
            data-readonly={ctx.readonly ? "true" : "false"}
            data-invalid={ctx.invalid ? "true" : "false"}
            data-has-set-format={typeof ctx.setFormat === "function" ? "true" : "false"}
        ></div>

        <ColorArea size="md" />
        <ColorSlider channel="hue" size="md" />
        <ColorSlider channel="alpha" size="md" />
        <ColorInput variant="soft" size="md" aria-label="Color value" />
        <ColorInput channel="alpha" variant="soft" size="md" aria-label="Alpha value" />
        <ColorFormatSelect variant="soft" size="md" aria-label="Color format" />
        <ColorSwatch size="md" label="Active color" />
        <ColorSwatchGroup aria-label="Preset colors">
            <ColorSwatch size="md" color="#ef4444" label="Red" />
            <ColorSwatch size="md" color="#22c55e" label="Green" />
            <ColorSwatch size="md" color="#3b82f6" label="Blue" />
        </ColorSwatchGroup>
        <ColorEyeDropper variant="secondary" size="md" />
    {/if}
{/snippet}

{#if bindMode === "bind"}
    <ColorPicker
        bind:ref
        bind:value
        bind:format
        {defaultValue}
        {defaultFormat}
        {space}
        {alphaFormat}
        {gamut}
        {onValueChange}
        {onCommit}
        {onFormatChange}
        {disabled}
        {readonly}
        {invalid}
        {label}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...pickerAttrs}
    >
        {#snippet children(ctx)}
            {@render pickerContent(ctx)}
        {/snippet}
    </ColorPicker>
{:else if bindMode === "strict"}
    <ColorPicker
        bind:ref
        bind:value={() => strictValue, () => {}}
        bind:format={() => strictFormat, () => {}}
        {defaultValue}
        {defaultFormat}
        {space}
        {alphaFormat}
        {gamut}
        {onValueChange}
        {onCommit}
        {onFormatChange}
        {disabled}
        {readonly}
        {invalid}
        {label}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...pickerAttrs}
    >
        {#snippet children(ctx)}
            {@render pickerContent(ctx)}
        {/snippet}
    </ColorPicker>
{:else}
    <ColorPicker
        bind:ref
        {defaultValue}
        {defaultFormat}
        {space}
        {alphaFormat}
        {gamut}
        {onValueChange}
        {onCommit}
        {onFormatChange}
        {disabled}
        {readonly}
        {invalid}
        {label}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        {...pickerAttrs}
    >
        {#snippet children(ctx)}
            {@render pickerContent(ctx)}
        {/snippet}
    </ColorPicker>
{/if}
