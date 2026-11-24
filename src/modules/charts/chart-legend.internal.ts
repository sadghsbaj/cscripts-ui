import type { Snippet } from "svelte";

import type {
    ChartDatum,
    ChartLegendMarker,
    ChartLegendPosition,
    ChartSeries,
} from "./chart-state.svelte.ts";
import type { ChartLegendConfig } from "./index.ts";

export interface ResolvedChartLegendConfig<TDatum = ChartDatum> {
    position: ChartLegendPosition;
    align: "start" | "center" | "end";
    interactive?: boolean;
    marker?: ChartLegendMarker;
    include?: readonly string[];
    exclude?: readonly string[];
    filter?: (series: ChartSeries<TDatum>) => boolean;
    extra?: Snippet;
}

export function resolveLegendConfig<TDatum = ChartDatum>(
    legend?: ChartLegendPosition | ChartLegendConfig<TDatum>,
): ResolvedChartLegendConfig<TDatum> {
    if (legend === undefined || typeof legend === "string") {
        return {
            position: legend ?? "top",
            align: "start",
        };
    }

    return {
        position: legend.position ?? "top",
        align: legend.align ?? "start",
        interactive: legend.interactive,
        marker: legend.marker,
        include: legend.include,
        exclude: legend.exclude,
        filter: legend.filter,
        extra: legend.extra,
    };
}

export function filterLegendSeries<TDatum = ChartDatum>(
    series: readonly ChartSeries<TDatum>[],
    options: {
        include?: readonly string[];
        exclude?: readonly string[];
        filter?: (series: ChartSeries<TDatum>) => boolean;
    },
): ChartSeries<TDatum>[] {
    let result = [...series];

    if (options.include !== undefined) {
        const includeSet = new Set(options.include);
        result = result.filter((item) => includeSet.has(item.id));
    }

    if (options.exclude !== undefined && options.exclude.length > 0) {
        const excludeSet = new Set(options.exclude);
        result = result.filter((item) => !excludeSet.has(item.id));
    }

    if (options.filter !== undefined) {
        const predicate = options.filter;
        result = result.filter((item) => predicate(item));
    }

    return result;
}
