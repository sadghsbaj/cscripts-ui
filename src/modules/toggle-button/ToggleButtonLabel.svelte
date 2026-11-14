<!--
@component
Explicit text label wrapper (`<ToggleButtonLabel />`) for `<ToggleButton />` components.

Architectural Notes:
- Optical Trimming & Truncation: Applies optical cap-height trimming
  (`text-box: trim-both cap alphabetic`) for vertical alignment with adjacent
  icons and flex-safe single-line ellipsis truncation.
- Explicit Role: Avoids inferring semantic label roles from the DOM structure,
  preventing style collisions with badges, status indicators, or auxiliary spans.
-->
<script lang="ts">
    import type { ToggleButtonLabelProps } from "./index.ts";

    let { class: className, children, ...rest }: ToggleButtonLabelProps = $props();
</script>

<span {...rest} class={["cs-toggle-button-label", className]}>
    {@render children?.()}
</span>

<style>
    @layer components.primitive {
        .cs-toggle-button-label {
            min-width: 0;
            overflow-x: clip;
            overflow-y: visible;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-box: trim-both cap alphabetic;
        }
    }
</style>
