<script module>
    export const id = "number-stepper";
    export const label = "Number-Stepper";
</script>

<script lang="ts">
    import { ZoomIn, ZoomOut } from "@lucide/svelte";
    import { NumberMorph } from "cs/svelte/number-morph";
    import {
        NUMBER_STEPPER_SIZES,
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
        NumberStepperInput,
        NumberStepperValue,
        type NumberStepperSize,
    } from "cs/svelte/number-stepper";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let softValue = $state(100);
    let elevatedValue = $state(24);

    let zoomMorphValue = $state(100);
    let plainReadoutValue = $state(4);

    let horizontalIconValue = $state(100);
    let verticalIconValue = $state(100);

    let sizeValues = $state<Record<NumberStepperSize, number>>({
        xs: 10,
        sm: 20,
        md: 30,
        lg: 40,
        xl: 50,
    });

    let boundaryValue = $state(0);
    let disabledValue = $state(42);
    let invalidValue = $state(120);
    let decimalValue = $state(1.5);

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const variantsCode = `<script lang="ts">
    import {
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
        NumberStepperInput,
    } from "cs/svelte/number-stepper";

    let opacity = $state(100);
    let radius = $state(24);
${closeScript}

<NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={100} defaultValue={100} bind:value={opacity}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="%" aria-label="Opacity" />
    <NumberStepperIncrement />
</NumberStepper>

<NumberStepper variant="elevated" size="md" orientation="horizontal" min={0} max={999} defaultValue={24} bind:value={radius}>
    <NumberStepperDecrement />
    <NumberStepperInput prefix="$" aria-label="Budget" />
    <NumberStepperIncrement />
</NumberStepper>`;

    const valueMorphCode = `<script lang="ts">
    import { NumberMorph } from "cs/svelte/number-morph";
    import {
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
        NumberStepperValue,
    } from "cs/svelte/number-stepper";

    let zoom = $state(100);
${closeScript}

<NumberStepper
    variant="soft"
    size="md"
    orientation="horizontal"
    min={25}
    max={400}
    step={25}
    defaultValue={100}
    bind:value={zoom}
>
    <NumberStepperDecrement />
    <NumberStepperValue>
        <NumberMorph value={zoom} suffix="%" willChange />
    </NumberStepperValue>
    <NumberStepperIncrement />
</NumberStepper>`;

    const iconOnlyCode = `<NumberStepper variant="soft" size="md" orientation="horizontal" min={25} max={200} step={25} bind:value={zoom}>
    <NumberStepperDecrement icon={ZoomOut} aria-label="Zoom out" />
    <NumberStepperIncrement icon={ZoomIn} aria-label="Zoom in" />
</NumberStepper>

<NumberStepper variant="elevated" size="md" orientation="vertical" min={25} max={200} step={25} bind:value={zoom}>
    <NumberStepperDecrement icon={ZoomOut} aria-label="Zoom out" />
    <NumberStepperIncrement icon={ZoomIn} aria-label="Zoom in" />
</NumberStepper>`;

    const sizesCode = `<NumberStepper variant="soft" size="xs" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="sm" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="md" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="lg" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="xl" orientation="horizontal" bind:value={val}>...</NumberStepper>`;

    const statesCode = `<!-- Boundary disabled at min={0} -->
<NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={5} bind:value={count}>
    <NumberStepperDecrement />
    <NumberStepperInput aria-label="Count" />
    <NumberStepperIncrement />
</NumberStepper>

<!-- Whole-stepper disabled -->
<NumberStepper variant="soft" size="md" orientation="horizontal" disabled bind:value={locked}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="px" aria-label="Locked size" />
    <NumberStepperIncrement />
</NumberStepper>

<!-- Invalid state -->
<NumberStepper variant="soft" size="md" orientation="horizontal" invalid bind:value={invalidValue}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="%" aria-label="Invalid percentage" />
    <NumberStepperIncrement />
</NumberStepper>

<!-- Decimal stepping -->
<NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={10} step={0.5} bind:value={scale}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="x" aria-label="Scale factor" />
    <NumberStepperIncrement />
</NumberStepper>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="NumberStepper"
        description="Compound numeric stepper with editable input wells, click-to-reset readouts, NumberMorph composition, and icon-only horizontal or vertical pairs."
    />

    <PreviewSection
        title="Variants & Editable Input"
        description="Soft and elevated shells with NumberStepperInput, prefix/suffix affixes, and middle-click reset to defaultValue."
        code={variantsCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">soft (suffix %, middle-click resets to 100)</span>
                <NumberStepper
                    variant="soft"
                    size="md"
                    orientation="horizontal"
                    min={0}
                    max={100}
                    defaultValue={100}
                    bind:value={softValue}
                >
                    <NumberStepperDecrement />
                    <NumberStepperInput suffix="%" aria-label="Opacity" />
                    <NumberStepperIncrement />
                </NumberStepper>
            </div>

            <SunkenWell>
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">elevated (prefix $, middle-click resets to 24)</span>
                    <NumberStepper
                        variant="elevated"
                        size="md"
                        orientation="horizontal"
                        min={0}
                        max={999}
                        defaultValue={24}
                        bind:value={elevatedValue}
                    >
                        <NumberStepperDecrement />
                        <NumberStepperInput prefix="$" aria-label="Budget" />
                        <NumberStepperIncrement />
                    </NumberStepper>
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Read-Only Value & NumberMorph"
        description="NumberStepperValue composes cleanly with NumberMorph and becomes a click-to-reset button when defaultValue is set."
        code={valueMorphCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">With NumberMorph + click-to-reset (defaultValue={100})</span>
                <NumberStepper
                    variant="soft"
                    size="md"
                    orientation="horizontal"
                    min={25}
                    max={400}
                    step={25}
                    defaultValue={100}
                    bind:value={zoomMorphValue}
                >
                    <NumberStepperDecrement />
                    <NumberStepperValue>
                        <NumberMorph value={zoomMorphValue} suffix="%" willChange />
                    </NumberStepperValue>
                    <NumberStepperIncrement />
                </NumberStepper>
            </div>

            <SunkenWell>
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Plain NumberStepperValue (no defaultValue)</span>
                    <NumberStepper
                        variant="elevated"
                        size="md"
                        orientation="horizontal"
                        min={1}
                        max={12}
                        bind:value={plainReadoutValue}
                    >
                        <NumberStepperDecrement />
                        <NumberStepperValue suffix=" cols" />
                        <NumberStepperIncrement />
                    </NumberStepper>
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Icon-Only (Horizontal & Vertical)"
        description="Omit NumberStepperInput and NumberStepperValue for compact trigger pairs. Vertical orientation stacks Increment on top of Decrement."
        code={iconOnlyCode}
    >
        <div class="flex flex-wrap items-center gap-8">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">horizontal ({horizontalIconValue}%)</span>
                <NumberStepper
                    variant="soft"
                    size="md"
                    orientation="horizontal"
                    min={25}
                    max={200}
                    step={25}
                    defaultValue={100}
                    bind:value={horizontalIconValue}
                >
                    <NumberStepperDecrement icon={ZoomOut} aria-label="Zoom out" />
                    <NumberStepperIncrement icon={ZoomIn} aria-label="Zoom in" />
                </NumberStepper>
            </div>

            <SunkenWell>
                <div class="flex items-center gap-4">
                    <NumberStepper
                        variant="elevated"
                        size="md"
                        orientation="vertical"
                        min={25}
                        max={200}
                        step={25}
                        defaultValue={100}
                        bind:value={verticalIconValue}
                    >
                        <NumberStepperDecrement icon={ZoomOut} aria-label="Zoom out" />
                        <NumberStepperIncrement icon={ZoomIn} aria-label="Zoom in" />
                    </NumberStepper>
                    <div class="flex flex-col gap-0.5">
                        <span class="text-xs font-medium text-weak">vertical</span>
                        <span class="text-sm font-semibold tabular-nums">{verticalIconValue}%</span>
                    </div>
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five T-shirt sizes (xs–xl, 28px–44px) matching Button and TextInput heights 1:1."
        code={sizesCode}
    >
        <div class="flex flex-col items-start gap-3">
            {#each NUMBER_STEPPER_SIZES as size (size)}
                <div class="flex items-center gap-3">
                    <span class="w-6 text-xs font-medium text-weak uppercase">{size}</span>
                    <NumberStepper variant="soft" {size} orientation="horizontal" min={0} max={100} bind:value={sizeValues[size]}>
                        <NumberStepperDecrement />
                        <NumberStepperInput suffix="%" aria-label="Size {size}" />
                        <NumberStepperIncrement />
                    </NumberStepper>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="States & Decimal Stepping"
        description="Automatic boundary disabling at min/max, whole-control disabled, invalid ring feedback, and floating-point-safe decimal steps."
        code={statesCode}
    >
        <div class="flex flex-wrap items-start gap-6">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Boundary disabled (min=0, max=5)</span>
                <NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={5} bind:value={boundaryValue}>
                    <NumberStepperDecrement />
                    <NumberStepperInput aria-label="Boundary count" />
                    <NumberStepperIncrement />
                </NumberStepper>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Disabled (soft)</span>
                <NumberStepper variant="soft" size="md" orientation="horizontal" disabled bind:value={disabledValue}>
                    <NumberStepperDecrement />
                    <NumberStepperInput suffix="px" aria-label="Disabled soft" />
                    <NumberStepperIncrement />
                </NumberStepper>
            </div>

            <SunkenWell>
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Disabled (elevated)</span>
                    <NumberStepper variant="elevated" size="md" orientation="horizontal" disabled bind:value={disabledValue}>
                        <NumberStepperDecrement />
                        <NumberStepperInput suffix="px" aria-label="Disabled elevated" />
                        <NumberStepperIncrement />
                    </NumberStepper>
                </div>
            </SunkenWell>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Invalid</span>
                <NumberStepper variant="soft" size="md" orientation="horizontal" invalid bind:value={invalidValue}>
                    <NumberStepperDecrement />
                    <NumberStepperInput suffix="%" aria-label="Invalid percentage" />
                    <NumberStepperIncrement />
                </NumberStepper>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Decimal step (step=0.5)</span>
                <NumberStepper
                    variant="soft"
                    size="md"
                    orientation="horizontal"
                    min={0}
                    max={10}
                    step={0.5}
                    defaultValue={1.5}
                    bind:value={decimalValue}
                >
                    <NumberStepperDecrement />
                    <NumberStepperInput suffix="x" aria-label="Scale factor" />
                    <NumberStepperIncrement />
                </NumberStepper>
            </div>
        </div>
    </PreviewSection>
</div>
