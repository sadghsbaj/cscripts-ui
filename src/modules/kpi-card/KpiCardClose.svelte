<script lang="ts">
    import { CloseButton, type CloseButtonSize } from "../close-button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { getKpiCardContext, hasKpiCardContext, type KpiCardCloseProps, type KpiCardSize } from "./index.ts";

    const CLOSE_SIZE_MAP: Record<KpiCardSize, CloseButtonSize> = {
        sm: "xs",
        md: "sm",
        lg: "md",
    };

    let { ref = $bindable(null), variant, size, class: className, children, ...rest }: KpiCardCloseProps = $props();

    const kpiCard = hasKpiCardContext() ? getKpiCardContext() : undefined;
    const resolvedSize = $derived(size ?? (kpiCard ? CLOSE_SIZE_MAP[kpiCard.size] : "sm"));
</script>

<CloseButton bind:ref {variant} size={resolvedSize} {...rest} class={["cs-kpi-card-close", className]}>
    <HitArea size="md" />
    {@render children?.()}
</CloseButton>
