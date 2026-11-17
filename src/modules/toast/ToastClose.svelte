<script lang="ts">
    import { CloseButton } from "../close-button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import type { ToastCloseProps } from "./index.ts";
    import { getToastContext, hasToastContext } from "./toast.context.internal.ts";

    let {
        ref = $bindable(null),
        variant = "soft",
        size = "sm",
        onclick,
        class: className,
        children,
        ...rest
    }: ToastCloseProps = $props();

    const toastCtx = hasToastContext() ? getToastContext() : undefined;

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        toastCtx?.onDismiss?.();
        onclick?.(event);
    }
</script>

<CloseButton bind:ref {variant} {size} {...rest} onclick={handleClick} class={["cs-toast-close", className]}>
    <HitArea size="md" />
    {@render children?.()}
</CloseButton>
