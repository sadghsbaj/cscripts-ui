<script module lang="ts">
    export const id = "color";
    export const label = "Color";
</script>

<script lang="ts">
    import { COLOR_SWATCH_PRESETS, COLOR_SWATCH_SIZES, ColorSwatch } from "cs/svelte/color";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    const formatSwatches = [
        { color: "#3b82f6", label: "sRGB blue" },
        { color: "oklch(0.68 0.24 145)", label: "OKLCH vivid green" },
        { color: "color(display-p3 1 0.15 0.25)", label: "Display P3 crimson" },
        { color: "rgba(59 130 246 / 0.5)", label: "Translucent blue 50%" },
        { color: "oklch(0.75 0.2 330 / 0.25)", label: "Translucent OKLCH magenta 25%" },
        { color: "transparent", label: "Transparent" },
    ] as const;

    let selectedChecks = $state<Record<string, boolean>>({
        "#FACC15": true,
        "#3B82F6": true,
        "#EC4899": true,
    });

    let selectedHaloColor = $state<string | undefined>("#6366F1");
    let squircleSelected = $state(true);

    function toggleCheck(color: string): void {
        selectedChecks[color] = !selectedChecks[color];
    }

    function toggleHalo(color: string): void {
        selectedHaloColor = selectedHaloColor === color ? undefined : color;
    }

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
    import { COLOR_SWATCH_PRESETS, ColorSwatch } from "cs/svelte/color";

    let selectedColor = $state("#3B82F6");
${closeScript}

<!-- Luminance-adaptive vector checkmark (default) -->
<div class="grid grid-cols-7 gap-3">
    {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
        <ColorSwatch
            size="lg"
            color={preset.color}
            label={preset.label}
            mode="button"
            selected={selectedColor === preset.color}
            onclick={() => (selectedColor = preset.color)}
        />
    {/each}
</div>

<!-- Selection halo alternative (showCheck={false}) -->
<div class="grid grid-cols-7 gap-3">
    {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
        <ColorSwatch
            size="lg"
            color={preset.color}
            label={preset.label}
            mode="button"
            selected={selectedColor === preset.color}
            showCheck={false}
            onclick={() => (selectedColor = preset.color)}
        />
    {/each}
</div>`;

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
        title="Interactive Selection"
        description="Click swatches from the calibrated 14-color palette to test tactile hover/press motion, vector checkmarks, and selection halos."
        code={interactiveCode}
    >
        <div class="flex flex-col items-center gap-8">
            <div class="grid grid-cols-7 gap-3">
                {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
                    <ColorSwatch
                        size="lg"
                        color={preset.color}
                        label={preset.label}
                        mode="button"
                        selected={Boolean(selectedChecks[preset.color])}
                        onclick={() => toggleCheck(preset.color)}
                    />
                {/each}
            </div>

            <div class="grid grid-cols-7 gap-3">
                {#each COLOR_SWATCH_PRESETS as preset (preset.color)}
                    <ColorSwatch
                        size="lg"
                        color={preset.color}
                        label="{preset.label} halo"
                        mode="button"
                        selected={selectedHaloColor === preset.color}
                        showCheck={false}
                        onclick={() => toggleHalo(preset.color)}
                    />
                {/each}
            </div>
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
</div>
