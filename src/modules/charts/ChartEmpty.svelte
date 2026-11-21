<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { Button, ButtonLabel } from "../button/index.ts";
    import { getChartContext, hasChartContext } from "./chart.context.ts";
    import type { ChartEmptyProps } from "./index.ts";

    let {
        ref = $bindable(null),
        title,
        description,
        hideReset = false,
        onReset,
        class: className,
        children,
        ...rest
    }: ChartEmptyProps = $props();

    const chart = hasChartContext() ? getChartContext() : undefined;
    const allSeriesHidden = $derived(Boolean(chart?.allSeriesHidden));

    const resolvedTitle = $derived.by(() => {
        if (title !== undefined) return title;
        return t(
            allSeriesHidden
                ? { de: "Alle Serien ausgeblendet", en: "All series hidden" }
                : { de: "Keine Daten verfügbar", en: "No data available" },
        );
    });

    const showResetButton = $derived(!hideReset && (allSeriesHidden || onReset !== undefined));

    function handleReset(): void {
        if (onReset) {
            onReset();
            return;
        }
        chart?.showAllSeries();
    }
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-chart-empty", className]}
    data-all-hidden={allSeriesHidden ? "" : undefined}
>
    <div class="cs-chart-empty-backdrop" aria-hidden="true">
        <span class="cs-chart-empty-gridline"></span>
        <span class="cs-chart-empty-gridline"></span>
        <span class="cs-chart-empty-gridline"></span>
        <span class="cs-chart-empty-gridline"></span>
    </div>

    {#if children}
        <div class="cs-chart-empty-inner">
            {@render children()}
        </div>
    {:else}
        <div class="cs-chart-empty-inner">
            <p class="cs-chart-empty-title">{resolvedTitle}</p>
            {#if description}
                <p class="cs-chart-empty-description">{description}</p>
            {/if}
            {#if showResetButton}
                <div class="cs-chart-empty-actions">
                    <Button variant="ghost" size="xs" onclick={handleReset}>
                        <ButtonLabel>{t({ de: "Alle anzeigen", en: "Show all" })}</ButtonLabel>
                    </Button>
                </div>
            {/if}
        </div>
    {/if}
</div>
