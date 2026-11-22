<script lang="ts">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { type ColorPickerContext, setColorPickerContext } from "./color.context.ts";
    import type { ColorFormat } from "./color.utils.ts";
    import { createColorState } from "./color-state.svelte.ts";
    import type { ColorPickerProps } from "./index.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        value = $bindable<string | undefined>(),
        defaultValue = "#3b82f6",
        format = $bindable<ColorFormat | undefined>(),
        defaultFormat = "auto",
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
        class: className,
        "aria-label": ariaLabelProp,
        "aria-labelledby": ariaLabelledByProp,
        children,
        ...rest
    }: ColorPickerProps = $props();

    let internalFormat = $state<ColorFormat | undefined>();
    const resolvedFormat = $derived(format ?? internalFormat ?? defaultFormat);

    const colorState = createColorState({
        value: () => value,
        setValue: (next) => {
            if (value !== undefined) {
                value = next;
            }
        },
        defaultValue: untrack(() => defaultValue),
        format: () => resolvedFormat,
        alphaFormat: () => alphaFormat,
        gamut: () => gamut,
        onValueChange: (next) => onValueChange?.(next),
        onCommit: (next) => onCommit?.(next),
    });

    function setFormat(next: ColorFormat): void {
        if (disabled) return;
        if (format !== undefined) {
            format = next;
        } else {
            internalFormat = next;
        }
        onFormatChange?.(next);
    }

    const pickerCtx: ColorPickerContext = {
        get state() {
            return colorState;
        },
        get value() {
            return colorState.value;
        },
        get format() {
            return resolvedFormat;
        },
        setFormat,
        get space() {
            return space;
        },
        get disabled() {
            return disabled;
        },
        get readonly() {
            return readonly;
        },
        get invalid() {
            return invalid;
        },
        getChannel: (channel) => colorState.getChannel(channel),
        setChannel: (channel, next, options) => {
            if (disabled || readonly) return;
            colorState.setChannel(channel, next, options);
        },
        setChannels: (partial, options) => {
            if (disabled || readonly) return;
            colorState.setChannels(partial, options);
        },
        setString: (raw, options) => {
            if (disabled || readonly) return false;
            return colorState.setString(raw, options);
        },
        commit: () => {
            if (disabled || readonly) return;
            colorState.commit();
        },
    };

    setColorPickerContext(pickerCtx);

    const resolvedAriaLabel = $derived(
        label ??
            ariaLabelProp ??
            (ariaLabelledByProp !== undefined ? undefined : t({ de: "Farbwähler", en: "Color picker" }))
    );
</script>

<div
    bind:this={ref}
    {...rest}
    role="group"
    aria-label={resolvedAriaLabel}
    aria-labelledby={ariaLabelledByProp}
    aria-disabled={disabled ? "true" : undefined}
    data-space={space}
    data-format={resolvedFormat}
    data-disabled={disabled ? "" : undefined}
    data-readonly={readonly ? "" : undefined}
    data-invalid={invalid ? "" : undefined}
    class={["cs-color-picker", className]}
>
    {@render children?.(pickerCtx)}
</div>

<style>
    @layer components.primitive {
        .cs-color-picker {
            display: flex;
            flex-direction: column;
            gap: var(--cs-color-picker-gap, 12px);
            inline-size: var(--cs-color-picker-width, 100%);
        }
    }
</style>
