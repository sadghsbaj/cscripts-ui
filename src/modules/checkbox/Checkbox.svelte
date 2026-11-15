<script lang="ts">
    import { type CheckboxProps } from ".";

    let {
        ref = $bindable(null),
        variant,
        size,
        checked = $bindable(),
        indeterminate = $bindable(),
        invalid,
        class: className,
        ...rest
    }: CheckboxProps = $props();

    const uid = $props.id();
    const anchorName = `--cs-checkbox-${uid}`;
</script>

<input
    bind:this={ref}
    {...rest}
    type="checkbox"
    bind:checked
    bind:indeterminate
    aria-invalid={invalid ? "true" : undefined}
    class={["cs-checkbox", className]}
    data-variant={variant}
    data-size={size}
    style:anchor-name={anchorName}
/>

<svg
    class="cs-checkbox-icon"
    style:position-anchor={anchorName}
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
>
    <path class="cs-checkbox-check" d="M4 12l5 5L20 6" pathLength="1" />
    <path class="cs-checkbox-dash" d="M5 12h14" pathLength="1" />
</svg>

<style>
    @layer components.primitive {
        .cs-checkbox {
            /* =========================================================
            * CHECKED INTENT (Accent by default, overridden by [aria-invalid])
            * ========================================================= */
            --cs-checkbox-bg-checked: var(--cs-color-accent-solid);
            --cs-checkbox-bg-checked-hover: var(--cs-color-accent-solid-hover);
            position: relative;
            width: var(--cs-checkbox-width);
            height: var(--cs-checkbox-width);
            appearance: none;
            background-color: var(--cs-checkbox-bg);
            border-radius: var(--cs-checkbox-radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-checkbox-shadow, none);

            transition:
                background-color 140ms var(--cs-ease-quad-out),
                box-shadow 140ms var(--cs-ease-quad-out),
                scale 120ms var(--cs-ease-quad-out);

            /* =========================================================
            * SIZES
            * ========================================================= */
            &[data-size="xs"] {
                --cs-checkbox-width: 12px;
                --cs-checkbox-radius: 4px;
            }

            &[data-size="sm"] {
                --cs-checkbox-width: 16px;
                --cs-checkbox-radius: 5px;
            }

            &[data-size="md"] {
                --cs-checkbox-width: 20px;
                --cs-checkbox-radius: 6px;
            }

            &[data-size="lg"] {
                --cs-checkbox-width: 24px;
                --cs-checkbox-radius: 7px;
            }

            &[data-size="xl"] {
                --cs-checkbox-width: 28px;
                --cs-checkbox-radius: 8px;
            }

            /* =========================================================
            * VARIANTS
            * ========================================================= */
            &[data-variant="soft"] {
                --cs-checkbox-bg: var(--cs-color-base-soft);
                --cs-checkbox-bg-hover: var(--cs-color-base-soft-hover);
            }

            &[data-variant="elevated"] {
                --cs-checkbox-bg: var(--cs-color-elevated);
                --cs-checkbox-bg-hover: var(--cs-color-elevated-hover);
                --cs-checkbox-shadow: var(--cs-shadow-elevated);
                --cs-checkbox-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            &::before {
                content: "";
                position: absolute;
                inset: 0;
            }

            @media (hover: hover) {
                &:hover:not(:disabled) {
                    background-color: var(--cs-checkbox-bg-hover);
                    box-shadow: var(--cs-checkbox-shadow-hover, none);
                }
            }

            &:active:not(:disabled) {
                scale: 0.9;

                &::before {
                    /* Net hit-area = 0.9 / 0.85 = ~1.06 (+6% safety margin against subpixel mouse jitter) */
                    scale: calc(1 / 0.85);
                }
            }

            &:is(:checked, :indeterminate) {
                --cs-checkbox-bg: var(--cs-checkbox-bg-checked);
                --cs-checkbox-bg-hover: var(--cs-checkbox-bg-checked-hover);
                --cs-checkbox-shadow: var(--cs-shadow-solid);
                --cs-checkbox-shadow-hover: var(--cs-checkbox-shadow);
            }

            &[aria-invalid="true"] {
                --cs-checkbox-bg-checked: var(--cs-color-negative-solid);
                --cs-checkbox-bg-checked-hover: var(--cs-color-negative-solid-hover);

                /* Error ring & soft tint apply only when inactive so checked states inherit the top-lit solid highlight */
                &:not(:checked, :indeterminate) {
                    --cs-checkbox-shadow: inset 0 0 0 1px color-mix(in oklab, var(--cs-color-negative-solid) 45%, transparent);
                    --cs-checkbox-shadow-hover: inset 0 0 0 1px color-mix(in oklab, var(--cs-color-negative-solid) 65%, transparent);
                    --cs-checkbox-bg: var(--cs-color-negative-soft);
                    --cs-checkbox-bg-hover: var(--cs-color-negative-soft-hover);
                }
            }

            /* =========================================================
             * DISABLED
             * ========================================================= */
            &:disabled {
                --cs-disabled-opacity: 1;
                --cs-checkbox-bg: var(--cs-color-disabled-bg);
                --cs-checkbox-shadow: none;

                &[data-variant="elevated"] {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg-elevated);
                    --cs-checkbox-shadow: 0 0 0 1px var(--cs-color-disabled-border);
                }

                &[aria-invalid="true"]:not(:checked, :indeterminate) {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg);
                    --cs-checkbox-shadow: none;
                }

                &:is(:checked, :indeterminate) {
                    --cs-checkbox-bg: var(--cs-color-disabled-bg-strong);
                    --cs-checkbox-shadow: none;
                }
            }
        }

        .cs-checkbox-icon {
            position: absolute;
            top: anchor(center);
            left: anchor(center);
            width: calc(anchor-size(width) * 0.7);
            height: calc(anchor-size(height) * 0.7);
            color: white;
            opacity: 0;
            translate: -50% -50%;
            scale: 0.7;
            transition:
                opacity 80ms var(--cs-ease-quad-out),
                scale 80ms var(--cs-ease-quad-out);
            pointer-events: none;

            & path {
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
                transition: stroke-dashoffset 100ms var(--cs-ease-quad-out);
            }
        }

        /* =========================================================
         * VECTOR DRAWING (Checked & Indeterminate Transitions)
         * ========================================================= */
        /* 1. Indeterminate: Draws horizontal dash while checkmark remains retracted */
        .cs-checkbox:indeterminate + .cs-checkbox-icon .cs-checkbox-dash {
            stroke-dashoffset: 0;
            transition: stroke-dashoffset 160ms var(--cs-ease-cubic-out);
        }

        /* 2. Checked: Draws checkmark while dash remains retracted */
        .cs-checkbox:checked:not(:indeterminate) + .cs-checkbox-icon .cs-checkbox-check {
            stroke-dashoffset: 0;
            transition: stroke-dashoffset 200ms var(--cs-ease-cubic-out);
        }

        /* 3. Active Icon Container: Snaps visibility immediately to prioritize vector drawing */
        .cs-checkbox:is(:checked, :indeterminate) + .cs-checkbox-icon {
            opacity: 1;
            scale: 1;
            transition: none;
        }

        /* Mirrors global disabled state (disabled.css only targets the input host, not its anchor sibling) */
        .cs-checkbox:disabled + .cs-checkbox-icon {
            opacity: 0.5;
        }
    }
</style>
