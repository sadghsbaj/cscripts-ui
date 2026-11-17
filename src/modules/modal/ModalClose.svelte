<script lang="ts">
    import { CloseButton, type CloseButtonSize } from "../close-button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { getModalContext, hasModalContext, type ModalCloseProps, type ModalSize } from "./index.ts";

    const CLOSE_SIZE_MAP: Record<ModalSize, CloseButtonSize> = {
        sm: "sm",
        md: "sm",
        lg: "sm",
        xl: "md",
        full: "md",
    };

    let {
        ref = $bindable(null),
        variant = "soft",
        size,
        onclick,
        class: className,
        children,
        ...rest
    }: ModalCloseProps = $props();

    const modal = hasModalContext() ? getModalContext() : undefined;
    const resolvedSize = $derived(size ?? (modal ? CLOSE_SIZE_MAP[modal.size] : "md"));

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented) return;
        modal?.close("close-button");
    }
</script>

<CloseButton
    bind:ref
    {variant}
    size={resolvedSize}
    {...rest}
    onclick={handleClick}
    class={["cs-modal-close", className]}
>
    <HitArea size="md" />
    {@render children?.()}
</CloseButton>
