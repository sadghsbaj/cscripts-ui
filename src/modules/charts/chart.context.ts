import { createContext } from "svelte";

import type { ChartDatum, ChartState } from "./chart-state.svelte.ts";

export type ChartContext<TDatum = ChartDatum> = ChartState<TDatum>;

const [getRawChartContext, setRawChartContext, hasChartContext] = createContext<unknown>();

export function setChartContext<TDatum = ChartDatum>(
    context: ChartContext<TDatum>,
): ChartContext<TDatum> {
    setRawChartContext(context);
    return context;
}

export function getChartContext<TDatum = ChartDatum>(): ChartContext<TDatum> {
    return getRawChartContext() as ChartContext<TDatum>;
}

export { hasChartContext };
