<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { getNumberStepperContext, type NumberStepperValueProps } from "./index.ts";

    let {
        ref = $bindable(null),
        prefix,
        suffix,
        format,
        locales,
        class: className,
        children,
        onclick,
        onkeydown,
        ...rest
    }: NumberStepperValueProps = $props();

    const ctx = getNumberStepperContext();
    if (ctx.orientation === "vertical") {
        throw new Error('NumberStepperValue cannot be used inside NumberStepper with orientation="vertical".');
    }

    const isResettable = $derived(ctx.defaultValue !== undefined);
    const isDisabled = $derived(ctx.disabled);

    const formattedNumber = $derived.by(() => {
        if (!format && !locales) return String(ctx.value);
        return new Intl.NumberFormat(locales, format).format(ctx.value);
    });

    const formattedText = $derived(`${prefix ?? ""}${formattedNumber}${suffix ?? ""}`);

    const defaultAriaLabel = $derived(
        t({
            de: `Wert: ${formattedText}. Klicken zum Zurücksetzen`,
            en: `Value: ${formattedText}. Click to reset`,
        })
    );

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || isDisabled) return;
        ctx.reset();
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || isDisabled) return;

        switch (event.key) {
            case "ArrowUp":
            case "ArrowRight": {
                event.preventDefault();
                ctx.increment();
                break;
            }
            case "ArrowDown":
            case "ArrowLeft": {
                event.preventDefault();
                ctx.decrement();
                break;
            }
        }
    }
</script>

{#if isResettable}
    <button
        bind:this={ref}
        aria-label={defaultAriaLabel}
        {...rest}
        type="button"
        disabled={isDisabled}
        class={["cs-number-stepper-value", className]}
        onclick={handleClick}
        onkeydown={handleKeyDown}
    >
        <span class="cs-number-stepper-value-text">
            {#if children}
                {@render children()}
            {:else}
                {formattedText}
            {/if}
        </span>
    </button>
{:else}
    <span bind:this={ref} {...rest} class={["cs-number-stepper-value", className]}>
        <span class="cs-number-stepper-value-text">
            {#if children}
                {@render children()}
            {:else}
                {formattedText}
            {/if}
        </span>
    </span>
{/if}

<style>
    @layer components.primitive {
        .cs-number-stepper-value {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: var(--cs-number-stepper-value-min-width);
            height: 100%;
            padding-inline: 8px;
            border: none;
            background-color: transparent;
            color: var(--cs-number-stepper-fg-strong);
            font: inherit;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            line-height: 1;
            cursor: default;
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        button.cs-number-stepper-value {
            &:focus-visible {
                z-index: 2;
            }

            @media (hover: hover) {
                &:hover:not(:disabled) {
                    background-color: var(--cs-number-stepper-btn-bg-hover);
                }
            }

            &:disabled {
                --cs-disabled-opacity: 1;
                color: var(--cs-number-stepper-fg-disabled);
            }
        }

        .cs-number-stepper-value-text {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-variant-numeric: tabular-nums;
            transition: scale var(--cs-dur-squash) var(--cs-ease-squash);

            button.cs-number-stepper-value:active:not(:disabled) & {
                scale: 0.93;
                transition: scale var(--cs-dur-press) var(--cs-ease-press);
            }
        }
    }
</style>
