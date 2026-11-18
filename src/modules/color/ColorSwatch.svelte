<script lang="ts">
    import { Check } from "@lucide/svelte";

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
        xs: 3,
        sm: 2.75,
        md: 2.75,
        lg: 2.5,
        xl: 2.5,
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
            <Check size={checkSize} strokeWidth={checkStrokeWidth} aria-hidden="true" />
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
        aria-pressed={resolvedMode === "button" && selected !== undefined
            ? isSelected
                ? "true"
                : "false"
            : undefined}
        aria-label={resolvedAriaLabel}
        disabled={resolvedDisabled || undefined}
        onclick={handleClick}
        class={["cs-color-swatch", className]}
        data-size={size}
        data-mode={resolvedMode}
        data-selected={isSelected ? "" : undefined}
        data-show-check={showCheck ? "" : undefined}
        data-check-contrast={checkContrast}
        data-halo-tone={haloTone}
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
            --cs-color-swatch-squircle: superellipse(1.4);
            --cs-color-swatch-rim-outer: 0 0 0 1px rgb(0 0 0 / 0.09);
            --cs-color-swatch-shadow: 0 1px 2px 0 light-dark(rgb(0 0 0 / 0.06), rgb(0 0 0 / 0.35));
            --cs-color-swatch-ring: inset 0 0 0 1px rgb(255 255 255 / 0.18);
            --cs-color-swatch-halo: var(--cs-color-swatch-halo-raw, var(--cs-color-swatch-bg));

            isolation: isolate;
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            inline-size: var(--cs-color-swatch-size);
            block-size: var(--cs-color-swatch-size);
            padding: 0;
            border: 0;
            background: transparent;
            border-radius: var(--cs-color-swatch-radius);
            corner-shape: var(--cs-color-swatch-squircle);
            overflow: visible;
            vertical-align: middle;
            user-select: none;
            cursor: default;
            -webkit-tap-highlight-color: transparent;

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

            &[data-halo-tone="transparent"] {
                --cs-color-swatch-halo: var(--cs-color-accent-solid);
            }

            &[data-halo-tone="near-white"] {
                --cs-color-swatch-halo: light-dark(
                    color-mix(in oklab, var(--cs-color-swatch-halo-raw, var(--cs-color-swatch-bg)) 68%, var(--cs-color-base-400)),
                    var(--cs-color-swatch-halo-raw, var(--cs-color-swatch-bg))
                );
            }

            &[data-halo-tone="near-black"] {
                --cs-color-swatch-halo: light-dark(
                    var(--cs-color-swatch-halo-raw, var(--cs-color-swatch-bg)),
                    color-mix(in oklab, var(--cs-color-swatch-halo-raw, var(--cs-color-swatch-bg)) 65%, var(--cs-color-base-400))
                );
            }

            &:not([data-show-check])::after {
                content: "";
                position: absolute;
                inset: -4px;
                z-index: 0;
                border: 2px solid var(--cs-color-swatch-halo);
                border-radius: calc(var(--cs-color-swatch-radius) + 4px);
                corner-shape: inherit;
                pointer-events: none;
                opacity: 0;
                scale: 0.84;
                transition:
                    opacity var(--cs-dur-exit-sm) var(--cs-ease-exit),
                    scale var(--cs-dur-exit-sm) var(--cs-ease-exit);
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
                --cs-color-swatch-shadow: none;
                --cs-color-swatch-rim-outer: 0 0 0 1px var(--cs-color-disabled-border);
                --cs-color-swatch-halo: var(--cs-color-disabled-fg);
                background-color: var(--cs-color-disabled-bg);

                & > .cs-color-swatch-fill {
                    filter: grayscale(0.85) opacity(0.42);
                }

                & > .cs-color-swatch-check {
                    color: var(--cs-color-disabled-fg);
                    filter: none;
                }
            }
        }

        button.cs-color-swatch {
            transition: scale var(--cs-dur-squash) var(--cs-ease-squash);

            @media (hover: hover) {
                &:hover:not(:disabled) {
                    --cs-color-swatch-shadow:
                        0 1px 3px 0 light-dark(rgb(0 0 0 / 0.1), transparent),
                        0 1px 2px -1px light-dark(rgb(0 0 0 / 0.1), transparent),
                        0 2px 6px 0 light-dark(transparent, rgb(0 0 0 / 0.5));
                    --cs-color-swatch-ring: inset 0 0 0 1px rgb(255 255 255 / 0.26);
                }
            }

            &:active:not(:disabled, :focus-visible) {
                & > .cs-color-swatch-fill {
                    scale: var(--cs-squash-default);
                    transition:
                        box-shadow var(--cs-dur-press) var(--cs-ease-press),
                        filter var(--cs-dur-press) var(--cs-ease-press),
                        scale var(--cs-dur-press) var(--cs-ease-press);
                }

                &[data-selected] > .cs-color-swatch-check {
                    scale: 0.92;
                    transition:
                        opacity var(--cs-dur-effect-fast) var(--cs-ease-effect),
                        scale var(--cs-dur-press) var(--cs-ease-press);
                }
            }

            &:active:focus-visible:not(:disabled) {
                scale: 0.95;
                transition: scale var(--cs-dur-press) var(--cs-ease-press);
            }

            &:focus-visible {
                z-index: 2;
            }
        }

        .cs-color-swatch-fill {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            corner-shape: inherit;
            overflow: hidden;
            pointer-events: none;
            box-shadow: var(--cs-color-swatch-rim-outer), var(--cs-color-swatch-shadow);
            background-image: conic-gradient(
                light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 90deg,
                light-dark(var(--cs-color-base-200), var(--cs-color-base-700)) 90deg 180deg,
                light-dark(var(--cs-color-base-50), var(--cs-color-base-800)) 180deg 270deg,
                light-dark(var(--cs-color-base-200), var(--cs-color-base-700)) 270deg
            );
            background-size: var(--cs-color-swatch-checker-size) var(--cs-color-swatch-checker-size);
            transition:
                box-shadow var(--cs-dur-effect-fast) var(--cs-ease-effect),
                filter var(--cs-dur-effect-fast) var(--cs-ease-effect),
                scale var(--cs-dur-squash) var(--cs-ease-squash);

            &::before {
                content: "";
                position: absolute;
                inset: 0;
                background-color: var(--cs-color-swatch-bg);
            }

            /* Theme-agnostic inner light hairline separates dark swatches on dark surfaces */
            &::after {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: inherit;
                corner-shape: inherit;
                box-shadow: var(--cs-color-swatch-ring);
                transition: box-shadow var(--cs-dur-effect-fast) var(--cs-ease-effect);
            }
        }

        .cs-color-swatch-check {
            position: relative;
            z-index: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            color: var(--cs-color-swatch-check-fg, var(--cs-color-text-strong));
            opacity: 0;
            scale: 0.65;
            transition:
                opacity var(--cs-dur-80) var(--cs-ease-quad-in),
                scale var(--cs-dur-80) var(--cs-ease-quad-in);
        }

        .cs-color-swatch[data-check-contrast="dark"] > .cs-color-swatch-check {
            color: var(--cs-color-swatch-check-fg, var(--cs-color-base-950));
        }

        .cs-color-swatch[data-check-contrast="light"] > .cs-color-swatch-check {
            color: var(--cs-color-swatch-check-fg, white);
            filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.22));
        }

        .cs-color-swatch[data-selected] > .cs-color-swatch-check {
            opacity: 1;
            scale: 1;
            transition:
                opacity var(--cs-dur-effect-fast) var(--cs-ease-effect),
                scale var(--cs-dur-effect-fast) var(--cs-ease-effect);
        }
    }
</style>
