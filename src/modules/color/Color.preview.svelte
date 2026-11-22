<script module lang="ts">
    export const id = "color";
    export const label = "Color";
</script>

<script lang="ts">
    import {
        COLOR_SLIDER_SIZES,
        COLOR_SWATCH_PRESETS,
        COLOR_SWATCH_SIZES,
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
</div>
