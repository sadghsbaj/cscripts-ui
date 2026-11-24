import { type Component, createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ChartLegendTestHost from "./ChartLegendTestHost.internal.svelte";
import { filterLegendSeries, resolveLegendConfig } from "./chart-legend.internal.ts";
import {
    AreaChart,
    BarChart,
    CHART_LEGEND_POSITIONS,
    ChartLegendItem,
    ComposedChart,
    LineChart,
    resolveToneColor,
    type AreaChartProps,
    type BarChartProps,
    type ChartDatum,
    type ChartLegendConfig,
    type ChartLegendItemMarker,
    type ChartLegendOption,
    type ChartSeries,
    type ComposedChartProps,
    type LineChartProps,
} from "./index.ts";

interface SampleDatum extends ChartDatum {
    month: string;
    revenue: number;
    margin: number;
    forecast: number;
}

const SAMPLE_DATA: readonly SampleDatum[] = [
    { month: "Jan", revenue: 120, margin: 45, forecast: 130 },
    { month: "Feb", revenue: 180, margin: 60, forecast: 175 },
    { month: "Mar", revenue: 240, margin: 80, forecast: 230 },
];

const SAMPLE_SERIES: readonly ChartSeries<ChartDatum>[] = [
    { id: "revenue", label: "Revenue", type: "bar" },
    { id: "margin", label: "Margin", type: "line" },
    { id: "forecast", label: "Forecast", type: "area" },
];

function stubCanvasRect(width = 640, height = 260): void {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        (): DOMRect => ({
            left: 0,
            top: 0,
            right: width,
            bottom: height,
            width,
            height,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        }),
    );
}

describe("chart-legend.internal", () => {
    describe("resolveLegendConfig", () => {
        it("resolves undefined and string positions with default start alignment", () => {
            expect(resolveLegendConfig()).toEqual({
                position: "top",
                align: "start",
            });

            for (const position of CHART_LEGEND_POSITIONS) {
                expect(resolveLegendConfig(position)).toEqual({
                    position,
                    align: "start",
                });
            }
        });

        it("resolves ChartLegendConfig defaults and preserves all overrides", () => {
            expect(resolveLegendConfig({})).toEqual({
                position: "top",
                align: "start",
                interactive: undefined,
                marker: undefined,
                include: undefined,
                exclude: undefined,
                filter: undefined,
                extra: undefined,
            });

            const filterFn = (item: ChartSeries<ChartDatum>): boolean => item.id !== "margin";
            const extraSnippet = createRawSnippet(() => ({
                render: () => '<span class="extra">Note</span>',
            }));
            const config: ChartLegendConfig<ChartDatum> = {
                position: "bottom",
                align: "end",
                interactive: false,
                marker: "bar",
                include: ["revenue", "margin"],
                exclude: ["forecast"],
                filter: filterFn,
                extra: extraSnippet,
            };

            expect(resolveLegendConfig(config)).toEqual({
                position: "bottom",
                align: "end",
                interactive: false,
                marker: "bar",
                include: ["revenue", "margin"],
                exclude: ["forecast"],
                filter: filterFn,
                extra: extraSnippet,
            });
        });
    });

    describe("filterLegendSeries", () => {
        it("returns a shallow copy when no filters are provided", () => {
            const result = filterLegendSeries(SAMPLE_SERIES, {});
            expect(result).toEqual(SAMPLE_SERIES);
            expect(result).not.toBe(SAMPLE_SERIES);
        });

        it("filters by include list including empty array", () => {
            expect(
                filterLegendSeries(SAMPLE_SERIES, { include: ["revenue", "forecast"] }).map(
                    (s) => s.id,
                ),
            ).toEqual(["revenue", "forecast"]);

            expect(filterLegendSeries(SAMPLE_SERIES, { include: [] })).toEqual([]);
        });

        it("filters by exclude list and ignores empty exclude", () => {
            expect(
                filterLegendSeries(SAMPLE_SERIES, { exclude: ["margin"] }).map((s) => s.id),
            ).toEqual(["revenue", "forecast"]);

            expect(filterLegendSeries(SAMPLE_SERIES, { exclude: [] }).map((s) => s.id)).toEqual([
                "revenue",
                "margin",
                "forecast",
            ]);
        });

        it("filters by predicate and combines include + exclude + filter", () => {
            expect(
                filterLegendSeries(SAMPLE_SERIES, {
                    filter: (item) => item.type === "line",
                }).map((s) => s.id),
            ).toEqual(["margin"]);

            expect(
                filterLegendSeries(SAMPLE_SERIES, {
                    include: ["revenue", "margin", "forecast"],
                    exclude: ["margin"],
                    filter: (item) => item.id !== "forecast",
                }).map((s) => s.id),
            ).toEqual(["revenue"]);
        });
    });
});

describe("ChartLegend & ChartLegendItem", () => {
    let container: HTMLDivElement;
    const mounted: ReturnType<typeof mount>[] = [];

    function trackMount<
        TProps extends Record<string, unknown>,
        TExports extends Record<string, unknown> = Record<string, unknown>,
    >(
        component: Component<TProps, TExports, keyof TProps | "">,
        props: TProps,
    ): TExports {
        const instance = mount(component, { target: container, props });
        flushSync();
        mounted.push(instance);
        return instance;
    }

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        while (mounted.length > 0) {
            const instance = mounted.pop();
            if (instance) unmount(instance);
        }
        container.replaceChildren();
        container.remove();
        vi.restoreAllMocks();
    });

    it("renders all chart.series when unfiltered and renders children-only when children are provided", () => {
        const unfiltered = trackMount(ChartLegendTestHost, {
            data: SAMPLE_DATA,
            series: SAMPLE_SERIES,
        });

        const labels = Array.from(
            container.querySelectorAll<HTMLElement>(".cs-chart-legend-label"),
        ).map((el) => el.textContent);
        expect(labels).toEqual(["Revenue", "Margin", "Forecast"]);

        unmount(unfiltered);
        mounted.pop();

        trackMount(ChartLegendTestHost, {
            data: SAMPLE_DATA,
            series: SAMPLE_SERIES,
            customChildLabel: "Custom Entry",
            extraText: "Tail Note",
        });

        const customLabels = Array.from(
            container.querySelectorAll<HTMLElement>(".cs-chart-legend-label"),
        ).map((el) => el.textContent);
        expect(customLabels).toEqual(["Custom Entry"]);
        expect(container.querySelector(".cs-test-legend-extra")?.textContent).toBe("Tail Note");
    });

    it("omits .cs-chart-legend when include=[] without extra, but renders it when extra is provided", () => {
        const emptyNoExtra = trackMount(ChartLegendTestHost, {
            data: SAMPLE_DATA,
            series: SAMPLE_SERIES,
            include: [],
        });

        expect(container.querySelector(".cs-chart-legend")).toBeNull();

        unmount(emptyNoExtra);
        mounted.pop();

        trackMount(ChartLegendTestHost, {
            data: SAMPLE_DATA,
            series: SAMPLE_SERIES,
            include: [],
            extraText: "Summary Only",
        });

        const legendEl = container.querySelector<HTMLElement>(".cs-chart-legend");
        expect(legendEl).not.toBeNull();
        expect(legendEl?.querySelectorAll(".cs-chart-legend-entry")).toHaveLength(0);
        expect(legendEl?.querySelector(".cs-test-legend-extra")?.textContent).toBe("Summary Only");
    });

    it("handles interactive button, HitArea, bind:pressed toggle, strict controlled mode, and onclick override", () => {
        const state = $state({ pressed: true });

        const interactiveInstance = trackMount(ChartLegendItem, {
            label: "Revenue",
            get pressed(): boolean {
                return state.pressed;
            },
            set pressed(value: boolean) {
                state.pressed = value;
            },
        });

        const button = container.querySelector<HTMLButtonElement>("button.cs-chart-legend-item");
        expect(button).not.toBeNull();
        expect(button?.querySelector(".cs-hit-area[data-size='sm']")).not.toBeNull();
        expect(button?.getAttribute("aria-pressed")).toBe("true");
        expect(button?.dataset.hidden).toBeUndefined();

        button?.click();
        flushSync();
        expect(state.pressed).toBe(false);
        expect(button?.getAttribute("aria-pressed")).toBe("false");
        expect(button?.dataset.hidden).toBe("");

        button?.click();
        flushSync();
        expect(state.pressed).toBe(true);
        expect(button?.getAttribute("aria-pressed")).toBe("true");
        expect(button?.dataset.hidden).toBeUndefined();

        unmount(interactiveInstance);
        mounted.pop();

        // Strict controlled mode: setter ignores internal writes
        const controlled = $state({ pressed: true });
        const controlledInstance = trackMount(ChartLegendItem, {
            label: "Controlled",
            get pressed(): boolean {
                return controlled.pressed;
            },
            set pressed(_value: boolean) {
                // Intentionally ignore internal writes
            },
        });

        const controlledBtn = container.querySelector<HTMLButtonElement>(
            "button.cs-chart-legend-item",
        );
        controlledBtn?.click();
        flushSync();
        expect(controlled.pressed).toBe(true);
        expect(controlledBtn?.getAttribute("aria-pressed")).toBe("true");

        controlled.pressed = false;
        flushSync();
        expect(controlledBtn?.getAttribute("aria-pressed")).toBe("false");
        expect(controlledBtn?.dataset.hidden).toBe("");

        unmount(controlledInstance);
        mounted.pop();

        // onclick override does not mutate pressed
        const overrideState = $state({ pressed: true });
        const onclick = vi.fn();
        trackMount(ChartLegendItem, {
            label: "Override",
            onclick,
            get pressed(): boolean {
                return overrideState.pressed;
            },
            set pressed(value: boolean) {
                overrideState.pressed = value;
            },
        });

        const overrideBtn = container.querySelector<HTMLButtonElement>(
            "button.cs-chart-legend-item",
        );
        overrideBtn?.click();
        flushSync();

        expect(onclick).toHaveBeenCalledTimes(1);
        expect(overrideState.pressed).toBe(true);
        expect(overrideBtn?.getAttribute("aria-pressed")).toBe("true");
    });

    it("renders static span with data-static when interactive={false}, plus highlighted, marker, pattern, and color/tone", () => {
        const markers: readonly ChartLegendItemMarker[] = ["line", "dashed", "bar", "dot"];
        for (const marker of markers) {
            const inst = trackMount(ChartLegendItem, {
                label: `Marker ${marker}`,
                interactive: false,
                highlighted: marker === "bar",
                marker,
                pattern: marker === "bar" ? "hatch" : "solid",
                color: marker === "dot" ? "#ff5500" : undefined,
                tone: marker === "line" ? "positive" : undefined,
            });

            expect(container.querySelector("button.cs-chart-legend-item")).toBeNull();
            expect(container.querySelector(".cs-hit-area")).toBeNull();

            const span = container.querySelector<HTMLSpanElement>("span.cs-chart-legend-item");
            expect(span).not.toBeNull();
            expect(span?.dataset.static).toBe("");
            expect(span?.getAttribute("aria-pressed")).toBeNull();
            expect(span?.dataset.active).toBe(marker === "bar" ? "" : undefined);

            const swatch = span?.querySelector<HTMLSpanElement>(".cs-chart-legend-swatch");
            expect(swatch?.dataset.kind).toBe(marker);
            expect(swatch?.dataset.pattern).toBe(marker === "bar" ? "hatch" : undefined);

            const swatchColor = swatch?.style.getPropertyValue("--cs-chart-swatch-color");
            if (marker === "dot") {
                expect(swatchColor).toBe("#ff5500");
            } else if (marker === "line") {
                expect(swatchColor).toBe(resolveToneColor("positive"));
            } else {
                expect(swatchColor).toBe("currentColor");
            }

            unmount(inst);
            mounted.pop();
        }
    });

    it("toggles series visibility and updates hover/focus highlight on a filtered ChartLegend", () => {
        stubCanvasRect(640, 260);
        const bindings = $state<{
            hiddenSeriesIds: readonly string[];
            hoveredSeriesId: string | null;
        }>({
            hiddenSeriesIds: [],
            hoveredSeriesId: null,
        });

        const lineProps: LineChartProps<SampleDatum> = {
            variant: "soft",
            size: "md",
            data: SAMPLE_DATA,
            x: "month",
            series: SAMPLE_SERIES,
            legend: { exclude: ["forecast"] },
            get hiddenSeriesIds(): readonly string[] {
                return bindings.hiddenSeriesIds;
            },
            set hiddenSeriesIds(value: readonly string[]) {
                bindings.hiddenSeriesIds = value;
            },
            get hoveredSeriesId(): string | null {
                return bindings.hoveredSeriesId;
            },
            set hoveredSeriesId(value: string | null) {
                bindings.hoveredSeriesId = value;
            },
        };

        trackMount(LineChart, lineProps);

        const getButtons = (): HTMLButtonElement[] =>
            Array.from(
                container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            );

        expect(getButtons()).toHaveLength(2);
        const itemA = getButtons()[0];
        const itemB = getButtons()[1];
        expect(itemA?.textContent).toContain("Revenue");
        expect(itemB?.textContent).toContain("Margin");

        // Toggle A off -> B off -> A back on
        itemA?.click();
        flushSync();
        expect(itemA?.getAttribute("aria-pressed")).toBe("false");
        expect(itemA?.dataset.hidden).toBe("");
        expect(bindings.hiddenSeriesIds).toEqual(["revenue"]);

        itemB?.click();
        flushSync();
        expect(itemB?.getAttribute("aria-pressed")).toBe("false");
        expect(itemB?.dataset.hidden).toBe("");
        expect(bindings.hiddenSeriesIds).toEqual(["revenue", "margin"]);

        itemA?.click();
        flushSync();
        expect(itemA?.getAttribute("aria-pressed")).toBe("true");
        expect(itemA?.dataset.hidden).toBeUndefined();
        expect(bindings.hiddenSeriesIds).toEqual(["margin"]);

        // pointerenter / pointerleave on visible item A
        itemA?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
        flushSync();
        expect(bindings.hoveredSeriesId).toBe("revenue");
        expect(itemA?.dataset.active).toBe("");

        itemA?.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
        flushSync();
        expect(bindings.hoveredSeriesId).toBeNull();
        expect(itemA?.dataset.active).toBeUndefined();

        // focus / blur on visible item A
        itemA?.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
        flushSync();
        expect(bindings.hoveredSeriesId).toBe("revenue");
        expect(itemA?.dataset.active).toBe("");

        itemA?.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
        flushSync();
        expect(bindings.hoveredSeriesId).toBeNull();
        expect(itemA?.dataset.active).toBeUndefined();

        // Hidden item B ignores pointerenter
        itemB?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
        flushSync();
        expect(bindings.hoveredSeriesId).toBeNull();
        expect(itemB?.dataset.active).toBeUndefined();
    });
});

describe("Chart presets — ChartLegendConfig", () => {
    let container: HTMLDivElement;
    const mounted: ReturnType<typeof mount>[] = [];

    beforeEach(() => {
        stubCanvasRect(640, 260);
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        while (mounted.length > 0) {
            const instance = mounted.pop();
            if (instance) unmount(instance);
        }
        container.replaceChildren();
        container.remove();
        vi.restoreAllMocks();
    });

    const PRESETS: readonly {
        readonly name: string;
        readonly mountPreset: (
            target: HTMLElement,
            legend: ChartLegendOption<SampleDatum>,
        ) => ReturnType<typeof mount>;
    }[] = [
        {
            name: "BarChart",
            mountPreset: (target, legend) => {
                const props: BarChartProps<SampleDatum> = {
                    variant: "soft",
                    size: "md",
                    data: SAMPLE_DATA,
                    x: "month",
                    series: SAMPLE_SERIES,
                    legend,
                };
                return mount(BarChart, { target, props });
            },
        },
        {
            name: "LineChart",
            mountPreset: (target, legend) => {
                const props: LineChartProps<SampleDatum> = {
                    variant: "soft",
                    size: "md",
                    data: SAMPLE_DATA,
                    x: "month",
                    series: SAMPLE_SERIES,
                    legend,
                };
                return mount(LineChart, { target, props });
            },
        },
        {
            name: "AreaChart",
            mountPreset: (target, legend) => {
                const props: AreaChartProps<SampleDatum> = {
                    variant: "soft",
                    size: "md",
                    data: SAMPLE_DATA,
                    x: "month",
                    series: SAMPLE_SERIES,
                    legend,
                };
                return mount(AreaChart, { target, props });
            },
        },
        {
            name: "ComposedChart",
            mountPreset: (target, legend) => {
                const props: ComposedChartProps<SampleDatum> = {
                    variant: "soft",
                    size: "md",
                    data: SAMPLE_DATA,
                    x: "month",
                    series: SAMPLE_SERIES,
                    legend,
                };
                return mount(ComposedChart, { target, props });
            },
        },
    ];

    it.each(PRESETS)(
        "$name applies legend position, exclude, and extra while keeping excluded series plotted in SVG",
        ({ mountPreset }) => {
            const extra = createRawSnippet(() => ({
                render: () => '<span class="cs-preset-extra">FY26</span>',
            }));

            const instance = mountPreset(container, {
                position: "bottom",
                exclude: ["margin"],
                extra,
            });
            flushSync();
            mounted.push(instance);

            const legendEl = container.querySelector<HTMLElement>(".cs-chart-legend");
            expect(legendEl).not.toBeNull();
            expect(legendEl?.dataset.position).toBe("bottom");

            const legendLabels = Array.from(
                legendEl?.querySelectorAll<HTMLElement>(".cs-chart-legend-label") ?? [],
            ).map((el) => el.textContent);
            expect(legendLabels).toEqual(["Revenue", "Forecast"]);
            expect(legendLabels).not.toContain("Margin");
            expect(legendEl?.querySelector(".cs-preset-extra")?.textContent).toBe("FY26");

            const svg = container.querySelector<SVGSVGElement>("svg.cs-chart-svg");
            expect(svg).not.toBeNull();
            expect(svg?.querySelector('[data-series-id="revenue"]')).not.toBeNull();
            expect(svg?.querySelector('[data-series-id="margin"]')).not.toBeNull();
            expect(svg?.querySelector('[data-series-id="forecast"]')).not.toBeNull();
        },
    );

    it("omits .cs-chart-legend on presets when include=[] without extra while keeping all series plotted", () => {
        const props: LineChartProps<SampleDatum> = {
            variant: "soft",
            size: "md",
            data: SAMPLE_DATA,
            x: "month",
            series: SAMPLE_SERIES,
            legend: { include: [] },
        };
        const instance = mount(LineChart, { target: container, props });
        flushSync();
        mounted.push(instance);

        expect(container.querySelector(".cs-chart-legend")).toBeNull();
        const svg = container.querySelector<SVGSVGElement>("svg.cs-chart-svg");
        expect(svg?.querySelector('[data-series-id="revenue"]')).not.toBeNull();
        expect(svg?.querySelector('[data-series-id="margin"]')).not.toBeNull();
        expect(svg?.querySelector('[data-series-id="forecast"]')).not.toBeNull();
    });

    it("omits .cs-chart-legend when legend.position='none' even if extra is provided", () => {
        const extra = createRawSnippet(() => ({
            render: () => '<span class="cs-preset-extra">Hidden Note</span>',
        }));

        const props: LineChartProps<SampleDatum> = {
            variant: "soft",
            size: "md",
            data: SAMPLE_DATA,
            x: "month",
            series: SAMPLE_SERIES,
            legend: { position: "none", extra },
        };
        const instance = mount(LineChart, { target: container, props });
        flushSync();
        mounted.push(instance);

        expect(container.querySelector(".cs-chart-legend")).toBeNull();
        expect(container.querySelector(".cs-preset-extra")).toBeNull();
    });

    it("renders static span items with marker='dot' when BarChart legend has interactive=false and marker='dot'", () => {
        const props: BarChartProps<SampleDatum> = {
            variant: "soft",
            size: "md",
            data: SAMPLE_DATA,
            x: "month",
            series: SAMPLE_SERIES,
            legend: { interactive: false, marker: "dot" },
        };
        const instance = mount(BarChart, { target: container, props });
        flushSync();
        mounted.push(instance);

        expect(container.querySelector("button.cs-chart-legend-item")).toBeNull();
        const staticItems = container.querySelectorAll<HTMLSpanElement>(
            "span.cs-chart-legend-item[data-static]",
        );
        expect(staticItems).toHaveLength(3);

        const swatches = container.querySelectorAll<HTMLSpanElement>(".cs-chart-legend-swatch");
        expect(swatches).toHaveLength(3);
        for (const swatch of swatches) {
            expect(swatch.dataset.kind).toBe("dot");
        }
    });

    it("applies position='end' and align='center' from ChartLegendConfig on presets", () => {
        const props: BarChartProps<SampleDatum> = {
            variant: "soft",
            size: "md",
            data: SAMPLE_DATA,
            x: "month",
            series: SAMPLE_SERIES,
            legend: { position: "end", align: "center" },
        };
        const instance = mount(BarChart, { target: container, props });
        flushSync();
        mounted.push(instance);

        const legendEl = container.querySelector<HTMLElement>(".cs-chart-legend");
        expect(legendEl).not.toBeNull();
        expect(legendEl?.dataset.position).toBe("end");
        expect(legendEl?.dataset.align).toBe("center");
    });
});
