<script lang="ts">
    import { CloseButton, type CloseButtonSize } from "../close-button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { getCardContext, hasCardContext, type CardCloseProps, type CardSize } from "./index.ts";

    const CLOSE_SIZE_MAP: Record<CardSize, CloseButtonSize> = {
        sm: "xs",
        md: "sm",
        lg: "md",
    };

    let { ref = $bindable(null), variant, size, class: className, children, ...rest }: CardCloseProps = $props();

    const card = hasCardContext() ? getCardContext() : undefined;
    const resolvedSize = $derived(size ?? (card ? CLOSE_SIZE_MAP[card.size] : "sm"));
</script>

<CloseButton bind:ref {variant} size={resolvedSize} {...rest} class={["cs-card-close", className]}>
    <HitArea size="md" />
    {@render children?.()}
</CloseButton>
