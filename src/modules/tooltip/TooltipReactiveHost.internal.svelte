<script lang="ts">
    import type { PopoverPlacement } from "../popover";
    import type { TooltipIconConfig } from "./index.ts";
    import { tooltip } from "./tooltip.attach.svelte.ts";

    let {
        text = "Initial",
        icon,
        placement = "top",
        enabled = true,
        target,
        delay = [100, 50] as [number, number],
    }: {
        text?: string;
        icon?: TooltipIconConfig;
        placement?: PopoverPlacement;
        enabled?: boolean;
        target?: string;
        delay?: [number, number];
    } = $props();

    const tooltipOptions = $derived(
        typeof target === "string" ? { target, placement, enabled, delay } : { text, icon, placement, enabled, delay }
    );
</script>

<button type="button" {@attach tooltip(tooltipOptions)}>Trigger</button>
