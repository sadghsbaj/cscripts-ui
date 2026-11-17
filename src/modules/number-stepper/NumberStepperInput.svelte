<script lang="ts">
    import { getNumberStepperContext, type NumberStepperInputProps } from "./index.ts";

    let {
        ref = $bindable(null),
        prefix,
        suffix,
        disabled = false,
        readonly = false,
        class: className,
        children,
        onfocus,
        onblur,
        oninput,
        onchange,
        onkeydown,
        ...rest
    }: NumberStepperInputProps = $props();

    const ctx = getNumberStepperContext();
    if (ctx.orientation === "vertical") {
        throw new Error('NumberStepperInput cannot be used inside NumberStepper with orientation="vertical".');
    }

    let isEditing = $state(false);
    let draft = $state("");

    const isDisabled = $derived(Boolean(disabled) || ctx.disabled);
    const hasDecimalStep = $derived(
        !Number.isSafeInteger(ctx.step) || (ctx.min !== undefined && !Number.isSafeInteger(ctx.min))
    );
    const displayValue = $derived(isEditing ? draft : String(ctx.value));

    let prevValue = ctx.value;
    $effect(() => {
        const current = ctx.value;
        if (current === prevValue) return;
        prevValue = current;
        if (isEditing) {
            const next = String(current);
            draft = next;
            if (ref && ref.value !== next) ref.value = next;
        }
    });

    function commitDraft(raw: string): void {
        const trimmed = raw.trim();
        if (trimmed !== "") {
            const parsed = Number(trimmed);
            if (Number.isFinite(parsed)) {
                ctx.commitValue(parsed);
            }
        }
        isEditing = false;
        const next = String(ctx.value);
        draft = next;
        // Ensure DOM value resets even when Svelte's reactive displayValue didn't net-change within the same tick.
        if (ref) ref.value = next;
    }

    function handleFocus(event: FocusEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        onfocus?.(event);
        isEditing = true;
        draft = String(ctx.value);
        event.currentTarget.select();
    }

    function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        oninput?.(event);
        draft = event.currentTarget.value;
    }

    function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        onchange?.(event);
        commitDraft(event.currentTarget.value);
    }

    function handleBlur(event: FocusEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        onblur?.(event);
        if (!isEditing) return;
        commitDraft(event.currentTarget.value);
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented || isDisabled || readonly) return;

        switch (event.key) {
            case "ArrowUp": {
                event.preventDefault();
                if (isEditing && draft.trim() !== String(ctx.value)) {
                    commitDraft(draft);
                    isEditing = true;
                }
                ctx.increment();
                draft = String(ctx.value);
                break;
            }
            case "ArrowDown": {
                event.preventDefault();
                if (isEditing && draft.trim() !== String(ctx.value)) {
                    commitDraft(draft);
                    isEditing = true;
                }
                ctx.decrement();
                draft = String(ctx.value);
                break;
            }
            case "Home": {
                if (ctx.min !== undefined && Number.isFinite(ctx.min)) {
                    event.preventDefault();
                    ctx.commitValue(ctx.min);
                    draft = String(ctx.value);
                }
                break;
            }
            case "End": {
                if (ctx.max !== undefined && Number.isFinite(ctx.max)) {
                    event.preventDefault();
                    ctx.commitValue(ctx.max);
                    draft = String(ctx.value);
                }
                break;
            }
            case "Enter": {
                event.preventDefault();
                commitDraft(event.currentTarget.value);
                event.currentTarget.blur();
                break;
            }
            case "Escape": {
                event.preventDefault();
                isEditing = false;
                draft = String(ctx.value);
                event.currentTarget.value = String(ctx.value);
                event.currentTarget.blur();
                break;
            }
        }
    }
</script>

{#snippet inputField()}
    <input
        bind:this={ref}
        {...rest}
        type="text"
        inputmode={hasDecimalStep ? "decimal" : "numeric"}
        role="spinbutton"
        aria-valuenow={ctx.value}
        aria-valuemin={ctx.min}
        aria-valuemax={ctx.max}
        aria-invalid={ctx.invalid ? "true" : undefined}
        value={displayValue}
        disabled={isDisabled}
        {readonly}
        class={["cs-number-stepper-field", className]}
        onfocus={handleFocus}
        oninput={handleInput}
        onchange={handleChange}
        onblur={handleBlur}
        onkeydown={handleKeyDown}
    />
{/snippet}

<label
    class="cs-number-stepper-input-shell"
    data-has-suffix={suffix ? "" : undefined}
    data-has-display={children ? "" : undefined}
    data-editing={isEditing ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
>
    {#if prefix}
        <span class="cs-number-stepper-unit" aria-hidden="true">{prefix}</span>
    {/if}
    {#if children}
        <span class="cs-number-stepper-input-stage">
            {@render inputField()}
            <span class="cs-number-stepper-input-display" aria-hidden="true">
                {@render children()}
            </span>
        </span>
    {:else}
        {@render inputField()}
    {/if}
    {#if suffix}
        <span class="cs-number-stepper-unit" aria-hidden="true">{suffix}</span>
    {/if}
</label>

<style>
    @layer components.primitive {
        .cs-number-stepper-input-shell {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 2px;
            height: calc(var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2);
            padding-inline: var(--cs-number-stepper-well-px);
            background-color: var(--cs-number-stepper-well-bg);
            border-radius: calc((var(--cs-number-stepper-height) - var(--cs-number-stepper-pad) * 2) / 2);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-number-stepper-well-shadow);
            cursor: text;
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                box-shadow var(--cs-dur-effect) var(--cs-ease-effect);

            &::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 1;
                border-radius: inherit;
                corner-shape: inherit;
                box-shadow: var(--cs-number-stepper-well-ring);
                pointer-events: none;
                transition: box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);
            }

            @media (hover: hover) {
                &:hover:not([data-disabled]):not(:focus-within) {
                    background-color: var(--cs-number-stepper-well-bg-hover);
                    box-shadow: var(--cs-number-stepper-well-shadow-hover);
                }
            }

            &:focus-within:not([data-disabled]) {
                --cs-number-stepper-well-ring: inset 0 0 0 2px var(--cs-color-accent-solid);
            }

            :global(.cs-number-stepper[data-invalid]:not([data-disabled])) & {
                --cs-number-stepper-well-ring: inset 0 0 0 2px var(--cs-color-negative-solid);
                --cs-number-stepper-well-caret: var(--cs-color-negative-solid);
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                cursor: default;
            }
        }

        .cs-number-stepper-input-stage {
            display: grid;
            align-items: baseline;
            height: 100%;
        }

        .cs-number-stepper-field {
            field-sizing: content;
            min-width: 3ch;
            padding: 0;
            margin: 0;
            border: none;
            outline: none;
            background: transparent;
            color: var(--cs-number-stepper-fg-strong);
            font: inherit;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            letter-spacing: inherit;
            line-height: normal;
            text-align: center;
            caret-color: var(--cs-number-stepper-well-caret, var(--cs-color-accent-solid));

            .cs-number-stepper-input-stage > & {
                grid-area: 1 / 1;
                height: 100%;
            }

            /* Suppress global :focus-visible outline; shell::after renders the focus ring */
            &:focus-visible {
                outline: none;
            }

            .cs-number-stepper-input-shell[data-has-suffix] & {
                min-width: 2ch;
                text-align: right;
            }

            .cs-number-stepper-input-shell[data-disabled] & {
                --cs-disabled-opacity: 1;
                color: var(--cs-color-disabled-fg);
                cursor: default;
            }

            .cs-number-stepper-input-shell[data-has-display]:not([data-editing]) & {
                color: transparent;
                caret-color: transparent;
            }
        }

        .cs-number-stepper-input-display {
            grid-area: 1 / 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 3ch;
            color: var(--cs-number-stepper-fg-strong);
            font: inherit;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            letter-spacing: inherit;
            line-height: normal;
            text-align: center;
            --cs-number-morph-char-height: 1.2em;
            pointer-events: none;
            user-select: none;

            .cs-number-stepper-input-shell[data-has-suffix] & {
                min-width: 2ch;
                justify-content: flex-end;
                text-align: right;
            }

            .cs-number-stepper-input-shell[data-disabled] & {
                --cs-disabled-opacity: 1;
                color: var(--cs-color-disabled-fg);
            }

            .cs-number-stepper-input-shell[data-editing] & {
                opacity: 0;
                visibility: hidden;
            }
        }

        .cs-number-stepper-unit {
            color: var(--cs-color-text-weak);
            font-weight: 500;
            line-height: 1;
            pointer-events: none;
            user-select: none;
            flex-shrink: 0;

            .cs-number-stepper-input-shell[data-disabled] & {
                color: var(--cs-color-disabled-fg);
            }
        }
    }
</style>
