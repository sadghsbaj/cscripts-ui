<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { HitArea } from "../hit-area/index.ts";
    import {
        getColorPickerContext,
        getColorSwatchGroupContext,
        hasColorPickerContext,
        hasColorSwatchGroupContext,
    } from "./color.context.ts";
    import { formatColor, getRelativeLuminance, parseColor } from "./color.utils.ts";
    import type { ColorSwatchProps, ColorSwatchSize } from "./index.ts";

    type CheckContrast = "checker" | "dark" | "light";
    type HaloTone = "transparent" | "near-white" | "near-black" | "normal";

    const CHECK_ICON_SIZES: Record<ColorSwatchSize, number> = {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 20,
    };

    const CHECK_STROKE_WIDTHS: Record<ColorSwatchSize, number> = {
        xs: 3.4,
        sm: 3.4,
        md: 3.1,
        lg: 2.8,
        xl: 2.8,
    };

    let {
        ref = $bindable(null),
        size,
        color,
        label,
        mode = "auto",
        selected,
        showCheck = true,
        decorative = false,
        disabled = false,
        class: className,
        onclick,
        children,
        ...rest
    }: ColorSwatchProps = $props();

    const pickerCtx = hasColorPickerContext() ? getColorPickerContext() : undefined;
    const groupCtx = hasColorSwatchGroupContext() ? getColorSwatchGroupContext() : undefined;

    const resolvedColor = $derived(color ?? pickerCtx?.value ?? "transparent");
    const resolvedMode = $derived(mode === "auto" ? (groupCtx ? "radio" : "preview") : mode);
    const isInteractive = $derived(resolvedMode === "radio" || resolvedMode === "button");
    const resolvedDisabled = $derived(Boolean(disabled || groupCtx?.disabled || pickerCtx?.disabled));
    const isSelected = $derived(selected ?? (groupCtx && color ? groupCtx.isSelected(color) : false));

    const resolvedLabel = $derived.by(() => {
        if (label) return label;
        const trimmed = resolvedColor.trim();
        if (!trimmed || trimmed.toLowerCase() === "transparent") {
            return t({ de: "Transparent", en: "Transparent" });
        }
        return trimmed;
    });

    const resolvedAriaLabel = $derived(
        decorative && resolvedMode === "preview"
            ? undefined
            : (label ?? rest["aria-label"] ?? (rest["aria-labelledby"] !== undefined ? undefined : resolvedLabel))
    );

    const parsed = $derived(parseColor(resolvedColor));
    const hasAlpha = $derived(!parsed || parsed.alpha < 1);
    const checkContrast = $derived.by<CheckContrast>(() => {
        if (!parsed || parsed.alpha < 0.45) {
            return "checker";
        }
        return getRelativeLuminance(parsed) > 0.42 ? "dark" : "light";
    });

    const haloRawColor = $derived.by(() => {
        if (!parsed || parsed.alpha === 0 || parsed.alpha >= 0.45) return;
        const targetFormat =
            parsed.space === "p3" ? "p3" : parsed.space === "oklch" || parsed.space === "oklab" ? "oklch" : "rgb";
        return formatColor(parsed, targetFormat, { alpha: "never" });
    });

    const haloTone = $derived.by<HaloTone>(() => {
        if (!parsed || parsed.alpha === 0) {
            return "transparent";
        }
        const luminance = getRelativeLuminance(parsed);
        if (luminance > 0.85) return "near-white";
        if (luminance < 0.04) return "near-black";
        return "normal";
    });

    const renderCheck = $derived(showCheck && (isInteractive || selected !== undefined));
    const checkSize = $derived(CHECK_ICON_SIZES[size]);
    const checkStrokeWidth = $derived(CHECK_STROKE_WIDTHS[size]);

    $effect(() => {
        if (resolvedMode !== "radio" || !groupCtx || !ref || resolvedDisabled) return;
        return groupCtx.registerItem(ref, () => color);
    });

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || resolvedDisabled) return;

        if (resolvedMode === "radio" && groupCtx && color) {
            groupCtx.select(color);
        }
    }
</script>

{#snippet swatchContent()}
    <span class="cs-color-swatch-fill" aria-hidden="true"></span>
    {#if renderCheck}
        <span class="cs-color-swatch-check" aria-hidden="true">
            <svg
                class="cs-color-swatch-check-icon"
                width={checkSize}
                height={checkSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width={checkStrokeWidth}
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M5 12.5L9.5 17L19 7" pathLength="100" />
            </svg>
        </span>
    {/if}
    {@render children?.()}
{/snippet}

{#if isInteractive}
    <button
        bind:this={ref}
        {...rest}
        type="button"
        role={resolvedMode === "radio" ? "radio" : undefined}
        aria-checked={resolvedMode === "radio" ? (isSelected ? "true" : "false") : undefined}
        aria-pressed={resolvedMode === "button" && selected !== undefined ? (isSelected ? "true" : "false") : undefined}
        aria-label={resolvedAriaLabel}
        tabindex={resolvedMode === "radio" ? (groupCtx?.tabStop === ref ? 0 : -1) : rest.tabindex}
        disabled={resolvedDisabled || undefined}
        onclick={handleClick}
        class={["cs-color-swatch", className]}
        data-size={size}
        data-mode={resolvedMode}
        data-selected={isSelected ? "" : undefined}
        data-show-check={showCheck ? "" : undefined}
        data-check-contrast={checkContrast}
        data-halo-tone={haloTone}
        data-translucent={hasAlpha ? "" : undefined}
        data-disabled={resolvedDisabled ? "" : undefined}
        style:--cs-color-swatch-bg={resolvedColor}
        style:--cs-color-swatch-halo-raw={haloRawColor}
    >
        {@render swatchContent()}
        <HitArea size={size === "xl" ? "md" : "sm"} />
    </button>
{:else}
    <span
        bind:this={ref}
        {...rest}
        role={decorative ? undefined : "img"}
        aria-hidden={decorative ? "true" : undefined}
        aria-label={resolvedAriaLabel}
        class={["cs-color-swatch", className]}
        data-size={size}
        data-mode={resolvedMode}
        data-selected={isSelected ? "" : undefined}
        data-show-check={showCheck ? "" : undefined}
        data-check-contrast={checkContrast}
        data-halo-tone={haloTone}
        data-translucent={hasAlpha ? "" : undefined}
        data-disabled={resolvedDisabled ? "" : undefined}
        style:--cs-color-swatch-bg={resolvedColor}
        style:--cs-color-swatch-halo-raw={haloRawColor}
    >
        {@render swatchContent()}
    </span>
{/if}

<style>
    @layer components.primitive {
        .cs-color-swatch {
            --cs-color-swatch-bg: transparent;
            --cs-color-swatch-radius: calc(var(--cs-color-swatch-size) / 2);
            --cs-color-swatch-squircle: var(--cs-squircle-soft);
            --cs-color-swatch-edge: transparent;
            --cs-color-swatch-halo: var(--cs-color-swatch-halo-raw, var(--cs-color-swatch-bg));
            -webkit-tap-highlight-color: transparent;

            isolation: isolate;
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            inline-size: var(--cs-color-swatch-size);
            block-size: var(--cs-color-swatch-size);
            padding: 0;
            overflow: visible;
            vertical-align: middle;
            background: transparent;
            border: 0;
            border-radius: var(--cs-color-swatch-radius);
            corner-shape: var(--cs-color-swatch-squircle);
            user-select: none;
            cursor: default;

            &[data-size="xs"] {
                --cs-color-swatch-size: 20px;
                --cs-color-swatch-checker-size: 8px;
            }

            &[data-size="sm"] {
                --cs-color-swatch-size: 24px;
                --cs-color-swatch-checker-size: 8px;
            }

            &[data-size="md"] {
                --cs-color-swatch-size: 28px;
                --cs-color-swatch-checker-size: 10px;
            }

            &[data-size="lg"] {
                --cs-color-swatch-size: 32px;
                --cs-color-swatch-checker-size: 10px;
            }

            &[data-size="xl"] {
                --cs-color-swatch-size: 40px;
                --cs-color-swatch-checker-size: 12px;
            }

            &[data-check-contrast="checker"] {
                --cs-color-swatch-edge: light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.12));
            }

            &[data-halo-tone="transparent"] {
                --cs-color-swatch-halo: var(--cs-color-accent-solid);
                --cs-color-swatch-edge: light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.12));
            }

            &[data-halo-tone="near-white"] {
                --cs-color-swatch-halo: light-dark(var(--cs-color-base-400), rgb(255 255 255 / 0.85));
                --cs-color-swatch-edge: rgb(0 0 0 / 0.1);
            }

            &[data-halo-tone="near-black"] {
                --cs-color-swatch-halo: light-dark(var(--cs-color-base-800), rgb(255 255 255 / 0.72));
                --cs-color-swatch-edge: rgb(255 255 255 / 0.16);
            }

            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 1;
                box-sizing: border-box;
                border: 1px solid var(--cs-color-swatch-edge);
                border-radius: inherit;
                corner-shape: inherit;
                pointer-events: none;
            }

            &:not([data-show-check])::after {
                content: "";
                position: absolute;
                inset: -4px;
                z-index: 0;
                border: 1.5px solid var(--cs-color-swatch-halo);
                border-radius: calc(var(--cs-color-swatch-radius) + 4px);
                corner-shape: inherit;
                opacity: 0;
                scale: 0.92;
                transition:
                    opacity var(--cs-dur-exit-sm) var(--cs-ease-exit),
                    scale var(--cs-dur-exit-sm) var(--cs-ease-exit);
                pointer-events: none;
            }

            &[data-selected]:not([data-show-check]) {
                z-index: 1;

                &::after {
                    opacity: 1;
                    scale: 1;
                    transition:
                        opacity var(--cs-dur-effect-fast) var(--cs-ease-effect),
                        scale var(--cs-dur-enter-sm) var(--cs-ease-enter);
                }

                &:focus-visible {
                    z-index: 2;
                    outline-offset: 6px;
                }
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-color-swatch-edge: var(--cs-color-disabled-border);
                --cs-color-swatch-halo: var(--cs-color-disabled-fg);
                background-color: var(--cs-color-disabled-bg);

                & > .cs-color-swatch-fill {
                    filter: grayscale(0.85) opacity(0.42);
                }

                & > .cs-color-swatch-check {
                    color: var(--cs-color-disabled-fg);
                }
            }
        }

        button.cs-color-swatch {
            scale: 1;
            transition: scale var(--cs-dur-240) var(--cs-spring-snappy);

            &:is(:hover, :active):not(:disabled) {
                will-change: scale;
            }

            @media (hover: hover) {
                &:hover:not(:disabled) {
                    scale: 1.06;
                    transition: scale var(--cs-dur-effect-fast) var(--cs-ease-effect);
                }
            }

            &:active:not(:disabled) {
                scale: 0.9;
                transition: scale var(--cs-dur-press) var(--cs-ease-press);
            }

            &:focus-visible {
                z-index: 2;
            }
        }

        .cs-color-swatch-fill {
            position: absolute;
            inset: 0;
            overflow: hidden;
            background-color: var(--cs-color-swatch-bg);
            border-radius: inherit;
            corner-shape: inherit;
            box-shadow: none;
            transition: filter var(--cs-dur-effect-fast) var(--cs-ease-effect);
            pointer-events: none;
        }

        .cs-color-swatch[data-translucent] > .cs-color-swatch-fill {
            background-color: transparent;
            background-image:
                linear-gradient(var(--cs-color-swatch-bg), var(--cs-color-swatch-bg)),
                conic-gradient(
                    light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 90deg,
                    light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 90deg 180deg,
                    light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 180deg 270deg,
                    light-dark(var(--cs-color-base-100), var(--cs-color-base-900)) 270deg
                );
            background-size:
                100% 100%,
                var(--cs-color-swatch-checker-size) var(--cs-color-swatch-checker-size);
        }

        .cs-color-swatch-check {
            position: relative;
            z-index: 2;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--cs-color-swatch-check-fg, var(--cs-color-text-strong));
            opacity: 0;
            scale: 0.88;
            transition:
                opacity var(--cs-dur-80) var(--cs-ease-quad-in),
                scale var(--cs-dur-80) var(--cs-ease-quad-in);
            pointer-events: none;
        }

        .cs-color-swatch-check-icon {
            display: block;

            & path {
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
                transition: stroke-dashoffset 0s var(--cs-dur-80);
            }
        }

        .cs-color-swatch[data-check-contrast="dark"] > .cs-color-swatch-check {
            color: var(--cs-color-swatch-check-fg, var(--cs-color-base-950));
        }

        .cs-color-swatch[data-check-contrast="light"] > .cs-color-swatch-check {
            color: var(--cs-color-swatch-check-fg, white);
        }

        .cs-color-swatch[data-check-contrast="checker"] > .cs-color-swatch-check {
            padding: 2px;
            color: var(--cs-color-swatch-check-fg, var(--cs-color-text-strong));
            background: light-dark(rgb(255 255 255 / 0.78), rgb(0 0 0 / 0.6));
            border-radius: var(--cs-radius-full);
            backdrop-filter: blur(4px);
        }

        .cs-color-swatch[data-selected] > .cs-color-swatch-check {
            opacity: 1;
            scale: 1;
            transition:
                opacity var(--cs-dur-60) var(--cs-ease-quad-out),
                scale var(--cs-dur-140) var(--cs-ease-quart-out);

            & .cs-color-swatch-check-icon path {
                stroke-dashoffset: 0;
                transition: stroke-dashoffset var(--cs-dur-140) var(--cs-ease-quart-out);
            }
        }
    }
</style>
