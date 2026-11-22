<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { TextInput, TextInputField } from "../text-input/index.ts";
    import {
        buildSnapshotFromColor,
        clampChannel,
        extractChannelFromSnapshot,
        getChannelMeta,
        stepChannelValue,
    } from "./color-channel.internal.ts";
    import {
        formatChannelDisplay,
        formatFullColorValue,
        isHexColorFormat,
        parseChannelInput,
        parseFullColorInput,
        resolveColorInputFormat,
        stripHexPrefix,
    } from "./color-input.internal.ts";
    import { getColorPickerContext, hasColorPickerContext } from "./color.context.ts";
    import { parseColor } from "./color.utils.ts";
    import ColorSwatch from "./ColorSwatch.svelte";
    import type { ColorInputChannelProps, ColorInputFullProps, ColorInputProps } from "./index.ts";

    let {
        ref = $bindable(null),
        inputRef = $bindable(null),
        variant,
        size,
        channel,
        value = $bindable(),
        onValueChange,
        onCommit,
        placeholder,
        label,
        disabled = false,
        readonly = false,
        invalid = false,
        class: className,
        "aria-label": ariaLabelProp,
        "aria-labelledby": ariaLabelledByProp,
        ...rest
    }: ColorInputProps = $props();

    const pickerCtx = hasColorPickerContext() ? getColorPickerContext() : undefined;

    const format = $derived(("format" in rest ? rest.format : undefined) ?? "auto");
    const alpha = $derived(("alpha" in rest ? rest.alpha : undefined) ?? "auto");
    const showSwatch = $derived(("showSwatch" in rest ? rest.showSwatch : undefined) ?? false);
    const showPrefix = $derived(("showPrefix" in rest ? rest.showPrefix : undefined) ?? true);
    const color = $derived("color" in rest ? rest.color : undefined);
    const showUnit = $derived(("showUnit" in rest ? rest.showUnit : undefined) ?? true);

    const divRest = $derived.by(() => {
        const next = { ...rest } as Record<string, unknown>;
        delete next.format;
        delete next.alpha;
        delete next.showSwatch;
        delete next.showPrefix;
        delete next.color;
        delete next.showUnit;
        return next;
    });

    const isChannelMode = $derived(channel !== undefined);
    const resolvedDisabled = $derived(Boolean(disabled || pickerCtx?.disabled));
    const resolvedReadonly = $derived(Boolean(readonly || pickerCtx?.readonly));
    const resolvedInvalid = $derived(Boolean(invalid || pickerCtx?.invalid));

    let internalString = $state("#000000");
    let internalChannel = $state<number | undefined>();
    let isFocused = $state(false);
    let draftValue = $state("");
    let preFocusValue = $state("");
    let preFocusRawString = $state("#000000");
    let preFocusRawNumber = $state(0);

    // Full-color derived state
    const resolvedStringSource = $derived.by(() => {
        if (typeof value === "string") return value;
        if (pickerCtx) return pickerCtx.value;
        return internalString;
    });

    const parsedFullSource = $derived(parseColor(resolvedStringSource));
    const targetFormat = $derived(
        resolveColorInputFormat(format, pickerCtx?.format, parsedFullSource?.sourceFormat)
    );
    const showHexPrefix = $derived(!isChannelMode && showPrefix && isHexColorFormat(targetFormat));

    const formattedFullColor = $derived.by(() => {
        if (parsedFullSource) {
            return formatFullColorValue(parsedFullSource, targetFormat, alpha);
        }
        return resolvedStringSource;
    });

    const resolvedSwatchColor = $derived(formattedFullColor || resolvedStringSource);

    // Single-channel derived state
    const channelMeta = $derived(channel !== undefined ? getChannelMeta(channel) : undefined);
    const standaloneBaseSnapshot = $derived(typeof color === "string" ? buildSnapshotFromColor(color) : undefined);

    const resolvedChannelValue = $derived.by(() => {
        if (channel === undefined || !channelMeta) return 0;
        if (typeof value === "number") {
            return clampChannel(channel, value);
        }
        if (pickerCtx) {
            return clampChannel(channel, pickerCtx.getChannel(channel));
        }
        if (internalChannel !== undefined) {
            return clampChannel(channel, internalChannel);
        }
        if (standaloneBaseSnapshot) {
            return clampChannel(channel, extractChannelFromSnapshot(channel, standaloneBaseSnapshot));
        }
        return channelMeta.defaultValue;
    });

    const resolvedDisplayValue = $derived.by(() => {
        if (channel !== undefined) {
            return formatChannelDisplay(channel, resolvedChannelValue, showUnit);
        }
        return stripHexPrefix(formattedFullColor, showHexPrefix);
    });

    const displayedValue = $derived(isFocused ? draftValue : resolvedDisplayValue);

    const resolvedAriaLabel = $derived.by(() => {
        if (label !== undefined) return label;
        if (ariaLabelProp !== undefined) return ariaLabelProp;
        if (ariaLabelledByProp !== undefined) return;
        if (channelMeta) return channelMeta.label;
        return t({ de: "Farbwert", en: "Color value" });
    });

    function emitStringUpdate(next: string, commit: boolean): void {
        if (pickerCtx && value === undefined) {
            pickerCtx.setString(next, { commit });
            return;
        }
        if (value !== undefined) {
            value = next;
        } else {
            internalString = next;
        }
        (onValueChange as ColorInputFullProps["onValueChange"])?.(next);
        if (commit) {
            (onCommit as ColorInputFullProps["onCommit"])?.(next);
        }
    }

    function emitChannelUpdate(next: number, commit: boolean): void {
        if (channel === undefined) return;
        const clamped = clampChannel(channel, next);
        if (pickerCtx && value === undefined) {
            pickerCtx.setChannel(channel, clamped, { commit });
            return;
        }
        if (value !== undefined) {
            value = clamped;
        } else {
            internalChannel = clamped;
        }
        (onValueChange as ColorInputChannelProps["onValueChange"])?.(clamped);
        if (commit) {
            (onCommit as ColorInputChannelProps["onCommit"])?.(clamped);
        }
    }

    function revertToPreFocus(restoreLiveState: boolean): void {
        draftValue = preFocusValue;
        if (!restoreLiveState) return;

        if (channel !== undefined) {
            if (pickerCtx && value === undefined) {
                pickerCtx.setChannel(channel, preFocusRawNumber, { commit: false });
            } else if (value !== undefined) {
                value = preFocusRawNumber;
            } else {
                internalChannel = preFocusRawNumber;
            }
            return;
        }

        if (pickerCtx && value === undefined) {
            pickerCtx.setString(preFocusRawString, { commit: false });
        } else if (value !== undefined) {
            value = preFocusRawString;
        } else {
            internalString = preFocusRawString;
        }
    }

    function commitDraft(): void {
        if (resolvedDisabled || resolvedReadonly) return;

        if (channel !== undefined) {
            const parsedNum = parseChannelInput(channel, draftValue);
            if (parsedNum === null) {
                revertToPreFocus(false);
                return;
            }
            emitChannelUpdate(parsedNum, true);
            const normalizedDisplay = formatChannelDisplay(channel, parsedNum, showUnit);
            draftValue = normalizedDisplay;
            preFocusValue = normalizedDisplay;
            preFocusRawNumber = parsedNum;
            return;
        }

        const parsed = parseFullColorInput(draftValue, showHexPrefix);
        if (!parsed) {
            revertToPreFocus(false);
            return;
        }

        const nextTargetFormat = resolveColorInputFormat(format, pickerCtx?.format, parsed.sourceFormat);
        const formatted = formatFullColorValue(parsed, nextTargetFormat, alpha);
        const nextPrefix = showPrefix && isHexColorFormat(nextTargetFormat);
        emitStringUpdate(formatted, true);

        const normalizedDisplay = stripHexPrefix(formatted, nextPrefix);
        draftValue = normalizedDisplay;
        preFocusValue = normalizedDisplay;
        preFocusRawString = formatted;
    }

    function handleFocus(): void {
        isFocused = true;
        preFocusValue = resolvedDisplayValue;
        preFocusRawString = formattedFullColor || resolvedStringSource;
        preFocusRawNumber = resolvedChannelValue;
        draftValue = resolvedDisplayValue;
    }

    function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        const nextDraft = event.currentTarget.value;
        draftValue = nextDraft;

        if (resolvedDisabled || resolvedReadonly) return;

        if (channel !== undefined) {
            const parsedNum = parseChannelInput(channel, nextDraft);
            if (parsedNum !== null) {
                emitChannelUpdate(parsedNum, false);
            }
            return;
        }

        const parsed = parseFullColorInput(nextDraft, showHexPrefix);
        if (!parsed) return;

        const nextTargetFormat = resolveColorInputFormat(format, pickerCtx?.format, parsed.sourceFormat);
        const formatted = formatFullColorValue(parsed, nextTargetFormat, alpha);
        emitStringUpdate(formatted, false);
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        if (event.key === "Enter") {
            commitDraft();
            return;
        }

        if (event.key === "Escape") {
            const isDirty = draftValue !== preFocusValue;
            if (isDirty) {
                event.preventDefault();
                event.stopPropagation();
                revertToPreFocus(true);
                inputRef?.blur();
            }
            return;
        }

        if (channel !== undefined && channelMeta && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            if (resolvedDisabled || resolvedReadonly) return;
            event.preventDefault();

            const delta = (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? channelMeta.largeStep : channelMeta.step);
            const baseValue = parseChannelInput(channel, draftValue) ?? resolvedChannelValue;
            const nextValue = stepChannelValue(channel, baseValue, delta);

            emitChannelUpdate(nextValue, true);
            const nextDisplay = formatChannelDisplay(channel, nextValue, showUnit);
            draftValue = nextDisplay;
            preFocusValue = nextDisplay;
            preFocusRawNumber = nextValue;
        }
    }

    function handleBlur(): void {
        if (!isFocused) return;
        commitDraft();
        isFocused = false;
    }
</script>

<TextInput
    bind:ref
    {variant}
    {size}
    disabled={resolvedDisabled}
    readonly={resolvedReadonly}
    invalid={resolvedInvalid}
    class={["cs-color-input", className]}
    data-mode={isChannelMode ? "channel" : "full"}
    data-channel={channel}
    {...divRest}
>
    {#if !isChannelMode && showSwatch}
        <ColorSwatch
            class="cs-color-input-swatch"
            {size}
            mode="preview"
            decorative
            color={resolvedSwatchColor}
        />
    {/if}
    {#if showHexPrefix}
        <span class="cs-color-input-prefix" aria-hidden="true">#</span>
    {/if}
    <TextInputField
        bind:ref={inputRef}
        class="cs-color-input-field"
        bind:value={() => displayedValue, () => {}}
        inputmode={isChannelMode ? "decimal" : "text"}
        spellcheck={false}
        autocomplete="off"
        autocapitalize="off"
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        {placeholder}
        onfocus={handleFocus}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        onblur={handleBlur}
    />
</TextInput>

<style>
    @layer components.primitive {
        :global(.cs-color-input) {
            --cs-color-input-prefix-fg: var(--cs-color-text-weak);
            width: var(--cs-color-input-width);
            font-variant-numeric: tabular-nums;
        }

        :global(.cs-color-input[data-mode="full"][data-size="xs"]) {
            --cs-color-input-width: 112px;
            --cs-color-input-swatch-size: 14px;
        }

        :global(.cs-color-input[data-mode="full"][data-size="sm"]) {
            --cs-color-input-width: 120px;
            --cs-color-input-swatch-size: 16px;
        }

        :global(.cs-color-input[data-mode="full"][data-size="md"]) {
            --cs-color-input-width: 128px;
            --cs-color-input-swatch-size: 18px;
        }

        :global(.cs-color-input[data-mode="full"][data-size="lg"]) {
            --cs-color-input-width: 136px;
            --cs-color-input-swatch-size: 20px;
        }

        :global(.cs-color-input[data-mode="full"][data-size="xl"]) {
            --cs-color-input-width: 144px;
            --cs-color-input-swatch-size: 22px;
        }

        :global(.cs-color-input[data-mode="channel"][data-size="xs"]) {
            --cs-color-input-width: 64px;
        }

        :global(.cs-color-input[data-mode="channel"][data-size="sm"]) {
            --cs-color-input-width: 68px;
        }

        :global(.cs-color-input[data-mode="channel"][data-size="md"]) {
            --cs-color-input-width: 72px;
        }

        :global(.cs-color-input[data-mode="channel"][data-size="lg"]) {
            --cs-color-input-width: 76px;
        }

        :global(.cs-color-input[data-mode="channel"][data-size="xl"]) {
            --cs-color-input-width: 80px;
        }

        :global(.cs-color-input[data-disabled]) {
            --cs-color-input-prefix-fg: var(--cs-color-disabled-fg);
        }

        :global(.cs-color-input[data-mode="full"]:has(> .cs-color-input-swatch)) {
            padding-inline-start: calc((var(--cs-text-input-height) - var(--cs-color-input-swatch-size)) / 2);
        }

        .cs-color-input-prefix {
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            height: 100%;
            line-height: normal;
            margin-inline-end: calc(-1 * var(--cs-text-input-gap) + 1px);
            color: var(--cs-color-input-prefix-fg);
            user-select: none;
            pointer-events: none;
            transition: color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        :global(.cs-color-input[data-size] > .cs-color-input-swatch) {
            --cs-color-swatch-size: var(--cs-color-input-swatch-size);
            --cs-color-swatch-checker-size: 6px;
        }
    }
</style>
