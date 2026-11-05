<!--
@component
Subtle corner creator watermark (`<WorkAppSignature />`) for internal work tools.

Architectural Notes:
- Frame Integration: Automatically rendered inside `<WorkAppFrame />` by default (`showSignature = true`),
  so it does not need to be placed manually in standard layouts. Exported standalone for custom frames.
- Non-Intrusive Layering (`z-index: -1`): Because `#app` defines `isolation: isolate` in `reset.css`
  while the page canvas background (`--cs-color-elevation-0`) lives on `<html>`, `z-index: -1`
  places the watermark above the background canvas but strictly behind all normal application content.
- Laptop-Friendly Breakpoint (`1024px`): Intentionally kept at `1024px` rather than a wider threshold
  so the watermark remains visible on standard work laptops. If a `1024px` (`--cs-container-5xl`)
  layout overlaps the bottom-right corner on narrower laptop viewports, `z-index: -1` ensures cards
  and panels smoothly cover the watermark without visual collision.
-->
<script lang="ts">
    import type { WorkAppSignatureProps } from "./index";

    let { class: className, ...rest }: WorkAppSignatureProps = $props();
</script>

<span {...rest} class={["cs-work-app-signature", className]}>
    <span class="cs-work-app-signature-label">Erstellt von:</span>
    <span class="cs-work-app-signature-name">Colin Schäfer</span>
</span>

<style>
    @layer components {
        .cs-work-app-signature {
            position: fixed;
            right: 24px;
            bottom: 24px;
            /* Sits above the <html> background but behind all content inside the isolated #app stacking context */
            z-index: -1;
            display: inline-flex;
            gap: 6px;
            align-items: center;
            font-size: var(--cs-text-xs);
            letter-spacing: var(--cs-tracking-tight);
            user-select: none;
            pointer-events: none;
        }

        .cs-work-app-signature-label {
            color: var(--cs-color-text-weaker);
            font-weight: 400;
        }

        .cs-work-app-signature-name {
            color: var(--cs-color-text-main);
            font-weight: 600;
        }

        /* Kept at 1024px so work laptops still show the signature; any overlap with a 1024px container slides behind via z-index: -1 */
        @media (width < 1024px) {
            .cs-work-app-signature {
                display: none;
            }
        }
    }
</style>
