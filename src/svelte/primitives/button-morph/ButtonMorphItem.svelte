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
             *   the 320ms transition window so its surface and content can
             *   animate out smoothly underneath the incoming button.
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
             * SHARED MORPH SHELL LOCK (During 320ms Transition Window)
             * ---------------------------------------------------------
             * While `.cs-button-morph[data-transitioning]` is active, both the
             * outgoing (`exiting`) and incoming (`active`) buttons are locked to
             * 100% of the interpolating container dimensions and share the exact
             * same `--_pill-radius`.
             *
             * Why this matters:
             * 1. Both buttons' `::before` / `::after` surfaces stay 100%
             *    congruent in every frame—even when morphing across different
             *    sizes (`sm` <-> `lg`) or shapes (`iconOnly` <-> text pill).
             * 2. The `:focus-visible` ring on the newly focused `<button>`
             *    tracks the morphing pill geometry 1:1 without detaching.
             * 3. `text-overflow: clip` on `.cs-button-label` prevents premature
             *    `...` ellipsis flickering while the pill expands to fit new text.
             * ========================================================= */
            :global(.cs-button-morph[data-transitioning]) &:is([data-state="active"], [data-state="exiting"]) {
                width: 100%;
                height: 100%;

                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button)) {
                    --_pill-radius: calc(var(--_morph-height, var(--_height, 36px)) / 2);

                    width: 100%;
                    height: 100%;
                    aspect-ratio: auto;
                    border-radius: var(--_pill-radius);
                }

                :global(:is(.cs-button-label, .cs-toggle-button-label)) {
                    text-overflow: clip;
                }
            }

            /* =========================================================
             * SURFACE & CONTENT CHOREOGRAPHY (Active Enter vs. Exiting Leave)
             * ---------------------------------------------------------
             * Gated by `[data-transitioning]` so initial page render never
             * triggers an entry animation.
             *
             * - Surface Layer (`::before` / `::after`):
             *   The incoming surface (`z-index: 2`) fades in quickly (`180ms`
             *   quad-out) with a subtle elastic pulse, while the outgoing
             *   surface (`z-index: 1`) delays its fade-out by `50ms` (`180ms`
             *   quad-in). Overlapping the two alpha curves prevents mid-transition
             *   opacity dips (background bleed-through) when morphing between
             *   two opaque buttons, while still fading cleanly to transparent
             *   when morphing into a `ghost` button.
             *
             * - Content Layer (Icons & Labels):
             *   Uses directional vertical slot-roll (`--_enter-y` / `--_exit-y`),
             *   scale (`0.88 <-> 1`), and Gaussian motion blur (`2.5px <-> 0px`)
             *   so old and new glyphs never clash legibly during crossfade.
             * ========================================================= */
            :global(.cs-button-morph[data-transitioning]) &[data-state="active"] {
                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button))::before {
                    animation: cs-button-morph-surface-enter 260ms var(--cs-spring-snappy) both;
                }

                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button))
                    > :global(*:not(.cs-hit-area)) {
                    animation: cs-button-morph-content-enter 280ms var(--cs-spring-snappy) 20ms both;
                }

                /* Subtle 15ms lead-in stagger when an icon is paired with a label */
                > :global(:is(.cs-button, .cs-toggle-button))
                    > :global(*:not(.cs-hit-area):nth-child(2)) {
                    animation-delay: 35ms;
                }
            }

            :global(.cs-button-morph[data-transitioning]) &[data-state="exiting"] {
                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button))::before,
                > :global(.cs-toggle-button)::after {
                    animation: cs-button-morph-surface-exit 180ms var(--cs-ease-quad-in) 50ms both;
                }

                > :global(:is(.cs-button, .cs-toggle-button, .cs-close-button))
                    > :global(*:not(.cs-hit-area)) {
                    animation: cs-button-morph-content-exit 130ms var(--cs-ease-quad-in) both;
                }
            }
        }

        @keyframes cs-button-morph-surface-enter {
            0% {
                opacity: 0;
                scale: 0.96;
            }
            65% {
                opacity: 1;
            }
            100% {
                opacity: 1;
                scale: 1;
            }
        }

        @keyframes cs-button-morph-surface-exit {
            0% {
                opacity: 1;
            }
            100% {
                opacity: 0;
            }
        }

        @keyframes cs-button-morph-content-enter {
            0% {
                opacity: 0;
                filter: blur(2.5px);
                translate: 0 var(--_enter-y, 6px);
                scale: 0.88;
            }
            60% {
                opacity: 1;
                filter: blur(0px);
            }
            100% {
                opacity: 1;
                filter: blur(0px);
                translate: 0 0;
                scale: 1;
            }
        }

        @keyframes cs-button-morph-content-exit {
            0% {
                opacity: 1;
                filter: blur(0px);
                translate: 0 0;
                scale: 1;
            }
            100% {
                opacity: 0;
                filter: blur(2.5px);
                translate: 0 var(--_exit-y, -6px);
                scale: 0.88;
            }
        }
    }
</style>
