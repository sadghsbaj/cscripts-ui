<script lang="ts">
    import "../../css/shared/button-control.css";
    import type { ButtonIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: ButtonIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-button-icon", "cs-button-control-icon", className]} />
