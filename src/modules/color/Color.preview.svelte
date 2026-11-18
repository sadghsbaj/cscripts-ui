<script module lang="ts">
    export const id = "color";
    export const label = "Color";
</script>

<script lang="ts">
    import { COLOR_SWATCH_SIZES, ColorSwatch } from "cs/svelte/color";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    const formatSwatches = [
        { color: "#3b82f6", label: "sRGB blue" },
        { color: "oklch(0.68 0.24 145)", label: "OKLCH vivid green" },
        { color: "color(display-p3 1 0.15 0.25)", label: "Display P3 crimson" },
        { color: "rgba(59 130 246 / 0.5)", label: "Translucent blue 50%" },
        { color: "oklch(0.75 0.2 330 / 0.25)", label: "Translucent OKLCH magenta 25%" },
        { color: "transparent", label: "Transparent" },
    ] as const;

    const interactivePalette = [
        { color: "#fde047", label: "Bright yellow" },
        { color: "#ffffff", label: "Pure white" },
        { color: "#1e3a8a", label: "Dark navy" },
        { color: "rebeccapurple", label: "Deep purple" },
        { color: "rgba(99 102 241 / 0.25)", label: "Translucent indigo" },
    ] as const;

    let selectedChecks = $state<Record<string, boolean>>({
        "#fde047": true,
        "#1e3a8a": true,
        "rgba(99 102 241 / 0.25)": true,
    });

    let selectedHaloColor = $state<string | undefined>("#1e3a8a");
    let circleSelected = $state(true);

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
    import { ColorSwatch } from "cs/svelte/color";

    let selected = $state(true);
${closeScript}

<!-- Luminance-adaptive checkmark (default) -->
<ColorSwatch size="lg" color="#fde047" mode="button" {selected} onclick={() => (selected = !selected)} />
<ColorSwatch size="lg" color="#1e3a8a" mode="button" {selected} onclick={() => (selected = !selected)} />
<ColorSwatch size="lg" color="rgba(99 102 241 / 0.25)" mode="button" {selected} onclick={() => (selected = !selected)} />

<!-- Double-ring halo alternative -->
<ColorSwatch size="lg" color="#1e3a8a" mode="button" {selected} showCheck={false} />`;

    const statesCode = `<!-- Disabled states -->
<ColorSwatch size="lg" color="#3b82f6" mode="button" disabled />
<ColorSwatch size="lg" color="#3b82f6" mode="button" selected disabled />
<ColorSwatch size="lg" color="#3b82f6" mode="button" selected showCheck={false} disabled />

<!-- Shape escape hatches (default: rounded-full squircle) -->
<ColorSwatch
    size="lg"
    color="#10b981"
    mode="button"
    selected
    style="--cs-color-swatch-squircle: round"
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
        description="A ColorSwatch primitive with squircle geometry, alpha checkerboard, anti-bleed rim-lighting, and luminance-adaptive selection checkmark."
    />

    <PreviewSection
        title="Sizes"
        description="Five calibrated squircle steps from xs (20px) to xl (40px) across elevated and sunken surfaces."
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
        title="Formats & Rims"
        description="Inset rim-lighting keeps pure white and black crisp on matching surfaces alongside wide-gamut and translucent colors."
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
        description="Click swatches to test tactile scale physics, luminance-adaptive checkmarks, and double-ring halo selection."
        code={interactiveCode}
    >
        <div class="flex flex-col items-center gap-6">
            <div class="flex-center flex-wrap gap-3">
                {#each interactivePalette as swatch (swatch.color)}
                    <ColorSwatch
                        size="lg"
                        color={swatch.color}
                        label={swatch.label}
                        mode="button"
                        selected={Boolean(selectedChecks[swatch.color])}
                        onclick={() => toggleCheck(swatch.color)}
                    />
                {/each}
            </div>

            <div class="flex-center flex-wrap gap-3">
                {#each interactivePalette as swatch (swatch.color)}
                    <ColorSwatch
                        size="lg"
                        color={swatch.color}
                        label="{swatch.label} halo"
                        mode="button"
                        selected={selectedHaloColor === swatch.color}
                        showCheck={false}
                        onclick={() => toggleHalo(swatch.color)}
                    />
                {/each}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="States & Shape Overrides"
        description="Disabled interactive swatches mute fill vibrancy, while --cs-color-swatch-squircle and --cs-color-swatch-radius customize the rounded-full squircle."
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
                    selected={circleSelected}
                    onclick={() => (circleSelected = !circleSelected)}
                    style="--cs-color-swatch-squircle: round"
                    label="True circle emerald swatch"
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
