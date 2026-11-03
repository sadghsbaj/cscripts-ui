<!--
@component
Explicit text label wrapper (`<ButtonLabel />`) for `<Button />` components.

Architectural Notes:
- Optical Trimming & Truncation: Applies optical cap-height trimming
  (`text-box: trim-both cap alphabetic`) for vertical alignment with adjacent
  icons and flex-safe single-line ellipsis truncation.
- Explicit Role: Avoids inferring semantic label roles from the DOM structure,
  preventing style collisions with badges, status indicators, or auxiliary spans.
-->
<script lang="ts">
    import type { ButtonLabelProps } from "./index.ts";

    let { class: className, children, ...rest }: ButtonLabelProps = $props();
</script>

<span {...rest} class={["cs-button-label", className]}>
    {@render children?.()}
</span>

<style>
    @layer components {
        .cs-button-label {
            min-width: 0;
            overflow-x: clip;
            overflow-y: visible;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-box: trim-both cap alphabetic;
        }
    }
</style>
