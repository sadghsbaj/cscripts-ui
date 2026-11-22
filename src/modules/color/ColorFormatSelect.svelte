<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import {
        Select,
        SelectContent,
        SelectItem,
        SelectItemText,
        SelectTrigger,
        SelectValue,
    } from "../select/index.ts";
    import { getColorPickerContext, hasColorPickerContext } from "./color.context.ts";
    import type { ColorFormat } from "./color.utils.ts";
    import { COLOR_FORMAT_SELECT_DEFAULTS, type ColorFormatSelectProps } from "./index.ts";

    const FORMAT_LABELS: Record<ColorFormat, string> = {
        hex: "Hex",
        hex8: "Hex8",
        rgb: "RGB",
        hsl: "HSL",
        oklch: "OKLCH",
        p3: "P3",
        auto: t({ de: "Auto", en: "Auto" }),
    };

    let {
        ref = $bindable<HTMLButtonElement | null>(null),
        variant,
        size,
        value = $bindable<ColorFormat | undefined>(),
        open = $bindable(false),
        formats = COLOR_FORMAT_SELECT_DEFAULTS,
        onValueChange,
        onOpenChange,
        disabled = false,
        invalid = false,
        required = false,
        name,
        id,
        label,
        class: className,
        "aria-label": ariaLabelProp,
        "aria-labelledby": ariaLabelledByProp,
        ...rest
    }: ColorFormatSelectProps = $props();

    const pickerCtx = hasColorPickerContext() ? getColorPickerContext() : undefined;

    let internalValue = $state<ColorFormat | undefined>();

    const uniqueFormats = $derived.by((): readonly ColorFormat[] => {
        const list: ColorFormat[] = [];
        for (const item of formats) {
            if (list.includes(item)) continue;
            list.push(item);
        }
        return list.length > 0 ? list : COLOR_FORMAT_SELECT_DEFAULTS;
    });

    const resolvedValue = $derived.by((): ColorFormat => {
        if (value !== undefined) {
            return value;
        }
        if (pickerCtx) {
            const ctxFormat = pickerCtx.format;
            if (ctxFormat === "auto" && !uniqueFormats.includes("auto")) {
                return uniqueFormats.includes("hex") ? "hex" : (uniqueFormats[0] ?? "hex");
            }
            return ctxFormat;
        }
        if (internalValue !== undefined && uniqueFormats.includes(internalValue)) {
            return internalValue;
        }
        return uniqueFormats[0] ?? "hex";
    });

    const resolvedDisabled = $derived(Boolean(disabled || pickerCtx?.disabled));
    const resolvedInvalid = $derived(Boolean(invalid || pickerCtx?.invalid));
    const resolvedAriaLabel = $derived(
        label ?? ariaLabelProp ?? (ariaLabelledByProp ? undefined : t({ de: "Farbformat", en: "Color format" }))
    );

    function handleValueChange(next: ColorFormat): void {
        pickerCtx?.setFormat?.(next);
        if (value !== undefined || !pickerCtx) {
            value = next;
        }
        internalValue = next;
        onValueChange?.(next);
    }
</script>

<Select
    bind:value={() => resolvedValue, () => {}}
    onValueChange={handleValueChange}
    bind:open
    {onOpenChange}
    {variant}
    {size}
    disabled={resolvedDisabled}
    invalid={resolvedInvalid}
    {required}
    {name}
    id={id ?? undefined}
>
    <SelectTrigger
        bind:ref
        class={["cs-color-format-select-trigger", className]}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        {...rest}
    >
        <SelectValue />
    </SelectTrigger>
    <SelectContent width="min-anchor">
        {#each uniqueFormats as format (format)}
            <SelectItem value={format} label={FORMAT_LABELS[format]}>
                <SelectItemText>{FORMAT_LABELS[format]}</SelectItemText>
            </SelectItem>
        {/each}
    </SelectContent>
</Select>

<style>
    @layer components.primitive {
        :global(.cs-color-format-select-trigger) {
            --cs-color-format-select-width: fit-content;
            width: var(--cs-color-format-select-width);
            min-width: var(--cs-color-format-select-min-width);
        }

        :global(.cs-color-format-select-trigger[data-size="xs"]) {
            --cs-color-format-select-min-width: 72px;
        }

        :global(.cs-color-format-select-trigger[data-size="sm"]) {
            --cs-color-format-select-min-width: 76px;
        }

        :global(.cs-color-format-select-trigger[data-size="md"]) {
            --cs-color-format-select-min-width: 84px;
        }

        :global(.cs-color-format-select-trigger[data-size="lg"]) {
            --cs-color-format-select-min-width: 92px;
        }

        :global(.cs-color-format-select-trigger[data-size="xl"]) {
            --cs-color-format-select-min-width: 100px;
        }
    }
</style>
