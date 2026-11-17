<script lang="ts">
    import { Bell, CircleAlert, CircleCheck, Info, TriangleAlert } from "@lucide/svelte";

    import type { ToastColor, ToastIconComponent, ToastIconProps } from "./index.ts";
    import { getToastContext, hasToastContext } from "./toast.context.internal.ts";

    const DEFAULT_ICONS: Record<ToastColor, ToastIconComponent> = {
        base: Info,
        accent: Bell,
        positive: CircleCheck,
        caution: TriangleAlert,
        negative: CircleAlert,
    };

    let {
        ref = $bindable(null),
        icon,
        color,
        strokeWidth = 2.25,
        class: className,
        ...rest
    }: ToastIconProps = $props();

    const toastCtx = hasToastContext() ? getToastContext() : undefined;
    const ResolvedIcon = $derived(icon ?? DEFAULT_ICONS[toastCtx?.color ?? "base"]);
</script>

<span bind:this={ref} {...rest} aria-hidden="true" class={["cs-toast-icon", className]}>
    <ResolvedIcon class="cs-toast-icon-svg" size={18} {color} {strokeWidth} aria-hidden="true" />
</span>

<style>
    @layer components.composite {
        .cs-toast-icon {
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            inline-size: 18px;
            /* Couple box height to line 1 of ToastTitle so the icon centers on the first line */
            font-size: var(--cs-text-sm);
            line-height: var(--cs-leading-tight);
            block-size: 1lh;
            color: var(--cs-toast-icon-fg);

            > :global(.cs-toast-icon-svg) {
                flex-shrink: 0;
                inline-size: 18px;
                block-size: 18px;
                pointer-events: none;
            }
        }
    }
</style>
