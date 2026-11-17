<script lang="ts">
    import { NumberMorph, type NumberMorphFormat } from "../number-morph/index.ts";
    import NumberStepper from "./NumberStepper.svelte";
    import NumberStepperDecrement from "./NumberStepperDecrement.svelte";
    import NumberStepperIncrement from "./NumberStepperIncrement.svelte";
    import NumberStepperInput from "./NumberStepperInput.svelte";
    import NumberStepperValue from "./NumberStepperValue.svelte";
    import type { NumberStepperOrientation, NumberStepperSize, NumberStepperVariant } from "./index.ts";

    export type NumberStepperTestMiddle = "none" | "input" | "input-morph" | "value" | "value-morph";

    interface Props {
        variant?: NumberStepperVariant;
        size?: NumberStepperSize;
        orientation?: NumberStepperOrientation;
        value?: number;
        strictControlled?: boolean;
        min?: number;
        max?: number;
        step?: number;
        defaultValue?: number;
        onValueChange?: (value: number) => void;
        disabled?: boolean;
        invalid?: boolean;
        middle?: NumberStepperTestMiddle;
        prefix?: string;
        suffix?: string;
        locales?: Intl.LocalesArgument;
        format?: Intl.NumberFormatOptions;
        decrementDisabled?: boolean;
        incrementDisabled?: boolean;
        inputDisabled?: boolean;
        inputReadonly?: boolean;
        ref?: HTMLDivElement | null;
        decrementRef?: HTMLButtonElement | null;
        incrementRef?: HTMLButtonElement | null;
        inputRef?: HTMLInputElement | null;
        valueRef?: HTMLElement | null;
        rootClass?: string;
        decrementClass?: string;
        incrementClass?: string;
        inputClass?: string;
        valueClass?: string;
        rootRest?: Record<string, unknown>;
        decrementRest?: Record<string, unknown>;
        incrementRest?: Record<string, unknown>;
        inputRest?: Record<string, unknown>;
        valueRest?: Record<string, unknown>;
    }

    let {
        variant = "soft",
        size = "md",
        orientation = "horizontal",
        value = $bindable(0),
        strictControlled = false,
        min,
        max,
        step = 1,
        defaultValue,
        onValueChange,
        disabled = false,
        invalid = false,
        middle = "none",
        prefix,
        suffix,
        locales,
        format,
        decrementDisabled = false,
        incrementDisabled = false,
        inputDisabled = false,
        inputReadonly = false,
        ref = $bindable(null),
        decrementRef = $bindable(null),
        incrementRef = $bindable(null),
        inputRef = $bindable(null),
        valueRef = $bindable(null),
        rootClass,
        decrementClass,
        incrementClass,
        inputClass,
        valueClass,
        rootRest = {},
        decrementRest = {},
        incrementRest = {},
        inputRest = {},
        valueRest = {},
    }: Props = $props();
</script>

{#snippet decrementBtn()}
    <NumberStepperDecrement
        bind:ref={decrementRef}
        disabled={decrementDisabled}
        class={decrementClass}
        {...decrementRest}
    />
{/snippet}

{#snippet incrementBtn()}
    <NumberStepperIncrement
        bind:ref={incrementRef}
        disabled={incrementDisabled}
        class={incrementClass}
        {...incrementRest}
    />
{/snippet}

{#snippet middleContent()}
    {#if middle === "input"}
        <NumberStepperInput
            bind:ref={inputRef}
            {prefix}
            {suffix}
            disabled={inputDisabled}
            readonly={inputReadonly}
            class={inputClass}
            {...inputRest}
        />
    {:else if middle === "input-morph"}
        <NumberStepperInput
            bind:ref={inputRef}
            {prefix}
            {suffix}
            disabled={inputDisabled}
            readonly={inputReadonly}
            class={inputClass}
            {...inputRest}
        >
            <NumberMorph {value} {locales} format={format as NumberMorphFormat | undefined} animated={false} />
        </NumberStepperInput>
    {:else if middle === "value"}
        <NumberStepperValue
            bind:ref={valueRef}
            {prefix}
            {suffix}
            {locales}
            {format}
            class={valueClass}
            {...valueRest}
        />
    {:else if middle === "value-morph"}
        <NumberStepperValue bind:ref={valueRef} class={valueClass} {...valueRest}>
            <NumberMorph {value} {prefix} {suffix} {locales} format={format as NumberMorphFormat | undefined} animated={false} />
        </NumberStepperValue>
    {/if}
{/snippet}

{#snippet stepperContent()}
    {#if orientation === "vertical"}
        {@render incrementBtn()}
        {@render middleContent()}
        {@render decrementBtn()}
    {:else}
        {@render decrementBtn()}
        {@render middleContent()}
        {@render incrementBtn()}
    {/if}
{/snippet}

{#if strictControlled}
    <NumberStepper
        bind:ref
        {variant}
        {size}
        {orientation}
        bind:value={() => value, () => {}}
        {min}
        {max}
        {step}
        {defaultValue}
        {onValueChange}
        {disabled}
        {invalid}
        class={rootClass}
        {...rootRest}
    >
        {@render stepperContent()}
    </NumberStepper>
{:else}
    <NumberStepper
        bind:ref
        {variant}
        {size}
        {orientation}
        bind:value
        {min}
        {max}
        {step}
        {defaultValue}
        {onValueChange}
        {disabled}
        {invalid}
        class={rootClass}
        {...rootRest}
    >
        {@render stepperContent()}
    </NumberStepper>
{/if}
