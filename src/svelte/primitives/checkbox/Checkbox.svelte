<!--
@component
Primitive squircle checkbox component (`<Checkbox />`) supporting multi-axis sizing,
elastic active press physics, dual-state vector icon drawing, and CSS anchor positioning.

Architectural Notes:
- Zero-Wrapper Flat Architecture (CSS Anchor Positioning):
  Instead of wrapping `<input>` and `<svg>` in a container `<span>` (which pollutes DOM
  and complicates parent flex/grid flow), the checkbox renders a pure native `<input type="checkbox">`
  with an adjacent sibling `<svg>`. The icon is anchored directly over the input's geometric center via
  CSS Anchor Positioning (`anchor-name` / `position-anchor: ...; top: anchor(center); left: anchor(center)`).
- Persistent Dual-Path Vector Transitions:
  Both the indeterminate dash and the checkmark paths are rendered concurrently in the SVG.
  Avoiding Svelte `{#if}` template branching prevents destructive DOM element teardown, allowing
  seamless bidirectional vector drawing transitions (`stroke-dashoffset`) between checked and
  indeterminate states.
- Active Press Physics & Subpixel Hit-Area Preservation:
  When pressed (`:active`), the checkbox contracts tactilely to `scale: 0.9`. To prevent edge clicks
  from falling out of bounds during scale down, the `::before` pseudo-element applies an inverse
  counter-scale of `calc(1 / 0.85)` (~1.06 net screen size), completely eliminating pointer-drop
  glitches and absorbing subpixel mouse jitter without overlapping sibling layout.
- Borderless Surface Depth & High-Contrast Invalid States:
  Uses pure `box-shadow` instead of CSS `border` to guarantee that inset hairline shadows on elevated
  dark-mode surfaces align directly with the outer squircle contour. The error state seamlessly transitions
  into an inset danger ring, leaving native `outline` completely unconstrained for `:focus-visible`.
- Defaults & Resets: Requires explicit `variant` and `size` props with no implicit fallbacks.
  See `../../explanations/component-defaults-and-globals.md`
- Elevated Hover Physics (Light vs. Dark):
  Follows `../../explanations/elevated-hover-physics.md` (shadow lift in light mode, surface luminance step-up in dark mode).
-->

<script lang="ts">
    import { type CheckboxProps } from ".";

    let {
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
            position: relative;
            width: var(--_size);
            height: var(--_size);
            appearance: none;
            background-color: var(--_bg);
            border-radius: var(--_radius);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--_shadow, none);

            transition:
                background-color 140ms var(--cs-ease-quad-out),
                box-shadow 140ms var(--cs-ease-quad-out),
                scale 120ms var(--cs-ease-quad-out);

            /* =========================================================
            * SIZES
            * ========================================================= */
            &[data-size="xs"] {
                --_size: 12px;
                --_radius: 4px;
            }

            &[data-size="sm"] {
                --_size: 16px;
                --_radius: 5px;
            }

            &[data-size="md"] {
                --_size: 20px;
                --_radius: 6px;
            }

            &[data-size="lg"] {
                --_size: 24px;
                --_radius: 7px;
            }

            &[data-size="xl"] {
                --_size: 28px;
                --_radius: 8px;
            }

            /* =========================================================
            * CHECKED INTENT (Accent by default, overridden by [aria-invalid])
            * ========================================================= */
            --_bg-checked: var(--cs-color-accent-solid);
            --_bg-checked-hover: var(--cs-color-accent-solid-hover);

            /* =========================================================
            * VARIANTS
            * ========================================================= */
            &[data-variant="soft"] {
                --_bg: var(--cs-color-base-soft);
                --_bg-hover: var(--cs-color-base-soft-hover);
            }

            /* Hover Physics (Light vs. Dark): See ../../explanations/elevated-hover-physics.md */
            &[data-variant="elevated"] {
                --_bg: var(--cs-color-elevation-1);
                --_bg-hover: light-dark(var(--_bg), var(--cs-color-elevation-2));
                --_shadow: var(--cs-shadow-elevation-1);
                --_shadow-hover: var(--cs-shadow-elevation-1-hover);
            }

            &::before {
                content: "";
                position: absolute;
                inset: 0;
            }

            @media (hover: hover) {
                &:hover {
                    background-color: var(--_bg-hover);
                    box-shadow: var(--_shadow-hover, none);
                }
            }

            &:active {
                scale: 0.9;

                &::before {
                    /* Net hit-area = 0.9 / 0.85 = ~1.06 (+6% safety margin against subpixel mouse jitter) */
                    scale: calc(1 / 0.85);
                }
            }

            &:is(:checked, :indeterminate) {
                --_bg: var(--_bg-checked);
                --_bg-hover: var(--_bg-checked-hover);
                --_shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.26), 0 1px 2px 0 rgb(0 0 0 / 0.12);
                --_shadow-hover: var(--_shadow);
            }

            &[aria-invalid="true"] {
                --_bg-checked: var(--cs-color-danger-solid);
                --_bg-checked-hover: var(--cs-color-danger-solid-hover);

                /* Error ring & soft tint apply only when inactive so checked states inherit the top-lit solid highlight */
                &:not(:checked, :indeterminate) {
                    --_shadow: inset 0 0 0 1px var(--cs-color-danger-solid);
                    --_shadow-hover: inset 0 0 0 1px var(--cs-color-danger-solid-hover);
                    --_bg: var(--cs-color-danger-soft);
                    --_bg-hover: var(--cs-color-danger-soft-hover);
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
