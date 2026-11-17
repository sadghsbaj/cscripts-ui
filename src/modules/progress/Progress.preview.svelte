<script module>
    export const id = "progress";
    export const label = "Progress";
</script>

<script lang="ts">
    import { Minus, Plus } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import {
        PROGRESS_APPEARANCES,
        PROGRESS_COLORS,
        PROGRESS_SIZES,
        PROGRESS_VARIANTS,
        Progress,
        type ProgressAppearance,
        type ProgressColor,
        type ProgressVariant,
    } from "cs/svelte/progress";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import { tooltip } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let interactiveValue = $state<number | null>(60);
    let interactiveAppearance = $state<ProgressAppearance>("bar");

    const quickJumps: Array<{ label: string; value: number | null }> = [
        { label: "0%", value: 0 },
        { label: "40%", value: 40 },
        { label: "80%", value: 80 },
        { label: "100%", value: 100 },
        { label: "Indeterminate", value: null },
    ];

    function stepValue(delta: number): void {
        const current = interactiveValue ?? 0;
        interactiveValue = Math.min(100, Math.max(0, current + delta));
    }

    const appearanceLabels: Record<ProgressAppearance, string> = {
        bar: "Bar",
        dashed: "Dashed",
        dotted: "Dotted",
    };

    const variantLabels: Record<ProgressVariant, string> = {
        soft: "Soft",
        elevated: "Elevated",
    };

    const colorLabels: Record<ProgressColor, string> = {
        base: "Base",
        accent: "Accent",
        positive: "Positive",
        caution: "Caution",
        negative: "Negative",
    };

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {value} bindings */
    const appearancesCode = `<script lang="ts">
    import { Progress } from "cs/svelte/progress";

    let value = $state<number | null>(60);
${closeScript}

<Progress appearance="bar" variant="soft" size="md" {value} aria-label="Bar progress" />
<Progress appearance="dashed" variant="soft" size="md" {value} aria-label="Dashed progress" />
<Progress appearance="dotted" variant="soft" size="md" {value} aria-label="Dotted progress" />`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */

    const variantsCode = `<Progress appearance="bar" variant="soft" size="md" value={65} aria-label="Soft bar" />
<Progress appearance="dashed" variant="soft" size="md" value={65} aria-label="Soft dashed" />

<SunkenWell>
    <Progress appearance="bar" variant="elevated" size="md" value={65} aria-label="Elevated bar" />
    <Progress appearance="dashed" variant="elevated" size="md" value={65} aria-label="Elevated dashed" />
</SunkenWell>`;

    const colorsCode = `<Progress appearance="bar" variant="soft" color="base" size="md" value={70} aria-label="Base" />
<Progress appearance="bar" variant="soft" color="accent" size="md" value={70} aria-label="Accent" />
<Progress appearance="bar" variant="soft" color="positive" size="md" value={70} aria-label="Positive" />
<Progress appearance="bar" variant="soft" color="caution" size="md" value={70} aria-label="Caution" />
<Progress appearance="bar" variant="soft" color="negative" size="md" value={70} aria-label="Negative" />`;

    const sizesCode = `<!-- xs, sm, md, lg, xl share thickness and gap parity across appearances -->
<Progress appearance="bar" variant="soft" size="xs" value={60} aria-label="Bar xs" />
<Progress appearance="dashed" variant="soft" size="xs" value={60} aria-label="Dashed xs" />
<Progress appearance="dotted" variant="soft" size="xs" value={60} aria-label="Dotted xs" />`;

    const orientationSegmentsCode = `<!-- Vertical orientation fills bottom-to-top -->
<div class="h-36 flex items-center gap-6">
    <Progress appearance="bar" variant="soft" size="md" orientation="vertical" value={70} aria-label="Vertical bar" />
    <Progress appearance="dashed" variant="soft" size="md" orientation="vertical" value={70} aria-label="Vertical dashed" />
    <Progress appearance="dotted" variant="soft" size="md" orientation="vertical" value={70} aria-label="Vertical dotted" />
</div>

<!-- Custom segment counts -->
<Progress appearance="dashed" variant="soft" size="md" segments={5} value={60} aria-label="5 dashes" />
<Progress appearance="dashed" variant="soft" size="md" segments={8} value={60} aria-label="8 dashes" />`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Progress"
        description="A determinate or indeterminate progress indicator in bar, dashed, and dotted appearances."
    />

    <PreviewSection
        title="Appearances & Interactive Motion"
        description="Compare continuous bar transitions against staggered segment activation in dashed and dotted modes."
        code={appearancesCode}
    >
        <div class="w-full max-w-lg flex flex-col gap-6">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-1.5">
                    {#each quickJumps as jump (jump.label)}
                        <Button
                            variant={interactiveValue === jump.value ? "primary" : "secondary"}
                            size="xs"
                            onclick={() => {
                                interactiveValue = jump.value;
                            }}
                        >
                            <ButtonLabel>{jump.label}</ButtonLabel>
                        </Button>
                    {/each}
                </div>

                <div class="flex items-center gap-1.5">
                    <Button
                        variant="secondary"
                        size="xs"
                        iconOnly
                        aria-label="Decrease progress by 10%"
                        disabled={interactiveValue === 0}
                        onclick={() => stepValue(-10)}
                        {@attach tooltip({ text: "Decrease by 10%" })}
                    >
                        <ButtonIcon icon={Minus} />
                        <HitArea size="md" />
                    </Button>
                    <span class="w-12 text-center text-xs font-medium text-strong tabular-nums">
                        {interactiveValue === null ? "Auto" : `${interactiveValue}%`}
                    </span>
                    <Button
                        variant="secondary"
                        size="xs"
                        iconOnly
                        aria-label="Increase progress by 10%"
                        disabled={interactiveValue === 100}
                        onclick={() => stepValue(10)}
                        {@attach tooltip({ text: "Increase by 10%" })}
                    >
                        <ButtonIcon icon={Plus} />
                        <HitArea size="md" />
                    </Button>
                </div>
            </div>

            <SegmentedControl
                size="sm"
                width="equal"
                bind:value={interactiveAppearance}
                aria-label="Progress appearance"
            >
                {#each PROGRESS_APPEARANCES as appearance (appearance)}
                    <SegmentedControlItem value={appearance}>
                        <SegmentedControlLabel>{appearanceLabels[appearance]}</SegmentedControlLabel>
                    </SegmentedControlItem>
                {/each}
            </SegmentedControl>

            <Progress
                appearance={interactiveAppearance}
                variant="soft"
                size="md"
                value={interactiveValue}
                aria-label="{appearanceLabels[interactiveAppearance]} interactive progress"
            />
        </div>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Soft blends into standard surfaces; elevated adds surface depth and active fill shadow."
        code={variantsCode}
    >
        <div class="w-full max-w-lg flex flex-col gap-5">
            {#each PROGRESS_VARIANTS as variant (variant)}
                {#if variant === "soft"}
                    <div class="flex flex-col gap-3 px-4 py-3">
                        <span class="text-xs font-medium text-weak">{variantLabels[variant]}</span>
                        <div class="flex flex-col gap-3">
                            {#each PROGRESS_APPEARANCES as appearance (appearance)}
                                <Progress
                                    {appearance}
                                    {variant}
                                    size="md"
                                    value={65}
                                    aria-label="{variantLabels[variant]} {appearance}"
                                />
                            {/each}
                        </div>
                    </div>
                {:else}
                    <SunkenWell class="w-full flex-col items-stretch gap-3 px-4 py-4">
                        <span class="text-xs font-medium text-weak">{variantLabels[variant]}</span>
                        <div class="flex flex-col gap-3">
                            {#each PROGRESS_APPEARANCES as appearance (appearance)}
                                <Progress
                                    {appearance}
                                    {variant}
                                    size="md"
                                    value={65}
                                    aria-label="{variantLabels[variant]} {appearance}"
                                />
                            {/each}
                        </div>
                    </SunkenWell>
                {/if}
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Colors"
        description="Five semantic fill colors shared across all appearances."
        code={colorsCode}
    >
        <div class="w-full max-w-lg flex flex-col gap-4">
            {#each PROGRESS_COLORS as color (color)}
                <div class="grid grid-cols-[72px_1fr_1fr] items-center gap-4">
                    <span class="text-xs font-medium text-weak">{colorLabels[color]}</span>
                    <Progress
                        appearance="bar"
                        variant="soft"
                        {color}
                        size="md"
                        value={70}
                        aria-label="{colorLabels[color]} bar progress"
                    />
                    <Progress
                        appearance="dashed"
                        variant="soft"
                        {color}
                        size="md"
                        value={60}
                        aria-label="{colorLabels[color]} dashed progress"
                    />
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five T-shirt sizes (xs to xl) with matching thickness and gap parity across bar, dashed, and dotted."
        code={sizesCode}
    >
        <div class="w-full max-w-lg flex flex-col gap-5">
            {#each PROGRESS_SIZES as size (size)}
                <div class="grid grid-cols-[36px_1fr] items-center gap-4">
                    <span class="text-xs font-medium text-weak uppercase">{size}</span>
                    <div class="flex flex-col gap-2.5">
                        {#each PROGRESS_APPEARANCES as appearance (appearance)}
                            <Progress
                                {appearance}
                                variant="soft"
                                {size}
                                value={60}
                                aria-label="{appearance} size {size}"
                            />
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Orientation & Custom Segments"
        description="Vertical orientation fills bottom-to-top; dashed and dotted appearances accept custom segment counts."
        code={orientationSegmentsCode}
    >
        <div class="w-full max-w-lg flex flex-col gap-8">
            <div class="flex flex-wrap items-center justify-around gap-8">
                <div class="flex flex-col items-center gap-2">
                    <div class="h-32 flex items-center">
                        <Progress
                            appearance="bar"
                            variant="soft"
                            size="md"
                            orientation="vertical"
                            value={70}
                            aria-label="Vertical bar progress"
                        />
                    </div>
                    <span class="text-xs text-weak">Bar (70%)</span>
                </div>

                <div class="flex flex-col items-center gap-2">
                    <div class="h-32 flex items-center">
                        <Progress
                            appearance="dashed"
                            variant="soft"
                            size="md"
                            orientation="vertical"
                            value={60}
                            aria-label="Vertical dashed progress"
                        />
                    </div>
                    <span class="text-xs text-weak">Dashed (60%)</span>
                </div>

                <div class="flex flex-col items-center gap-2">
                    <div class="h-32 flex items-center">
                        <Progress
                            appearance="dotted"
                            variant="soft"
                            size="md"
                            orientation="vertical"
                            segments={6}
                            value={66}
                            aria-label="Vertical dotted progress"
                        />
                    </div>
                    <span class="text-xs text-weak">Dotted (6 dots)</span>
                </div>

                <div class="flex flex-col items-center gap-2">
                    <div class="h-32 flex items-center">
                        <Progress
                            appearance="bar"
                            variant="soft"
                            size="md"
                            orientation="vertical"
                            aria-label="Vertical indeterminate bar"
                        />
                    </div>
                    <span class="text-xs text-weak">Indeterminate</span>
                </div>
            </div>

            <div class="flex flex-col gap-3">
                <div class="grid grid-cols-[96px_1fr] items-center gap-4">
                    <span class="text-xs font-medium text-weak">5 dashes</span>
                    <Progress
                        appearance="dashed"
                        variant="soft"
                        size="md"
                        segments={5}
                        value={60}
                        aria-label="5 dashes at 60%"
                    />
                </div>
                <div class="grid grid-cols-[96px_1fr] items-center gap-4">
                    <span class="text-xs font-medium text-weak">8 dashes</span>
                    <Progress
                        appearance="dashed"
                        variant="soft"
                        size="md"
                        segments={8}
                        value={60}
                        aria-label="8 dashes at 60%"
                    />
                </div>
                <div class="grid grid-cols-[96px_1fr] items-center gap-4">
                    <span class="text-xs font-medium text-weak">6 dots</span>
                    <Progress
                        appearance="dotted"
                        variant="soft"
                        size="md"
                        segments={6}
                        value={66}
                        aria-label="6 dots at 66%"
                    />
                </div>
                <div class="grid grid-cols-[96px_1fr] items-center gap-4">
                    <span class="text-xs font-medium text-weak">12 dots</span>
                    <Progress
                        appearance="dotted"
                        variant="soft"
                        size="md"
                        segments={12}
                        value={75}
                        aria-label="12 dots at 75%"
                    />
                </div>
            </div>
        </div>
    </PreviewSection>
</div>
