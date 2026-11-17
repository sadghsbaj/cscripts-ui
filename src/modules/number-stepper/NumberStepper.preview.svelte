<script module>
    export const id = "number-stepper";
    export const label = "Number-Stepper";
</script>

<script lang="ts">
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
    let colsMorphValue = $state(4);

    let horizontalIconValue = $state(50);
    let verticalIconValue = $state(50);

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
    import { NumberMorph } from "cs/svelte/number-morph";
    import {
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
        NumberStepperInput,
    } from "cs/svelte/number-stepper";

    let opacity = $state(100);
    let budget = $state(24);
${closeScript}

<NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={100} defaultValue={100} bind:value={opacity}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="%" aria-label="Opacity">
        <NumberMorph value={opacity} willChange />
    </NumberStepperInput>
    <NumberStepperIncrement />
</NumberStepper>

<NumberStepper variant="elevated" size="md" orientation="horizontal" min={0} max={999} defaultValue={24} bind:value={budget}>
    <NumberStepperDecrement />
    <NumberStepperInput prefix="$" aria-label="Budget">
        <NumberMorph value={budget} willChange />
    </NumberStepperInput>
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
    let cols = $state(4);
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
</NumberStepper>

<NumberStepper variant="elevated" size="md" orientation="horizontal" min={1} max={12} bind:value={cols}>
    <NumberStepperDecrement />
    <NumberStepperValue>
        <NumberMorph value={cols} suffix=" cols" willChange />
    </NumberStepperValue>
    <NumberStepperIncrement />
</NumberStepper>`;

    const iconOnlyCode = `<NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={100} step={10} defaultValue={50} bind:value={horizontalVal}>
    <NumberStepperDecrement />
    <NumberStepperIncrement />
</NumberStepper>

<NumberStepper variant="elevated" size="md" orientation="vertical" min={0} max={100} step={10} defaultValue={50} bind:value={verticalVal}>
    <NumberStepperIncrement />
    <NumberStepperDecrement />
</NumberStepper>`;

    const sizesCode = `<NumberStepper variant="soft" size="xs" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="sm" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="md" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="lg" orientation="horizontal" bind:value={val}>...</NumberStepper>
<NumberStepper variant="soft" size="xl" orientation="horizontal" bind:value={val}>...</NumberStepper>`;

    const statesCode = `<!-- Boundary disabled at min={0} -->
<NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={5} bind:value={count}>
    <NumberStepperDecrement />
    <NumberStepperInput aria-label="Count">
        <NumberMorph value={count} willChange />
    </NumberStepperInput>
    <NumberStepperIncrement />
</NumberStepper>

<!-- Whole-stepper disabled -->
<NumberStepper variant="soft" size="md" orientation="horizontal" disabled bind:value={locked}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="px" aria-label="Locked size">
        <NumberMorph value={locked} willChange />
    </NumberStepperInput>
    <NumberStepperIncrement />
</NumberStepper>

<!-- Invalid state -->
<NumberStepper variant="soft" size="md" orientation="horizontal" invalid bind:value={invalidValue}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="%" aria-label="Invalid percentage">
        <NumberMorph value={invalidValue} willChange />
    </NumberStepperInput>
    <NumberStepperIncrement />
</NumberStepper>

<!-- Decimal stepping -->
<NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={10} step={0.5} defaultValue={1.5} bind:value={scale}>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="x" aria-label="Scale factor">
        <NumberMorph value={scale} willChange />
    </NumberStepperInput>
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
                <NumberStepperInput suffix="%" aria-label="Opacity">
                    <NumberMorph value={softValue} willChange />
                </NumberStepperInput>
                <NumberStepperIncrement />
            </NumberStepper>

            <SunkenWell>
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
                    <NumberStepperInput prefix="$" aria-label="Budget">
                        <NumberMorph value={elevatedValue} willChange />
                    </NumberStepperInput>
                    <NumberStepperIncrement />
                </NumberStepper>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Read-Only Value & NumberMorph"
        description="NumberStepperValue composes with NumberMorph and becomes a click-to-reset button when defaultValue is set."
        code={valueMorphCode}
    >
        <div class="flex flex-wrap items-center gap-6">
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

            <SunkenWell>
                <NumberStepper
                    variant="elevated"
                    size="md"
                    orientation="horizontal"
                    min={1}
                    max={12}
                    bind:value={colsMorphValue}
                >
                    <NumberStepperDecrement />
                    <NumberStepperValue>
                        <NumberMorph value={colsMorphValue} suffix=" cols" willChange />
                    </NumberStepperValue>
                    <NumberStepperIncrement />
                </NumberStepper>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Icon-Only (Horizontal & Vertical)"
        description="Omit NumberStepperInput and NumberStepperValue for compact trigger pairs. Vertical orientation stacks Increment on top of Decrement."
        code={iconOnlyCode}
    >
        <div class="flex flex-wrap items-center gap-8">
            <div class="flex items-center gap-3">
                <NumberStepper
                    variant="soft"
                    size="md"
                    orientation="horizontal"
                    min={0}
                    max={100}
                    step={10}
                    defaultValue={50}
                    bind:value={horizontalIconValue}
                >
                    <NumberStepperDecrement />
                    <NumberStepperIncrement />
                </NumberStepper>
                <NumberMorph value={horizontalIconValue} suffix="%" willChange class="text-sm font-semibold" />
            </div>

            <SunkenWell>
                <div class="flex items-center gap-4">
                    <NumberStepper
                        variant="elevated"
                        size="md"
                        orientation="vertical"
                        min={0}
                        max={100}
                        step={10}
                        defaultValue={50}
                        bind:value={verticalIconValue}
                    >
                        <NumberStepperIncrement />
                        <NumberStepperDecrement />
                    </NumberStepper>
                    <NumberMorph value={verticalIconValue} suffix="%" willChange class="text-sm font-semibold" />
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five T-shirt sizes (xs–xl, 28px–44px) matching Button and TextInput heights 1:1."
        code={sizesCode}
    >
        <div class="flex flex-wrap items-center gap-4">
            {#each NUMBER_STEPPER_SIZES as size (size)}
                <NumberStepper variant="soft" {size} orientation="horizontal" min={0} max={100} bind:value={sizeValues[size]}>
                    <NumberStepperDecrement />
                    <NumberStepperValue>
                        <NumberMorph value={sizeValues[size]} suffix="%" willChange />
                    </NumberStepperValue>
                    <NumberStepperIncrement />
                </NumberStepper>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="States & Decimal Stepping"
        description="Automatic boundary disabling at min/max, whole-control disabled, invalid ring feedback, and floating-point-safe decimal steps."
        code={statesCode}
    >
        <div class="flex flex-wrap items-center gap-4">
            <NumberStepper variant="soft" size="md" orientation="horizontal" min={0} max={5} bind:value={boundaryValue}>
                <NumberStepperDecrement />
                <NumberStepperInput aria-label="Boundary count">
                    <NumberMorph value={boundaryValue} willChange />
                </NumberStepperInput>
                <NumberStepperIncrement />
            </NumberStepper>

            <NumberStepper variant="soft" size="md" orientation="horizontal" disabled bind:value={disabledValue}>
                <NumberStepperDecrement />
                <NumberStepperInput suffix="px" aria-label="Disabled soft">
                    <NumberMorph value={disabledValue} willChange />
                </NumberStepperInput>
                <NumberStepperIncrement />
            </NumberStepper>

            <SunkenWell>
                <NumberStepper variant="elevated" size="md" orientation="horizontal" disabled bind:value={disabledValue}>
                    <NumberStepperDecrement />
                    <NumberStepperInput suffix="px" aria-label="Disabled elevated">
                        <NumberMorph value={disabledValue} willChange />
                    </NumberStepperInput>
                    <NumberStepperIncrement />
                </NumberStepper>
            </SunkenWell>

            <NumberStepper variant="soft" size="md" orientation="horizontal" invalid bind:value={invalidValue}>
                <NumberStepperDecrement />
                <NumberStepperInput suffix="%" aria-label="Invalid percentage">
                    <NumberMorph value={invalidValue} willChange />
                </NumberStepperInput>
                <NumberStepperIncrement />
            </NumberStepper>

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
                <NumberStepperInput suffix="x" aria-label="Scale factor">
                    <NumberMorph value={decimalValue} willChange />
                </NumberStepperInput>
                <NumberStepperIncrement />
            </NumberStepper>
        </div>
    </PreviewSection>
</div>
