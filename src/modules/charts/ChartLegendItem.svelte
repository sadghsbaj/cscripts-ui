<script lang="ts">
    import { HitArea } from "../hit-area/index.ts";
    import { resolveToneColor } from "./chart-state.svelte.ts";
    import type { ChartLegendItemProps } from "./index.ts";

    let {
        ref = $bindable(null),
        label,
        color,
        tone,
        marker = "line",
        pattern = "solid",
        interactive = true,
        pressed = $bindable(true),
        highlighted = false,
        class: className,
        onclick,
        ...rest
    }: ChartLegendItemProps = $props();

    const resolvedColor = $derived(color ?? (tone ? resolveToneColor(tone) : "currentColor"));

    function handleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
    ): void {
        if (onclick) {
            onclick(event);
            return;
        }
        pressed = !pressed;
    }
</script>

<div class="cs-chart-legend-entry" role="listitem">
    {#if interactive}
        <button
            bind:this={ref}
            {...rest}
            type="button"
            class={["cs-chart-legend-item", className]}
            aria-pressed={pressed}
            data-hidden={!pressed ? "" : undefined}
            data-active={highlighted ? "" : undefined}
            onclick={handleClick}
        >
            <HitArea size="sm" />
            <span
                class="cs-chart-legend-swatch"
                data-kind={marker}
                data-pattern={pattern !== "solid" ? pattern : undefined}
                style:--cs-chart-swatch-color={resolvedColor}
                aria-hidden="true"
            ></span>
            <span class="cs-chart-legend-label">{label}</span>
        </button>
    {:else}
        <span
            bind:this={ref}
            {...rest}
            class={["cs-chart-legend-item", className]}
            data-static=""
            data-hidden={!pressed ? "" : undefined}
            data-active={highlighted ? "" : undefined}
        >
            <span
                class="cs-chart-legend-swatch"
                data-kind={marker}
                data-pattern={pattern !== "solid" ? pattern : undefined}
                style:--cs-chart-swatch-color={resolvedColor}
                aria-hidden="true"
            ></span>
            <span class="cs-chart-legend-label">{label}</span>
        </span>
    {/if}
</div>
