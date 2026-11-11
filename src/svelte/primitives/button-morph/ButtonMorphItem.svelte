<!--
@component
State slot wrapper (`<ButtonMorphItem value="..." />`) inside `<ButtonMorph />` holding a
`<Button />`, `<ToggleButton />`, or `<CloseButton />` for a specific morph state.

Architectural Notes:
- Accessibility & Inert Isolation: Automatically applies native `inert` and `aria-hidden="true"`
  whenever the slot is not the active state, ensuring only the active button participates in the
  tab order and accessibility tree.
- Intrinsic Measurement: Registers the slot in DOM order and observes its child button's natural
  dimensions via `ResizeObserver` so target sizes are pre-cached before a morph begins.
-->
<script lang="ts">
    import { getButtonMorphContext, type ButtonMorphItemProps } from "./index.ts";

    let { value, class: className, children, ...rest }: ButtonMorphItemProps = $props();

    const morph = getButtonMorphContext();
    const state = $derived(morph.getItemState(value));
    const isActive = $derived(state === "active");
</script>

<div
    {...rest}
    {@attach morph.attachItem(value)}
    class={["cs-button-morph-item", className]}
    data-value={value}
    data-state={state}
    inert={!isActive}
    aria-hidden={!isActive ? "true" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-button-morph-item {
            grid-area: 1 / 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;

            /* =========================================================
             * SLOT LIFECYCLE STATES (Active / Exiting / Inactive)
             * ---------------------------------------------------------
             * - `active`: Sits on top (z-index: 2) and receives all input.
             * - `exiting`: Remains in the shared grid cell (z-index: 1) for
             *   the 350ms transition window so its content can animate out
             *   underneath the incoming button.
             * - `inactive`: Taken out of grid track sizing (`position: absolute`
             *   + `width: max-content`) while hidden. This prevents wide inactive
             *   buttons from inflating the resting container width, while still
             *   allowing `ResizeObserver` to measure their true intrinsic size
             *   before a transition begins.
             * ========================================================= */
            &[data-state="active"] {
                position: relative;
                z-index: 2;
            }

            &[data-state="exiting"] {
                position: relative;
                z-index: 1;
                pointer-events: none;
            }

            &[data-state="inactive"] {
                position: absolute;
                inset: 0 auto auto 0;
                z-index: 0;
                width: max-content;
                visibility: hidden;
                opacity: 0;
                pointer-events: none;
            }

            /* =========================================================
             * ICON-ONLY & CLOSE-BUTTON ASPECT RATIO PROTECTION
             * ---------------------------------------------------------
             * `ButtonIcon`, `ToggleButtonIcon`, `CopyIcon`, `PasteIcon`, and
             * `CloseButton` size their SVGs using percentage widths (`50%` or
             * `66.67%`) assuming a 1:1 square host button. When morphing between
             * an icon-only button and a wide text button, stretching the host
             * button's width to 100% of the pill would stretch `width: 50%`
             * horizontally. Locking `width: auto; aspect-ratio: 1` derives the
             * glyph width strictly from its vertical percentage height.
             * ========================================================= */
            > :global(:is(.cs-button, .cs-toggle-button)[data-icon-only]) > :global(*:not(.cs-hit-area)),
            > :global(.cs-close-button) > :global(.cs-close-button-icon) {
                width: auto;
                aspect-ratio: 1 / 1;
            }

            /* =========================================================
             * SHARED MORPH SHELL LOCK (During 350ms Transition Window)
             * ---------------------------------------------------------
             * While `.cs-button-morph[data-transitioning]` is active, both the
             * outgoing (`exiting`) and incoming (`active`) buttons are locked to
             * 100% of the interpolating container dimensions.
             *
             * Why `min-width: 0`, `padding-inline: 0`, and `flex-shrink: 0` on
             * `.cs-button-label` are critical for X-axis stability:
             * - Standard `.cs-button-label` has `min-width: 0` (`flex-shrink: 1`).
             *   If a wide button (e.g. 154px) is constrained to a narrow shell
             *   (e.g. 32px) at the start/end of a morph, Flexbox would crush the
             *   label width down to 0px and shove the adjacent icon sideways across
             *   the X-axis as the label expands/collapses.
             * - Setting `flex-shrink: 0` on the label and `padding-inline: 0` on
             *   the centered flex button keeps the `[Icon + Label]` lockup at its
             *   exact final width and dead-centered at 50% of the pill from frame 0
             *   to frame 100, eliminating any horizontal drift. When the lockup is
             *   wider than the current shell it overflows evenly on both sides.
             *
             * Why `clip-path` (shape-aware reveal):
             * - The item is clipped to the pill silhouette while morphing. A
             *   growing pill therefore uncovers the new, centered content from the
             *   middle outwards, and a shrinking pill swallows the old content the
             *   same way. Text motion is bound to the geometry the eye already
             *   tracks, so almost no extra translate/blur is needed to look clean.
             * - Trade-off: the focus ring is clipped for the ~350ms of the morph.
             * ========================================================= */
            :global(.cs-button-morph[data-transitioning]) &:is([data-state="active"], [data-state="exiting"]) {
                width: 100%;
                min-width: 0;
                height: 100%;
                min-height: 0;
                clip-path: inset(0 round var(--cs-radius-full));

                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button)) {
                    width: 100%;
                    min-width: 0;
                    height: 100%;
                    min-height: 0;
                    padding-inline: 0;
                    aspect-ratio: auto;
                    border-radius: var(--cs-radius-full);
                }

                :global(:is(.cs-button-label, .cs-toggle-button-label)) {
                    flex-shrink: 0;
                    text-overflow: clip;
                }

                /* =========================================================
                 * HIDDEN BUTTON SURFACES
                 * ---------------------------------------------------------
                 * The shell's own `::before` (see ButtonMorph) draws the single
                 * interpolating surface, so each button's real surface is hidden
                 * for the transition. Their resolved colors equal the shell's
                 * start/end colors, which makes the handoff invisible.
                 * ========================================================= */
                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button))::before,
                > :global(.cs-toggle-button)::after {
                    opacity: 0;
                    transition: none;
                }
            }

            /* =========================================================
             * CONTENT CHOREOGRAPHY (Out -> Morph -> In)
             * ---------------------------------------------------------
             * Gated by `[data-transitioning]` so initial page render never
             * triggers an entry animation.
             *
             * Content is deliberately sequenced instead of cross-faded:
             * 1. The outgoing lockup leaves fast (0-130ms) while the surface is
             *    still close to its start color.
             * 2. The incoming lockup only starts at 150ms. The surface color change
             *    (300ms, quad-in-out) has its midpoint at the same moment, so the
             *    gap between both lockups is exactly where the surface is half-way.
             *    Old content therefore never sits on the new surface, and new
             *    content never sits on the old one (the "dirty" contrast mix).
             * Icon and label move as one rigid lockup (no child stagger).
             * ========================================================= */
            :global(.cs-button-morph[data-transitioning]) &[data-state="active"] {
                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button))
                    > :global(*:not(.cs-hit-area)) {
                    animation: cs-button-morph-content-enter 280ms var(--cs-ease-cubic-out) 150ms both;
                }
            }

            :global(.cs-button-morph[data-transitioning]) &[data-state="exiting"] {
                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button))
                    > :global(*:not(.cs-hit-area)) {
                    animation: cs-button-morph-content-exit 130ms var(--cs-ease-quad-in) both;
                }
            }
        }

        @keyframes cs-button-morph-content-enter {
            0% {
                opacity: 0;
                filter: blur(1px);
                translate: 0 var(--_enter-y, 3px);
            }
            100% {
                opacity: 1;
                filter: blur(0px);
                translate: 0 0;
            }
        }

        @keyframes cs-button-morph-content-exit {
            0% {
                opacity: 1;
                filter: blur(0px);
                translate: 0 0;
            }
            100% {
                opacity: 0;
                filter: blur(1px);
                translate: 0 var(--_exit-y, -3px);
            }
        }
    }
</style>
