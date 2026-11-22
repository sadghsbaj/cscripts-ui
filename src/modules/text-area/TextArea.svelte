<script lang="ts">
    import type { TextAreaProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        resize = "vertical",
        rows = 3,
        cols,
        value = $bindable(""),
        onValueChange,
        invalid,
        disabled,
        readonly,
        class: className,
        oninput,
        ...rest
    }: TextAreaProps = $props();

    function handleInput(event: Event & { currentTarget: EventTarget & HTMLTextAreaElement }): void {
        oninput?.(event);
        onValueChange?.(event.currentTarget.value);
    }
</script>

<textarea
    bind:this={ref}
    {...rest}
    bind:value
    {rows}
    {cols}
    class={["cs-text-area", className]}
    {disabled}
    {readonly}
    aria-invalid={invalid ? "true" : undefined}
    data-variant={variant}
    data-size={size}
    data-resize={resize}
    data-invalid={invalid ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    data-readonly={readonly ? "" : undefined}
    oninput={handleInput}
></textarea>

<style>
    @layer components.primitive {
        .cs-text-area {
            --cs-text-area-fg: var(--cs-color-text-strong);
            --cs-text-area-placeholder-fg: var(--cs-color-text-weak);
            --cs-text-area-caret: auto;
            --cs-text-area-shadow: 0 0 #0000;
            --cs-text-area-shadow-hover: var(--cs-text-area-shadow);
            --cs-text-area-ring-shadow: inset 0 0 0 0px transparent;
            --cs-text-area-ring-shadow-hover: var(--cs-text-area-ring-shadow);
            --cs-text-area-line-height: var(--cs-leading-normal);

            display: block;
            min-width: 0;
            min-height: calc(var(--cs-text-area-padding-block) * 2 + 2lh);
            padding-inline: var(--cs-text-area-padding-inline);
            padding-block: var(--cs-text-area-padding-block);
            overflow: auto;
            scrollbar-gutter: auto;
            appearance: none;
            border: none;
            outline: none;
            font-family: inherit;
            font-size: var(--cs-text-area-font-size);
            line-height: var(--cs-text-area-line-height);
            color: var(--cs-text-area-fg);
            caret-color: var(--cs-text-area-caret);
            background-color: var(--cs-text-area-bg);
            border-radius: var(--cs-text-area-radius);
            corner-shape: var(--cs-squircle-soft);
            /* Composite ring before elevation shadow so the 2px inset ring paints above --cs-shadow-elevated. */
            box-shadow: var(--cs-text-area-ring-shadow), var(--cs-text-area-shadow);
            transition:
                box-shadow var(--cs-dur-120) var(--cs-ease-quart-out),
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                color var(--cs-dur-effect) var(--cs-ease-effect);
            cursor: text;

            &:not([cols]) {
                width: 100%;
            }

            &::placeholder {
                color: var(--cs-text-area-placeholder-fg);
                opacity: 1;
                transition: color var(--cs-dur-effect) var(--cs-ease-effect);
            }

            /* Override the global 50px thumb floor in scroll.css so compact textareas (e.g. 2 rows) keep proportional thumb scaling and draggable travel. */
            &::-webkit-scrollbar-thumb {
                min-width: 16px;
                min-height: 16px;
            }

            /* =========================================================
             * SIZES (sm - lg)
             * ========================================================= */
            &[data-size="sm"] {
                --cs-text-area-font-size: var(--cs-text-xs);
                --cs-text-area-padding-inline: 10px;
                --cs-text-area-padding-block: 7px;
                --cs-text-area-radius: 10px;
            }

            &[data-size="md"] {
                --cs-text-area-font-size: var(--cs-text-sm);
                --cs-text-area-padding-inline: 12px;
                --cs-text-area-padding-block: 8px;
                --cs-text-area-radius: 12px;
            }

            &[data-size="lg"] {
                --cs-text-area-font-size: var(--cs-text-sm);
                --cs-text-area-padding-inline: 14px;
                --cs-text-area-padding-block: 10px;
                --cs-text-area-radius: 13px;
            }

            /* =========================================================
             * VARIANTS
             * ========================================================= */
            &[data-variant="soft"] {
                --cs-text-area-bg: var(--cs-color-base-soft);
                --cs-text-area-bg-hover: var(--cs-color-base-soft-hover);
                --cs-text-area-shadow: 0 0 #0000;
                --cs-text-area-shadow-hover: 0 0 #0000;
            }

            &[data-variant="elevated"] {
                --cs-text-area-bg: var(--cs-color-elevated);
                --cs-text-area-bg-hover: var(--cs-color-elevated-hover);
                --cs-text-area-shadow: var(--cs-shadow-elevated);
                --cs-text-area-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            /* =========================================================
             * RESIZE
             * ========================================================= */
            &[data-resize="none"] {
                resize: none;
            }

            &[data-resize="vertical"] {
                resize: vertical;
            }

            &[data-resize="horizontal"] {
                resize: horizontal;
            }

            &[data-resize="both"] {
                resize: both;
            }

            /* =========================================================
             * AUTO-RESIZE ATTACHMENT COORDINATION
             * ========================================================= */
            &[data-auto-resize] {
                resize: none;
                min-width: var(--cs-auto-resize-min-width, 0);
                min-height: var(
                    --cs-auto-resize-min-height,
                    calc(var(--cs-text-area-padding-block) * 2 + var(--cs-auto-resize-min-rows, 2) * 1lh)
                );
                max-height: var(
                    --cs-auto-resize-max-height,
                    calc(var(--cs-text-area-padding-block) * 2 + var(--cs-auto-resize-max-rows) * 1lh)
                );
            }

            /* =========================================================
             * STATES
             * ========================================================= */
            @media (hover: hover) {
                &:hover:not(:disabled, [data-disabled]) {
                    background-color: var(--cs-text-area-bg-hover);
                    box-shadow: var(--cs-text-area-ring-shadow-hover), var(--cs-text-area-shadow-hover);
                }
            }

            &:focus:not(:disabled),
            &:focus-visible:not(:disabled) {
                outline: none;
                --cs-text-area-ring-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);
                --cs-text-area-ring-shadow-hover: inset 0 0 0 2px var(--cs-color-accent-solid);
            }

            &[data-invalid]:not(:disabled) {
                --cs-text-area-caret: var(--cs-color-negative-solid);
                --cs-text-area-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);
                --cs-text-area-ring-shadow-hover: inset 0 0 0 2px var(--cs-color-negative-solid);
            }

            &:disabled,
            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-text-area-fg: var(--cs-color-disabled-fg);
                --cs-text-area-placeholder-fg: var(--cs-color-disabled-fg);
                --cs-text-area-ring-shadow: inset 0 0 0 0px transparent;
                --cs-text-area-ring-shadow-hover: inset 0 0 0 0px transparent;
                resize: none;
                cursor: default;

                &[data-variant="soft"],
                &[data-variant="elevated"] {
                    --cs-text-area-bg: var(--cs-color-disabled-bg);
                    --cs-text-area-bg-hover: var(--cs-color-disabled-bg);
                    --cs-text-area-shadow: 0 0 #0000;
                    --cs-text-area-shadow-hover: 0 0 #0000;
                }
            }
        }
    }
</style>
