<!--
@component
Explicit text label wrapper (`<ToggleButtonLabel />`) for `<ToggleButton />` components.
-->
<script lang="ts">
    import "../../css/shared/button-control.css";
    import type { ToggleButtonLabelProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ToggleButtonLabelProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-toggle-button-label", "cs-button-control-label", className]}>
    {@render children?.()}
</span>
