<script lang="ts">
    import { getBadgeContext, hasBadgeContext } from "./badge.context.internal.ts";
    import type { BadgeIconProps } from "./index.ts";

    let { icon: Icon, strokeWidth, class: className, ...rest }: BadgeIconProps = $props();

    const badge = hasBadgeContext() ? getBadgeContext() : undefined;
    const resolvedStrokeWidth = $derived(
        strokeWidth ?? (badge?.variant === "solid" && (badge.size === "xs" || badge.size === "sm") ? 2.5 : 2.25)
    );
</script>

<Icon {...rest} strokeWidth={resolvedStrokeWidth} aria-hidden="true" class={["cs-badge-icon", className]} />

<style>
    @layer components.primitive {
        :global(.cs-badge-icon) {
            flex-shrink: 0;
            inline-size: var(--cs-badge-icon-size);
            block-size: var(--cs-badge-icon-size);
            pointer-events: none;
        }
    }
</style>
