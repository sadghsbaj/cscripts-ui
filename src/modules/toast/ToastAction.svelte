<script lang="ts">
    import { Button, ButtonLabel } from "../button/index.ts";
    import type { ToastActionProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant = "secondary",
        class: className,
        children,
        ...rest
    }: ToastActionProps = $props();
</script>

<Button bind:ref {variant} size="xs" {...rest} class={["cs-toast-action", className]}>
    <ButtonLabel>{@render children?.()}</ButtonLabel>
</Button>
