<script lang="ts">
    import { untrack } from "svelte";

    import {
        ColorEyeDropper,
        createColorState,
        setColorPickerContext,
        type ColorEyeDropperSize,
        type ColorEyeDropperUnsupportedBehavior,
        type ColorEyeDropperVariant,
    } from "./index.ts";

    interface Props {
        withPicker?: boolean;
        pickerDisabled?: boolean;
        pickerReadonly?: boolean;
        onPickerSetString?: (raw: string, options?: { commit?: boolean }) => void;
        bindMode?: "none" | "bind" | "strict";
        value?: string | undefined;
        strictValue?: string | undefined;
        ref?: HTMLButtonElement | null;
        variant?: ColorEyeDropperVariant;
        size?: ColorEyeDropperSize;
        unsupportedBehavior?: ColorEyeDropperUnsupportedBehavior;
        disabled?: boolean;
        label?: string;
        title?: string;
        className?: string;
        ariaLabel?: string;
        ariaLabelledBy?: string;
        externalLabelText?: string;
        customChildrenText?: string;
        onPick?: (color: string) => void;
        onError?: (error: unknown) => void;
        onclick?: (event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) => void;
        buttonAttrs?: Record<string, unknown>;
    }

    let {
        withPicker = false,
        pickerDisabled = false,
        pickerReadonly = false,
        onPickerSetString,
        bindMode = "none",
        value = $bindable<string | undefined>(),
        strictValue = "#112233",
        ref = $bindable<HTMLButtonElement | null>(null),
        variant = "ghost",
        size = "md",
        unsupportedBehavior,
        disabled = false,
        label,
        title,
        className,
        ariaLabel,
        ariaLabelledBy,
        externalLabelText,
        customChildrenText,
        onPick,
        onError,
        onclick,
        buttonAttrs = {},
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
                return "hex" as const;
            },
            space: "hsv",
            get disabled() {
                return pickerDisabled;
            },
            get readonly() {
                return pickerReadonly;
            },
            get invalid() {
                return false;
            },
            getChannel: (ch) => pickerState.getChannel(ch),
            setChannel: (ch, next, options) => pickerState.setChannel(ch, next, options),
            setChannels: (partial, options) => pickerState.setChannels(partial, options),
            setString: (raw, options) => {
                onPickerSetString?.(raw, options);
                return pickerState.setString(raw, options);
            },
            commit: () => pickerState.commit(),
        });
    }
</script>

{#snippet customChildrenSnippet()}
    <span class="custom-dropper-content">{customChildrenText}</span>
{/snippet}

{#if ariaLabelledBy && externalLabelText}
    <span id={ariaLabelledBy}>{externalLabelText}</span>
{/if}

{#if bindMode === "bind"}
    <ColorEyeDropper
        bind:ref
        bind:value
        {variant}
        {size}
        {unsupportedBehavior}
        {disabled}
        {label}
        {title}
        {onPick}
        {onError}
        {onclick}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        children={customChildrenText === undefined ? undefined : customChildrenSnippet}
        {...buttonAttrs}
    />
{:else if bindMode === "strict"}
    <ColorEyeDropper
        bind:ref
        bind:value={() => strictValue, () => {}}
        {variant}
        {size}
        {unsupportedBehavior}
        {disabled}
        {label}
        {title}
        {onPick}
        {onError}
        {onclick}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        children={customChildrenText === undefined ? undefined : customChildrenSnippet}
        {...buttonAttrs}
    />
{:else}
    <ColorEyeDropper
        bind:ref
        {variant}
        {size}
        {unsupportedBehavior}
        {disabled}
        {label}
        {title}
        {onPick}
        {onError}
        {onclick}
        class={className}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        children={customChildrenText === undefined ? undefined : customChildrenSnippet}
        {...buttonAttrs}
    />
{/if}
