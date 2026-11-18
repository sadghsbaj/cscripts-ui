<script lang="ts">
    import type { KpiCardIconComponentProps } from "./index.ts";

    let { strokeWidth, ...rest }: KpiCardIconComponentProps = $props();

    const formattedStrokeWidth = $derived(
        typeof strokeWidth === "number" || typeof strokeWidth === "string" ? String(strokeWidth) : undefined
    );
</script>

<svg
    viewBox="0 0 24 24"
    stroke-width={formattedStrokeWidth}
    data-stroke-width={formattedStrokeWidth}
    {...rest}
></svg>
