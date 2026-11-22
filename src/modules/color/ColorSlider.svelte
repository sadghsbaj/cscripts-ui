<script lang="ts">
    import {
        buildSliderGradient,
        buildSnapshotFromColor,
        clampChannel,
        extractChannelFromSnapshot,
        getChannelMeta,
        mergeChannelIntoSnapshot,
        resolveThumbColor,
        stepChannelValue,
        type SliderGradientDirection,
    } from "./color-channel.internal.ts";
    import { getColorPickerContext, hasColorPickerContext } from "./color.context.ts";
    import { clamp01 } from "./color-math.internal.ts";
    import type { ColorSliderProps } from "./index.ts";

    let {
        ref = $bindable(null),
        size,
        channel,
        orientation = "horizontal",
        value = $bindable(),
        onValueChange,
        onCommit,
        color,
        label,
        disabled = false,
        readonly = false,
        invalid = false,
        inverted = false,
        class: className,
        "aria-label": ariaLabelProp,
        "aria-labelledby": ariaLabelledByProp,
        ...rest
    }: ColorSliderProps = $props();

    const pickerCtx = hasColorPickerContext() ? getColorPickerContext() : undefined;

    let trackRef = $state<HTMLDivElement | null>(null);
    let thumbRef = $state<HTMLDivElement | null>(null);
    let internalValue = $state<number | undefined>();
    let isDragging = $state(false);
    let pointerFocus = $state(false);
    let activePointerId = $state<number | null>(null);
    let lastDraggedValue = $state(0);
    let isRtl = $state(false);

    const meta = $derived(getChannelMeta(channel));
    const resolvedDisabled = $derived(Boolean(disabled || pickerCtx?.disabled));
    const resolvedReadonly = $derived(Boolean(readonly || pickerCtx?.readonly));
    const resolvedInvalid = $derived(Boolean(invalid || pickerCtx?.invalid));

    const standaloneBaseSnapshot = $derived(buildSnapshotFromColor(color));

    const resolvedValue = $derived.by(() => {
        if (value !== undefined) {
            return clampChannel(channel, value);
        }
        if (pickerCtx) {
            return clampChannel(channel, pickerCtx.getChannel(channel));
        }
        if (internalValue !== undefined) {
            return clampChannel(channel, internalValue);
        }
        if (color !== undefined) {
            return clampChannel(channel, extractChannelFromSnapshot(channel, standaloneBaseSnapshot));
        }
        return meta.defaultValue;
    });

    const activeSnapshot = $derived.by(() => {
        if (pickerCtx && value === undefined) {
            return pickerCtx.state.channels;
        }
        return mergeChannelIntoSnapshot(standaloneBaseSnapshot, channel, resolvedValue);
    });

    const rawRatio = $derived(
        meta.max > meta.min ? clamp01((resolvedValue - meta.min) / (meta.max - meta.min)) : 0
    );
    const visualProgress = $derived(inverted ? 1 - rawRatio : rawRatio);

    const gradientDirection = $derived.by<SliderGradientDirection>(() => {
        if (orientation === "vertical") {
            return inverted ? "to bottom" : "to top";
        }
        return isRtl !== inverted ? "to left" : "to right";
    });

    const trackGradient = $derived(buildSliderGradient(channel, activeSnapshot, gradientDirection));
    const thumbFill = $derived(resolveThumbColor(channel, activeSnapshot));
    const formattedAriaValueText = $derived(meta.formatValueText(resolvedValue));

    const resolvedAriaLabel = $derived(
        label ?? ariaLabelProp ?? (ariaLabelledByProp !== undefined ? undefined : meta.label)
    );

    $effect(() => {
        if (!ref) return;
        isRtl = getComputedStyle(ref).direction === "rtl";
    });

    function updateValue(next: number, commit: boolean): void {
        if (resolvedDisabled || resolvedReadonly) return;
        const clamped = clampChannel(channel, next);

        if (pickerCtx && value === undefined) {
            pickerCtx.setChannel(channel, clamped, { commit });
            return;
        }

        if (value !== undefined) {
            value = clamped;
        } else {
            internalValue = clamped;
        }

        onValueChange?.(clamped);
        if (commit) {
            onCommit?.(clamped);
        }
    }

    function computeValueFromPointer(event: PointerEvent): number | null {
        if (!trackRef) return null;
        const rect = trackRef.getBoundingClientRect();
        if (ref) {
            isRtl = getComputedStyle(ref).direction === "rtl";
        }

        if (orientation === "horizontal") {
            if (rect.width <= 0) return null;
            let ratio = clamp01((event.clientX - rect.left) / rect.width);
            if (isRtl) ratio = 1 - ratio;
            if (inverted) ratio = 1 - ratio;
            return clampChannel(channel, meta.min + ratio * (meta.max - meta.min));
        }

        if (rect.height <= 0) return null;
        let ratio = clamp01(1 - (event.clientY - rect.top) / rect.height);
        if (inverted) ratio = 1 - ratio;
        return clampChannel(channel, meta.min + ratio * (meta.max - meta.min));
    }

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        if (resolvedDisabled || resolvedReadonly || event.button !== 0) return;
        event.preventDefault();

        isDragging = true;
        activePointerId = event.pointerId;
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Ignore in synthetic test environments where pointer capture is unavailable.
        }

        pointerFocus = true;
        thumbRef?.focus({ preventScroll: true });

        const next = computeValueFromPointer(event);
        if (next !== null) {
            lastDraggedValue = next;
            updateValue(next, false);
        } else {
            lastDraggedValue = resolvedValue;
        }
    }

    function handlePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        if (!isDragging || event.pointerId !== activePointerId) return;
        const next = computeValueFromPointer(event);
        if (next !== null) {
            lastDraggedValue = next;
            updateValue(next, false);
        }
    }

    function finishDrag(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        if (!isDragging || event.pointerId !== activePointerId) return;
        isDragging = false;
        activePointerId = null;

        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // Ignore if capture was already released.
            }
        }

        updateValue(lastDraggedValue, true);
    }

    function handleLostPointerCapture(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        if (!isDragging || event.pointerId !== activePointerId) return;
        isDragging = false;
        activePointerId = null;
        updateValue(lastDraggedValue, true);
    }

    function handleThumbKeyDown(event: KeyboardEvent): void {
        if (resolvedDisabled || resolvedReadonly) return;
        if (ref) {
            isRtl = getComputedStyle(ref).direction === "rtl";
        }

        const dirSign = inverted ? -1 : 1;
        const rtlSign = isRtl ? -1 : 1;
        let nextValue: number;

        switch (event.key) {
            case "ArrowRight": {
                nextValue = stepChannelValue(channel, resolvedValue, meta.step * rtlSign * dirSign);
                break;
            }
            case "ArrowLeft": {
                nextValue = stepChannelValue(channel, resolvedValue, -meta.step * rtlSign * dirSign);
                break;
            }
            case "ArrowUp": {
                nextValue = stepChannelValue(channel, resolvedValue, meta.step * dirSign);
                break;
            }
            case "ArrowDown": {
                nextValue = stepChannelValue(channel, resolvedValue, -meta.step * dirSign);
                break;
            }
            case "PageUp": {
                nextValue = stepChannelValue(channel, resolvedValue, meta.largeStep * dirSign);
                break;
            }
            case "PageDown": {
                nextValue = stepChannelValue(channel, resolvedValue, -meta.largeStep * dirSign);
                break;
            }
            case "Home": {
                nextValue = inverted ? meta.max : meta.min;
                break;
            }
            case "End": {
                nextValue = inverted ? meta.min : meta.max;
                break;
            }
            default: {
                return;
            }
        }

        event.preventDefault();
        updateValue(nextValue, true);
    }
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-color-slider", className]}
    data-size={size}
    data-orientation={orientation}
    data-channel={channel}
    data-alpha={channel === "alpha" ? "" : undefined}
    data-inverted={inverted ? "" : undefined}
    data-dragging={isDragging ? "" : undefined}
    data-disabled={resolvedDisabled ? "" : undefined}
    data-readonly={resolvedReadonly ? "" : undefined}
    data-invalid={resolvedInvalid ? "" : undefined}
    style:--cs-color-slider-gradient={trackGradient}
    style:--cs-color-slider-thumb-bg={thumbFill}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={finishDrag}
    onpointercancel={finishDrag}
    onlostpointercapture={handleLostPointerCapture}
>
    <div bind:this={trackRef} class="cs-color-slider-track" aria-hidden="true">
        <div class="cs-color-slider-gradient"></div>
    </div>
    <div
        bind:this={thumbRef}
        class="cs-color-slider-thumb"
        role="slider"
        tabindex={resolvedDisabled ? -1 : 0}
        data-pointer-focus={pointerFocus ? "" : undefined}
        aria-label={resolvedAriaLabel}
        aria-labelledby={resolvedAriaLabel ? undefined : ariaLabelledByProp}
        aria-orientation={orientation}
        aria-valuemin={meta.min}
        aria-valuemax={meta.max}
        aria-valuenow={resolvedValue}
        aria-valuetext={formattedAriaValueText}
        aria-disabled={resolvedDisabled ? "true" : undefined}
        aria-readonly={resolvedReadonly ? "true" : undefined}
        aria-invalid={resolvedInvalid ? "true" : undefined}
        style:--cs-color-slider-progress={visualProgress}
        onkeydown={handleThumbKeyDown}
        onblur={() => (pointerFocus = false)}
    >
        <span class="cs-color-slider-thumb-fill" aria-hidden="true"></span>
    </div>
</div>

<style>
    @layer components.primitive {
        .cs-color-slider {
            --cs-color-slider-radius: var(--cs-radius-full);
            --cs-color-slider-thumb-ring: white;
            --cs-color-slider-thumb-rim: rgb(0 0 0 / 0.14);
            --cs-color-slider-hit-pad: 6px;
            -webkit-tap-highlight-color: transparent;

            position: relative;
            display: flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            user-select: none;
            touch-action: none;
            cursor: default;

            &[data-size="xs"] {
                --cs-color-slider-track-size: 8px;
                --cs-color-slider-thumb-size: 12px;
                --cs-color-slider-checker-size: 6px;
            }

            &[data-size="sm"] {
                --cs-color-slider-track-size: 10px;
                --cs-color-slider-thumb-size: 14px;
                --cs-color-slider-checker-size: 6px;
            }

            &[data-size="md"] {
                --cs-color-slider-track-size: 12px;
                --cs-color-slider-thumb-size: 16px;
                --cs-color-slider-checker-size: 8px;
            }

            &[data-size="lg"] {
                --cs-color-slider-track-size: 14px;
                --cs-color-slider-thumb-size: 18px;
                --cs-color-slider-checker-size: 8px;
            }

            &[data-size="xl"] {
                --cs-color-slider-track-size: 16px;
                --cs-color-slider-thumb-size: 22px;
                --cs-color-slider-checker-size: 10px;
            }

            &[data-orientation="horizontal"] {
                inline-size: var(--cs-color-slider-track-length, 100%);
                block-size: calc(var(--cs-color-slider-track-size) + var(--cs-color-slider-hit-pad) * 2);
                padding-block: var(--cs-color-slider-hit-pad);
            }

            &[data-orientation="vertical"] {
                inline-size: calc(var(--cs-color-slider-track-size) + var(--cs-color-slider-hit-pad) * 2);
                block-size: var(--cs-color-slider-track-length, 200px);
                padding-inline: var(--cs-color-slider-hit-pad);
            }

            &[data-dragging] {
                cursor: grabbing;
            }
        }

        .cs-color-slider-track {
            position: relative;
            inline-size: 100%;
            block-size: 100%;
            overflow: hidden;
            border-radius: var(--cs-color-slider-radius);
            transition: filter var(--cs-dur-effect-fast) var(--cs-ease-effect);
            pointer-events: none;

            &::after {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: inherit;
                box-shadow: inset 0 0 0 1px light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.12));
                pointer-events: none;
            }
        }

        .cs-color-slider-gradient {
            position: absolute;
            inset: 0;
            background-image: var(--cs-color-slider-gradient);
            border-radius: inherit;
        }

        .cs-color-slider[data-alpha] .cs-color-slider-track {
            background-image: conic-gradient(
                light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 90deg,
                light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 90deg 180deg,
                light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 180deg 270deg,
                light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 270deg
            );
            background-size: var(--cs-color-slider-checker-size) var(--cs-color-slider-checker-size);
        }

        .cs-color-slider[data-invalid] .cs-color-slider-track::after {
            box-shadow: inset 0 0 0 1.5px var(--cs-color-negative-solid);
        }

        .cs-color-slider[data-disabled] .cs-color-slider-track {
            filter: grayscale(0.85) opacity(0.45);
        }

        .cs-color-slider-thumb {
            position: absolute;
            z-index: 1;
            box-sizing: border-box;
            inline-size: var(--cs-color-slider-thumb-size);
            block-size: var(--cs-color-slider-thumb-size);
            overflow: hidden;
            border: 2px solid var(--cs-color-slider-thumb-ring);
            border-radius: var(--cs-radius-full);
            box-shadow:
                0 0 0 1px var(--cs-color-slider-thumb-rim),
                0 1px 3px rgb(0 0 0 / 0.22);
            scale: 1;
            transition: scale var(--cs-dur-240) var(--cs-spring-snappy);
            pointer-events: auto;

            &:focus-visible {
                z-index: 2;
                outline-offset: 2px;
            }

            &[data-pointer-focus]:focus-visible {
                outline: none;
            }
        }

        .cs-color-slider[data-orientation="horizontal"] .cs-color-slider-thumb {
            inset-block-start: 50%;
            inset-inline-start: calc(var(--cs-color-slider-progress) * 100%);
            translate: -50% -50%;

            &:dir(rtl) {
                translate: 50% -50%;
            }
        }

        .cs-color-slider[data-orientation="vertical"] .cs-color-slider-thumb {
            inset-inline-start: 50%;
            inset-block-end: calc(var(--cs-color-slider-progress) * 100%);
            translate: -50% 50%;

            &:dir(rtl) {
                translate: 50% 50%;
            }
        }

        .cs-color-slider-thumb-fill {
            position: absolute;
            inset: 0;
            background-color: var(--cs-color-slider-thumb-bg);
            border-radius: inherit;
        }

        .cs-color-slider[data-alpha] .cs-color-slider-thumb-fill {
            background-color: transparent;
            background-image:
                linear-gradient(var(--cs-color-slider-thumb-bg), var(--cs-color-slider-thumb-bg)),
                conic-gradient(
                    light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 90deg,
                    light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 90deg 180deg,
                    light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 180deg 270deg,
                    light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 270deg
                );
            background-size:
                100% 100%,
                calc(var(--cs-color-slider-checker-size) * 0.75)
                    calc(var(--cs-color-slider-checker-size) * 0.75);
        }

        @media (hover: hover) {
            .cs-color-slider:not([data-disabled], [data-readonly]) .cs-color-slider-thumb:hover {
                cursor: grab;
            }
        }

        .cs-color-slider[data-dragging] .cs-color-slider-thumb {
            cursor: grabbing;
        }

        .cs-color-slider:is([data-dragging], :active:not([data-disabled], [data-readonly]))
            .cs-color-slider-thumb {
            scale: 1.1;
            transition: scale var(--cs-dur-160) var(--cs-ease-cubic-out);
        }

        .cs-color-slider[data-disabled] .cs-color-slider-thumb {
            border-color: var(--cs-color-disabled-border);
            box-shadow: none;
        }

        .cs-color-slider[data-disabled] .cs-color-slider-thumb-fill {
            background: var(--cs-color-disabled-bg);
        }
    }
</style>
