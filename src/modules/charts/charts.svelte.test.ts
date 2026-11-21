import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ChartTestHost from "./ChartTestHost.internal.svelte";
import { clearMeasureCache } from "./chart-measure.internal.ts";
import {
    CHART_LEGEND_MARKERS,
    CHART_LEGEND_PLACEMENTS,
    CHART_SIZES,
    CHART_VARIANTS,
    ChartLoading,
    ChartState,
    type ChartAreaMode,
    type ChartCurve,
    type ChartDatum,
    type ChartGridOption,
    type ChartLegendMarker,
    type ChartLegendPlacement,
    type ChartLegendPosition,
    type ChartLineDotsMode,
    type ChartLoadingShape,
    type ChartSeries,
    type ChartTooltipContext,
} from "./index.ts";

interface RevenueRow extends ChartDatum {
    month: string;
    revenue: number;
    margin: number;
    variance?: number;
}

const SAMPLE_DATA: RevenueRow[] = [
    { month: "Jan", revenue: 120, margin: 0.24, variance: -25 },
    { month: "Feb", revenue: 180, margin: 0.28, variance: 15 },
    { month: "Mar", revenue: 240, margin: 0.31, variance: 45 },
    { month: "Apr", revenue: 210, margin: 0.29, variance: -10 },
];

const SAMPLE_SERIES: ChartSeries<RevenueRow>[] = [
    { id: "revenue", label: "Revenue" },
];

const DUAL_AXIS_SERIES: ChartSeries<RevenueRow>[] = [
    { id: "revenue", label: "Revenue", yAxis: "left" },
    { id: "margin", label: "Margin %", yAxis: "right" },
];

const VARIANCE_SERIES: ChartSeries<RevenueRow>[] = [
    { id: "variance", label: "Variance" },
];

interface ResizeObserverHarness {
    callback: ResizeObserverCallback | null;
    observe: (target: Element) => void;
    unobserve: (target: Element) => void;
    disconnect: () => void;
}

let activeResizeHarness: ResizeObserverHarness | null = null;

class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
        if (activeResizeHarness) {
            activeResizeHarness.callback = cb;
        }
    }

    observe(target: Element): void {
        activeResizeHarness?.observe(target);
    }

    unobserve(target: Element): void {
        activeResizeHarness?.unobserve(target);
    }

    disconnect(): void {
        activeResizeHarness?.disconnect();
    }
}

function isHalfPixel(value: string | null): boolean {
    if (value === null) return false;
    const numeric = Number(value);
    return Number.isFinite(numeric) && Number.isSafeInteger(numeric - 0.5);
}

function isIntegerAttr(value: string | null): boolean {
    if (value === null) return false;
    const numeric = Number(value);
    return Number.isSafeInteger(numeric);
}

describe("Charts M1 — Shell, Canvas, Grid, Axes & Empty/Loading States", () => {
    let container: HTMLDivElement;
    const mounted: ReturnType<typeof mount>[] = [];

    function renderHost(props: Record<string, unknown> = {}): ReturnType<typeof mount> {
        const instance = mount(ChartTestHost, { target: container, props });
        flushSync();
        mounted.push(instance);
        return instance;
    }

    beforeEach(() => {
        clearMeasureCache();
        activeResizeHarness = null;
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        while (mounted.length > 0) {
            const instance = mounted.pop();
            if (instance) unmount(instance);
        }
        container.remove();
        activeResizeHarness = null;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("Chart root shell", () => {
        it("sets data-variant, data-size, data-palette, data-monotone, data-loading, and data-empty accurately", () => {
            for (const variant of CHART_VARIANTS) {
                for (const size of CHART_SIZES) {
                    const instance = renderHost({
                        variant,
                        size,
                        data: SAMPLE_DATA,
                        x: "month",
                        series: SAMPLE_SERIES,
                    });
                    const figure = container.querySelector<HTMLElement>("figure.cs-chart");
                    expect(figure).not.toBeNull();
                    expect(figure?.dataset.variant).toBe(variant);
                    expect(figure?.dataset.size).toBe(size);
                    expect(figure?.dataset.palette).toBe("categorical");
                    expect(figure?.dataset.monotone).toBeUndefined();
                    expect(figure?.dataset.loading).toBeUndefined();
                    expect(figure?.dataset.empty).toBeUndefined();
                    expect(figure?.dataset.nested).toBeUndefined();
                    unmount(instance);
                    mounted.pop();
                }
            }

            renderHost({
                variant: "soft",
                size: "md",
                palette: "semantic",
                monotone: "teal",
                loading: true,
                empty: true,
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
            });

            const figure = container.querySelector<HTMLElement>("figure.cs-chart");
            expect(figure?.dataset.palette).toBe("semantic");
            expect(figure?.dataset.monotone).toBe("teal");
            expect(figure?.dataset.loading).toBe("");
            expect(figure?.dataset.empty).toBe("");
            expect(figure?.getAttribute("aria-busy")).toBe("true");
        });

        it("derives data-empty from empty data and allSeriesHidden, and respects explicit empty override", () => {
            const state = new ChartState<RevenueRow>({
                data: [],
                x: "month",
                series: SAMPLE_SERIES,
            });
            renderHost({ variant: "elevated", size: "md", state });

            const figure = container.querySelector<HTMLElement>("figure.cs-chart");
            expect(figure?.dataset.empty).toBe("");

            state.data = SAMPLE_DATA;
            flushSync();
            expect(figure?.dataset.empty).toBeUndefined();

            state.toggleSeries("revenue");
            flushSync();
            expect(state.allSeriesHidden).toBe(true);
            expect(figure?.dataset.empty).toBe("");

            state.showAllSeries();
            flushSync();
            expect(figure?.dataset.empty).toBeUndefined();

            // Explicit empty={false} suppresses data-empty even when data is empty
            const emptyOverrideHost = renderHost({
                variant: "elevated",
                size: "md",
                data: [],
                empty: false,
                chartAttrs: { "data-testid": "explicit-not-empty" },
            });
            const explicitFigure = container.querySelector<HTMLElement>(
                '[data-testid="explicit-not-empty"]',
            );
            expect(explicitFigure?.dataset.empty).toBeUndefined();
            unmount(emptyOverrideHost);
            mounted.pop();
        });

        it("binds ref to <figure class='cs-chart'> and forwards {...rest} class, aria-label, and data-* attributes", () => {
            const refs: { chart: HTMLElement | null } = { chart: null };
            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                label: "Quarterly revenue chart",
                chartClass: "custom-chart-class",
                chartAttrs: { "data-testid": "revenue-chart", "data-track": "exec" },
                get chartRef() {
                    return refs.chart;
                },
                set chartRef(value: HTMLElement | null) {
                    refs.chart = value;
                },
            });

            renderHost(props);

            const figure = container.querySelector<HTMLElement>('[data-testid="revenue-chart"]');
            expect(figure).not.toBeNull();
            expect(figure?.tagName).toBe("FIGURE");
            expect(figure?.classList.contains("cs-chart")).toBe(true);
            expect(figure?.classList.contains("custom-chart-class")).toBe(true);
            expect(figure?.dataset.track).toBe("exec");
            expect(figure?.getAttribute("aria-label")).toBe("Quarterly revenue chart");
            expect(refs.chart).toBe(figure);
        });

        it("forwards aria-label passed via {...rest} when label prop is omitted", () => {
            renderHost({
                variant: "elevated",
                size: "md",
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                chartAttrs: {
                    "data-testid": "rest-aria-chart",
                    "aria-label": "Forwarded aria label",
                },
            });

            const figure = container.querySelector<HTMLElement>('[data-testid="rest-aria-chart"]');
            expect(figure?.getAttribute("aria-label")).toBe("Forwarded aria label");
        });

        it("sets data-nested and concentric --cs-chart-nested-radius when nested inside <Card>", () => {
            renderHost({
                mode: "nested-in-card",
                cardVariant: "elevated",
                cardSize: "lg",
                variant: "sunken",
                size: "md",
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
            });

            const card = container.querySelector<HTMLElement>(".cs-card");
            const figure = container.querySelector<HTMLElement>("figure.cs-chart");
            expect(card).not.toBeNull();
            expect(figure).not.toBeNull();
            expect(figure?.dataset.nested).toBe("");
            expect(figure?.style.getPropertyValue("--cs-chart-nested-radius")).not.toBe("");
        });

        it("syncs $bindable hiddenSeriesIds, activeIndex, and hoveredSeriesId in both directions", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
            });

            const bindings = $state<{
                hidden: readonly string[];
                active: number | null;
                hovered: string | null;
            }>({
                hidden: [],
                active: null,
                hovered: null,
            });

            const props = {
                variant: "elevated" as const,
                size: "md" as const,
                state,
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
                get hoveredSeriesId() {
                    return bindings.hovered;
                },
                set hoveredSeriesId(v: string | null) {
                    bindings.hovered = v;
                },
            };

            renderHost(props);

            const figure = container.querySelector<HTMLElement>("figure.cs-chart");
            expect(figure?.dataset.scrubbing).toBeUndefined();

            // Parent -> ChartState
            bindings.hidden = ["margin"];
            bindings.active = 2;
            bindings.hovered = "revenue";
            flushSync();

            expect(state.hiddenSeriesIds).toEqual(["margin"]);
            expect(state.activeIndex).toBe(2);
            expect(state.hoveredSeriesId).toBe("revenue");
            expect(figure?.dataset.scrubbing).toBe("");

            // ChartState -> Parent
            state.showAllSeries();
            state.setActiveIndex(null);
            state.setHoveredSeries(null);
            flushSync();

            expect(bindings.hidden).toEqual([]);
            expect(bindings.active).toBeNull();
            expect(bindings.hovered).toBeNull();
            expect(figure?.dataset.scrubbing).toBeUndefined();
        });

        it("supports one-way controlled props (without bind:) and fully uncontrolled ChartState mutations", () => {
            const controlledState = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
            });

            const controlledProps = $state({
                mode: "one-way-controlled" as const,
                variant: "elevated" as const,
                size: "md" as const,
                state: controlledState,
                hiddenSeriesIds: ["margin"] as readonly string[],
                activeIndex: 1 as number | null,
                hoveredSeriesId: "revenue" as string | null,
                chartAttrs: { "data-testid": "one-way-chart" },
            });

            const controlledHost = renderHost(controlledProps);
            const controlledFigure = container.querySelector<HTMLElement>(
                '[data-testid="one-way-chart"]',
            );

            expect(controlledState.hiddenSeriesIds).toEqual(["margin"]);
            expect(controlledState.activeIndex).toBe(1);
            expect(controlledState.hoveredSeriesId).toBe("revenue");
            expect(controlledFigure?.dataset.scrubbing).toBe("");

            // Internal mutation does not throw; subsequent parent prop update still syncs cleanly
            controlledState.setActiveIndex(2);
            flushSync();
            expect(controlledState.activeIndex).toBe(2);

            controlledProps.hiddenSeriesIds = [];
            controlledProps.activeIndex = null;
            controlledProps.hoveredSeriesId = null;
            flushSync();

            expect(controlledState.hiddenSeriesIds).toEqual([]);
            expect(controlledState.activeIndex).toBeNull();
            expect(controlledState.hoveredSeriesId).toBeNull();
            expect(controlledFigure?.dataset.scrubbing).toBeUndefined();

            unmount(controlledHost);
            mounted.pop();

            // Completely uncontrolled: bindable props omitted while ChartState mutates freely
            const uncontrolledState = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
            });

            renderHost({
                mode: "uncontrolled",
                variant: "soft",
                size: "md",
                state: uncontrolledState,
                chartAttrs: { "data-testid": "uncontrolled-chart" },
            });

            const uncontrolledFigure = container.querySelector<HTMLElement>(
                '[data-testid="uncontrolled-chart"]',
            );
            expect(uncontrolledFigure?.dataset.scrubbing).toBeUndefined();

            uncontrolledState.toggleSeries("revenue");
            uncontrolledState.setActiveIndex(2);
            uncontrolledState.setHoveredSeries("margin");
            flushSync();

            expect(uncontrolledState.hiddenSeriesIds).toEqual(["revenue"]);
            expect(uncontrolledState.activeIndex).toBe(2);
            expect(uncontrolledState.hoveredSeriesId).toBe("margin");
            expect(uncontrolledFigure?.dataset.scrubbing).toBe("");

            uncontrolledState.showAllSeries();
            uncontrolledState.setActiveIndex(null);
            uncontrolledState.setHoveredSeries(null);
            flushSync();

            expect(uncontrolledState.hiddenSeriesIds).toEqual([]);
            expect(uncontrolledState.activeIndex).toBeNull();
            expect(uncontrolledState.hoveredSeriesId).toBeNull();
            expect(uncontrolledFigure?.dataset.scrubbing).toBeUndefined();
        });
    });

    describe("Header primitives (ChartHeader, ChartTitle, ChartDescription, ChartActions)", () => {
        it("renders semantic structure, custom title element, binds refs, and forwards {...rest}", () => {
            const refs: {
                header: HTMLDivElement | null;
                title: HTMLHeadingElement | HTMLDivElement | null;
                description: HTMLParagraphElement | null;
                actions: HTMLDivElement | null;
            } = {
                header: null,
                title: null,
                description: null,
                actions: null,
            };

            renderHost({
                variant: "elevated",
                size: "md",
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                showHeader: true,
                headerClass: "custom-header",
                headerAttrs: { "data-testid": "hdr" },
                titleText: "Operating Margin",
                titleAs: "h2",
                titleAttrs: { "data-testid": "ttl", id: "chart-heading" },
                descriptionText: "Trailing 4 months in EUR",
                descriptionAttrs: { "data-testid": "desc" },
                showActions: true,
                actionsAttrs: { "data-testid": "acts" },
                get headerRef() {
                    return refs.header;
                },
                set headerRef(v: HTMLDivElement | null) {
                    refs.header = v;
                },
                get titleRef() {
                    return refs.title;
                },
                set titleRef(v: HTMLHeadingElement | HTMLDivElement | null) {
                    refs.title = v;
                },
                get descriptionRef() {
                    return refs.description;
                },
                set descriptionRef(v: HTMLParagraphElement | null) {
                    refs.description = v;
                },
                get actionsRef() {
                    return refs.actions;
                },
                set actionsRef(v: HTMLDivElement | null) {
                    refs.actions = v;
                },
            });

            const header = container.querySelector<HTMLDivElement>('[data-testid="hdr"]');
            const title = container.querySelector<HTMLElement>('[data-testid="ttl"]');
            const desc = container.querySelector<HTMLParagraphElement>('[data-testid="desc"]');
            const actions = container.querySelector<HTMLDivElement>('[data-testid="acts"]');

            expect(header?.classList.contains("cs-chart-header")).toBe(true);
            expect(header?.classList.contains("custom-header")).toBe(true);
            expect(title?.tagName).toBe("H2");
            expect(title?.classList.contains("cs-chart-title")).toBe(true);
            expect(title?.textContent?.trim()).toBe("Operating Margin");
            expect(title?.id).toBe("chart-heading");
            expect(desc?.tagName).toBe("P");
            expect(desc?.classList.contains("cs-chart-description")).toBe(true);
            expect(desc?.textContent?.trim()).toBe("Trailing 4 months in EUR");
            expect(actions?.classList.contains("cs-chart-actions")).toBe(true);
            expect(actions?.querySelector("button")?.textContent).toBe("Export");

            expect(refs.header).toBe(header);
            expect(refs.title).toBe(title);
            expect(refs.description).toBe(desc);
            expect(refs.actions).toBe(actions);
        });

        it("defaults ChartTitle to <h3> when `as` is omitted", () => {
            renderHost({
                variant: "elevated",
                size: "sm",
                showHeader: true,
                titleText: "Default Heading",
            });

            const title = container.querySelector(".cs-chart-title");
            expect(title?.tagName).toBe("H3");
        });
    });

    describe("ChartCanvas", () => {
        it("guards plot/mark rendering when dimensions are 0x0 and renders cleanly once sized", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 0,
                height: 0,
            });

            const refs: {
                canvas: HTMLDivElement | null;
                svg: SVGSVGElement | null;
            } = {
                canvas: null,
                svg: null,
            };

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showGrid: true,
                showBottomAxis: true,
                showLeftAxis: true,
                showCustomMark: true,
                showOverlay: true,
                canvasHeight: 280,
                canvasLabel: "Revenue trend",
                get canvasRef() {
                    return refs.canvas;
                },
                set canvasRef(v: HTMLDivElement | null) {
                    refs.canvas = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            // 0x0 guard: no defs, no clipPath, no plot group, no marks
            expect(state.hasSize).toBe(false);
            expect(refs.canvas).not.toBeNull();
            expect(refs.svg).not.toBeNull();
            expect(refs.svg?.getAttribute("width")).toBe("0");
            expect(refs.svg?.getAttribute("height")).toBe("0");
            expect(refs.svg?.querySelector("defs")).toBeNull();
            expect(refs.svg?.querySelector("clipPath")).toBeNull();
            expect(refs.svg?.querySelector(".cs-chart-plot")).toBeNull();
            expect(refs.svg?.querySelector('[data-testid="custom-mark"]')).toBeNull();
            expect(container.querySelector('[data-testid="canvas-overlay"]')).not.toBeNull();

            // Resize to fractional dimensions -> rounded to integer SVG attributes
            state.setDimensions(520.6, 280.2);
            flushSync();

            expect(state.hasSize).toBe(true);
            expect(refs.svg?.getAttribute("width")).toBe("521");
            expect(refs.svg?.getAttribute("height")).toBe("280");
            expect(isIntegerAttr(refs.svg?.getAttribute("width") ?? null)).toBe(true);
            expect(isIntegerAttr(refs.svg?.getAttribute("height") ?? null)).toBe(true);

            const clipPath = refs.svg?.querySelector(":scope > defs > clipPath");
            expect(clipPath).not.toBeNull();
            expect(state.plotClipId).not.toBe("");
            expect(clipPath?.id).toBe(state.plotClipId);

            const clipRect = clipPath?.querySelector("rect");
            expect(Number(clipRect?.getAttribute("width"))).toBe(state.plotWidth);
            expect(Number(clipRect?.getAttribute("height"))).toBe(state.plotHeight);

            expect(refs.svg?.querySelector(".cs-chart-plot")).not.toBeNull();
            expect(refs.svg?.querySelector('[data-testid="custom-mark"]')).not.toBeNull();

            // Export-safety invariant: zero <foreignObject> and zero <filter>
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            // Interactive attributes & explicit height style
            expect(refs.canvas?.getAttribute("role")).toBe("application");
            expect(refs.canvas?.getAttribute("tabindex")).toBe("0");
            expect(refs.canvas?.style.blockSize).toBe("280px");
        });

        it("coalesces ResizeObserver notifications via requestAnimationFrame and cleans up on unmount", () => {
            const harness: ResizeObserverHarness = {
                callback: null,
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
            activeResizeHarness = harness;

            const rafCallbacks: FrameRequestCallback[] = [];
            const cancelRafSpy = vi.fn();

            vi.stubGlobal("ResizeObserver", MockResizeObserver);
            vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
                rafCallbacks.push(cb);
                return rafCallbacks.length;
            });
            vi.stubGlobal("cancelAnimationFrame", cancelRafSpy);

            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
            });

            const instance = renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                canvasInteractive: false,
            });

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            expect(canvas?.getAttribute("role")).toBeNull();
            expect(canvas?.getAttribute("tabindex")).toBeNull();
            expect(harness.observe).toHaveBeenCalledTimes(1);
            expect(harness.callback).not.toBeNull();

            // Two rapid resize events coalesce into a single rAF using latest dimensions
            const fireResize = (width: number, height: number): void => {
                harness.callback?.(
                    [{ contentRect: { width, height } } as ResizeObserverEntry],
                    {} as ResizeObserver,
                );
            };
            fireResize(300, 200);
            fireResize(480, 260);
            expect(rafCallbacks).toHaveLength(1);

            rafCallbacks[0]?.(16);
            flushSync();
            expect(state.containerWidth).toBe(480);
            expect(state.containerHeight).toBe(260);
            expect(state.hasSize).toBe(true);

            // Queue another resize then unmount before rAF fires -> cancels pending rAF and disconnects
            fireResize(600, 320);
            expect(rafCallbacks).toHaveLength(2);

            unmount(instance);
            mounted.pop();

            expect(harness.disconnect).toHaveBeenCalledTimes(1);
            expect(cancelRafSpy).toHaveBeenCalledWith(2);
        });
    });

    describe("ChartGrid", () => {
        it("renders horizontal and vertical 1px hairlines snapped to n + 0.5 with crispEdges", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 520,
                height: 260,
            });

            const refs: { grid: SVGGElement | null } = { grid: null };
            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showGrid: true,
                gridHorizontal: true,
                gridVertical: true,
                gridAttrs: { "data-testid": "chart-grid" },
                get gridRef() {
                    return refs.grid;
                },
                set gridRef(v: SVGGElement | null) {
                    refs.grid = v;
                },
            });

            const grid = container.querySelector<SVGGElement>('[data-testid="chart-grid"]');
            expect(grid).not.toBeNull();
            expect(grid?.getAttribute("aria-hidden")).toBe("true");
            expect(refs.grid).toBe(grid);

            const lines = [...(grid?.querySelectorAll<SVGLineElement>("line.cs-chart-grid-line") ?? [])];
            expect(lines.length).toBeGreaterThan(0);

            const horizontalLines = lines.filter(
                (line) => line.getAttribute("y1") === line.getAttribute("y2"),
            );
            const verticalLines = lines.filter(
                (line) => line.getAttribute("x1") === line.getAttribute("x2"),
            );

            expect(horizontalLines.length).toBeGreaterThan(0);
            expect(verticalLines.length).toBeGreaterThan(0);

            for (const line of horizontalLines) {
                expect(line.getAttribute("shape-rendering")).toBe("crispEdges");
                expect(isHalfPixel(line.getAttribute("y1"))).toBe(true);
                expect(line.getAttribute("y1")).toBe(line.getAttribute("y2"));
            }

            for (const line of verticalLines) {
                expect(line.getAttribute("shape-rendering")).toBe("crispEdges");
                expect(isHalfPixel(line.getAttribute("x1"))).toBe(true);
                expect(line.getAttribute("x1")).toBe(line.getAttribute("x2"));
            }

            // Strictly positive domain omits zero-baseline
            expect(grid?.querySelector(".cs-chart-grid-zero")).toBeNull();
        });

        it("renders emphasized zero-baseline when domain crosses 0 and omits it when zeroLine is false", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: VARIANCE_SERIES,
                width: 520,
                height: 260,
            });

            expect(state.yScale.crossesZero).toBe(true);

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showGrid: true,
                gridHorizontal: true,
                gridZeroLine: true,
            });

            renderHost(props);

            const zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine).not.toBeNull();
            expect(zeroLine?.getAttribute("shape-rendering")).toBe("crispEdges");
            expect(isHalfPixel(zeroLine?.getAttribute("y1") ?? null)).toBe(true);
            expect(zeroLine?.getAttribute("y1")).toBe(zeroLine?.getAttribute("y2"));

            // Ensure no duplicate regular grid line sits on the exact same y coordinate as zeroLine
            const regularYCoords = [
                ...container.querySelectorAll<SVGLineElement>("line.cs-chart-grid-line"),
            ].map((line) => line.getAttribute("y1"));
            expect(regularYCoords).not.toContain(zeroLine?.getAttribute("y1"));

            // Turning zeroLine off removes the emphasized zero line
            props.gridZeroLine = false;
            flushSync();
            expect(container.querySelector("line.cs-chart-grid-zero")).toBeNull();
        });
    });

    describe("ChartAxis", () => {
        it("renders bottom, left, and right axes at integer coordinates and hides Y spines by default", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                yAxis: { label: "EUR" },
                y2Axis: { label: "Margin", format: (v) => `${Math.round(Number(v) * 100)}%` },
                width: 560,
                height: 280,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBottomAxis: true,
                bottomAxisLabel: "Month",
                showLeftAxis: true,
                showRightAxis: true,
            });

            const bottom = container.querySelector<SVGGElement>('[data-position="bottom"]');
            const left = container.querySelector<SVGGElement>('[data-position="left"]');
            const right = container.querySelector<SVGGElement>('[data-position="right"]');

            expect(bottom).not.toBeNull();
            expect(left).not.toBeNull();
            expect(right).not.toBeNull();

            // Bottom spine shown by default (half-pixel snapped); left & right spines hidden by default
            const bottomSpine = bottom?.querySelector<SVGLineElement>("line.cs-chart-axis-line");
            expect(bottomSpine).not.toBeNull();
            expect(isHalfPixel(bottomSpine?.getAttribute("y1") ?? null)).toBe(true);
            expect(bottomSpine?.getAttribute("shape-rendering")).toBe("crispEdges");
            expect(left?.querySelector("line.cs-chart-axis-line")).toBeNull();
            expect(right?.querySelector("line.cs-chart-axis-line")).toBeNull();

            // Integer coordinates on all tick labels
            const bottomTicks = bottom?.querySelectorAll("text.cs-chart-axis-tick-text") ?? [];
            for (const tick of bottomTicks) {
                expect(isIntegerAttr(tick.getAttribute("x"))).toBe(true);
                expect(isIntegerAttr(tick.getAttribute("y"))).toBe(true);
            }
            const leftTicks = left?.querySelectorAll("text.cs-chart-axis-tick-text") ?? [];
            for (const tick of leftTicks) {
                expect(isIntegerAttr(tick.getAttribute("x"))).toBe(true);
                expect(isIntegerAttr(tick.getAttribute("y"))).toBe(true);
            }
            const rightTicks = right?.querySelectorAll("text.cs-chart-axis-tick-text") ?? [];
            for (const tick of rightTicks) {
                expect(isIntegerAttr(tick.getAttribute("x"))).toBe(true);
                expect(isIntegerAttr(tick.getAttribute("y"))).toBe(true);
            }

            // Optional axis titles rendered
            expect(bottom?.querySelector("text.cs-chart-axis-label")?.textContent?.trim()).toBe("Month");
            expect(left?.querySelector("text.cs-chart-axis-label")?.textContent?.trim()).toBe("EUR");
            expect(right?.querySelector("text.cs-chart-axis-label")?.textContent?.trim()).toBe("Margin");
        });

        it("truncates overflowing labels with ellipsis and includes full untruncated label in <title>", () => {
            const longLabel = "Very Long Enterprise Operations Division Name";
            const state = new ChartState<ChartDatum>({
                data: [
                    { category: longLabel, value: 80 },
                    { category: "Short", value: 40 },
                ],
                x: "category",
                series: [{ id: "value", label: "Value" }],
                width: 480,
                height: 240,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBottomAxis: true,
                bottomAxisMaxTickWidth: 72,
            });

            const bottom = container.querySelector<SVGGElement>('[data-position="bottom"]');
            const ticks = [...(bottom?.querySelectorAll<SVGTextElement>("text.cs-chart-axis-tick-text") ?? [])];
            expect(ticks).toHaveLength(2);

            const truncatedTick = ticks[0];
            const titleEl = truncatedTick?.querySelector("title");
            expect(titleEl).not.toBeNull();
            expect(titleEl?.textContent).toBe(longLabel);

            // Visible text (excluding <title>) ends with ellipsis
            const visibleText = [...(truncatedTick?.childNodes ?? [])]
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent ?? "")
                .join("")
                .trim();
            expect(visibleText.endsWith("\u{2026}")).toBe(true);
            expect(visibleText.length).toBeLessThan(longLabel.length);

            // Short non-overflowing label omits <title>
            const shortTick = ticks[1];
            expect(shortTick?.querySelector("title")).toBeNull();
            expect(shortTick?.textContent?.trim()).toBe("Short");
        });

        it("skips colliding X-axis ticks when horizontal space is tight", () => {
            const denseData = Array.from({ length: 24 }, (_, idx) => ({
                day: `2026-01-${String(idx + 1).padStart(2, "0")}`,
                value: idx * 10 + 20,
            }));

            const state = new ChartState<ChartDatum>({
                data: denseData,
                x: "day",
                preferBandX: false,
                series: [{ id: "value", label: "Value" }],
                width: 280,
                height: 220,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBottomAxis: true,
            });

            const bottom = container.querySelector<SVGGElement>('[data-position="bottom"]');
            const renderedTicks = bottom?.querySelectorAll("text.cs-chart-axis-tick-text") ?? [];
            expect(renderedTicks.length).toBeGreaterThan(0);
            expect(renderedTicks.length).toBeLessThan(denseData.length);
        });

        it("renders 2-line <tspan> wrap when wrapTicks is true and rotated transforms when tickAngle is set", () => {
            const multiWordData = [
                { category: "Enterprise Cloud Infrastructure", value: 100 },
                { category: "Customer Support Operations", value: 75 },
            ];

            const state = new ChartState<ChartDatum>({
                data: multiWordData,
                x: "category",
                series: [{ id: "value", label: "Value" }],
                width: 440,
                height: 260,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBottomAxis: true,
                bottomAxisWrapTicks: true,
                bottomAxisMaxTickWidth: 96,
                bottomAxisTickAngle: 0 as 0 | -35 | -45 | "auto",
            });

            renderHost(props);

            const bottom = container.querySelector<SVGGElement>('[data-position="bottom"]');
            const wrappedTicks = bottom?.querySelectorAll("text.cs-chart-axis-tick-text") ?? [];
            expect(wrappedTicks.length).toBe(2);
            const firstTspans = wrappedTicks[0]?.querySelectorAll("tspan");
            expect(firstTspans?.length).toBe(2);

            // Switch to angled ticks (-45°)
            props.bottomAxisWrapTicks = false;
            props.bottomAxisTickAngle = -45;
            flushSync();

            const rotatedTicks =
                bottom?.querySelectorAll<SVGTextElement>("text.cs-chart-axis-tick-text") ?? [];
            expect(rotatedTicks.length).toBe(2);
            for (const tick of rotatedTicks) {
                expect(tick.getAttribute("transform")).toMatch(/rotate\(-45\)/);
            }
        });

        it("auto-rotates tickAngle='auto' and expands margins.bottom only when labels overflow slot width", () => {
            const shortData = [
                { category: "Q1", value: 100 },
                { category: "Q2", value: 140 },
                { category: "Q3", value: 120 },
                { category: "Q4", value: 180 },
            ];
            const longData = [
                { category: "Enterprise Operations Division", value: 100 },
                { category: "Global Supply Chain Logistics", value: 140 },
                { category: "Customer Success Engineering", value: 120 },
                { category: "Financial Planning & Analytics", value: 180 },
            ];

            const state = new ChartState<ChartDatum>({
                data: shortData,
                x: "category",
                series: [{ id: "value", label: "Value" }],
                width: 520,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBottomAxis: true,
                bottomAxisTickAngle: "auto",
            });

            const bottom = container.querySelector<SVGGElement>('[data-position="bottom"]');
            expect(state.resolvedBottomTickAngle).toBe(0);
            const flatMarginBottom = state.margins.bottom;
            const flatTicks = bottom?.querySelectorAll<SVGTextElement>("text.cs-chart-axis-tick-text") ?? [];
            expect(flatTicks.length).toBe(4);
            for (const tick of flatTicks) {
                expect(tick.getAttribute("transform")).toBeNull();
            }

            // Switch to long overflowing category labels -> auto-rotates to -38° and expands margins.bottom
            state.data = longData;
            flushSync();

            expect(state.resolvedBottomTickAngle).toBe(-38);
            expect(state.margins.bottom).toBeGreaterThan(flatMarginBottom);
            const autoRotatedTicks =
                bottom?.querySelectorAll<SVGTextElement>("text.cs-chart-axis-tick-text") ?? [];
            expect(autoRotatedTicks.length).toBeGreaterThan(0);
            for (const tick of autoRotatedTicks) {
                expect(tick.getAttribute("transform")).toMatch(/rotate\(-38\)/);
            }
        });

        it("syncs direct <ChartAxis label> prop to chart.margins.bottom and cleans up on unmount", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 520,
                height: 260,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBottomAxis: true,
                bottomAxisLabel: undefined as string | undefined,
            });

            renderHost(props);

            const marginWithoutLabel = state.margins.bottom;
            expect(
                container.querySelector('[data-position="bottom"]')?.querySelector("text.cs-chart-axis-label"),
            ).toBeNull();

            props.bottomAxisLabel = "Month";
            flushSync();

            expect(state.margins.bottom).toBeGreaterThan(marginWithoutLabel);
            expect(
                container
                    .querySelector('[data-position="bottom"]')
                    ?.querySelector("text.cs-chart-axis-label")
                    ?.textContent?.trim(),
            ).toBe("Month");

            // Unmounting <ChartAxis> clears the override and restores margin
            props.showBottomAxis = false;
            flushSync();
            expect(state.margins.bottom).toBe(marginWithoutLabel);
        });

        it("respects hideLine overrides on bottom, left, and right axes", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 560,
                height: 280,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBottomAxis: true,
                bottomAxisHideLine: true,
                showLeftAxis: true,
                leftAxisHideLine: false,
                showRightAxis: true,
                rightAxisHideLine: false,
            });

            const bottom = container.querySelector<SVGGElement>('[data-position="bottom"]');
            const left = container.querySelector<SVGGElement>('[data-position="left"]');
            const right = container.querySelector<SVGGElement>('[data-position="right"]');

            expect(bottom?.querySelector("line.cs-chart-axis-line")).toBeNull();

            const leftSpine = left?.querySelector<SVGLineElement>("line.cs-chart-axis-line");
            expect(leftSpine).not.toBeNull();
            expect(leftSpine?.getAttribute("shape-rendering")).toBe("crispEdges");
            expect(isHalfPixel(leftSpine?.getAttribute("x1") ?? null)).toBe(true);
            expect(leftSpine?.getAttribute("x1")).toBe(leftSpine?.getAttribute("x2"));

            const rightSpine = right?.querySelector<SVGLineElement>("line.cs-chart-axis-line");
            expect(rightSpine).not.toBeNull();
            expect(rightSpine?.getAttribute("shape-rendering")).toBe("crispEdges");
            expect(isHalfPixel(rightSpine?.getAttribute("x1") ?? null)).toBe(true);
            expect(rightSpine?.getAttribute("x1")).toBe(rightSpine?.getAttribute("x2"));
        });
    });

    describe("Horizontal orientation (ChartGrid & ChartAxis)", () => {
        it("renders vertical zero-line and swapped gridlines when orientation='horizontal'", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: VARIANCE_SERIES,
                orientation: "horizontal",
                width: 520,
                height: 260,
            });

            expect(state.yScale.crossesZero).toBe(true);

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showGrid: true,
                gridHorizontal: true,
                gridVertical: true,
                gridZeroLine: true,
            });

            const zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine).not.toBeNull();
            expect(zeroLine?.getAttribute("shape-rendering")).toBe("crispEdges");
            expect(isHalfPixel(zeroLine?.getAttribute("x1") ?? null)).toBe(true);
            expect(zeroLine?.getAttribute("x1")).toBe(zeroLine?.getAttribute("x2"));
            expect(zeroLine?.getAttribute("y1")).toBe("0");
            expect(Number(zeroLine?.getAttribute("y2"))).toBe(state.plotHeight);

            const gridLines = [
                ...container.querySelectorAll<SVGLineElement>("line.cs-chart-grid-line"),
            ];
            const horizontalLines = gridLines.filter(
                (line) => line.getAttribute("y1") === line.getAttribute("y2"),
            );
            const verticalLines = gridLines.filter(
                (line) => line.getAttribute("x1") === line.getAttribute("x2"),
            );

            // Horizontal lines follow category xScale (4 months); vertical lines follow numeric yScale (excluding 0)
            expect(horizontalLines).toHaveLength(SAMPLE_DATA.length);
            expect(verticalLines.length).toBeGreaterThan(0);
            const verticalXCoords = verticalLines.map((line) => line.getAttribute("x1"));
            expect(verticalXCoords).not.toContain(zeroLine?.getAttribute("x1"));
        });

        it("swaps axis scales (categories on left, values on bottom) and clamps left gutter via maxTickWidth", () => {
            const longCategory = "Very Long Enterprise Operations Division Name";
            const state = new ChartState<ChartDatum>({
                data: [
                    { category: longCategory, value: 120 },
                    { category: "Short", value: 45 },
                ],
                x: "category",
                series: [{ id: "value", label: "Value" }],
                orientation: "horizontal",
                width: 480,
                height: 240,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showLeftAxis: true,
                showBottomAxis: true,
                leftAxisMaxTickWidth: 76,
            });

            renderHost(props);

            const left = container.querySelector<SVGGElement>('[data-position="left"]');
            const bottom = container.querySelector<SVGGElement>('[data-position="bottom"]');

            // Left axis renders categories, truncates overflowing label with <title>, and clamps margins.left
            const leftTicks = [
                ...(left?.querySelectorAll<SVGTextElement>("text.cs-chart-axis-tick-text") ?? []),
            ];
            expect(leftTicks).toHaveLength(2);
            expect(leftTicks[0]?.querySelector("title")?.textContent).toBe(longCategory);
            const visibleLeftText = [...(leftTicks[0]?.childNodes ?? [])]
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent ?? "")
                .join("")
                .trim();
            expect(visibleLeftText.endsWith("\u{2026}")).toBe(true);
            expect(leftTicks[1]?.textContent?.trim()).toBe("Short");

            const clampedLeftMargin = state.margins.left;
            expect(clampedLeftMargin).toBeGreaterThan(76);
            expect(clampedLeftMargin).toBeLessThanOrEqual(110);

            // Expanding maxTickWidth increases margins.left accordingly
            props.leftAxisMaxTickWidth = 140;
            flushSync();
            expect(state.margins.left).toBeGreaterThan(clampedLeftMargin);

            // Bottom axis renders numeric values from yScale
            const bottomTickTexts = [
                ...(bottom?.querySelectorAll<SVGTextElement>("text.cs-chart-axis-tick-text") ?? []),
            ].map((node) => node.textContent?.trim() ?? "");
            expect(bottomTickTexts.length).toBeGreaterThan(0);
            expect(bottomTickTexts).toContain("0");
            for (const text of bottomTickTexts) {
                const numeric = Number(text.replaceAll(",", ""));
                expect(Number.isFinite(numeric)).toBe(true);
            }
        });
    });

    describe("ChartEmpty & ChartLoading", () => {
        it("renders localized empty message and Show all reset button when allSeriesHidden is true", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                hiddenSeriesIds: ["revenue", "margin"],
            });

            const refs: { empty: HTMLDivElement | null } = { empty: null };
            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showEmpty: true,
                emptyDescription: "Toggle a legend item to restore marks.",
                emptyAttrs: { "data-testid": "empty-panel" },
                get emptyRef() {
                    return refs.empty;
                },
                set emptyRef(v: HTMLDivElement | null) {
                    refs.empty = v;
                },
            });

            const panel = container.querySelector<HTMLDivElement>('[data-testid="empty-panel"]');
            expect(panel).not.toBeNull();
            expect(refs.empty).toBe(panel);
            expect(panel?.dataset.allHidden).toBe("");
            expect(panel?.querySelector(".cs-chart-empty-title")?.textContent?.trim()).toBe(
                "All series hidden",
            );
            expect(panel?.querySelector(".cs-chart-empty-description")?.textContent?.trim()).toBe(
                "Toggle a legend item to restore marks.",
            );

            const resetButton = panel?.querySelector<HTMLButtonElement>("button");
            expect(resetButton).not.toBeNull();
            expect(resetButton?.textContent?.trim()).toBe("Show all");

            resetButton?.click();
            flushSync();

            expect(state.hiddenSeriesIds).toEqual([]);
            expect(state.allSeriesHidden).toBe(false);
            expect(panel?.dataset.allHidden).toBeUndefined();
            expect(panel?.querySelector(".cs-chart-empty-title")?.textContent?.trim()).toBe(
                "No data available",
            );
            expect(panel?.querySelector("button")).toBeNull();
        });

        it("invokes custom onReset handler and supports hideReset and standalone rendering", () => {
            const onReset = vi.fn();
            renderHost({
                mode: "standalone-empty",
                onEmptyReset: onReset,
                emptyAttrs: { "data-testid": "standalone-empty" },
            });

            const panel = container.querySelector<HTMLDivElement>('[data-testid="standalone-empty"]');
            expect(panel?.querySelector(".cs-chart-empty-title")?.textContent?.trim()).toBe(
                "No data available",
            );
            const resetButton = panel?.querySelector<HTMLButtonElement>("button");
            expect(resetButton).not.toBeNull();
            resetButton?.click();
            expect(onReset).toHaveBeenCalledTimes(1);

            const hiddenReset = renderHost({
                mode: "standalone-empty",
                onEmptyReset: onReset,
                emptyHideReset: true,
                emptyAttrs: { "data-testid": "hidden-reset-empty" },
            });
            const hiddenPanel = container.querySelector<HTMLDivElement>(
                '[data-testid="hidden-reset-empty"]',
            );
            expect(hiddenPanel?.querySelector("button")).toBeNull();
            unmount(hiddenReset);
            mounted.pop();
        });

        it("renders ChartLoading with role='status', aria-busy='true', localized aria-label, and custom label/children support", () => {
            const refs: { loading: HTMLDivElement | null } = { loading: null };
            renderHost({
                variant: "elevated",
                size: "md",
                loading: true,
                showLoading: true,
                loadingAttrs: { "data-testid": "loading-state" },
                get loadingRef() {
                    return refs.loading;
                },
                set loadingRef(v: HTMLDivElement | null) {
                    refs.loading = v;
                },
            });

            const loadingEl = container.querySelector<HTMLDivElement>(
                '[data-testid="loading-state"]',
            );
            expect(loadingEl).not.toBeNull();
            expect(refs.loading).toBe(loadingEl);
            expect(loadingEl?.getAttribute("role")).toBe("status");
            expect(loadingEl?.getAttribute("aria-busy")).toBe("true");
            expect(loadingEl?.getAttribute("aria-label")).toBe("Loading chart");
            expect(loadingEl?.querySelectorAll(".cs-chart-loading-bar")).toHaveLength(7);

            const custom = renderHost({
                mode: "standalone-loading",
                loadingLabel: "Fetching telemetry",
                loadingCustomContent: "Custom shimmer",
                loadingAttrs: { "data-testid": "custom-loading-state" },
            });
            const customEl = container.querySelector<HTMLDivElement>(
                '[data-testid="custom-loading-state"]',
            );
            expect(customEl?.getAttribute("aria-label")).toBe("Fetching telemetry");
            expect(customEl?.querySelector('[data-testid="custom-loading"]')?.textContent).toBe(
                "Custom shimmer",
            );
            expect(customEl?.querySelectorAll(".cs-chart-loading-bar")).toHaveLength(0);
            unmount(custom);
            mounted.pop();
        });

        it("renders ChartLoading shape silhouettes (bars default, line, donut) via <clipPath> with status semantics and no foreignObject/filter", () => {
            const props = $state<{ shape?: ChartLoadingShape }>({});
            const instance = mount(ChartLoading, { target: container, props });
            mounted.push(instance);
            flushSync();

            const cases: Array<{
                nextShape?: ChartLoadingShape;
                expectedShape: ChartLoadingShape;
                silhouetteSelector: string;
                expectedCount: number;
            }> = [
                {
                    expectedShape: "bars",
                    silhouetteSelector: ".cs-chart-loading-bar",
                    expectedCount: 7,
                },
                {
                    nextShape: "line",
                    expectedShape: "line",
                    silhouetteSelector: ".cs-chart-loading-line",
                    expectedCount: 1,
                },
                {
                    nextShape: "donut",
                    expectedShape: "donut",
                    silhouetteSelector: ".cs-chart-loading-donut",
                    expectedCount: 1,
                },
            ];

            for (const { nextShape, expectedShape, silhouetteSelector, expectedCount } of cases) {
                if (nextShape !== undefined) {
                    props.shape = nextShape;
                    flushSync();
                }

                const loadingEl = container.querySelector<HTMLDivElement>(".cs-chart-loading");
                expect(loadingEl).not.toBeNull();
                expect(loadingEl?.dataset.shape).toBe(expectedShape);
                expect(loadingEl?.getAttribute("role")).toBe("status");
                expect(loadingEl?.getAttribute("aria-busy")).toBe("true");

                const svg = loadingEl?.querySelector("svg.cs-chart-loading-svg");
                expect(svg).not.toBeNull();
                const clipPath = svg?.querySelector(":scope > defs > clipPath");
                expect(clipPath).not.toBeNull();
                expect(clipPath?.id).not.toBe("");
                expect(clipPath?.querySelectorAll(silhouetteSelector)).toHaveLength(expectedCount);
                expect(svg?.querySelector("g[clip-path]")?.getAttribute("clip-path")).toBe(
                    `url(#${clipPath?.id})`,
                );
                expect(svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);
            }
        });
    });
});

interface NullableMetricRow extends ChartDatum {
    month: string;
    actual: number | null;
    target: number | null;
}

const NULLABLE_DATA: NullableMetricRow[] = [
    { month: "Jan", actual: 100, target: 90 },
    { month: "Feb", actual: 150, target: null },
    { month: "Mar", actual: null, target: 140 },
    { month: "Apr", actual: 200, target: 180 },
];

const NULLABLE_SERIES: ChartSeries<NullableMetricRow>[] = [
    { id: "actual", label: "Actual" },
    { id: "target", label: "Target" },
];

function mockElementRect(
    el: Element,
    rect: { left: number; top: number; width: number; height: number },
): void {
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
        x: rect.left,
        y: rect.top,
        left: rect.left,
        top: rect.top,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        width: rect.width,
        height: rect.height,
        toJSON: () => ({}),
    });
}

function installPopoverHarness(el: HTMLDivElement): {
    isOpen: () => boolean;
    showPopover: ReturnType<typeof vi.fn>;
    hidePopover: ReturnType<typeof vi.fn>;
} {
    let open = false;
    const originalMatches = el.matches.bind(el);
    const showPopover = vi.fn(() => {
        open = true;
    });
    const hidePopover = vi.fn(() => {
        open = false;
    });

    Object.defineProperties(el, {
        showPopover: {
            configurable: true,
            writable: true,
            value: showPopover,
        },
        hidePopover: {
            configurable: true,
            writable: true,
            value: hidePopover,
        },
        matches: {
            configurable: true,
            writable: true,
            value: (selector: string) => {
                if (selector === ":popover-open") return open;
                return originalMatches(selector);
            },
        },
    });

    return {
        isOpen: () => open,
        showPopover,
        hidePopover,
    };
}

describe("Charts M2 — Interactive Scrubbing, Crosshair, Tooltip, Legend & Overlay", () => {
    let container: HTMLDivElement;
    const mounted: ReturnType<typeof mount>[] = [];

    function renderHost(props: Record<string, unknown> = {}): ReturnType<typeof mount> {
        const instance = mount(ChartTestHost, { target: container, props });
        flushSync();
        mounted.push(instance);
        return instance;
    }

    beforeEach(() => {
        clearMeasureCache();
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        while (mounted.length > 0) {
            const instance = mounted.pop();
            if (instance) unmount(instance);
        }
        container.remove();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("ChartCanvas keyboard & pointer scrubbing", () => {
        it("updates activeIndex and .cs-chart-sr-live via ArrowRight/ArrowLeft/ArrowDown/ArrowUp/Home/End and clears on Escape/blur", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 520,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
            });

            const figure = container.querySelector<HTMLElement>("figure.cs-chart");
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const srLive = container.querySelector<HTMLDivElement>(".cs-chart-sr-live");

            expect(canvas).not.toBeNull();
            expect(srLive).not.toBeNull();
            expect(srLive?.getAttribute("aria-live")).toBe("polite");
            expect(srLive?.getAttribute("aria-atomic")).toBe("true");
            expect(srLive?.textContent?.trim()).toBe("");
            expect(state.activeIndex).toBeNull();
            expect(canvas?.dataset.scrubbing).toBeUndefined();
            expect(figure?.dataset.scrubbing).toBeUndefined();

            // Escape when not scrubbing is a no-op and does not preventDefault
            const idleEscape = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true,
            });
            canvas?.dispatchEvent(idleEscape);
            flushSync();
            expect(idleEscape.defaultPrevented).toBe(false);
            expect(state.activeIndex).toBeNull();

            // ArrowRight from null -> index 0
            const arrowRight1 = new KeyboardEvent("keydown", {
                key: "ArrowRight",
                bubbles: true,
                cancelable: true,
            });
            canvas?.dispatchEvent(arrowRight1);
            flushSync();
            expect(arrowRight1.defaultPrevented).toBe(true);
            expect(state.activeIndex).toBe(0);
            expect(canvas?.dataset.scrubbing).toBe("");
            expect(figure?.dataset.scrubbing).toBe("");
            expect(srLive?.textContent?.trim()).toBe("Jan: Revenue 120, Margin % 0.24");

            // ArrowRight -> 1, ArrowDown -> 2, End -> 3
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(1);
            expect(srLive?.textContent?.trim()).toBe("Feb: Revenue 180, Margin % 0.28");

            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(2);

            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(3);
            expect(srLive?.textContent?.trim()).toBe("Apr: Revenue 210, Margin % 0.29");

            // Clamps at upper bound
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(3);

            // ArrowLeft -> 2, ArrowUp -> 1, Home -> 0
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(2);

            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(1);

            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(0);

            // Clamps at lower bound
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(0);

            // Escape clears activeIndex and prevents default
            const activeEscape = new KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true,
            });
            canvas?.dispatchEvent(activeEscape);
            flushSync();
            expect(activeEscape.defaultPrevented).toBe(true);
            expect(state.activeIndex).toBeNull();
            expect(canvas?.dataset.scrubbing).toBeUndefined();
            expect(figure?.dataset.scrubbing).toBeUndefined();
            expect(srLive?.textContent?.trim()).toBe("");

            // ArrowLeft from null jumps to last datum
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(3);

            // Blur clears activeIndex
            canvas?.dispatchEvent(new FocusEvent("blur"));
            flushSync();
            expect(state.activeIndex).toBeNull();
            expect(canvas?.dataset.scrubbing).toBeUndefined();
        });

        it("invokes onPointClick on Enter and Space only when activeIndex is non-null", () => {
            const onPointClick = vi.fn();
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 520,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                onPointClick,
            });

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");

            // Idle Enter / Space do nothing and do not preventDefault
            const idleEnter = new KeyboardEvent("keydown", {
                key: "Enter",
                bubbles: true,
                cancelable: true,
            });
            const idleSpace = new KeyboardEvent("keydown", {
                key: " ",
                bubbles: true,
                cancelable: true,
            });
            canvas?.dispatchEvent(idleEnter);
            canvas?.dispatchEvent(idleSpace);
            flushSync();
            expect(idleEnter.defaultPrevented).toBe(false);
            expect(idleSpace.defaultPrevented).toBe(false);
            expect(onPointClick).not.toHaveBeenCalled();

            // Scrub to index 2 and activate with Enter then Space
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }),
            );
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
            );
            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(2);

            const enterEvent = new KeyboardEvent("keydown", {
                key: "Enter",
                bubbles: true,
                cancelable: true,
            });
            canvas?.dispatchEvent(enterEvent);
            expect(enterEvent.defaultPrevented).toBe(true);
            expect(onPointClick).toHaveBeenLastCalledWith(SAMPLE_DATA[2], 2);

            const spaceEvent = new KeyboardEvent("keydown", {
                key: " ",
                bubbles: true,
                cancelable: true,
            });
            canvas?.dispatchEvent(spaceEvent);
            expect(spaceEvent.defaultPrevented).toBe(true);
            expect(onPointClick).toHaveBeenLastCalledWith(SAMPLE_DATA[2], 2);
            expect(onPointClick).toHaveBeenCalledTimes(2);
        });

        it("scrubs via pointermove bisector, clears on out-of-bounds/pointerleave, invokes onPointClick on click, and interoperates with keyboard", () => {
            const onPointClick = vi.fn();
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 520,
                height: 260,
            });

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                onPointClick,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const srLive = container.querySelector<HTMLDivElement>(".cs-chart-sr-live");
            expect(refs.svg).not.toBeNull();
            if (refs.svg) {
                mockElementRect(refs.svg, { left: 100, top: 50, width: 520, height: 260 });
            }

            canvas?.dispatchEvent(new PointerEvent("pointerenter", { clientX: 150, clientY: 120 }));
            flushSync();

            const midPlotY = 50 + state.margins.top + state.plotHeight / 2;

            // Pointer scrub across every datum center
            for (const [idx, row] of SAMPLE_DATA.entries()) {
                const centerX = state.xScale.center(row.month);
                const clientX = 100 + state.margins.left + centerX;
                canvas?.dispatchEvent(
                    new PointerEvent("pointermove", { clientX, clientY: midPlotY, bubbles: true }),
                );
                flushSync();

                expect(state.activeIndex).toBe(idx);
                expect(state.pointerPosition).not.toBeNull();
                expect(canvas?.dataset.scrubbing).toBe("");
                expect(srLive?.textContent?.trim()).toBe(`${row.month}: Revenue ${row.revenue}`);
            }

            // Click while active invokes onPointClick with current active datum
            canvas?.dispatchEvent(new MouseEvent("click", { clientX: 0, clientY: 0, bubbles: true }));
            expect(onPointClick).toHaveBeenLastCalledWith(SAMPLE_DATA[3], 3);

            // Moving outside plot beyond edgeTolerance (12px) clears activeIndex
            canvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    clientX: 100 + state.margins.left - 24,
                    clientY: midPlotY,
                    bubbles: true,
                }),
            );
            flushSync();
            expect(state.activeIndex).toBeNull();
            expect(state.pointerPosition).toBeNull();
            expect(canvas?.dataset.scrubbing).toBeUndefined();

            // Direct click without prior pointermove still resolves nearest datum via bisector
            const febX = 100 + state.margins.left + state.xScale.center("Feb");
            canvas?.dispatchEvent(
                new MouseEvent("click", { clientX: febX, clientY: midPlotY, bubbles: true }),
            );
            expect(onPointClick).toHaveBeenLastCalledWith(SAMPLE_DATA[1], 1);

            // Cross-sequence: pointermove -> keyboard ArrowRight -> pointerleave -> ArrowLeft -> Enter
            canvas?.dispatchEvent(
                new PointerEvent("pointermove", { clientX: febX, clientY: midPlotY, bubbles: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(1);

            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(2);

            canvas?.dispatchEvent(new PointerEvent("pointerleave"));
            flushSync();
            expect(state.activeIndex).toBeNull();
            expect(state.pointerPosition).toBeNull();
            expect(canvas?.dataset.scrubbing).toBeUndefined();

            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
            );
            flushSync();
            expect(state.activeIndex).toBe(3);

            canvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
            );
            expect(onPointClick).toHaveBeenLastCalledWith(SAMPLE_DATA[3], 3);
            expect(onPointClick).toHaveBeenCalledTimes(3);
        });

        it("scrubs along plotY in horizontal orientation and disables scrubbing when interactive={false}", () => {
            const onPointClick = vi.fn();
            const horizontalState = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                orientation: "horizontal",
                width: 520,
                height: 260,
            });

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            const hInstance = renderHost({
                variant: "elevated",
                size: "md",
                state: horizontalState,
                showCanvas: true,
                onPointClick,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            const hCanvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            if (refs.svg) {
                mockElementRect(refs.svg, { left: 40, top: 20, width: 520, height: 260 });
            }
            hCanvas?.dispatchEvent(new PointerEvent("pointerenter"));

            const marCenterY = horizontalState.xScale.center("Mar");
            hCanvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    clientX: 40 + horizontalState.margins.left + horizontalState.plotWidth / 2,
                    clientY: 20 + horizontalState.margins.top + marCenterY,
                    bubbles: true,
                }),
            );
            flushSync();
            expect(horizontalState.activeIndex).toBe(2);

            unmount(hInstance);
            mounted.pop();

            // Non-interactive canvas ignores keyboard & pointer events and omits live region
            const staticState = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 520,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state: staticState,
                showCanvas: true,
                canvasInteractive: false,
                onPointClick,
            });

            const staticCanvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            expect(container.querySelector(".cs-chart-sr-live")).toBeNull();
            expect(staticCanvas?.dataset.interactive).toBeUndefined();

            staticCanvas?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
            );
            staticCanvas?.dispatchEvent(
                new PointerEvent("pointermove", { clientX: 200, clientY: 100, bubbles: true }),
            );
            staticCanvas?.dispatchEvent(
                new MouseEvent("click", { clientX: 200, clientY: 100, bubbles: true }),
            );
            flushSync();

            expect(staticState.activeIndex).toBeNull();
            expect(onPointClick).not.toHaveBeenCalled();
        });
    });

    describe("ChartCrosshair", () => {
        it("renders snapped hairline rule (n + 0.5, crispEdges), band rect on band scale, active dots + halos, and zero foreignObject/filter", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 560,
                height: 280,
            });

            const refs: {
                svg: SVGSVGElement | null;
                crosshair: SVGGElement | null;
            } = { svg: null, crosshair: null };

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showCrosshair: true,
                crosshairShowDots: true,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
                get crosshairRef() {
                    return refs.crosshair;
                },
                set crosshairRef(v: SVGGElement | null) {
                    refs.crosshair = v;
                },
            });

            renderHost(props);

            // Hidden when activeIndex is null
            expect(container.querySelector(".cs-chart-layer-crosshair")).toBeNull();
            expect(refs.crosshair).toBeNull();

            // Activate index 1
            state.setActiveIndex(1);
            flushSync();

            const layer = container.querySelector<SVGGElement>(".cs-chart-layer-crosshair");
            expect(layer).not.toBeNull();
            expect(refs.crosshair).toBe(layer);
            expect(layer?.getAttribute("aria-hidden")).toBe("true");

            // Vertical hairline snapped to n + 0.5 with crispEdges
            const lines = [...(layer?.querySelectorAll<SVGLineElement>("line.cs-chart-crosshair") ?? [])];
            expect(lines).toHaveLength(1);
            const vLine = lines[0];
            expect(vLine?.getAttribute("shape-rendering")).toBe("crispEdges");
            expect(isHalfPixel(vLine?.getAttribute("x1") ?? null)).toBe(true);
            expect(vLine?.getAttribute("x1")).toBe(vLine?.getAttribute("x2"));
            expect(vLine?.getAttribute("y1")).toBe("0");
            expect(Number(vLine?.getAttribute("y2"))).toBe(state.plotHeight);

            // Category hover band on band scale
            const band = layer?.querySelector<SVGRectElement>("rect.cs-chart-hover-band");
            expect(band).not.toBeNull();
            expect(isIntegerAttr(band?.getAttribute("x") ?? null)).toBe(true);
            expect(band?.getAttribute("y")).toBe("0");
            expect(isIntegerAttr(band?.getAttribute("width") ?? null)).toBe(true);
            expect(Number(band?.getAttribute("width"))).toBeGreaterThanOrEqual(1);
            expect(Number(band?.getAttribute("height"))).toBe(state.plotHeight);

            // Active point dot + halo per visible series
            const pointGroups = [
                ...(layer?.querySelectorAll<SVGGElement>("g.cs-chart-point-group") ?? []),
            ];
            expect(pointGroups).toHaveLength(2);
            expect(pointGroups.map((g) => g.dataset.seriesId)).toEqual(["revenue", "margin"]);
            for (const group of pointGroups) {
                expect(group.dataset.dimmed).toBeUndefined();
                expect(group.querySelector("circle.cs-chart-point-halo")).not.toBeNull();
                expect(group.querySelector("circle.cs-chart-point-dot")).not.toBeNull();
            }

            // Export safety: zero <foreignObject> and zero <filter>
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            // showDots={false} omits all point groups
            props.crosshairShowDots = false;
            flushSync();
            expect(layer?.querySelectorAll("g.cs-chart-point-group")).toHaveLength(0);

            // Point scale (bandwidth === 0) omits hover band while keeping vertical hairline
            state.preferBandX = false;
            state.xScaleType = "point";
            flushSync();
            expect(state.xScale.type).toBe("point");
            expect(layer?.querySelector("rect.cs-chart-hover-band")).toBeNull();
            expect(layer?.querySelectorAll("line.cs-chart-crosshair")).toHaveLength(1);

            // Horizontal orientation renders horizontal hairline and horizontal band
            state.xScaleType = "band";
            state.preferBandX = true;
            state.orientation = "horizontal";
            flushSync();
            const hLine = layer?.querySelector<SVGLineElement>("line.cs-chart-crosshair");
            expect(hLine?.getAttribute("shape-rendering")).toBe("crispEdges");
            expect(isHalfPixel(hLine?.getAttribute("y1") ?? null)).toBe(true);
            expect(hLine?.getAttribute("y1")).toBe(hLine?.getAttribute("y2"));
            expect(hLine?.getAttribute("x1")).toBe("0");
            expect(Number(hLine?.getAttribute("x2"))).toBe(state.plotWidth);

            const hBand = layer?.querySelector<SVGRectElement>("rect.cs-chart-hover-band");
            expect(hBand).not.toBeNull();
            expect(hBand?.getAttribute("x")).toBe("0");
            expect(Number(hBand?.getAttribute("width"))).toBe(state.plotWidth);
        });

        it("marks non-hovered series points with data-dimmed, skips hidden/null series, and computes stacked y1 dots", () => {
            const state = new ChartState<NullableMetricRow>({
                data: NULLABLE_DATA,
                x: "month",
                series: NULLABLE_SERIES,
                width: 520,
                height: 260,
                activeIndex: 0,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showCrosshair: true,
            });

            // Hover "actual" -> "target" is marked data-dimmed
            state.setHoveredSeries("actual");
            flushSync();

            const actualGroup = container.querySelector<SVGGElement>('[data-series-id="actual"]');
            const targetGroup = container.querySelector<SVGGElement>('[data-series-id="target"]');
            expect(actualGroup?.dataset.dimmed).toBeUndefined();
            expect(targetGroup?.dataset.dimmed).toBe("");

            // Switch hover to "target" -> "actual" dimmed, "target" undimmed
            state.setHoveredSeries("target");
            flushSync();
            expect(actualGroup?.dataset.dimmed).toBe("");
            expect(targetGroup?.dataset.dimmed).toBeUndefined();

            // Clear hover -> neither dimmed
            state.setHoveredSeries(null);
            flushSync();
            expect(actualGroup?.dataset.dimmed).toBeUndefined();
            expect(targetGroup?.dataset.dimmed).toBeUndefined();

            // Index 1 has target: null -> only "actual" dot renders
            state.setActiveIndex(1);
            flushSync();
            expect(container.querySelectorAll("g.cs-chart-point-group")).toHaveLength(1);
            expect(container.querySelector('[data-series-id="actual"]')).not.toBeNull();
            expect(container.querySelector('[data-series-id="target"]')).toBeNull();

            // Hiding "actual" removes its dot too
            state.toggleSeries("actual");
            flushSync();
            expect(container.querySelectorAll("g.cs-chart-point-group")).toHaveLength(0);

            // Restore all & enable stacked mode at index 0 (actual=100, target=90 -> cumulative 190)
            state.showAllSeries();
            state.stacked = true;
            state.setActiveIndex(0);
            flushSync();

            const stackedTargetDot = container
                .querySelector<SVGGElement>('[data-series-id="target"]')
                ?.querySelector<SVGCircleElement>("circle.cs-chart-point-dot");
            const expectedStackedY = state.yScale.scale(190);
            expect(Number(stackedTargetDot?.getAttribute("cy"))).toBeCloseTo(expectedStackedY, 3);
        });
    });

    describe("ChartTooltip", () => {
        it("renders popover='manual', opens/closes cleanly, positions with translate3d, flips near right edge, and binds ref", () => {
            const rafCallbacks: FrameRequestCallback[] = [];
            const cancelRafSpy = vi.fn();
            vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
                rafCallbacks.push(cb);
                return rafCallbacks.length;
            });
            vi.stubGlobal("cancelAnimationFrame", cancelRafSpy);

            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 520,
                height: 260,
            });
            state.setSvgRect({ left: 80, top: 60, width: 520, height: 260 });

            const refs: { tooltip: HTMLDivElement | null } = { tooltip: null };
            const instance = renderHost({
                variant: "elevated",
                size: "md",
                state,
                showTooltip: true,
                tooltipAttrs: { "data-testid": "chart-tooltip" },
                get tooltipRef() {
                    return refs.tooltip;
                },
                set tooltipRef(v: HTMLDivElement | null) {
                    refs.tooltip = v;
                },
            });

            const tooltipEl = container.querySelector<HTMLDivElement>('[data-testid="chart-tooltip"]');
            expect(tooltipEl).not.toBeNull();
            if (!tooltipEl) return;
            expect(refs.tooltip).toBe(tooltipEl);
            expect(tooltipEl.getAttribute("popover")).toBe("manual");
            expect(tooltipEl.dataset.open).toBeUndefined();
            expect(tooltipEl.getAttribute("aria-hidden")).toBe("true");
            expect(tooltipEl.dataset.gliding).toBeUndefined();

            const popover = installPopoverHarness(tooltipEl);

            // Open by setting activeIndex
            state.setActiveIndex(1);
            flushSync();

            expect(tooltipEl?.dataset.open).toBe("");
            expect(tooltipEl?.getAttribute("aria-hidden")).toBeNull();
            expect(popover.showPopover).toHaveBeenCalledTimes(1);
            expect(popover.isOpen()).toBe(true);
            expect(tooltipEl?.style.transform).toMatch(/^translate3d\(\d+px,\s*\d+px,\s*0(?:px)?\)$/);
            expect(tooltipEl?.dataset.side).toBe("end");
            // First open snaps immediately without gliding
            expect(tooltipEl?.dataset.gliding).toBeUndefined();

            // After rAF, scrub gliding activates
            expect(rafCallbacks.length).toBeGreaterThanOrEqual(1);
            rafCallbacks.at(-1)?.(16);
            flushSync();
            expect(tooltipEl?.dataset.gliding).toBe("");

            // Near right viewport edge -> flips to data-side="start"
            state.setSvgRect({ left: 860, top: 60, width: 520, height: 260 });
            state.setActiveIndex(3);
            flushSync();
            expect(tooltipEl?.dataset.side).toBe("start");

            // Close by clearing activeIndex
            state.setActiveIndex(null);
            flushSync();
            expect(tooltipEl?.dataset.open).toBeUndefined();
            expect(tooltipEl?.getAttribute("aria-hidden")).toBe("true");
            expect(tooltipEl?.dataset.gliding).toBeUndefined();
            expect(popover.hidePopover).toHaveBeenCalledTimes(1);
            expect(popover.isOpen()).toBe(false);

            // Re-open then unmount -> cleanup hides popover
            state.setActiveIndex(0);
            flushSync();
            expect(popover.isOpen()).toBe(true);

            unmount(instance);
            mounted.pop();
            expect(popover.hidePopover).toHaveBeenCalledTimes(2);
            expect(popover.isOpen()).toBe(false);
        });

        it("enables data-gliding after rapid scrub before first rAF, enforces 16px flip hysteresis, and resets side to 'end' on close", () => {
            const rafCallbacks: FrameRequestCallback[] = [];
            const cancelRafSpy = vi.fn();
            vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
                rafCallbacks.push(cb);
                return rafCallbacks.length;
            });
            vi.stubGlobal("cancelAnimationFrame", cancelRafSpy);

            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 520,
                height: 260,
            });
            state.setSvgRect({ left: 80, top: 60, width: 520, height: 260 });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showTooltip: true,
                tooltipAttrs: { "data-testid": "chart-tooltip-regression" },
            });

            const tooltipEl = container.querySelector<HTMLDivElement>(
                '[data-testid="chart-tooltip-regression"]',
            );
            expect(tooltipEl).not.toBeNull();
            if (!tooltipEl) return;

            // 1. Rapid scrub before first rAF must NOT cancel the glide activation rAF
            state.setActiveIndex(1);
            flushSync();
            expect(tooltipEl.dataset.open).toBe("");
            expect(tooltipEl.dataset.gliding).toBeUndefined();
            expect(rafCallbacks).toHaveLength(1);
            expect(cancelRafSpy).not.toHaveBeenCalled();

            state.setActiveIndex(2);
            flushSync();
            expect(cancelRafSpy).not.toHaveBeenCalled();
            expect(tooltipEl.dataset.gliding).toBeUndefined();

            rafCallbacks[0]?.(16);
            flushSync();
            expect(tooltipEl.dataset.gliding).toBe("");

            // 2. Hysteresis flip-back & close reset (default offset=12, fallback width=168, clearance=8 => rightEdge = clientX + 188; hysteresis=16)
            const viewportWidth = window.innerWidth > 0 ? window.innerWidth : 1024;
            const setAnchorClientX = (targetClientX: number): void => {
                const anchor = state.activeAnchor;
                if (!anchor) return;
                const currentOffsetFromLeft = state.margins.left + anchor.plotX;
                state.setSvgRect({
                    left: targetClientX - currentOffsetFromLeft,
                    top: 60,
                    width: 520,
                    height: 260,
                });
                flushSync();
            };

            // Near right edge (rightEdge > viewportWidth) -> flips end -> start
            setAnchorClientX(viewportWidth - 180);
            expect(tooltipEl.dataset.side).toBe("start");

            // Inside 16px FLIP_HYSTERESIS deadzone (rightEdge <= viewportWidth, rightEdge + 16 > viewportWidth) -> stays "start"
            setAnchorClientX(viewportWidth - 196);
            expect(tooltipEl.dataset.side).toBe("start");

            // Past 16px hysteresis threshold (rightEdge + 16 <= viewportWidth) -> flips back start -> end
            setAnchorClientX(viewportWidth - 210);
            expect(tooltipEl.dataset.side).toBe("end");

            // Flip to "start" again, then close -> side resets to "end"
            setAnchorClientX(viewportWidth - 180);
            expect(tooltipEl.dataset.side).toBe("start");

            state.setActiveIndex(null);
            flushSync();
            expect(tooltipEl.dataset.open).toBeUndefined();
            expect(tooltipEl.dataset.side).toBe("end");
        });

        it("renders NumberMorph for numeric values, em-dash for null values, showTotal, formatX/morph={false}, and custom children snippet", () => {
            const state = new ChartState<NullableMetricRow>({
                data: NULLABLE_DATA,
                x: "month",
                series: NULLABLE_SERIES,
                width: 520,
                height: 260,
                activeIndex: 1, // actual: 150, target: null
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showTooltip: true,
                tooltipShowTotal: true,
                tooltipMorph: true,
                tooltipFormatX: undefined as ((v: string | number | Date) => string) | undefined,
                tooltipFormatTotal: undefined as ((v: number) => string) | undefined,
                tooltipCustomRenderer: undefined as
                    | ((ctx: ChartTooltipContext<ChartDatum>) => string)
                    | undefined,
            });

            renderHost(props);

            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip?.dataset.open).toBe("");
            expect(tooltip?.querySelector(".cs-chart-tooltip-header")?.textContent?.trim()).toBe("Feb");

            const valueCells = [
                ...(tooltip?.querySelectorAll<HTMLSpanElement>(".cs-chart-tooltip-value") ?? []),
            ];
            expect(valueCells).toHaveLength(2);
            // Numeric series uses NumberMorph
            expect(valueCells[0]?.querySelector(".cs-number-morph")).not.toBeNull();
            // Null series falls back to em-dash without NumberMorph
            expect(valueCells[1]?.querySelector(".cs-number-morph")).toBeNull();
            expect(valueCells[1]?.textContent?.trim()).toBe("\u{2014}");

            // showTotal renders total row with NumberMorph
            const totalRow = tooltip?.querySelector<HTMLDivElement>(".cs-chart-tooltip-total");
            expect(totalRow).not.toBeNull();
            expect(totalRow?.querySelector(".cs-chart-tooltip-total-label")?.textContent?.trim()).toBe(
                "Total",
            );
            expect(
                totalRow
                    ?.querySelector(".cs-chart-tooltip-total-value")
                    ?.querySelector(".cs-number-morph"),
            ).not.toBeNull();

            // formatX + morph={false} + formatTotal render plain formatted text
            props.tooltipFormatX = (v) => `Month: ${String(v)}`;
            props.tooltipMorph = false;
            props.tooltipFormatTotal = (v) => `EUR ${v}`;
            flushSync();

            expect(tooltip?.querySelector(".cs-chart-tooltip-header")?.textContent?.trim()).toBe(
                "Month: Feb",
            );
            expect(tooltip?.querySelectorAll(".cs-number-morph")).toHaveLength(0);
            expect(
                tooltip?.querySelector(".cs-chart-tooltip-total-value")?.textContent?.trim(),
            ).toBe("EUR 150");

            // Custom children snippet receives ChartTooltipContext and replaces default body
            props.tooltipCustomRenderer = (ctx) =>
                `idx=${ctx.index}|x=${ctx.xLabel}|count=${ctx.items.length}|total=${ctx.total ?? "none"}`;
            flushSync();

            const customTooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            const customContent = customTooltip?.querySelector('[data-testid="custom-tooltip"]');
            expect(customContent?.textContent?.trim()).toBe("idx=1|x=Month: Feb|count=2|total=150");
            expect(customTooltip?.querySelector(".cs-chart-tooltip-header")).toBeNull();
            expect(customTooltip?.querySelector(".cs-chart-tooltip-list")).toBeNull();
        });
    });

    describe("ChartLegend", () => {
        it("toggles aria-pressed and hiddenSeriesIds on click, triggers ChartEmpty when all hidden, and restores all on Show all", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 520,
                height: 260,
            });

            const bindings = $state<{ hidden: readonly string[] }>({ hidden: [] });
            const refs: { legend: HTMLDivElement | null } = { legend: null };

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showLegend: true,
                showEmptyWhenAllHidden: true,
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
                get legendRef() {
                    return refs.legend;
                },
                set legendRef(v: HTMLDivElement | null) {
                    refs.legend = v;
                },
            });

            const legend = container.querySelector<HTMLDivElement>(".cs-chart-legend");
            expect(legend).not.toBeNull();
            expect(refs.legend).toBe(legend);
            expect(legend?.getAttribute("role")).toBe("list");

            const buttons = [
                ...(legend?.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item") ?? []),
            ];
            expect(buttons).toHaveLength(2);
            expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");
            expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true");
            expect(container.querySelector(".cs-chart-empty")).toBeNull();

            // Toggle first series off
            buttons[0]?.click();
            flushSync();
            expect(buttons[0]?.getAttribute("aria-pressed")).toBe("false");
            expect(buttons[0]?.dataset.hidden).toBe("");
            expect(state.hiddenSeriesIds).toEqual(["revenue"]);
            expect(bindings.hidden).toEqual(["revenue"]);
            expect(container.querySelector(".cs-chart-empty")).toBeNull();

            // Toggle second series off -> allSeriesHidden triggers ChartEmpty
            buttons[1]?.click();
            flushSync();
            expect(buttons[1]?.getAttribute("aria-pressed")).toBe("false");
            expect(state.allSeriesHidden).toBe(true);
            expect(bindings.hidden).toEqual(["revenue", "margin"]);

            const emptyPanel = container.querySelector<HTMLDivElement>(".cs-chart-empty");
            expect(emptyPanel).not.toBeNull();
            expect(emptyPanel?.dataset.allHidden).toBe("");

            const showAllBtn = emptyPanel?.querySelector<HTMLButtonElement>("button");
            expect(showAllBtn?.textContent?.trim()).toBe("Show all");

            // Clicking "Show all" restores all series and legend pressed states
            showAllBtn?.click();
            flushSync();
            expect(state.hiddenSeriesIds).toEqual([]);
            expect(bindings.hidden).toEqual([]);
            expect(state.allSeriesHidden).toBe(false);
            expect(container.querySelector(".cs-chart-empty")).toBeNull();
            expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");
            expect(buttons[0]?.dataset.hidden).toBeUndefined();
            expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true");
            expect(buttons[1]?.dataset.hidden).toBeUndefined();
        });

        it("sets/clears hoveredSeriesId on pointerenter/pointerleave and focus/blur, dimming crosshair siblings and ignoring hidden series", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 520,
                height: 260,
                activeIndex: 1,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showLegend: true,
                showCanvas: true,
                showCrosshair: true,
            });

            const buttons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(buttons).toHaveLength(2);
            const [revenueBtn, marginBtn] = buttons;
            if (!revenueBtn || !marginBtn) return;

            // Pointer hover sets hoveredSeriesId & dims sibling crosshair dot
            revenueBtn.dispatchEvent(new PointerEvent("pointerenter"));
            flushSync();
            expect(state.hoveredSeriesId).toBe("revenue");
            expect(revenueBtn.dataset.active).toBe("");
            expect(
                container.querySelector<SVGGElement>('[data-series-id="revenue"]')?.dataset.dimmed,
            ).toBeUndefined();
            expect(
                container.querySelector<SVGGElement>('[data-series-id="margin"]')?.dataset.dimmed,
            ).toBe("");

            revenueBtn.dispatchEvent(new PointerEvent("pointerleave"));
            flushSync();
            expect(state.hoveredSeriesId).toBeNull();
            expect(revenueBtn.dataset.active).toBeUndefined();
            expect(
                container.querySelector<SVGGElement>('[data-series-id="margin"]')?.dataset.dimmed,
            ).toBeUndefined();

            // Focus / blur also isolate series
            marginBtn.dispatchEvent(new FocusEvent("focus"));
            flushSync();
            expect(state.hoveredSeriesId).toBe("margin");
            expect(marginBtn.dataset.active).toBe("");
            expect(
                container.querySelector<SVGGElement>('[data-series-id="revenue"]')?.dataset.dimmed,
            ).toBe("");

            marginBtn.dispatchEvent(new FocusEvent("blur"));
            flushSync();
            expect(state.hoveredSeriesId).toBeNull();
            expect(marginBtn.dataset.active).toBeUndefined();

            // Cross-interaction: hovering then clicking to hide clears hoveredSeriesId immediately
            revenueBtn.dispatchEvent(new PointerEvent("pointerenter"));
            flushSync();
            expect(state.hoveredSeriesId).toBe("revenue");

            revenueBtn.click();
            flushSync();
            expect(state.isSeriesHidden("revenue")).toBe(true);
            expect(state.hoveredSeriesId).toBeNull();

            // Hovering or focusing a hidden series is ignored
            revenueBtn.dispatchEvent(new PointerEvent("pointerenter"));
            revenueBtn.dispatchEvent(new FocusEvent("focus"));
            flushSync();
            expect(state.hoveredSeriesId).toBeNull();
        });

        it("supports non-interactive mode, positions (top/bottom/end), mark-matched swatches (auto/line/bar/dot/dashed), and custom children", () => {
            const mixedSeries: ChartSeries<ChartDatum>[] = [
                { id: "a", label: "Line Series", type: "line" },
                { id: "b", label: "Bar Series", type: "bar" },
                { id: "c", label: "Forecast", type: "line", dashed: true },
                { id: "d", label: "Area Series", type: "area" },
            ];
            const state = new ChartState<ChartDatum>({
                data: [{ x: "Q1", a: 10, b: 20, c: 30, d: 40 }],
                x: "x",
                series: mixedSeries,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showLegend: true,
                legendPosition: "top" as ChartLegendPlacement,
                legendAlign: "start" as "start" | "center" | "end",
                legendInteractive: false,
                legendMarker: "auto" as ChartLegendMarker,
                legendCustomContent: undefined as string | undefined,
            });

            renderHost(props);

            const legend = container.querySelector<HTMLDivElement>(".cs-chart-legend");
            expect(legend?.querySelectorAll("button")).toHaveLength(0);

            const staticItems = [
                ...(legend?.querySelectorAll<HTMLSpanElement>("span.cs-chart-legend-item") ?? []),
            ];
            expect(staticItems).toHaveLength(4);
            for (const item of staticItems) {
                expect(item.dataset.static).toBe("");
            }

            // Clicking non-interactive item does not hide series
            staticItems[0]?.click();
            flushSync();
            expect(state.hiddenSeriesIds).toEqual([]);

            // Auto mark-matched swatches
            const swatches = (): HTMLSpanElement[] => [
                ...(legend?.querySelectorAll<HTMLSpanElement>(".cs-chart-legend-swatch") ?? []),
            ];
            expect(swatches().map((el) => el.dataset.kind)).toEqual([
                "line",
                "bar",
                "dashed",
                "line",
            ]);

            // Explicit marker overrides
            for (const marker of CHART_LEGEND_MARKERS) {
                if (marker === "auto") continue;
                props.legendMarker = marker;
                flushSync();
                expect(swatches().every((el) => el.dataset.kind === marker)).toBe(true);
            }

            // Position & align attributes
            for (const position of CHART_LEGEND_PLACEMENTS) {
                props.legendPosition = position;
                flushSync();
                expect(legend?.dataset.position).toBe(position);
            }
            props.legendAlign = "end";
            flushSync();
            expect(legend?.dataset.align).toBe("end");

            // Custom children snippet
            props.legendCustomContent = "Custom Legend Content";
            flushSync();
            const customLegend = container.querySelector<HTMLDivElement>(".cs-chart-legend");
            expect(customLegend?.querySelector('[data-testid="custom-legend"]')?.textContent).toBe(
                "Custom Legend Content",
            );
            expect(customLegend?.querySelectorAll(".cs-chart-legend-entry")).toHaveLength(0);
        });
    });

    describe("ChartOverlay", () => {
        it("aligns to chart.margins and plot dimensions, guards children until chart.hasSize, updates on resize, and binds ref", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 0,
                height: 0,
            });

            const refs: { overlay: HTMLDivElement | null } = { overlay: null };
            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showChartOverlay: true,
                chartOverlayContent: "KPI Callout",
                chartOverlayAttrs: { "data-testid": "plot-overlay" },
                get chartOverlayRef() {
                    return refs.overlay;
                },
                set chartOverlayRef(v: HTMLDivElement | null) {
                    refs.overlay = v;
                },
            });

            const overlayEl = container.querySelector<HTMLDivElement>('[data-testid="plot-overlay"]');
            expect(overlayEl).not.toBeNull();
            expect(refs.overlay).toBe(overlayEl);
            expect(overlayEl?.classList.contains("cs-chart-overlay")).toBe(true);

            // 0x0 guard: children not rendered until chart.hasSize
            expect(state.hasSize).toBe(false);
            expect(overlayEl?.querySelector('[data-testid="chart-overlay-child"]')).toBeNull();

            // Size the chart -> children render and inline geometry matches chart.margins + plot size
            state.setDimensions(560, 280);
            flushSync();

            expect(state.hasSize).toBe(true);
            expect(
                overlayEl?.querySelector('[data-testid="chart-overlay-child"]')?.textContent?.trim(),
            ).toBe("KPI Callout");
            expect(overlayEl?.style.insetBlockStart).toBe(`${state.margins.top}px`);
            expect(overlayEl?.style.insetInlineStart).toBe(`${state.margins.left}px`);
            expect(overlayEl?.style.inlineSize).toBe(`${state.plotWidth}px`);
            expect(overlayEl?.style.blockSize).toBe(`${state.plotHeight}px`);

            // Resize updates overlay box reactively
            state.setDimensions(680, 340);
            flushSync();
            expect(overlayEl?.style.inlineSize).toBe(`${state.plotWidth}px`);
            expect(overlayEl?.style.blockSize).toBe(`${state.plotHeight}px`);
        });
    });
});

interface MultiSeriesRow extends ChartDatum {
    month: string;
    actual: number | null;
    forecast: number | null;
}

const MULTI_LINE_DATA: MultiSeriesRow[] = [
    { month: "Jan", actual: 120, forecast: 110 },
    { month: "Feb", actual: 180, forecast: 170 },
    { month: "Mar", actual: 150, forecast: 200 },
    { month: "Apr", actual: 240, forecast: 230 },
];

const MULTI_LINE_SERIES: ChartSeries<MultiSeriesRow>[] = [
    { id: "actual", label: "Actual" },
    { id: "forecast", label: "Forecast", dashed: true },
];

const GAPPED_LINE_DATA: MultiSeriesRow[] = [
    { month: "Jan", actual: 100, forecast: 90 },
    { month: "Feb", actual: 160, forecast: null },
    { month: "Mar", actual: null, forecast: 180 },
    { month: "Apr", actual: 210, forecast: null },
    { month: "May", actual: 250, forecast: 240 },
];

const SINGLE_POINT_DATA: MultiSeriesRow[] = [
    { month: "Jan", actual: 145, forecast: 120 },
];

interface StackedTrafficRow extends ChartDatum {
    month: string;
    organic: number | null;
    paid: number | null;
}

const STACKED_AREA_DATA: StackedTrafficRow[] = [
    { month: "Jan", organic: 100, paid: 50 },
    { month: "Feb", organic: 140, paid: 80 },
    { month: "Mar", organic: 180, paid: 120 },
    { month: "Apr", organic: 160, paid: 140 },
];

const STACKED_AREA_SERIES: ChartSeries<StackedTrafficRow>[] = [
    { id: "organic", label: "Organic" },
    { id: "paid", label: "Paid" },
];

function countMoveToCommands(pathD: string | null): number {
    if (!pathD) return 0;
    return (pathD.match(/M/g) ?? []).length;
}

function makeDomRect(width: number, height: number): DOMRect {
    return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
    } as DOMRect;
}

function stubLayoutRect(width = 560, height = 280): void {
    const rect = makeDomRect(width, height);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
}

describe("Charts M3 — ChartLine, ChartArea, LineChart & AreaChart", () => {
    let container: HTMLDivElement;
    const mounted: ReturnType<typeof mount>[] = [];

    function renderHost(props: Record<string, unknown> = {}): ReturnType<typeof mount> {
        const instance = mount(ChartTestHost, { target: container, props });
        flushSync();
        mounted.push(instance);
        return instance;
    }

    beforeEach(() => {
        clearMeasureCache();
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        while (mounted.length > 0) {
            const instance = mounted.pop();
            if (instance) unmount(instance);
        }
        container.remove();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("ChartLine (Tier-1 mark)", () => {
        it("renders multi-series paths across monotone, linear, and step curves, applies dashed strokes and strokeWidth, binds ref, and forwards {...rest}", () => {
            const state = new ChartState<MultiSeriesRow>({
                data: MULTI_LINE_DATA,
                x: "month",
                series: MULTI_LINE_SERIES,
                width: 560,
                height: 280,
            });

            const refs: { line: SVGGElement | null } = { line: null };
            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showLine: true,
                lineCurve: "monotone" as ChartCurve,
                lineStrokeWidth: 2.5,
                lineDashed: undefined as boolean | undefined,
                lineAttrs: { "data-testid": "tier1-line", class: "custom-line-layer" },
                get lineRef() {
                    return refs.line;
                },
                set lineRef(v: SVGGElement | null) {
                    refs.line = v;
                },
            });

            renderHost(props);

            const lineGroup = container.querySelector<SVGGElement>('[data-testid="tier1-line"]');
            expect(lineGroup).not.toBeNull();
            expect(refs.line).toBe(lineGroup);
            expect(lineGroup?.classList.contains("cs-chart-line")).toBe(true);
            expect(lineGroup?.classList.contains("custom-line-layer")).toBe(true);

            const getSeriesPath = (id: string): SVGPathElement | null =>
                container.querySelector<SVGPathElement>(
                    `:scope .cs-chart-line-series[data-series-id="${CSS.escape(id)}"] path.cs-chart-line-path`,
                );

            const actualPath = getSeriesPath("actual");
            const forecastPath = getSeriesPath("forecast");
            expect(actualPath).not.toBeNull();
            expect(forecastPath).not.toBeNull();

            const monotoneD = actualPath?.getAttribute("d") ?? "";
            expect(monotoneD).toContain("M");
            expect(monotoneD).toContain("C");
            expect(monotoneD).not.toContain("NaN");

            expect(actualPath?.getAttribute("stroke-linecap")).toBe("round");
            expect(actualPath?.getAttribute("stroke-linejoin")).toBe("round");
            expect(actualPath?.style.strokeWidth).toBe("2.5px");
            expect(actualPath?.getAttribute("stroke-dasharray")).toBeNull();
            expect(forecastPath?.getAttribute("stroke-dasharray")).toBe("5 4");

            // Switch curve -> linear (straight L segments, no bezier C)
            props.lineCurve = "linear";
            flushSync();
            const linearD = getSeriesPath("actual")?.getAttribute("d") ?? "";
            expect(linearD).toContain("L");
            expect(linearD).not.toContain("C");
            expect(linearD).not.toBe(monotoneD);

            // Switch curve -> step (horizontal/vertical step segments)
            props.lineCurve = "step";
            flushSync();
            const stepD = getSeriesPath("actual")?.getAttribute("d") ?? "";
            expect(stepD).not.toBe(linearD);
            expect(stepD).not.toBe(monotoneD);
            expect(stepD).not.toContain("NaN");

            // Prop-level dashed={true} overrides series-level dashed
            props.lineDashed = true;
            flushSync();
            expect(getSeriesPath("actual")?.getAttribute("stroke-dasharray")).toBe("5 4");
            expect(getSeriesPath("forecast")?.getAttribute("stroke-dasharray")).toBe("5 4");
        });

        it("breaks path into multiple M subpaths on null when connectNulls={false} and bridges into a single path when connectNulls={true}", () => {
            const state = new ChartState<MultiSeriesRow>({
                data: GAPPED_LINE_DATA,
                x: "month",
                series: MULTI_LINE_SERIES,
                width: 560,
                height: 280,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showLine: true,
                lineCurve: "linear" as ChartCurve,
                lineConnectNulls: false,
            });

            renderHost(props);

            const actualPath = container.querySelector<SVGPathElement>(
                ':scope .cs-chart-line-series[data-series-id="actual"] path.cs-chart-line-path',
            );
            const forecastSeries = container.querySelector<SVGGElement>(
                '.cs-chart-line-series[data-series-id="forecast"]',
            );

            const gappedD = actualPath?.getAttribute("d") ?? "";
            expect(countMoveToCommands(gappedD)).toBe(2);
            expect(gappedD).not.toContain("NaN");

            // Forecast has isolated non-null points flanked by nulls (Jan, Mar, May) -> 3 visible dots
            const isolatedDots = [
                ...(forecastSeries?.querySelectorAll<SVGCircleElement>(
                    "circle.cs-chart-line-dot",
                ) ?? []),
            ];
            expect(isolatedDots).toHaveLength(3);
            for (const dot of isolatedDots) {
                const cx = Number(dot.getAttribute("cx"));
                const cy = Number(dot.getAttribute("cy"));
                expect(Number.isFinite(cx)).toBe(true);
                expect(Number.isFinite(cy)).toBe(true);
            }

            // Enabling connectNulls bridges into a single continuous M subpath and removes isolated-only dots
            props.lineConnectNulls = true;
            flushSync();

            const bridgedD = actualPath?.getAttribute("d") ?? "";
            expect(countMoveToCommands(bridgedD)).toBe(1);
            expect(bridgedD).not.toContain("NaN");
            expect(
                forecastSeries?.querySelectorAll<SVGCircleElement>("circle.cs-chart-line-dot"),
            ).toHaveLength(0);
        });

        it("renders a visible dot without NaN coordinates for a single-point dataset", () => {
            const state = new ChartState<MultiSeriesRow>({
                data: SINGLE_POINT_DATA,
                x: "month",
                series: [{ id: "actual", label: "Actual" }],
                width: 520,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showLine: true,
                lineShowDots: "active",
            });

            const dots = container.querySelectorAll<SVGCircleElement>("circle.cs-chart-line-dot");
            expect(dots).toHaveLength(1);
            const cx = Number(dots[0]?.getAttribute("cx"));
            const cy = Number(dots[0]?.getAttribute("cy"));
            expect(Number.isFinite(cx)).toBe(true);
            expect(Number.isFinite(cy)).toBe(true);

            const path = container.querySelector<SVGPathElement>("path.cs-chart-line-path");
            if (path) {
                expect(path.getAttribute("d")).not.toContain("NaN");
            }
        });

        it("supports showDots={true | false} and showLabels={true} with default and custom formatLabel", () => {
            const state = new ChartState<MultiSeriesRow>({
                data: MULTI_LINE_DATA,
                x: "month",
                series: [{ id: "actual", label: "Actual" }],
                width: 560,
                height: 280,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showLine: true,
                lineShowDots: true as ChartLineDotsMode,
                lineShowLabels: true,
                lineFormatLabel: undefined as
                    | ((value: number, datum: ChartDatum, series: ChartSeries<ChartDatum>) => string)
                    | undefined,
            });

            renderHost(props);

            expect(container.querySelectorAll("circle.cs-chart-line-dot")).toHaveLength(4);
            const defaultLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-value-label"),
            ];
            expect(defaultLabels).toHaveLength(4);
            expect(defaultLabels.map((el) => el.textContent?.trim())).toEqual([
                "120",
                "180",
                "150",
                "240",
            ]);

            // Custom formatLabel receives (value, datum, series)
            props.lineFormatLabel = (value, _datum, s) => `${s.id}:${value}€`;
            flushSync();
            expect(
                [...container.querySelectorAll<SVGTextElement>("text.cs-chart-value-label")].map(
                    (el) => el.textContent?.trim(),
                ),
            ).toEqual(["actual:120€", "actual:180€", "actual:150€", "actual:240€"]);

            // showDots={false} hides non-isolated dots; showLabels={false} removes value labels
            props.lineShowDots = false;
            props.lineShowLabels = false;
            flushSync();
            expect(container.querySelectorAll("circle.cs-chart-line-dot")).toHaveLength(0);
            expect(container.querySelectorAll("text.cs-chart-value-label")).toHaveLength(0);
        });

        it("filters by series type or explicit seriesId and dims sibling series on hoveredSeriesId", () => {
            const mixedSeries: ChartSeries<ChartDatum>[] = [
                { id: "lineA", label: "Line A", type: "line" },
                { id: "lineB", label: "Line B" },
                { id: "barC", label: "Bar C", type: "bar" },
            ];
            const state = new ChartState<ChartDatum>({
                data: [
                    { month: "Jan", lineA: 10, lineB: 20, barC: 30 },
                    { month: "Feb", lineA: 30, lineB: 25, barC: 40 },
                ],
                x: "month",
                series: mixedSeries,
                width: 520,
                height: 260,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showLine: true,
                lineSeriesId: undefined as string | undefined,
            });

            renderHost(props);

            const renderedIds = (): string[] =>
                [...container.querySelectorAll<SVGGElement>(".cs-chart-line-series")].map(
                    (el) => el.dataset.seriesId ?? "",
                );
            expect(renderedIds()).toEqual(["lineA", "lineB"]);

            // Hovering lineA dims lineB
            state.setHoveredSeries("lineA");
            flushSync();
            expect(
                container.querySelector<SVGGElement>(
                    '.cs-chart-line-series[data-series-id="lineA"]',
                )?.dataset.dimmed,
            ).toBeUndefined();
            expect(
                container.querySelector<SVGGElement>(
                    '.cs-chart-line-series[data-series-id="lineB"]',
                )?.dataset.dimmed,
            ).toBe("");

            // Explicit seriesId narrows rendering to that single series
            props.lineSeriesId = "lineB";
            flushSync();
            expect(renderedIds()).toEqual(["lineB"]);
        });
    });

    describe("ChartArea (Tier-1 mark)", () => {
        it("renders gradient vs solid fills, optional top line, connectNulls gaps, ref binding, and {...rest} in overlay mode", () => {
            const state = new ChartState<MultiSeriesRow>({
                data: GAPPED_LINE_DATA,
                x: "month",
                series: [{ id: "actual", label: "Actual" }],
                width: 560,
                height: 280,
            });

            const refs: { area: SVGGElement | null } = { area: null };
            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showArea: true,
                areaMode: "overlay" as ChartAreaMode,
                areaCurve: "linear" as ChartCurve,
                areaGradient: true,
                areaShowLine: true,
                areaConnectNulls: false,
                areaAttrs: { "data-testid": "tier1-area", class: "custom-area-layer" },
                get areaRef() {
                    return refs.area;
                },
                set areaRef(v: SVGGElement | null) {
                    refs.area = v;
                },
            });

            renderHost(props);

            const areaGroup = container.querySelector<SVGGElement>('[data-testid="tier1-area"]');
            expect(areaGroup).not.toBeNull();
            expect(refs.area).toBe(areaGroup);
            expect(areaGroup?.classList.contains("cs-chart-area")).toBe(true);
            expect(areaGroup?.classList.contains("custom-area-layer")).toBe(true);
            expect(areaGroup?.dataset.mode).toBe("overlay");

            // Gradient enabled: <linearGradient> present and fill references url(#...)
            const gradients = areaGroup?.querySelectorAll("linearGradient");
            expect(gradients).toHaveLength(1);
            const fillPath = areaGroup?.querySelector<SVGPathElement>("path.cs-chart-area-fill");
            expect(fillPath).not.toBeNull();
            expect(fillPath?.getAttribute("fill")).toMatch(/^url\(#cs-chart-area-grad-/);
            expect(fillPath?.dataset.solid).toBeUndefined();

            // Null gap splits both area fill and top line into 2 M subpaths
            expect(countMoveToCommands(fillPath?.getAttribute("d") ?? null)).toBe(2);
            const topLine = areaGroup?.querySelector<SVGPathElement>("path.cs-chart-line-path");
            expect(topLine).not.toBeNull();
            expect(countMoveToCommands(topLine?.getAttribute("d") ?? null)).toBe(2);

            // connectNulls={true} bridges both area and top line into 1 continuous subpath
            props.areaConnectNulls = true;
            flushSync();
            expect(countMoveToCommands(fillPath?.getAttribute("d") ?? null)).toBe(1);
            expect(countMoveToCommands(topLine?.getAttribute("d") ?? null)).toBe(1);

            // gradient={false} switches to solid fill with zero <linearGradient>
            props.areaGradient = false;
            flushSync();
            expect(areaGroup?.querySelectorAll("linearGradient")).toHaveLength(0);
            expect(fillPath?.dataset.solid).toBe("");
            expect(fillPath?.getAttribute("fill")).toBeNull();
            expect(fillPath?.style.fill).not.toBe("");

            // showLine={false} omits the top stroke path
            props.areaShowLine = false;
            flushSync();
            expect(areaGroup?.querySelector("path.cs-chart-line-path")).toBeNull();
        });

        it("computes stacked cumulative geometry in stacked mode and renders isolated/single-point dot without NaN", () => {
            const stackedState = new ChartState<StackedTrafficRow>({
                data: STACKED_AREA_DATA,
                x: "month",
                series: STACKED_AREA_SERIES,
                width: 560,
                height: 280,
                stacked: false,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state: stackedState,
                showCanvas: true,
                showArea: true,
                areaMode: "overlay" as ChartAreaMode,
                areaCurve: "linear" as ChartCurve,
            });

            const host = renderHost(props);

            const getPaidAreaD = (): string =>
                container
                    .querySelector<SVGPathElement>(
                        ':scope .cs-chart-area-series[data-series-id="paid"] path.cs-chart-area-fill',
                    )
                    ?.getAttribute("d") ?? "";

            const overlayPaidD = getPaidAreaD();
            const overlayDomain = [...stackedState.yScale.domain];
            expect(overlayPaidD).not.toBe("");
            expect(overlayPaidD).not.toContain("NaN");

            // Switch overlay -> stacked: ChartArea enables chart.stacked and recomputes cumulative paths & Y domain
            props.areaMode = "stacked";
            flushSync();

            expect(stackedState.stacked).toBe(true);
            const stackedPaidD = getPaidAreaD();
            expect(stackedPaidD).not.toBe("");
            expect(stackedPaidD).not.toContain("NaN");
            expect(stackedPaidD).not.toBe(overlayPaidD);
            expect(stackedState.yScale.domain[1]).toBeGreaterThan(overlayDomain[1] ?? 0);

            // Switch stacked -> overlay: ChartArea cleanup restores chart.stacked = false, path, and domain
            props.areaMode = "overlay";
            flushSync();

            expect(stackedState.stacked).toBe(false);
            expect(getPaidAreaD()).toBe(overlayPaidD);
            expect([...stackedState.yScale.domain]).toEqual(overlayDomain);

            // Switch back to stacked, then unmount ChartArea -> restores chart.stacked = false
            props.areaMode = "stacked";
            flushSync();
            expect(stackedState.stacked).toBe(true);

            props.showArea = false;
            flushSync();
            expect(stackedState.stacked).toBe(false);

            // Remount in stacked mode, then unmount entire host -> restores chart.stacked = false
            props.showArea = true;
            flushSync();
            expect(stackedState.stacked).toBe(true);

            unmount(host);
            mounted.pop();
            expect(stackedState.stacked).toBe(false);

            // Single-point guard for ChartArea
            const singleState = new ChartState<MultiSeriesRow>({
                data: SINGLE_POINT_DATA,
                x: "month",
                series: [{ id: "actual", label: "Actual" }],
                width: 520,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state: singleState,
                showCanvas: true,
                showArea: true,
                areaMode: "overlay",
            });

            const dots = container.querySelectorAll<SVGCircleElement>("circle.cs-chart-line-dot");
            expect(dots).toHaveLength(1);
            const dotCx = Number(dots[0]?.getAttribute("cx"));
            const dotCy = Number(dots[0]?.getAttribute("cy"));
            expect(Number.isFinite(dotCx)).toBe(true);
            expect(Number.isFinite(dotCy)).toBe(true);
            for (const path of container.querySelectorAll<SVGPathElement>("path")) {
                expect(path.getAttribute("d") ?? "").not.toContain("NaN");
            }
        });
    });

    describe("LineChart (Tier-2 component)", () => {
        it("renders multi-series paths, dashed strokes, legend placements, ref & svgRef bindings, {...rest}, header a11y, and zero foreignObject/filter", () => {
            stubLayoutRect(560, 280);

            const refs: { figure: HTMLElement | null; svg: SVGSVGElement | null } = {
                figure: null,
                svg: null,
            };

            const props = $state({
                mode: "line-chart" as const,
                variant: "soft" as const,
                size: "lg" as const,
                data: MULTI_LINE_DATA,
                x: "month",
                series: MULTI_LINE_SERIES,
                tier2Title: "Revenue vs Forecast",
                tier2Description: "Monthly trend in EUR",
                showActions: true,
                tier2Legend: "top" as ChartLegendPosition,
                chartClass: "exec-line-chart",
                chartAttrs: { "data-testid": "line-chart-root", "data-track": "m3" },
                get chartRef() {
                    return refs.figure;
                },
                set chartRef(v: HTMLElement | null) {
                    refs.figure = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            const figure = container.querySelector<HTMLElement>('[data-testid="line-chart-root"]');
            expect(figure).not.toBeNull();
            expect(refs.figure).toBe(figure);
            expect(figure?.dataset.variant).toBe("soft");
            expect(figure?.dataset.size).toBe("lg");
            expect(figure?.classList.contains("exec-line-chart")).toBe(true);
            expect(figure?.dataset.track).toBe("m3");

            // Header + auto aria-labelledby wiring
            const titleEl = figure?.querySelector<HTMLElement>(".cs-chart-title");
            expect(titleEl?.textContent?.trim()).toBe("Revenue vs Forecast");
            expect(titleEl?.id).not.toBe("");
            expect(figure?.getAttribute("aria-labelledby")).toBe(titleEl?.id);
            expect(figure?.querySelector(".cs-chart-description")?.textContent?.trim()).toBe(
                "Monthly trend in EUR",
            );
            expect(figure?.querySelector('[data-testid="tier2-action-btn"]')).not.toBeNull();

            // SVG ref, paths, dashed forecast, export-safety (0 foreignObject, 0 filter)
            expect(refs.svg).not.toBeNull();
            expect(refs.svg?.querySelectorAll("path.cs-chart-line-path")).toHaveLength(2);
            expect(
                refs.svg
                    ?.querySelector<SVGPathElement>(
                        ':scope .cs-chart-line-series[data-series-id="forecast"] path.cs-chart-line-path',
                    )
                    ?.getAttribute("stroke-dasharray"),
            ).toBe("5 4");
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            // Legend placements: top -> bottom -> end (wrapped in .cs-chart-body) -> none
            expect(figure?.querySelector<HTMLElement>(".cs-chart-legend")?.dataset.position).toBe(
                "top",
            );
            expect(figure?.querySelector(".cs-chart-body")).toBeNull();

            props.tier2Legend = "bottom";
            flushSync();
            expect(figure?.querySelector<HTMLElement>(".cs-chart-legend")?.dataset.position).toBe(
                "bottom",
            );

            props.tier2Legend = "end";
            flushSync();
            expect(figure?.querySelector(".cs-chart-body")).not.toBeNull();
            expect(
                figure?.querySelector<HTMLElement>(":scope .cs-chart-body .cs-chart-legend")
                    ?.dataset.position,
            ).toBe("end");

            props.tier2Legend = "none";
            flushSync();
            expect(figure?.querySelector(".cs-chart-legend")).toBeNull();
        });

        it("renders custom children SVG layer, custom tooltip snippet, showDots/showLabels, and syncs $bindable state across legend & keyboard scrubbing", () => {
            stubLayoutRect(560, 280);

            const bindings = $state<{
                hidden: readonly string[];
                active: number | null;
                hovered: string | null;
            }>({
                hidden: [],
                active: null,
                hovered: null,
            });

            const props = $state({
                mode: "line-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: MULTI_LINE_DATA,
                x: "month",
                series: MULTI_LINE_SERIES,
                lineShowDots: true as ChartLineDotsMode,
                lineShowLabels: true,
                tier2CustomLayerText: "Target SLA",
                showOverlay: true,
                tooltipCustomRenderer: (ctx: ChartTooltipContext<ChartDatum>) =>
                    `line-tip:${ctx.xLabel}:${ctx.items.length}`,
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
                get hoveredSeriesId() {
                    return bindings.hovered;
                },
                set hoveredSeriesId(v: string | null) {
                    bindings.hovered = v;
                },
            });

            renderHost(props);

            // Custom SVG layer and HTML overlay render inside LineChart
            expect(
                container.querySelector(':scope [data-testid="custom-svg-layer"] text')?.textContent,
            ).toBe("Target SLA");
            expect(container.querySelector('[data-testid="tier2-overlay"]')).not.toBeNull();
            expect(container.querySelectorAll("circle.cs-chart-line-dot")).toHaveLength(8);
            expect(container.querySelectorAll("text.cs-chart-value-label")).toHaveLength(8);

            // Keyboard scrub activates index -> custom tooltip renders and activeIndex binding updates
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            expect(canvas).not.toBeNull();
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();

            expect(bindings.active).toBe(0);
            expect(
                container.querySelector('[data-testid="custom-tooltip"]')?.textContent?.trim(),
            ).toBe("line-tip:Jan:2");
            expect(
                container.querySelectorAll(":scope .cs-chart-layer-crosshair .cs-chart-point-dot"),
            ).toHaveLength(2);

            // Setting showDots={false} suppresses both static dots and crosshair active dots
            props.lineShowDots = false;
            flushSync();
            expect(container.querySelectorAll("circle.cs-chart-line-dot")).toHaveLength(0);
            expect(
                container.querySelectorAll(":scope .cs-chart-layer-crosshair .cs-chart-point-dot"),
            ).toHaveLength(0);

            // Hover legend item -> hoveredSeriesId syncs and dims sibling line series
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            legendButtons[0]?.dispatchEvent(new PointerEvent("pointerenter"));
            flushSync();
            expect(bindings.hovered).toBe("actual");
            expect(
                container.querySelector<SVGGElement>(
                    '.cs-chart-line-series[data-series-id="forecast"]',
                )?.dataset.dimmed,
            ).toBe("");

            legendButtons[0]?.dispatchEvent(new PointerEvent("pointerleave"));
            flushSync();
            expect(bindings.hovered).toBeNull();

            // Escape clears activeIndex
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            flushSync();
            expect(bindings.active).toBeNull();
        });

        it("renders ChartLoading shape='line' when loading, ChartEmpty on empty data, and Show all reset when all series are hidden", () => {
            stubLayoutRect(560, 280);

            const props = $state({
                mode: "line-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: MULTI_LINE_DATA as readonly MultiSeriesRow[],
                x: "month",
                series: MULTI_LINE_SERIES,
                loading: true,
            });

            renderHost(props);

            const loadingEl = container.querySelector<HTMLDivElement>(".cs-chart-loading");
            expect(loadingEl).not.toBeNull();
            expect(loadingEl?.dataset.shape).toBe("line");
            expect(container.querySelector(".cs-chart-canvas")).toBeNull();
            expect(container.querySelector(".cs-chart-legend")).toBeNull();

            // Finish loading -> SVG + 2 line paths appear
            props.loading = false;
            flushSync();
            expect(container.querySelector(".cs-chart-loading")).toBeNull();
            expect(container.querySelectorAll("path.cs-chart-line-path")).toHaveLength(2);

            // Hide all series via legend -> ChartEmpty appears with working Show all reset
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(2);
            legendButtons[0]?.click();
            flushSync();
            legendButtons[1]?.click();
            flushSync();

            const emptyEl = container.querySelector<HTMLDivElement>(".cs-chart-empty");
            expect(emptyEl).not.toBeNull();
            expect(emptyEl?.dataset.allHidden).toBe("");
            expect(container.querySelector(".cs-chart-canvas")).toBeNull();

            const resetBtn = emptyEl?.querySelector<HTMLButtonElement>("button");
            expect(resetBtn?.textContent?.trim()).toBe("Show all");
            resetBtn?.click();
            flushSync();

            expect(container.querySelector(".cs-chart-empty")).toBeNull();
            expect(container.querySelectorAll("path.cs-chart-line-path")).toHaveLength(2);

            // Empty dataset renders ChartEmpty without reset button
            props.data = [];
            flushSync();
            expect(container.querySelector(".cs-chart-empty")).not.toBeNull();
            expect(container.querySelector(":scope .cs-chart-empty button")).toBeNull();
        });

        it("renders right Y2 axis when a series targets yAxis='right' and respects grid={false} and grid config overrides", () => {
            stubLayoutRect(560, 280);

            const props = $state({
                mode: "line-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: SAMPLE_DATA,
                x: "month",
                series: [
                    { id: "variance", label: "Variance", yAxis: "left" as const },
                    { id: "margin", label: "Margin %", yAxis: "right" as const },
                ],
                y2Axis: { format: (v: string | number | Date) => `${Math.round(Number(v) * 100)}%` },
                lineCurve: "linear" as ChartCurve,
                tier2Grid: true as ChartGridOption,
            });

            renderHost(props);

            // Right Y2 axis renders formatted % ticks
            const rightAxis = container.querySelector<SVGGElement>(
                '.cs-chart-layer-axes[data-position="right"]',
            );
            expect(rightAxis).not.toBeNull();
            const rightTickLabels = [
                ...(rightAxis?.querySelectorAll<SVGTextElement>(".cs-chart-axis-tick-text") ?? []),
            ].map((el) => el.textContent?.trim() ?? "");
            expect(rightTickLabels.length).toBeGreaterThan(0);
            expect(rightTickLabels.every((label) => label.endsWith("%"))).toBe(true);

            // Margin series scales against y2Scale (0.24..0.31 spans vertical plot height rather than collapsing near 0)
            const marginD =
                container
                    .querySelector<SVGPathElement>(
                        ':scope .cs-chart-line-series[data-series-id="margin"] path.cs-chart-line-path',
                    )
                    ?.getAttribute("d") ?? "";
            const yCoords = marginD
                .matchAll(/[ML][^,]+,([^ML\s]+)/g)
                .map((match) => Number(match[1]))
                .filter((v) => Number.isFinite(v))
                .toArray();
            expect(yCoords).toHaveLength(4);
            expect(Math.max(...yCoords) - Math.min(...yCoords)).toBeGreaterThan(20);

            // Default grid={true} renders horizontal lines + zero baseline (variance crosses 0)
            expect(container.querySelector(".cs-chart-layer-grid")).not.toBeNull();
            expect(container.querySelector("line.cs-chart-grid-zero")).not.toBeNull();

            // grid={false} omits the grid layer completely
            props.tier2Grid = false;
            flushSync();
            expect(container.querySelector(".cs-chart-layer-grid")).toBeNull();

            // grid={{ horizontal: false, vertical: true, zeroLine: false }} renders vertical lines only
            props.tier2Grid = { horizontal: false, vertical: true, zeroLine: false };
            flushSync();
            const gridLines = [
                ...container.querySelectorAll<SVGLineElement>(
                    ":scope .cs-chart-layer-grid line.cs-chart-grid-line",
                ),
            ];
            expect(gridLines.length).toBeGreaterThan(0);
            expect(gridLines.every((line) => line.getAttribute("x1") === line.getAttribute("x2"))).toBe(
                true,
            );
            expect(container.querySelector("line.cs-chart-grid-zero")).toBeNull();
        });
    });

    describe("AreaChart (Tier-2 component)", () => {
        it("renders overlay mode with gradients vs solid fill, optional top line, custom SVG children & tooltip, legend placements, bindings, and zero foreignObject/filter", () => {
            stubLayoutRect(560, 280);

            const refs: { figure: HTMLElement | null; svg: SVGSVGElement | null } = {
                figure: null,
                svg: null,
            };

            const props = $state({
                mode: "area-chart" as const,
                variant: "elevated" as const,
                size: "sm" as const,
                data: GAPPED_LINE_DATA,
                x: "month",
                series: MULTI_LINE_SERIES,
                areaMode: "overlay" as ChartAreaMode,
                areaCurve: "linear" as ChartCurve,
                areaGradient: true,
                areaShowLine: true,
                areaConnectNulls: false,
                tier2Legend: "top" as ChartLegendPosition,
                tier2CustomLayerText: "Overlay Note",
                chartAttrs: { "data-testid": "area-chart-root" },
                tooltipCustomRenderer: undefined as
                    | ((ctx: ChartTooltipContext<ChartDatum>) => string)
                    | undefined,
                activeIndex: null as number | null,
                get chartRef() {
                    return refs.figure;
                },
                set chartRef(v: HTMLElement | null) {
                    refs.figure = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            const figure = container.querySelector<HTMLElement>('[data-testid="area-chart-root"]');
            expect(figure).not.toBeNull();
            expect(refs.figure).toBe(figure);
            expect(figure?.dataset.variant).toBe("elevated");
            expect(figure?.dataset.size).toBe("sm");
            expect(refs.svg).not.toBeNull();
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            // Overlay gradients + top lines + custom SVG layer
            expect(refs.svg?.querySelectorAll("linearGradient")).toHaveLength(2);
            expect(refs.svg?.querySelectorAll("path.cs-chart-area-fill")).toHaveLength(2);
            expect(refs.svg?.querySelectorAll("path.cs-chart-line-path")).toHaveLength(2);
            expect(
                refs.svg?.querySelector(':scope [data-testid="custom-svg-layer"] text')?.textContent,
            ).toBe("Overlay Note");

            // connectNulls splits vs bridges on actual series
            const actualFill = (): string | null =>
                refs.svg
                    ?.querySelector<SVGPathElement>(
                        ':scope .cs-chart-area-series[data-series-id="actual"] path.cs-chart-area-fill',
                    )
                    ?.getAttribute("d") ?? null;
            expect(countMoveToCommands(actualFill())).toBe(2);

            props.areaConnectNulls = true;
            flushSync();
            expect(countMoveToCommands(actualFill())).toBe(1);

            // Solid fill (gradient={false}) & showLine={false}
            props.areaGradient = false;
            props.areaShowLine = false;
            flushSync();
            expect(refs.svg?.querySelectorAll("linearGradient")).toHaveLength(0);
            expect(
                refs.svg?.querySelectorAll('path.cs-chart-area-fill[data-solid=""]'),
            ).toHaveLength(2);
            expect(refs.svg?.querySelectorAll("path.cs-chart-line-path")).toHaveLength(0);

            // Legend placements
            for (const placement of ["top", "bottom", "end"] as const) {
                props.tier2Legend = placement;
                flushSync();
                expect(figure?.querySelector<HTMLElement>(".cs-chart-legend")?.dataset.position).toBe(
                    placement,
                );
            }
            props.tier2Legend = "none";
            flushSync();
            expect(figure?.querySelector(".cs-chart-legend")).toBeNull();

            // Custom tooltip snippet receives context when activeIndex is set
            props.tooltipCustomRenderer = (ctx) => `area-tip:${ctx.xLabel}:${ctx.items.length}`;
            props.activeIndex = 0;
            flushSync();
            expect(
                container.querySelector('[data-testid="custom-tooltip"]')?.textContent?.trim(),
            ).toBe("area-tip:Jan:2");
        });

        it("computes stacked cumulative paths, defaults tooltip showTotal to true, and recalculates paths & Y domain on legend toggle", () => {
            stubLayoutRect(560, 280);

            const bindings = $state<{
                hidden: readonly string[];
                active: number | null;
            }>({
                hidden: [],
                active: 2, // Mar: organic=180, paid=120 -> stacked total = 300
            });

            const props = $state({
                mode: "area-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: STACKED_AREA_DATA,
                x: "month",
                series: STACKED_AREA_SERIES,
                areaMode: "stacked" as ChartAreaMode,
                areaCurve: "linear" as ChartCurve,
                tier2ShowTotal: undefined as boolean | undefined,
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
            });

            renderHost(props);

            // Tooltip defaults showTotal to true in stacked mode
            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip?.dataset.open).toBe("");
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).not.toBeNull();

            // Explicit showTotal={false} overrides the stacked default
            props.tier2ShowTotal = false;
            flushSync();
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).toBeNull();

            props.tier2ShowTotal = undefined;
            flushSync();
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).not.toBeNull();

            const getYTickValues = (): number[] =>
                [
                    ...container.querySelectorAll<SVGTextElement>(
                        ':scope .cs-chart-layer-axes[data-position="left"] .cs-chart-axis-tick-text',
                    ),
                ]
                    .map((el) => Number((el.textContent ?? "").replaceAll(",", "").trim()))
                    .filter((v) => Number.isFinite(v));

            const getPaidPath = (): string =>
                container
                    .querySelector<SVGPathElement>(
                        ':scope .cs-chart-area-series[data-series-id="paid"] path.cs-chart-area-fill',
                    )
                    ?.getAttribute("d") ?? "";

            const initialMaxTick = Math.max(...getYTickValues());
            const initialPaidPath = getPaidPath();
            // Combined max is 300 (180+120 and 160+140), so Y-axis max tick >= 300
            expect(initialMaxTick).toBeGreaterThanOrEqual(300);
            expect(initialPaidPath).not.toContain("NaN");

            // Toggle "organic" off via legend -> "paid" drops to baseline & Y domain shrinks (< 300, max paid = 140)
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(2);
            legendButtons[0]?.click();
            flushSync();

            expect(bindings.hidden).toEqual(["organic"]);
            const afterToggleMaxTick = Math.max(...getYTickValues());
            const afterTogglePaidPath = getPaidPath();
            expect(afterToggleMaxTick).toBeLessThan(initialMaxTick);
            expect(afterTogglePaidPath).not.toBe(initialPaidPath);
            expect(afterTogglePaidPath).not.toContain("NaN");

            // Toggle "paid" off too -> all series hidden shows ChartEmpty
            legendButtons[1]?.click();
            flushSync();

            const emptyEl = container.querySelector<HTMLDivElement>(".cs-chart-empty");
            expect(emptyEl).not.toBeNull();
            expect(emptyEl?.dataset.allHidden).toBe("");

            // Click "Show all" -> restores both stacked series, paths, and Y domain
            emptyEl?.querySelector<HTMLButtonElement>("button")?.click();
            flushSync();

            expect(bindings.hidden).toEqual([]);
            expect(container.querySelector(".cs-chart-empty")).toBeNull();
            expect(Math.max(...getYTickValues())).toBe(initialMaxTick);
            expect(getPaidPath()).toBe(initialPaidPath);
        });

        it("guards single-point dataset without NaN and renders loading/empty states cleanly", () => {
            stubLayoutRect(560, 280);

            const props = $state({
                mode: "area-chart" as const,
                variant: "sunken" as const,
                size: "md" as const,
                data: SINGLE_POINT_DATA as readonly MultiSeriesRow[],
                x: "month",
                series: [{ id: "actual", label: "Actual" }],
                loading: false,
            });

            renderHost(props);

            const dots = container.querySelectorAll<SVGCircleElement>("circle.cs-chart-line-dot");
            expect(dots).toHaveLength(1);
            const dotCx = Number(dots[0]?.getAttribute("cx"));
            const dotCy = Number(dots[0]?.getAttribute("cy"));
            expect(Number.isFinite(dotCx)).toBe(true);
            expect(Number.isFinite(dotCy)).toBe(true);
            for (const path of container.querySelectorAll<SVGPathElement>("path")) {
                expect(path.getAttribute("d") ?? "").not.toContain("NaN");
            }

            // loading={true} renders ChartLoading shape="line"
            props.loading = true;
            flushSync();
            const loadingEl = container.querySelector<HTMLDivElement>(".cs-chart-loading");
            expect(loadingEl?.dataset.shape).toBe("line");
            expect(container.querySelector(".cs-chart-canvas")).toBeNull();

            // empty data renders ChartEmpty
            props.loading = false;
            props.data = [];
            flushSync();
            expect(container.querySelector(".cs-chart-empty")).not.toBeNull();
        });
    });
});
