<script lang="ts">
    import type { TooltipIconComponentProps } from "./index.ts";

    let { class: className, ...rest }: TooltipIconComponentProps = $props();
</script>

<svg {...rest} data-testid="tooltip-test-icon" class={className} viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" />
</svg>
