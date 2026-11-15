<script lang="ts">
    import "../../css/shared/button-control.css";
    import type { ButtonLabelProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: ButtonLabelProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-button-label", "cs-button-control-label", className]}>
    {@render children?.()}
</span>
