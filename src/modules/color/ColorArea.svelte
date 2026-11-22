<script lang="ts">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import {
        buildCanvasPlaneSignature,
        renderColorAreaCanvas,
        resolveColorAreaChannels,
        resolveColorAreaPlane,
        resolveColorAreaThumbColor,
    } from "./color-area-plane.internal.ts";
    import {
        buildSnapshotFromColor,
        clampChannel,
        extractChannelFromSnapshot,
        getChannelMeta,
        mergeChannelIntoSnapshot,
        stepChannelValue,
    } from "./color-channel.internal.ts";
    import { getColorPickerContext, hasColorPickerContext } from "./color.context.ts";
    import { clamp01 } from "./color-math.internal.ts";
    import type { ColorAreaProps, ColorChannelSnapshot } from "./index.ts";

    let {
        ref = $bindable(null),
        size,
        xChannel,
        yChannel,
        xValue = $bindable(),
        yValue = $bindable(),
        onValueChange,
        onCommit,
        color,
        label,
        disabled = false,
        readonly = false,
        invalid = false,
        class: className,
        "aria-label": ariaLabelProp,
        "aria-labelledby": ariaLabelledByProp,
        ...rest
    }: ColorAreaProps = $props();

    const pickerCtx = hasColorPickerContext() ? getColorPickerContext() : undefined;

    let surfaceRef = $state<HTMLDivElement | null>(null);
    let canvasRef = $state<HTMLCanvasElement | null>(null);
    let thumbRef = $state<HTMLDivElement | null>(null);

    let internalXValue = $state<number | undefined>();
    let internalYValue = $state<number | undefined>();
    let isDragging = $state(false);
    let pointerFocus = $state(false);
    let activePointerId = $state<number | null>(null);
    let lastDraggedX = $state(0);
    let lastDraggedY = $state(0);
    let isRtl = $state(false);
    let canvasWidth = $state(0);
    let canvasHeight = $state(0);

    const resolvedChannels = $derived(resolveColorAreaChannels(pickerCtx?.space, xChannel, yChannel));
    const resolvedXChannel = $derived(resolvedChannels.xChannel);
    const resolvedYChannel = $derived(resolvedChannels.yChannel);

    const xMeta = $derived(getChannelMeta(resolvedXChannel));
    const yMeta = $derived(getChannelMeta(resolvedYChannel));

    const resolvedDisabled = $derived(Boolean(disabled || pickerCtx?.disabled));
    const resolvedReadonly = $derived(Boolean(readonly || pickerCtx?.readonly));
    const resolvedInvalid = $derived(Boolean(invalid || pickerCtx?.invalid));
    const isAlphaArea = $derived(resolvedXChannel === "alpha" || resolvedYChannel === "alpha");

    let lastStandaloneSnapshot: ColorChannelSnapshot | undefined;
    const standaloneBaseSnapshot = $derived.by(() => {
        const next = buildSnapshotFromColor(color, lastStandaloneSnapshot);
        lastStandaloneSnapshot = next;
        return next;
    });

    const resolvedX = $derived.by(() => {
        if (xValue !== undefined) {
            return clampChannel(resolvedXChannel, xValue);
        }
        if (pickerCtx) {
            return clampChannel(resolvedXChannel, pickerCtx.getChannel(resolvedXChannel));
        }
        if (internalXValue !== undefined) {
            return clampChannel(resolvedXChannel, internalXValue);
        }
        if (color !== undefined) {
            return clampChannel(resolvedXChannel, extractChannelFromSnapshot(resolvedXChannel, standaloneBaseSnapshot));
        }
        return xMeta.defaultValue;
    });

    const resolvedY = $derived.by(() => {
        if (yValue !== undefined) {
            return clampChannel(resolvedYChannel, yValue);
        }
        if (pickerCtx) {
            return clampChannel(resolvedYChannel, pickerCtx.getChannel(resolvedYChannel));
        }
        if (internalYValue !== undefined) {
            return clampChannel(resolvedYChannel, internalYValue);
        }
        if (color !== undefined) {
            return clampChannel(resolvedYChannel, extractChannelFromSnapshot(resolvedYChannel, standaloneBaseSnapshot));
        }
        return yMeta.defaultValue;
    });

    const activeSnapshot = $derived.by(() => {
        if (pickerCtx && xValue === undefined && yValue === undefined) {
            return pickerCtx.state.channels;
        }
        const base = pickerCtx ? pickerCtx.state.channels : standaloneBaseSnapshot;
        const withX = mergeChannelIntoSnapshot(base, resolvedXChannel, resolvedX);
        return mergeChannelIntoSnapshot(withX, resolvedYChannel, resolvedY);
    });

    const xProgress = $derived(
        xMeta.max > xMeta.min ? clamp01((resolvedX - xMeta.min) / (xMeta.max - xMeta.min)) : 0
    );
    const yProgress = $derived(
        yMeta.max > yMeta.min ? clamp01((resolvedY - yMeta.min) / (yMeta.max - yMeta.min)) : 0
    );

    const plane = $derived(resolveColorAreaPlane(resolvedXChannel, resolvedYChannel, activeSnapshot, isRtl));
    const thumbFill = $derived(resolveColorAreaThumbColor(resolvedXChannel, resolvedYChannel, activeSnapshot));

    const canvasSignature = $derived(
        plane.kind === "canvas"
            ? buildCanvasPlaneSignature(resolvedXChannel, resolvedYChannel, activeSnapshot, isRtl)
            : ""
    );

    const roledescription = t({ de: "2D-Farbfeld", en: "2D color area" });
    const formattedAriaValueText = $derived(
        `${xMeta.label} ${xMeta.formatValueText(resolvedX)}, ${yMeta.label} ${yMeta.formatValueText(resolvedY)}`
    );
    const resolvedAriaLabel = $derived(
        label ??
            ariaLabelProp ??
            (ariaLabelledByProp !== undefined
                ? undefined
                : t({
                      de: `${xMeta.label} und ${yMeta.label}`,
                      en: `${xMeta.label} and ${yMeta.label}`,
                  }))
    );

    function updateCanvasSize(width: number, height: number): void {
        if (width <= 0 || height <= 0) {
            canvasWidth = 0;
            canvasHeight = 0;
            return;
        }
        // Cap internal resolution to 96px on the longest side; CSS upscales bilinearly on the GPU.
        const scale = Math.min(1, 96 / Math.max(width, height));
        canvasWidth = Math.max(1, Math.round(width * scale));
        canvasHeight = Math.max(1, Math.round(height * scale));
    }

    $effect(() => {
        if (!ref) return;
        isRtl = getComputedStyle(ref).direction === "rtl";
    });

    $effect(() => {
        if (!surfaceRef || typeof ResizeObserver === "undefined") return;

        const rect = surfaceRef.getBoundingClientRect();
        updateCanvasSize(rect.width, rect.height);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            updateCanvasSize(entry.contentRect.width, entry.contentRect.height);
        });
        observer.observe(surfaceRef);

        return () => {
            observer.disconnect();
        };
    });

    $effect(() => {
        if (plane.kind !== "canvas" || !canvasRef || canvasWidth <= 0 || canvasHeight <= 0) return;
        // Track only canvasSignature + dimensions so dragging X/Y never triggers a full canvas redraw.
        void canvasSignature;
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;

        const snapshot = untrack(() => activeSnapshot);
        const xCh = untrack(() => resolvedXChannel);
        const yCh = untrack(() => resolvedYChannel);
        const rtl = untrack(() => isRtl);
        if (canvasRef.width !== canvasWidth) {
            canvasRef.width = canvasWidth;
        }
        if (canvasRef.height !== canvasHeight) {
            canvasRef.height = canvasHeight;
        }
        renderColorAreaCanvas(ctx, canvasWidth, canvasHeight, xCh, yCh, snapshot, rtl);
    });

    function updateValues(nextX: number, nextY: number, commit: boolean): void {
        if (resolvedDisabled || resolvedReadonly) return;
        const clampedX = clampChannel(resolvedXChannel, nextX);
        const clampedY = clampChannel(resolvedYChannel, nextY);

        if (pickerCtx && xValue === undefined && yValue === undefined) {
            pickerCtx.setChannels(
                { [resolvedXChannel]: clampedX, [resolvedYChannel]: clampedY },
                { commit }
            );
            return;
        }

        if (xValue !== undefined) {
            xValue = clampedX;
        } else if (pickerCtx) {
            pickerCtx.setChannel(resolvedXChannel, clampedX, { commit });
        } else {
            internalXValue = clampedX;
        }

        if (yValue !== undefined) {
            yValue = clampedY;
        } else if (pickerCtx) {
            pickerCtx.setChannel(resolvedYChannel, clampedY, { commit });
        } else {
            internalYValue = clampedY;
        }

        onValueChange?.(clampedX, clampedY);
        if (commit) {
            onCommit?.(clampedX, clampedY);
        }
    }

    function computeValuesFromPointer(event: PointerEvent): { x: number; y: number } | null {
        if (!surfaceRef) return null;
        const rect = surfaceRef.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;

        if (ref) {
            isRtl = getComputedStyle(ref).direction === "rtl";
        }

        const rawX = clamp01((event.clientX - rect.left) / rect.width);
        const xRatio = isRtl ? 1 - rawX : rawX;
        const yRatio = clamp01(1 - (event.clientY - rect.top) / rect.height);

        return {
            x: clampChannel(resolvedXChannel, xMeta.min + xRatio * (xMeta.max - xMeta.min)),
            y: clampChannel(resolvedYChannel, yMeta.min + yRatio * (yMeta.max - yMeta.min)),
        };
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

        const next = computeValuesFromPointer(event);
        if (next) {
            lastDraggedX = next.x;
            lastDraggedY = next.y;
            updateValues(next.x, next.y, false);
        } else {
            lastDraggedX = resolvedX;
            lastDraggedY = resolvedY;
        }
    }

    function handlePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        if (!isDragging || event.pointerId !== activePointerId) return;
        const next = computeValuesFromPointer(event);
        if (next) {
            lastDraggedX = next.x;
            lastDraggedY = next.y;
            updateValues(next.x, next.y, false);
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

        updateValues(lastDraggedX, lastDraggedY, true);
    }

    function handleLostPointerCapture(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        if (!isDragging || event.pointerId !== activePointerId) return;
        isDragging = false;
        activePointerId = null;
        updateValues(lastDraggedX, lastDraggedY, true);
    }

    function handleThumbKeyDown(event: KeyboardEvent): void {
        if (resolvedDisabled || resolvedReadonly) return;
        if (ref) {
            isRtl = getComputedStyle(ref).direction === "rtl";
        }

        const rtlSign = isRtl ? -1 : 1;
        let nextX = resolvedX;
        let nextY = resolvedY;

        switch (event.key) {
            case "ArrowRight": {
                const step = event.shiftKey ? xMeta.largeStep : xMeta.step;
                nextX = stepChannelValue(resolvedXChannel, resolvedX, step * rtlSign);
                break;
            }
            case "ArrowLeft": {
                const step = event.shiftKey ? xMeta.largeStep : xMeta.step;
                nextX = stepChannelValue(resolvedXChannel, resolvedX, -step * rtlSign);
                break;
            }
            case "ArrowUp": {
                const step = event.shiftKey ? yMeta.largeStep : yMeta.step;
                nextY = stepChannelValue(resolvedYChannel, resolvedY, step);
                break;
            }
            case "ArrowDown": {
                const step = event.shiftKey ? yMeta.largeStep : yMeta.step;
                nextY = stepChannelValue(resolvedYChannel, resolvedY, -step);
                break;
            }
            case "PageUp": {
                nextY = stepChannelValue(resolvedYChannel, resolvedY, yMeta.largeStep);
                break;
            }
            case "PageDown": {
                nextY = stepChannelValue(resolvedYChannel, resolvedY, -yMeta.largeStep);
                break;
            }
            case "Home": {
                if (event.shiftKey) {
                    nextY = yMeta.min;
                } else {
                    nextX = xMeta.min;
                }
                break;
            }
            case "End": {
                if (event.shiftKey) {
                    nextY = yMeta.max;
                } else {
                    nextX = xMeta.max;
                }
                break;
            }
            default: {
                return;
            }
        }

        event.preventDefault();
        updateValues(nextX, nextY, true);
    }
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-color-area", className]}
    data-size={size}
    data-x-channel={resolvedXChannel}
    data-y-channel={resolvedYChannel}
    data-alpha={isAlphaArea ? "" : undefined}
    data-dragging={isDragging ? "" : undefined}
    data-disabled={resolvedDisabled ? "" : undefined}
    data-readonly={resolvedReadonly ? "" : undefined}
    data-invalid={resolvedInvalid ? "" : undefined}
    style:--cs-color-area-thumb-bg={thumbFill}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={finishDrag}
    onpointercancel={finishDrag}
    onlostpointercapture={handleLostPointerCapture}
>
    <div
        bind:this={surfaceRef}
        class="cs-color-area-surface"
        style:background-color={plane.kind === "css" ? plane.baseColor : undefined}
        aria-hidden="true"
    >
        {#if plane.kind === "canvas"}
            <canvas bind:this={canvasRef} class="cs-color-area-canvas"></canvas>
        {:else}
            {#each plane.layers as layer, index (index)}
                <div
                    class="cs-color-area-layer"
                    style:background-image={layer.backgroundImage}
                    style:mix-blend-mode={layer.blendMode}
                ></div>
            {/each}
        {/if}
    </div>
    <div
        bind:this={thumbRef}
        class="cs-color-area-thumb"
        role="slider"
        tabindex={resolvedDisabled ? -1 : 0}
        data-pointer-focus={pointerFocus ? "" : undefined}
        aria-roledescription={roledescription}
        aria-label={resolvedAriaLabel}
        aria-labelledby={resolvedAriaLabel ? undefined : ariaLabelledByProp}
        aria-valuemin={xMeta.min}
        aria-valuemax={xMeta.max}
        aria-valuenow={resolvedX}
        aria-valuetext={formattedAriaValueText}
        aria-disabled={resolvedDisabled ? "true" : undefined}
        aria-readonly={resolvedReadonly ? "true" : undefined}
        aria-invalid={resolvedInvalid ? "true" : undefined}
        style:--cs-color-area-x-progress={xProgress}
        style:--cs-color-area-y-progress={yProgress}
        onkeydown={handleThumbKeyDown}
        onblur={() => (pointerFocus = false)}
    >
        <span class="cs-color-area-thumb-fill" aria-hidden="true"></span>
    </div>
</div>

<style>
    @layer components.primitive {
        .cs-color-area {
            --cs-color-area-width: 100%;
            --cs-color-area-thumb-ring: white;
            --cs-color-area-thumb-rim: rgb(0 0 0 / 0.14);
            -webkit-tap-highlight-color: transparent;

            position: relative;
            display: block;
            flex-shrink: 0;
            box-sizing: border-box;
            inline-size: var(--cs-color-area-width);
            block-size: var(--cs-color-area-height);
            user-select: none;
            touch-action: none;
            cursor: default;

            &[data-size="xs"] {
                --cs-color-area-height: 120px;
                --cs-color-area-radius: var(--cs-radius-md);
                --cs-color-area-thumb-size: 12px;
                --cs-color-area-checker-size: 6px;
            }

            &[data-size="sm"] {
                --cs-color-area-height: 150px;
                --cs-color-area-radius: var(--cs-radius-lg);
                --cs-color-area-thumb-size: 14px;
                --cs-color-area-checker-size: 6px;
            }

            &[data-size="md"] {
                --cs-color-area-height: 180px;
                --cs-color-area-radius: var(--cs-radius-xl);
                --cs-color-area-thumb-size: 16px;
                --cs-color-area-checker-size: 8px;
            }

            &[data-size="lg"] {
                --cs-color-area-height: 210px;
                --cs-color-area-radius: 14px;
                --cs-color-area-thumb-size: 18px;
                --cs-color-area-checker-size: 8px;
            }

            &[data-size="xl"] {
                --cs-color-area-height: 240px;
                --cs-color-area-radius: var(--cs-radius-2xl);
                --cs-color-area-thumb-size: 22px;
                --cs-color-area-checker-size: 10px;
            }

            &[data-dragging] {
                cursor: grabbing;
            }

            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 1;
                box-sizing: border-box;
                border: 1px solid light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.12));
                border-radius: var(--cs-color-area-radius);
                corner-shape: var(--cs-squircle-smooth);
                pointer-events: none;
            }

            &[data-invalid]::before {
                border: 1.5px solid var(--cs-color-negative-solid);
            }
        }

        .cs-color-area-surface {
            position: relative;
            inline-size: 100%;
            block-size: 100%;
            overflow: hidden;
            isolation: isolate;
            border-radius: var(--cs-color-area-radius);
            corner-shape: var(--cs-squircle-smooth);
            transition: filter var(--cs-dur-effect-fast) var(--cs-ease-effect);
            pointer-events: none;
        }

        .cs-color-area-layer,
        .cs-color-area-canvas {
            position: absolute;
            inset: 0;
            display: block;
            inline-size: 100%;
            block-size: 100%;
            border-radius: inherit;
            corner-shape: inherit;
        }

        .cs-color-area[data-alpha] .cs-color-area-surface {
            background-image: conic-gradient(
                light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 90deg,
                light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 90deg 180deg,
                light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 180deg 270deg,
                light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 270deg
            );
            background-size: var(--cs-color-area-checker-size) var(--cs-color-area-checker-size);
        }

        .cs-color-area[data-disabled] .cs-color-area-surface {
            filter: grayscale(0.85) opacity(0.45);
        }

        .cs-color-area-thumb {
            position: absolute;
            z-index: 2;
            inset-inline-start: calc(var(--cs-color-area-x-progress) * 100%);
            inset-block-end: calc(var(--cs-color-area-y-progress) * 100%);
            translate: -50% 50%;
            box-sizing: border-box;
            inline-size: var(--cs-color-area-thumb-size);
            block-size: var(--cs-color-area-thumb-size);
            overflow: hidden;
            border: 2px solid var(--cs-color-area-thumb-ring);
            border-radius: var(--cs-radius-full);
            box-shadow:
                0 0 0 1px var(--cs-color-area-thumb-rim),
                0 1px 3px rgb(0 0 0 / 0.22);
            scale: 1;
            transition: scale var(--cs-dur-240) var(--cs-spring-snappy);
            pointer-events: auto;

            &:dir(rtl) {
                translate: 50% 50%;
            }

            &:focus-visible {
                z-index: 2;
                outline-offset: 2px;
            }

            &[data-pointer-focus]:focus-visible {
                outline: none;
            }
        }

        .cs-color-area-thumb-fill {
            position: absolute;
            inset: 0;
            background-color: var(--cs-color-area-thumb-bg);
            border-radius: inherit;
        }

        .cs-color-area[data-alpha] .cs-color-area-thumb-fill {
            background-color: transparent;
            background-image:
                linear-gradient(var(--cs-color-area-thumb-bg), var(--cs-color-area-thumb-bg)),
                conic-gradient(
                    light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 90deg,
                    light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 90deg 180deg,
                    light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 180deg 270deg,
                    light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 270deg
                );
            background-size:
                100% 100%,
                calc(var(--cs-color-area-checker-size) * 0.75)
                    calc(var(--cs-color-area-checker-size) * 0.75);
        }

        @media (hover: hover) {
            .cs-color-area:not([data-disabled], [data-readonly]) .cs-color-area-thumb:hover {
                cursor: grab;
            }
        }

        .cs-color-area[data-dragging] .cs-color-area-thumb {
            cursor: grabbing;
        }

        .cs-color-area:is([data-dragging], :active:not([data-disabled], [data-readonly]))
            .cs-color-area-thumb {
            scale: 1.1;
            transition: scale var(--cs-dur-160) var(--cs-ease-cubic-out);
        }

        .cs-color-area[data-disabled] .cs-color-area-thumb {
            border-color: var(--cs-color-disabled-border);
            box-shadow: none;
        }

        .cs-color-area[data-disabled] .cs-color-area-thumb-fill {
            background: var(--cs-color-disabled-bg);
        }
    }
</style>
