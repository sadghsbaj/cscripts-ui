<script lang="ts">
    import { Check } from "@lucide/svelte";
    import Badge from "./Badge.svelte";
    import BadgeIcon from "./BadgeIcon.svelte";
    import BadgeLabel from "./BadgeLabel.svelte";
    import type { BadgeColor, BadgeSize, BadgeVariant } from "./index.ts";

    interface Props {
        variant?: BadgeVariant;
        color?: BadgeColor;
        size?: BadgeSize;
        iconOnly?: boolean;
        label?: string;
        showIcon?: boolean;
        strokeWidth?: number | string;
        labelRef?: HTMLSpanElement | null;
    }

    let {
        variant = "soft",
        color = "base",
        size = "md",
        iconOnly = false,
        label = "Beta",
        showIcon = true,
        strokeWidth,
        labelRef = $bindable(null),
    }: Props = $props();
</script>

<Badge {variant} {color} {size} {iconOnly}>
    {#if showIcon}
        <BadgeIcon icon={Check} {strokeWidth} />
    {/if}
    {#if label}
        <BadgeLabel bind:ref={labelRef}>{label}</BadgeLabel>
    {/if}
</Badge>
