<script lang="ts">
    import { Pipette } from "@lucide/svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { Button, ButtonIcon } from "../button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { getColorPickerContext, hasColorPickerContext } from "./color.context.ts";
    import { isEyeDropperSupported } from "./color.utils.ts";
    import type { ColorEyeDropperProps } from "./index.ts";

    interface EyeDropperResult {
        readonly sRGBHex: string;
    }

    interface EyeDropperInstance {
        open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
    }

    type EyeDropperConstructor = new () => EyeDropperInstance;

    function getEyeDropperConstructor(): EyeDropperConstructor | null {
        if (typeof window === "undefined") return null;
        const maybeEyeDropper = (window as Window & { EyeDropper?: unknown }).EyeDropper;
        if (typeof maybeEyeDropper !== "function") return null;
        return maybeEyeDropper as EyeDropperConstructor;
    }

    let {
        ref = $bindable<HTMLButtonElement | null>(null),
        variant,
        size,
        // eslint-disable-next-line no-useless-assignment -- $bindable() writes back to parent via `value = result.sRGBHex`
        value = $bindable<string | undefined>(),
        onPick,
        onError,
        unsupportedBehavior = "hide",
        disabled = false,
        label,
        children,
        onclick,
        title: titleProp,
        class: className,
        "aria-label": ariaLabelProp,
        "aria-labelledby": ariaLabelledByProp,
        ...rest
    }: ColorEyeDropperProps = $props();

    const pickerCtx = hasColorPickerContext() ? getColorPickerContext() : undefined;

    // Defer capability detection to mount so SSR and initial hydration stay deterministic.
    // eslint-disable-next-line svelte/prefer-writable-derived
    let supported = $state<boolean | null>(null);
    let picking = $state(false);
    let activeController: AbortController | null = null;

    $effect(() => {
        supported = isEyeDropperSupported();
    });

    const shouldRender = $derived(unsupportedBehavior === "disable" || supported === true);
    const isUnsupportedDisabled = $derived(unsupportedBehavior === "disable" && supported !== true);
    const effectiveDisabled = $derived(
        Boolean(disabled || pickerCtx?.disabled || pickerCtx?.readonly || isUnsupportedDisabled)
    );
    const needsHitArea = $derived(!children && size !== "xl");

    const resolvedAriaLabel = $derived(
        label ??
            ariaLabelProp ??
            (ariaLabelledByProp || children
                ? undefined
                : t({ de: "Farbe aus Bildschirm wählen", en: "Pick color from screen" }))
    );

    const resolvedTitle = $derived(
        titleProp ??
            (isUnsupportedDisabled
                ? t({
                      de: "Pipette wird in diesem Browser nicht unterstützt",
                      en: "EyeDropper is not supported in this browser",
                  })
                : undefined)
    );

    function abortActiveController(): void {
        activeController?.abort();
    }

    $effect(() => {
        if (effectiveDisabled && activeController) {
            activeController.abort();
        }
    });

    $effect(() => abortActiveController);

    async function handleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
    ): Promise<void> {
        onclick?.(event);
        if (event.defaultPrevented) return;
        if (effectiveDisabled || picking || !isEyeDropperSupported()) return;

        const EyeDropperCtor = getEyeDropperConstructor();
        if (!EyeDropperCtor) return;

        const controller = new AbortController();
        activeController = controller;
        picking = true;

        try {
            const result = await new EyeDropperCtor().open({ signal: controller.signal });
            if (controller.signal.aborted) return;
            value = result.sRGBHex;
            pickerCtx?.setString(result.sRGBHex, { commit: true });
            onPick?.(result.sRGBHex);
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }
            onError?.(error);
        } finally {
            if (activeController === controller) {
                activeController = null;
            }
            picking = false;
        }
    }
</script>

{#if shouldRender}
    <!-- eslint-disable-next-line button/require-structure -- iconOnly is dynamic (!children); consumer children supply their own structure -->
    <Button
        bind:ref
        {variant}
        {size}
        iconOnly={!children}
        disabled={effectiveDisabled}
        aria-disabled={isUnsupportedDisabled ? "true" : undefined}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        title={resolvedTitle}
        data-picking={picking ? "" : undefined}
        data-unsupported={supported === false ? "" : undefined}
        onclick={handleClick}
        {...rest}
        class={["cs-color-eye-dropper", className]}
    >
        {#if children}
            {@render children()}
        {:else}
            <ButtonIcon icon={Pipette} />
            {#if needsHitArea}
                <HitArea size="md" />
            {/if}
        {/if}
    </Button>
{/if}

<style>
    @layer components.primitive {
        :global(.cs-color-eye-dropper) {
            transition:
                color var(--cs-dur-effect) var(--cs-ease-effect),
                background-color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        :global(.cs-color-eye-dropper[data-picking]:not([data-variant="primary"])) {
            --cs-button-bg: var(--cs-color-accent-soft);
            --cs-button-bg-hover: var(--cs-color-accent-soft-hover);
            --cs-button-fg: var(--cs-color-accent-soft-fg);
            --cs-button-fg-hover: var(--cs-color-accent-soft-fg);
        }
    }
</style>
