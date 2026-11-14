<!--
@component
Accessible icon wrapper (`<ToggleButtonIcon icon={...} />`) for `<ToggleButton />` components.
-->
<script lang="ts">
    import "../../css/shared/button-control.css";
    import type { ToggleButtonIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: ToggleButtonIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-toggle-button-icon", "cs-button-control-icon", className]} />
