<script module lang="ts">
    export const id = "color";
    export const label = "Color";
</script>

<script lang="ts">
    import {
        COLOR_AREA_SIZES,
        COLOR_INPUT_SIZES,
        COLOR_INPUT_VARIANTS,
        COLOR_SLIDER_SIZES,
        COLOR_SWATCH_PRESETS,
        COLOR_SWATCH_SIZES,
        ColorArea,
        ColorInput,
        ColorSlider,
        ColorSwatch,
        ColorSwatchGroup,
        createColorState,
    } from "cs/svelte/color";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    const formatSwatches = [
        { color: "#3b82f6", label: "sRGB blue" },
        { color: "oklch(0.68 0.24 145)", label: "OKLCH vivid green" },
        { color: "color(display-p3 1 0.15 0.25)", label: "Display P3 crimson" },
        { color: "rgba(59 130 246 / 0.5)", label: "Translucent blue 50%" },
        { color: "oklch(0.75 0.2 330 / 0.25)", label: "Translucent OKLCH magenta 25%" },
        { color: "transparent", label: "Transparent" },
    ] as const;

    let selectedCheckColor = $state("#3B82F6");
    let selectedHaloColor = $state("#6366F1");
    let squircleSelected = $state(true);
    const sliderState = createColorState({ defaultValue: "#3b82f6", format: () => "rgb" });
    const areaState = createColorState({ defaultValue: "#3b82f6", format: () => "rgb" });
    const oklchAreaState = createColorState({ defaultValue: "oklch(0.65 0.2 250)", format: () => "oklch" });
    const colorInputState = createColorState({ defaultValue: "#4F46E5", format: () => "hex" });
    let previewVariantColor = $state("#10B981");
    let previewVariantAlpha = $state(0.85);
    let previewScaleColor = $state("#3B82F6");
    let previewDisabledColor = $state("#6366F1");
    let previewDisabledAlpha = $state(0.5);
    let previewInvalidColor = $state("#EF4444");
    let verticalHue = $state(217);
    let verticalAlpha = $state(0.75);

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const sizesCode = `<script lang="ts">
    import { COLOR_SWATCH_SIZES, ColorSwatch } from "cs/svelte/color";
${closeScript}

{#each COLOR_SWATCH_SIZES as size (size)}
    <ColorSwatch {size} color="#3b82f6" mode="preview" />
{/each}`;

    const formatsCode = `<!-- Anti-bleed rim separation -->
<ColorSwatch size="lg" color="#ffffff" mode="preview" />
<ColorSwatch size="lg" color="#000000" mode="preview" />

<!-- sRGB, OKLCH, Display P3 & alpha checkerboard -->
<ColorSwatch size="lg" color="#3b82f6" mode="preview" />
<ColorSwatch size="lg" color="oklch(0.68 0.24 145)" mode="preview" />
<ColorSwatch size="lg" color="color(display-p3 1 0.15 0.25)" mode="preview" />
<ColorSwatch size="lg" color="rgba(59 130 246 / 0.5)" mode="preview" />
<ColorSwatch size="lg" color="oklch(0.75 0.2 330 / 0.25)" mode="preview" />
<ColorSwatch size="lg" color="transparent" mode="preview" />`;

    const interactiveCode = `<script lang="ts">
    import { COLOR_SWATCH_PRESETS, ColorSwatch, ColorSwatchGroup } from "cs/svelte/color";

    let selectedColor = $state("#3B82F6");
${closeScript}

<!-- Luminance-adaptive vector checkmark (default) -->
<ColorSwatchGroup bind:value={selectedColor} columns={7} aria-label="Preset colors">
    {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
        <ColorSwatch size="lg" color={preset.color} label={preset.label} />
    {/each}
</ColorSwatchGroup>

<!-- Selection halo alternative (showCheck={false}) -->
<ColorSwatchGroup bind:value={selectedColor} columns={7} aria-label="Preset colors (halo)">
    {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
        <ColorSwatch size="lg" color={preset.color} label={preset.label} showCheck={false} />
    {/each}
</ColorSwatchGroup>`;

    const statesCode = `<!-- Disabled states -->
<ColorSwatch size="lg" color="#3b82f6" mode="button" disabled />
<ColorSwatch size="lg" color="#3b82f6" mode="button" selected disabled />
<ColorSwatch size="lg" color="#3b82f6" mode="button" selected showCheck={false} disabled />

<!-- Shape overrides (default: round circle) -->
<ColorSwatch
    size="lg"
    color="#10b981"
    mode="button"
    selected
    style="--cs-color-swatch-squircle: superellipse(1.4)"
/>
<ColorSwatch
    size="lg"
    color="#f97316"
    mode="preview"
    style="--cs-color-swatch-radius: 8px; --cs-color-swatch-squircle: var(--cs-squircle-smooth)"
/>`;

    const slidersCode = `<script lang="ts">
    import { ColorSlider, ColorSwatch, createColorState } from "cs/svelte/color";

    const colorState = createColorState({ defaultValue: "#3b82f6", format: () => "rgb" });
${closeScript}

<div class="flex items-center gap-4">
    <ColorSwatch size="xl" color={colorState.value} mode="preview" />
    <div class="flex flex-col gap-3 w-64">
        <ColorSlider
            size="md"
            channel="hue"
            color={colorState.value}
            bind:value={
                () => colorState.getChannel("hue"),
                (v) => colorState.setChannel("hue", v, { commit: false })
            }
            onCommit={(v) => colorState.setChannel("hue", v, { commit: true })}
        />
        <ColorSlider
            size="md"
            channel="alpha"
            color={colorState.value}
            bind:value={
                () => colorState.getChannel("alpha"),
                (v) => colorState.setChannel("alpha", v, { commit: false })
            }
            onCommit={(v) => colorState.setChannel("alpha", v, { commit: true })}
        />
    </div>
</div>`;

    const colorAreaCode = `<script lang="ts">
    import { ColorArea, ColorSlider, ColorSwatch, createColorState } from "cs/svelte/color";

    const colorState = createColorState({ defaultValue: "#3b82f6", format: () => "rgb" });
${closeScript}

<div class="flex flex-col gap-3 w-72">
    <ColorArea
        size="md"
        color={\`hsl(\${colorState.getChannel("hue")} 100% 50% / \${colorState.getChannel("alpha")})\`}
        bind:xValue={
            () => colorState.getChannel("saturation"),
            (v) => colorState.setChannel("saturation", v, { commit: false })
        }
        bind:yValue={
            () => colorState.getChannel("value"),
            (v) => colorState.setChannel("value", v, { commit: false })
        }
        onCommit={(x, y) => colorState.setChannels({ saturation: x, value: y }, { commit: true })}
    />
    <div class="flex items-center gap-3">
        <ColorSwatch size="lg" color={colorState.value} mode="preview" />
        <div class="flex flex-col gap-2 flex-1">
            <ColorSlider
                size="sm"
                channel="hue"
                color={colorState.value}
                bind:value={
                    () => colorState.getChannel("hue"),
                    (v) => colorState.setChannel("hue", v, { commit: false })
                }
                onCommit={(v) => colorState.setChannel("hue", v, { commit: true })}
            />
            <ColorSlider
                size="sm"
                channel="alpha"
                color={colorState.value}
                bind:value={
                    () => colorState.getChannel("alpha"),
                    (v) => colorState.setChannel("alpha", v, { commit: false })
                }
                onCommit={(v) => colorState.setChannel("alpha", v, { commit: true })}
            />
        </div>
    </div>
</div>`;
    const colorInputCode = `<script lang="ts">
    import { ColorInput, createColorState } from "cs/svelte/color";

    const colorState = createColorState({ defaultValue: "#4F46E5", format: () => "hex" });
${closeScript}

<div class="flex items-center gap-2">
    <ColorInput
        variant="soft"
        size="md"
        showSwatch
        format="hex"
        alpha="never"
        bind:value={
            () => colorState.value,
            (v) => colorState.setString(v, { commit: false })
        }
        onCommit={(v) => colorState.setString(v, { commit: true })}
    />
    <ColorInput
        variant="soft"
        size="md"
        channel="alpha"
        bind:value={
            () => colorState.getChannel("alpha"),
            (v) => colorState.setChannel("alpha", v, { commit: false })
        }
        onCommit={(v) => colorState.setChannel("alpha", v, { commit: true })}
    />
</div>`;

    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Color"
        description="A ColorSwatch primitive with true circle geometry by default, alpha checkerboard, surgical edge-guards, and a calibrated vector checkmark."
    />

    <PreviewSection
        title="Sizes"
        description="Five calibrated circle steps from xs (20px) to xl (40px) across elevated and sunken surfaces."
        code={sizesCode}
    >
        <div class="flex-center flex-wrap gap-6">
            <div class="flex items-center gap-3">
                {#each COLOR_SWATCH_SIZES as size (size)}
                    <ColorSwatch {size} color="#3b82f6" mode="preview" label="Blue ({size})" />
                {/each}
            </div>

            <SunkenWell>
                {#each COLOR_SWATCH_SIZES as size (size)}
                    <ColorSwatch {size} color="#3b82f6" mode="preview" label="Blue ({size})" />
                {/each}
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Formats & Edge Guards"
        description="Surgical edge-guards keep pure white, pure black, and translucent swatches crisp on matching surfaces without adding muddy rims to vibrant colors."
        code={formatsCode}
    >
        <div class="flex flex-col items-center gap-6">
            <div class="flex-center flex-wrap gap-4">
                <div class="bg-white border border-base-soft rounded-2xl squircle-soft px-4 py-2.5 inline-flex items-center gap-3">
                    <ColorSwatch size="lg" color="#ffffff" mode="preview" label="Pure white on white" />
                </div>

                <div class="bg-base-950 rounded-2xl squircle-soft px-4 py-2.5 inline-flex items-center gap-3">
                    <ColorSwatch size="lg" color="#000000" mode="preview" label="Pure black on dark canvas" />
                </div>

                <SunkenWell>
                    <ColorSwatch size="lg" color="#ffffff" mode="preview" label="Pure white on sunken" />
                    <ColorSwatch size="lg" color="#000000" mode="preview" label="Pure black on sunken" />
                </SunkenWell>
            </div>

            <div class="flex-center flex-wrap gap-3">
                {#each formatSwatches as swatch (swatch.color)}
                    <ColorSwatch size="lg" color={swatch.color} mode="preview" label={swatch.label} />
                {/each}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Swatch Group & Interactive Selection"
        description="ColorSwatchGroup coordinates single-select radiogroup state, 2D keyboard navigation, and roving tabindex across checkmark and selection-halo palettes."
        code={interactiveCode}
    >
        <div class="flex flex-col items-center gap-8">
            <ColorSwatchGroup bind:value={selectedCheckColor} columns={7} aria-label="Preset colors with checkmark">
                {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
                    <ColorSwatch size="lg" color={preset.color} label={preset.label} />
                {/each}
            </ColorSwatchGroup>

            <ColorSwatchGroup bind:value={selectedHaloColor} columns={7} aria-label="Preset colors with selection halo">
                {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
                    <ColorSwatch size="lg" color={preset.color} label="{preset.label} halo" showCheck={false} />
                {/each}
            </ColorSwatchGroup>
        </div>
    </PreviewSection>

    <PreviewSection
        title="States & Shape Overrides"
        description="Disabled interactive swatches mute fill vibrancy, while --cs-color-swatch-squircle and --cs-color-swatch-radius customize the default round circle."
        code={statesCode}
    >
        <div class="flex-center flex-wrap gap-6">
            <div class="flex items-center gap-3">
                <ColorSwatch size="lg" color="#3b82f6" mode="button" label="Enabled swatch" />
                <ColorSwatch size="lg" color="#3b82f6" mode="button" disabled label="Disabled swatch" />
                <ColorSwatch size="lg" color="#3b82f6" mode="button" selected disabled label="Disabled selected" />
                <ColorSwatch
                    size="lg"
                    color="#3b82f6"
                    mode="button"
                    selected
                    showCheck={false}
                    disabled
                    label="Disabled selected halo"
                />
            </div>

            <SunkenWell>
                <ColorSwatch
                    size="lg"
                    color="#10b981"
                    mode="button"
                    selected={squircleSelected}
                    onclick={() => (squircleSelected = !squircleSelected)}
                    style="--cs-color-swatch-squircle: superellipse(1.4)"
                    label="Squircle emerald swatch"
                />
                <ColorSwatch
                    size="lg"
                    color="#f97316"
                    mode="preview"
                    style="--cs-color-swatch-radius: 8px; --cs-color-swatch-squircle: var(--cs-squircle-smooth)"
                    label="Tile squircle orange swatch"
                />
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="ColorSlider"
        description="Accessible 1D color-channel sliders across xs–xl scales, coupled Hue + Alpha state with live ColorSwatch preview, and vertical orientation."
        code={slidersCode}
    >
        <div class="flex flex-col items-center gap-8 w-full">
            <div class="flex-center flex-wrap gap-6">
                <div class="flex items-center gap-4">
                    <ColorSwatch size="xl" color={sliderState.value} mode="preview" label="Live slider color" />
                    <div class="flex flex-col gap-3 w-64">
                        <ColorSlider
                            size="md"
                            channel="hue"
                            color={sliderState.value}
                            bind:value={
                                () => sliderState.getChannel("hue"),
                                (v) => sliderState.setChannel("hue", v, { commit: false })
                            }
                            onCommit={(v) => sliderState.setChannel("hue", v, { commit: true })}
                        />
                        <ColorSlider
                            size="md"
                            channel="alpha"
                            color={sliderState.value}
                            bind:value={
                                () => sliderState.getChannel("alpha"),
                                (v) => sliderState.setChannel("alpha", v, { commit: false })
                            }
                            onCommit={(v) => sliderState.setChannel("alpha", v, { commit: true })}
                        />
                    </div>
                </div>

                <SunkenWell>
                    <div class="flex items-center gap-4 px-2 py-1" style="--cs-color-slider-track-length: 120px">
                        <ColorSlider size="md" channel="hue" orientation="vertical" bind:value={verticalHue} />
                        <ColorSlider
                            size="md"
                            channel="alpha"
                            orientation="vertical"
                            color={`hsl(${verticalHue} 90% 55%)`}
                            bind:value={verticalAlpha}
                        />
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-col gap-2.5 w-full max-w-xs">
                {#each COLOR_SLIDER_SIZES as size (size)}
                    <ColorSlider {size} channel="hue" color="#3b82f6" />
                {/each}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="ColorArea"
        description="2D color-plane selectors across xs–xl scales: HSV CSS fast-path coupled with Hue + Alpha sliders, plus gamut-clamped OKLCH canvas rendering."
        code={colorAreaCode}
    >
        <div class="flex flex-col items-center gap-8 w-full">
            <div class="flex-center flex-wrap gap-8 w-full">
                <div class="flex flex-col gap-3 w-72">
                    <ColorArea
                        size="md"
                        color={`hsl(${areaState.getChannel("hue")} 100% 50% / ${areaState.getChannel("alpha")})`}
                        bind:xValue={
                            () => areaState.getChannel("saturation"),
                            (v) => areaState.setChannel("saturation", v, { commit: false })
                        }
                        bind:yValue={
                            () => areaState.getChannel("value"),
                            (v) => areaState.setChannel("value", v, { commit: false })
                        }
                        onCommit={(x, y) =>
                            areaState.setChannels({ saturation: x, value: y }, { commit: true })}
                    />
                    <div class="flex items-center gap-3">
                        <ColorSwatch size="lg" color={areaState.value} mode="preview" label="Live HSV area color" />
                        <div class="flex flex-col gap-2 flex-1">
                            <ColorSlider
                                size="sm"
                                channel="hue"
                                color={areaState.value}
                                bind:value={
                                    () => areaState.getChannel("hue"),
                                    (v) => areaState.setChannel("hue", v, { commit: false })
                                }
                                onCommit={(v) => areaState.setChannel("hue", v, { commit: true })}
                            />
                            <ColorSlider
                                size="sm"
                                channel="alpha"
                                color={areaState.value}
                                bind:value={
                                    () => areaState.getChannel("alpha"),
                                    (v) => areaState.setChannel("alpha", v, { commit: false })
                                }
                                onCommit={(v) => areaState.setChannel("alpha", v, { commit: true })}
                            />
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-3 w-72">
                    <ColorArea
                        size="md"
                        xChannel="chroma"
                        yChannel="oklch-lightness"
                        color={`oklch(0.7 0.2 ${oklchAreaState.getChannel("oklch-hue")})`}
                        bind:xValue={
                            () => oklchAreaState.getChannel("chroma"),
                            (v) => oklchAreaState.setChannel("chroma", v, { commit: false })
                        }
                        bind:yValue={
                            () => oklchAreaState.getChannel("oklch-lightness"),
                            (v) => oklchAreaState.setChannel("oklch-lightness", v, { commit: false })
                        }
                        onCommit={(x, y) =>
                            oklchAreaState.setChannels(
                                { chroma: x, "oklch-lightness": y },
                                { commit: true }
                            )}
                    />
                    <div class="flex items-center gap-3">
                        <ColorSwatch
                            size="lg"
                            color={oklchAreaState.value}
                            mode="preview"
                            label="Live OKLCH area color"
                        />
                        <div class="flex-1">
                            <ColorSlider
                                size="sm"
                                channel="oklch-hue"
                                color={oklchAreaState.value}
                                bind:value={
                                    () => oklchAreaState.getChannel("oklch-hue"),
                                    (v) => oklchAreaState.setChannel("oklch-hue", v, { commit: false })
                                }
                                onCommit={(v) => oklchAreaState.setChannel("oklch-hue", v, { commit: true })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex items-end justify-center flex-wrap gap-4 w-full">
                {#each COLOR_AREA_SIZES as size (size)}
                    <div class="w-40">
                        <ColorArea {size} color="#3b82f6" />
                    </div>
                {/each}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="ColorInput"
        description="Full-color CSS/hex input (with optional swatch & # prefix) and single-channel numeric input with ArrowUp/ArrowDown stepping."
        code={colorInputCode}
    >
        <div class="flex flex-col items-center gap-6 w-full">
            <div class="flex-center flex-wrap gap-3">
                <ColorSwatch
                    size="lg"
                    color={colorInputState.value}
                    mode="preview"
                    label="Live ColorInput preview"
                />
                <ColorInput
                    variant="soft"
                    size="md"
                    showSwatch
                    format="hex"
                    alpha="never"
                    bind:value={
                        () => colorInputState.value,
                        (v) => colorInputState.setString(v, { commit: false })
                    }
                    onCommit={(v: string) => colorInputState.setString(v, { commit: true })}
                />
                <ColorInput
                    variant="soft"
                    size="md"
                    channel="alpha"
                    bind:value={
                        () => colorInputState.getChannel("alpha"),
                        (v) => colorInputState.setChannel("alpha", v, { commit: false })
                    }
                    onCommit={(v) => colorInputState.setChannel("alpha", v, { commit: true })}
                />
                <ColorInput
                    variant="soft"
                    size="md"
                    channel="hue"
                    bind:value={
                        () => colorInputState.getChannel("hue"),
                        (v) => colorInputState.setChannel("hue", v, { commit: false })
                    }
                    onCommit={(v) => colorInputState.setChannel("hue", v, { commit: true })}
                />
            </div>

            <div class="flex-center flex-wrap gap-4">
                {#each COLOR_INPUT_VARIANTS as variant (variant)}
                    <div class="flex items-center gap-2">
                        {#if variant === "elevated"}
                            <SunkenWell>
                                <div class="flex items-center gap-2">
                                    <ColorInput {variant} size="md" showSwatch bind:value={previewVariantColor} />
                                    <ColorInput {variant} size="md" channel="alpha" bind:value={previewVariantAlpha} />
                                </div>
                            </SunkenWell>
                        {:else}
                            <ColorInput {variant} size="md" showSwatch bind:value={previewVariantColor} />
                            <ColorInput {variant} size="md" channel="alpha" bind:value={previewVariantAlpha} />
                        {/if}
                    </div>
                {/each}
            </div>

            <div class="flex flex-wrap items-end justify-center gap-3">
                {#each COLOR_INPUT_SIZES as size (size)}
                    <ColorInput variant="soft" {size} showSwatch bind:value={previewScaleColor} />
                {/each}
            </div>

            <div class="flex-center flex-wrap gap-3">
                <ColorInput variant="soft" size="md" showSwatch bind:value={previewDisabledColor} disabled />
                <ColorInput variant="soft" size="md" channel="alpha" bind:value={previewDisabledAlpha} disabled />
                <ColorInput variant="soft" size="md" showSwatch bind:value={previewInvalidColor} invalid />
            </div>
        </div>
    </PreviewSection>
</div>
