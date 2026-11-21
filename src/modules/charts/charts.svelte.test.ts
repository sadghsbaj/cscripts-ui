import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ChartTestHost from "./ChartTestHost.internal.svelte";
import { clearMeasureCache } from "./chart-measure.internal.ts";
import {
    CHART_LEGEND_MARKERS,
    CHART_LEGEND_PLACEMENTS,
    CHART_SIZES,
    CHART_TONES,
    CHART_VARIANTS,
    ChartLoading,
    ChartState,
    type ChartAnnotationConfig,
    type ChartAreaMode,
    type ChartBarInsideLabelOrientation,
    type ChartBarLabelLayout,
    type ChartBarMode,
    type ChartBarValueLabels,
    type ChartCurve,
    type ChartDatum,
    type ChartGridOption,
    type ChartLegendMarker,
    type ChartLegendPlacement,
    type ChartLegendPosition,
    type ChartLineDotsMode,
    type ChartLoadingShape,
    type ChartOrientation,
    type ChartReferenceBandConfig,
    type ChartReferenceLineConfig,
    type ChartSeries,
    type ChartTone,
    type ChartTooltipContext,
    type ChartTooltipMode,
    type ChartZeroLineStyle,
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

function readLeaderStart(pathEl: SVGPathElement | null | undefined): { x: number; y: number } {
    const d = pathEl?.getAttribute("d") ?? "";
    const match = /^M\s+([-\d.]+)\s+([-\d.]+)/.exec(d);
    expect(match).not.toBeNull();
    return { x: Number(match?.[1]), y: Number(match?.[2]) };
}

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

interface BarRow extends ChartDatum {
    category: string;
    a: number;
    b?: number;
    c?: number;
}

interface ParsedBarBox {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    hasArc: boolean;
}

function parseBarPathBox(d: string | null = ""): ParsedBarBox {
    const raw = d === null ? "" : d;
    const xs: number[] = [];
    const ys: number[] = [];

    for (const match of raw.matchAll(/M(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)) {
        xs.push(Number(match[1]));
        ys.push(Number(match[2]));
    }
    for (const match of raw.matchAll(/H(-?\d+(?:\.\d+)?)/g)) {
        xs.push(Number(match[1]));
    }
    for (const match of raw.matchAll(/V(-?\d+(?:\.\d+)?)/g)) {
        ys.push(Number(match[1]));
    }
    for (const match of raw.matchAll(
        /A-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?\s+\d+\s+\d+\s+\d+\s+(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
    )) {
        xs.push(Number(match[1]));
        ys.push(Number(match[2]));
    }

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        hasArc: raw.includes("A"),
    };
}

function stubBarLayoutRect(width: number, height: number): void {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        () => new DOMRect(0, 0, width, height),
    );
}

function readPlotMargins(svg: SVGSVGElement | null): {
    left: number;
    top: number;
    right: number;
    plotWidth: number;
    plotHeight: number;
} {
    const svgWidth = Number(svg?.getAttribute("width") ?? 0);
    const plotTransform = svg?.querySelector<SVGGElement>(".cs-chart-plot")?.getAttribute("transform") ?? "";
    const match = /translate\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(plotTransform);
    const left = Number(match?.[1] ?? NaN);
    const top = Number(match?.[2] ?? NaN);
    const clipRect = svg?.querySelector<SVGRectElement>(":scope > defs > clipPath > rect");
    const plotWidth = Number(clipRect?.getAttribute("width") ?? NaN);
    const plotHeight = Number(clipRect?.getAttribute("height") ?? NaN);
    return {
        left,
        top,
        right: svgWidth - left - plotWidth,
        plotWidth,
        plotHeight,
    };
}

const GROUPED_BAR_DATA: BarRow[] = [
    { category: "Q1", a: 120, b: 80 },
    { category: "Q2", a: 180, b: -40 },
    { category: "Q3", a: 90, b: 140 },
    { category: "Q4", a: 210, b: 110 },
];

const GROUPED_BAR_SERIES: ChartSeries<BarRow>[] = [
    { id: "a", label: "North" },
    { id: "b", label: "South" },
];

const DIVERGING_STACK_DATA: BarRow[] = [
    { category: "Jan", a: 80, b: 50, c: -45 },
    { category: "Feb", a: 60, b: -30, c: -50 },
    { category: "Mar", a: 100, b: 40, c: 20 },
];

const DIVERGING_STACK_SERIES: ChartSeries<BarRow>[] = [
    { id: "a", label: "Expansion", tone: "positive" },
    { id: "b", label: "Net Change", tone: "accent" },
    { id: "c", label: "Churn", tone: "negative" },
];

const TINY_AND_ZERO_BAR_DATA: BarRow[] = [
    { category: "Huge", a: 1000 },
    { category: "TinyPos", a: 0.1 },
    { category: "Zero", a: 0 },
    { category: "TinyNeg", a: -0.1 },
];

const LONG_LABEL_BAR_DATA: BarRow[] = [
    {
        category:
            "Enterprise Platform Subscription & Dedicated Multi-Region Cloud Support Agreement",
        a: 420,
        b: 180,
    },
    { category: "Self-Serve", a: 190, b: 90 },
    {
        category: "Professional Services Implementation & Architecture Advisory Retainer",
        a: 310,
        b: 140,
    },
];

describe("Charts M4 — ChartBar & BarChart (Vertical/Horizontal, Grouped/Stacked/Diverging)", () => {
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

    describe("ChartBar (Tier-1 primitive)", () => {
        it("renders vertical and horizontal grouped bars with integer coordinates, maxBarWidth, data attributes, ref binding, {...rest}, and zero foreignObject/filter", () => {
            const state = new ChartState<BarRow>({
                data: GROUPED_BAR_DATA,
                x: "category",
                series: GROUPED_BAR_SERIES,
                orientation: "vertical",
                preferBandX: true,
                width: 560,
                height: 280,
            });

            const refs: { bar: SVGGElement | null; svg: SVGSVGElement | null } = {
                bar: null,
                svg: null,
            };

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBar: true,
                barMode: "grouped" as ChartBarMode,
                barMaxBarWidth: 22,
                barAttrs: { "data-testid": "tier1-bar", "data-custom": "bar-pass" },
                get barRef() {
                    return refs.bar;
                },
                set barRef(v: SVGGElement | null) {
                    refs.bar = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            const group = container.querySelector<SVGGElement>('[data-testid="tier1-bar"]');
            expect(group).not.toBeNull();
            expect(refs.bar).toBe(group);
            expect(group?.dataset.custom).toBe("bar-pass");
            expect(group?.dataset.mode).toBe("grouped");
            expect(group?.dataset.orientation).toBe("vertical");
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            const verticalBars = [
                ...(group?.querySelectorAll<SVGPathElement>("path.cs-chart-bar-rect") ?? []),
            ];
            expect(verticalBars).toHaveLength(8);

            for (const bar of verticalBars) {
                expect(bar.dataset.orientation).toBe("vertical");
                const box = parseBarPathBox(bar.getAttribute("d"));
                expect(Number.isSafeInteger(box.minX)).toBe(true);
                expect(Number.isSafeInteger(box.maxX)).toBe(true);
                expect(Number.isSafeInteger(box.minY)).toBe(true);
                expect(Number.isSafeInteger(box.maxY)).toBe(true);
                expect(box.width).toBeLessThanOrEqual(22);
                expect(box.height).toBeGreaterThan(0);
            }

            // Negative value (Q2 series b = -40) carries data-negative; positive bars do not
            const negVertical = group?.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="b"][data-index="1"]',
            );
            const posVertical = group?.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="a"][data-index="0"]',
            );
            expect(negVertical?.dataset.negative).toBe("");
            expect(posVertical?.dataset.negative).toBeUndefined();

            // Switch orientation -> horizontal: bars flip orientation, still snap to integer pixels & respect maxBarWidth
            state.orientation = "horizontal";
            flushSync();

            expect(group?.dataset.orientation).toBe("horizontal");
            const horizontalBars = [
                ...(group?.querySelectorAll<SVGPathElement>("path.cs-chart-bar-rect") ?? []),
            ];
            expect(horizontalBars).toHaveLength(8);
            for (const bar of horizontalBars) {
                expect(bar.dataset.orientation).toBe("horizontal");
                const box = parseBarPathBox(bar.getAttribute("d"));
                expect(Number.isSafeInteger(box.minX)).toBe(true);
                expect(Number.isSafeInteger(box.maxX)).toBe(true);
                expect(Number.isSafeInteger(box.minY)).toBe(true);
                expect(Number.isSafeInteger(box.maxY)).toBe(true);
                expect(box.height).toBeLessThanOrEqual(22);
                expect(box.width).toBeGreaterThan(0);
            }
            expect(
                group?.querySelector<SVGPathElement>(
                    'path.cs-chart-bar-rect[data-series-id="b"][data-index="1"]',
                )?.dataset.negative,
            ).toBe("");
        });

        it("stacks diverging positive & negative values without overlap, applies caps only to outermost segments, and restores chart.stacked on mode switch & unmount", () => {
            const state = new ChartState<BarRow>({
                data: DIVERGING_STACK_DATA,
                x: "category",
                series: DIVERGING_STACK_SERIES,
                orientation: "vertical",
                preferBandX: true,
                stacked: false,
                width: 560,
                height: 300,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBar: true,
                barMode: "grouped" as ChartBarMode,
            });

            const host = renderHost(props);
            expect(state.stacked).toBe(false);
            const groupedDomain = [...state.yScale.domain];

            // Switch grouped -> stacked: ChartBar sets chart.stacked = true
            props.barMode = "stacked";
            flushSync();
            expect(state.stacked).toBe(true);
            expect(state.yScale.domain[1]).toBeGreaterThan(groupedDomain[1] ?? 0);

            const baseline = Math.round(state.yScale.baseline);

            // Category 0 (Jan): a = +80 (inner positive), b = +50 (outermost positive), c = -45 (outermost negative)
            const janA = parseBarPathBox(
                container
                    .querySelector<SVGPathElement>(
                        'path.cs-chart-bar-rect[data-series-id="a"][data-index="0"]',
                    )
                    ?.getAttribute("d") ?? null,
            );
            const janB = parseBarPathBox(
                container
                    .querySelector<SVGPathElement>(
                        'path.cs-chart-bar-rect[data-series-id="b"][data-index="0"]',
                    )
                    ?.getAttribute("d") ?? null,
            );
            const janC = parseBarPathBox(
                container
                    .querySelector<SVGPathElement>(
                        'path.cs-chart-bar-rect[data-series-id="c"][data-index="0"]',
                    )
                    ?.getAttribute("d") ?? null,
            );

            // Positive stack sits above baseline without overlapping; negative sits below baseline without overlapping
            expect(janA.maxY).toBeLessThanOrEqual(baseline + 1);
            expect(janB.maxY).toBeLessThanOrEqual(janA.minY);
            expect(janC.minY).toBeGreaterThanOrEqual(baseline - 1);
            expect(janC.minY).toBeGreaterThanOrEqual(janA.maxY);

            // Internal stack segment (janA) has 0px corner radius; outermost positive (janB) & negative (janC) have rounded caps
            expect(janA.hasArc).toBe(false);
            expect(janB.hasArc).toBe(true);
            expect(janC.hasArc).toBe(true);

            // Category 1 (Feb): b = -30 (inner negative), c = -50 (outermost negative) stack downward without overlap
            const febB = parseBarPathBox(
                container
                    .querySelector<SVGPathElement>(
                        'path.cs-chart-bar-rect[data-series-id="b"][data-index="1"]',
                    )
                    ?.getAttribute("d") ?? null,
            );
            const febC = parseBarPathBox(
                container
                    .querySelector<SVGPathElement>(
                        'path.cs-chart-bar-rect[data-series-id="c"][data-index="1"]',
                    )
                    ?.getAttribute("d") ?? null,
            );
            expect(febB.minY).toBeGreaterThanOrEqual(baseline - 1);
            expect(febC.minY).toBeGreaterThanOrEqual(febB.maxY);
            expect(febB.hasArc).toBe(false);
            expect(febC.hasArc).toBe(true);

            // Switch stacked -> grouped restores chart.stacked = false and original domain
            props.barMode = "grouped";
            flushSync();
            expect(state.stacked).toBe(false);
            expect([...state.yScale.domain]).toEqual(groupedDomain);

            // Switch back to stacked, then unmount ChartBar -> restores chart.stacked = false
            props.barMode = "stacked";
            flushSync();
            expect(state.stacked).toBe(true);

            props.showBar = false;
            flushSync();
            expect(state.stacked).toBe(false);

            // Remount in stacked mode, then unmount entire host -> restores chart.stacked = false
            props.showBar = true;
            flushSync();
            expect(state.stacked).toBe(true);

            unmount(host);
            mounted.pop();
            expect(state.stacked).toBe(false);
        });

        it("clamps tiny non-zero values to >= 2px (minBarLength) and renders no bar path for exact 0", () => {
            const state = new ChartState<BarRow>({
                data: TINY_AND_ZERO_BAR_DATA,
                x: "category",
                series: [{ id: "a", label: "Value" }],
                orientation: "vertical",
                preferBandX: true,
                width: 520,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBar: true,
                barMinBarLength: 2,
            });

            // 4 categories, 1 exact zero -> only 3 rendered bar paths
            const bars = container.querySelectorAll<SVGPathElement>("path.cs-chart-bar-rect");
            expect(bars).toHaveLength(3);
            expect(container.querySelector('path.cs-chart-bar-rect[data-index="2"]')).toBeNull();

            const tinyPos = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-index="1"]',
            );
            const tinyNeg = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-index="3"]',
            );
            expect(tinyPos).not.toBeNull();
            expect(tinyNeg).not.toBeNull();
            expect(tinyNeg?.dataset.negative).toBe("");
            expect(parseBarPathBox(tinyPos?.getAttribute("d") ?? null).height).toBeGreaterThanOrEqual(
                2,
            );
            expect(parseBarPathBox(tinyNeg?.getAttribute("d") ?? null).height).toBeGreaterThanOrEqual(
                2,
            );

            // Horizontal orientation also clamps tiny non-zero widths to >= 2px and omits exact 0
            state.orientation = "horizontal";
            flushSync();

            expect(container.querySelectorAll("path.cs-chart-bar-rect")).toHaveLength(3);
            expect(container.querySelector('path.cs-chart-bar-rect[data-index="2"]')).toBeNull();
            expect(
                parseBarPathBox(
                    container
                        .querySelector<SVGPathElement>('path.cs-chart-bar-rect[data-index="1"]')
                        ?.getAttribute("d") ?? null,
                ).width,
            ).toBeGreaterThanOrEqual(2);
            expect(
                parseBarPathBox(
                    container
                        .querySelector<SVGPathElement>('path.cs-chart-bar-rect[data-index="3"]')
                        ?.getAttribute("d") ?? null,
                ).width,
            ).toBeGreaterThanOrEqual(2);
        });

        it("renders outside value labels (for 'outside' and true) and auto-suppresses inside labels when bar is too narrow or too short", () => {
            const insideData: BarRow[] = [
                { category: "Large", a: 500 },
                { category: "Tiny", a: 8 },
            ];
            const state = new ChartState<BarRow>({
                data: insideData,
                x: "category",
                series: [{ id: "a", label: "Revenue" }],
                orientation: "horizontal",
                preferBandX: true,
                width: 560,
                height: 220,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBar: true,
                barValueLabels: "outside" as ChartBarValueLabels,
                barMaxBarWidth: 36,
                barFormatLabel: (v: number) => `$${v}`,
            });

            renderHost(props);

            // valueLabels="outside" renders haloed .cs-chart-bar-value-label for both bars
            const outsideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-value-label"),
            ];
            expect(outsideLabels).toHaveLength(2);
            expect(outsideLabels.map((el) => el.textContent?.trim())).toEqual(["$500", "$8"]);
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);

            // valueLabels={true} is an alias for "outside"
            props.barValueLabels = true;
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(2);

            // valueLabels="inside": Large bar (width >> labelWidth + 14, thickness >= 18) shows inside label; Tiny bar auto-suppresses
            props.barValueLabels = "inside";
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(0);
            const insideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            expect(insideLabels).toHaveLength(1);
            expect(insideLabels[0]?.dataset.index).toBe("0");
            expect(insideLabels[0]?.textContent?.trim()).toBe("$500");

            // Shrinking barThickness below 18px (via maxBarWidth=14) auto-suppresses ALL inside labels even on wide bars
            props.barMaxBarWidth = 14;
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);

            // valueLabels="none" / false suppresses all labels
            props.barMaxBarWidth = 36;
            props.barValueLabels = false;
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(0);
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);
        });

        it("renders horizontal labelLayout='above' inline category labels with truncation <title> and flush-right values, plus dimmed/active states", () => {
            const state = new ChartState<BarRow>({
                data: LONG_LABEL_BAR_DATA,
                x: "category",
                series: [{ id: "a", label: "ARR" }],
                orientation: "horizontal",
                preferBandX: true,
                width: 320,
                height: 260,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBar: true,
                barLabelLayout: "above" as ChartBarLabelLayout,
                barValueLabels: "outside" as ChartBarValueLabels,
                barFormatLabel: (v: number) => `${v}k`,
            });

            renderHost(props);

            const aboveLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-above-label"),
            ];
            const aboveValues = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-above-value"),
            ];
            expect(aboveLabels).toHaveLength(3);
            expect(aboveValues).toHaveLength(3);
            // Outside bar labels are replaced by flush-right above-bar values in single-series above layout
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(0);

            // Long labels truncate with ellipsis and attach <title> with full category text
            const longTitle = aboveLabels[0]?.querySelector("title");
            expect(longTitle?.textContent).toBe(LONG_LABEL_BAR_DATA[0]?.category);
            expect(aboveLabels[0]?.textContent).toContain("…");

            // Short label ("Self-Serve") does not truncate and omits <title>
            expect(aboveLabels[1]?.querySelector("title")).toBeNull();
            expect(aboveLabels[1]?.textContent?.trim()).toBe("Self-Serve");

            // Flush-right values align at plotWidth with text-anchor="end"
            expect(aboveValues[0]?.getAttribute("text-anchor")).toBe("end");
            expect(Number(aboveValues[0]?.getAttribute("x"))).toBe(Math.round(state.plotWidth));
            expect(aboveValues.map((el) => el.textContent?.trim())).toEqual([
                "420k",
                "190k",
                "310k",
            ]);

            // activeIndex highlights matching bar and above-bar row with data-active
            state.setActiveIndex(1);
            flushSync();
            expect(
                container.querySelector<SVGPathElement>('path.cs-chart-bar-rect[data-index="1"]')
                    ?.dataset.active,
            ).toBe("");
            expect(
                container.querySelector<SVGPathElement>('path.cs-chart-bar-rect[data-index="0"]')
                    ?.dataset.active,
            ).toBeUndefined();
            expect(aboveLabels[1]?.dataset.active).toBe("");
            expect(aboveValues[1]?.dataset.active).toBe("");

            // hoveredSeriesId dimming on multi-series ChartBar
            state.series = GROUPED_BAR_SERIES;
            state.setHoveredSeries("a");
            flushSync();

            const dimmedBars = container.querySelectorAll<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="b"][data-dimmed=""]',
            );
            const focusedBars = container.querySelectorAll<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="a"]:not([data-dimmed])',
            );
            expect(dimmedBars).toHaveLength(3);
            expect(focusedBars).toHaveLength(3);
        });
    });

    describe("BarChart (Tier-2 component)", () => {
        it("renders required variant & size, ref & svgRef bindings, {...rest}, header a11y, all 4 orientation x mode combinations, and zero foreignObject/filter", () => {
            stubBarLayoutRect(560, 280);

            const refs: { figure: HTMLElement | null; svg: SVGSVGElement | null } = {
                figure: null,
                svg: null,
            };

            const props = $state({
                mode: "bar-chart" as const,
                variant: "soft" as const,
                size: "lg" as const,
                data: GROUPED_BAR_DATA,
                x: "category",
                series: GROUPED_BAR_SERIES,
                orientation: "vertical" as ChartOrientation,
                barMode: "grouped" as ChartBarMode,
                tier2Title: "Regional Revenue",
                tier2Description: "Quarterly split by region",
                showActions: true,
                tier2Legend: "top" as ChartLegendPosition,
                chartClass: "exec-bar-chart",
                chartAttrs: { "data-testid": "bar-chart-root", "data-track": "m4" },
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

            const figure = container.querySelector<HTMLElement>('[data-testid="bar-chart-root"]');
            expect(figure).not.toBeNull();
            expect(refs.figure).toBe(figure);
            expect(refs.svg).not.toBeNull();
            expect(figure?.dataset.variant).toBe("soft");
            expect(figure?.dataset.size).toBe("lg");
            expect(figure?.classList.contains("exec-bar-chart")).toBe(true);
            expect(figure?.dataset.track).toBe("m4");

            const titleEl = figure?.querySelector<HTMLElement>(".cs-chart-title");
            expect(titleEl?.textContent?.trim()).toBe("Regional Revenue");
            expect(figure?.getAttribute("aria-labelledby")).toBe(titleEl?.id);
            expect(figure?.querySelector(".cs-chart-description")?.textContent?.trim()).toBe(
                "Quarterly split by region",
            );
            expect(figure?.querySelector('[data-testid="tier2-action-btn"]')).not.toBeNull();

            // Verify all 4 combinations: vertical/horizontal x grouped/stacked
            const combos: Array<{ orientation: ChartOrientation; mode: ChartBarMode }> = [
                { orientation: "vertical", mode: "grouped" },
                { orientation: "vertical", mode: "stacked" },
                { orientation: "horizontal", mode: "grouped" },
                { orientation: "horizontal", mode: "stacked" },
            ];

            for (const combo of combos) {
                props.orientation = combo.orientation;
                props.barMode = combo.mode;
                flushSync();

                const barGroup = refs.svg?.querySelector<SVGGElement>("g.cs-chart-bar");
                expect(barGroup?.dataset.orientation).toBe(combo.orientation);
                expect(barGroup?.dataset.mode).toBe(combo.mode);

                const bars = [
                    ...(refs.svg?.querySelectorAll<SVGPathElement>("path.cs-chart-bar-rect") ?? []),
                ];
                expect(bars).toHaveLength(8);
                for (const bar of bars) {
                    const d = bar.getAttribute("d") ?? "";
                    expect(d).not.toBe("");
                    expect(d).not.toContain("NaN");
                }
                expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);
            }
        });

        it("renders diverging variance with semantic tones and horizontal/vertical zero-line plus negative bars", () => {
            stubBarLayoutRect(560, 280);

            const props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: DIVERGING_STACK_DATA,
                x: "category",
                series: DIVERGING_STACK_SERIES,
                orientation: "vertical" as ChartOrientation,
                barMode: "stacked" as ChartBarMode,
            });

            renderHost(props);

            // Vertical diverging chart -> horizontal zero-line (y1 === y2) + negative bars with data-negative
            const vZeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(vZeroLine).not.toBeNull();
            expect(vZeroLine?.getAttribute("y1")).toBe(vZeroLine?.getAttribute("y2"));
            expect(isHalfPixel(vZeroLine?.getAttribute("y1") ?? null)).toBe(true);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-negative=""]').length,
            ).toBe(3);

            // Horizontal diverging chart -> vertical zero-line (x1 === x2) + negative bars with data-negative
            props.orientation = "horizontal";
            flushSync();

            const hZeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(hZeroLine).not.toBeNull();
            expect(hZeroLine?.getAttribute("x1")).toBe(hZeroLine?.getAttribute("x2"));
            expect(isHalfPixel(hZeroLine?.getAttribute("x1") ?? null)).toBe(true);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-negative=""]').length,
            ).toBe(3);
        });

        it("round-trips horizontal labelLayout ('gutter' -> 'above' -> 'gutter') and clears/restores axis ticks and right/top margins on valueLabels transitions", () => {
            stubBarLayoutRect(420, 260);

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            const props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: LONG_LABEL_BAR_DATA,
                x: "category",
                series: [{ id: "a", label: "ARR" }],
                orientation: "horizontal" as ChartOrientation,
                barLabelLayout: "gutter" as ChartBarLabelLayout,
                barValueLabels: "outside" as ChartBarValueLabels,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            // 1. Initial gutter + outside valueLabels: left axis ticks render & right margin gets 44px headroom
            const initialLeftAxis = container.querySelector<SVGGElement>(
                '.cs-chart-layer-axes[data-position="left"]',
            );
            expect(initialLeftAxis).not.toBeNull();
            expect(
                initialLeftAxis?.querySelectorAll(".cs-chart-axis-tick-text"),
            ).toHaveLength(3);
            expect(container.querySelectorAll("text.cs-chart-bar-above-label")).toHaveLength(0);
            const gutterOutsideMargins = readPlotMargins(refs.svg);
            expect(gutterOutsideMargins.right).toBe(44);

            // 2. Switch gutter -> above: left axis hides, inline above labels/values appear, right margin clears (< 44)
            props.barLabelLayout = "above";
            flushSync();

            expect(
                container.querySelector('.cs-chart-layer-axes[data-position="left"]'),
            ).toBeNull();
            expect(
                container.querySelector('.cs-chart-layer-axes[data-position="bottom"]'),
            ).not.toBeNull();
            expect(container.querySelectorAll("text.cs-chart-bar-above-label")).toHaveLength(3);
            expect(container.querySelectorAll("text.cs-chart-bar-above-value")).toHaveLength(3);
            const aboveMargins = readPlotMargins(refs.svg);
            expect(aboveMargins.right).toBeLessThan(44);
            expect(aboveMargins.left).toBeLessThan(gutterOutsideMargins.left);

            // 3. Round-trip above -> gutter: left axis remounts with all 3 ticks & right margin restores to 44px
            props.barLabelLayout = "gutter";
            flushSync();

            const restoredLeftAxis = container.querySelector<SVGGElement>(
                '.cs-chart-layer-axes[data-position="left"]',
            );
            expect(restoredLeftAxis).not.toBeNull();
            expect(
                restoredLeftAxis?.querySelectorAll(".cs-chart-axis-tick-text"),
            ).toHaveLength(3);
            expect(container.querySelectorAll("text.cs-chart-bar-above-label")).toHaveLength(0);
            expect(container.querySelectorAll("text.cs-chart-bar-above-value")).toHaveLength(0);
            const restoredGutterMargins = readPlotMargins(refs.svg);
            expect(restoredGutterMargins.right).toBe(44);
            expect(restoredGutterMargins.left).toBe(gutterOutsideMargins.left);

            // 4. Horizontal valueLabels: "outside" -> "none" clears 44px right margin override
            props.barValueLabels = "none";
            flushSync();

            const gutterNoneMargins = readPlotMargins(refs.svg);
            expect(gutterNoneMargins.right).toBeLessThan(44);
            expect(gutterNoneMargins.plotWidth).toBeGreaterThan(restoredGutterMargins.plotWidth);

            // 5. Vertical valueLabels: "outside" -> "none" clears 24px top margin override
            props.orientation = "vertical";
            props.barValueLabels = "outside";
            flushSync();

            const verticalOutsideMargins = readPlotMargins(refs.svg);
            expect(verticalOutsideMargins.top).toBe(24);

            props.barValueLabels = "none";
            flushSync();

            const verticalNoneMargins = readPlotMargins(refs.svg);
            expect(verticalNoneMargins.top).toBeLessThan(24);
            expect(verticalNoneMargins.plotHeight).toBeGreaterThan(verticalOutsideMargins.plotHeight);
        });

        it("defaults stacked tooltip showTotal to true, recalculates stacked bars & Y domain on legend toggle, handles all-hidden ChartEmpty reset, and renders loading shape='bars'", () => {
            stubBarLayoutRect(560, 280);

            const bindings = $state<{
                hidden: readonly string[];
                active: number | null;
            }>({
                hidden: [],
                active: 0,
            });

            const props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: [
                    { category: "Q1", a: 120, b: 180 },
                    { category: "Q2", a: 150, b: 150 },
                    { category: "Q3", a: 100, b: 120 },
                ] as readonly BarRow[],
                x: "category",
                series: GROUPED_BAR_SERIES,
                barMode: "stacked" as ChartBarMode,
                tier2ShowTotal: undefined as boolean | undefined,
                loading: false,
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

            // Stacked mode defaults tooltip showTotal to true
            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip?.dataset.open).toBe("");
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).not.toBeNull();

            // Explicit showTotal={false} overrides stacked default
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

            const getSeriesBQ1Path = (): string =>
                container
                    .querySelector<SVGPathElement>(
                        'path.cs-chart-bar-rect[data-series-id="b"][data-index="0"]',
                    )
                    ?.getAttribute("d") ?? "";

            const initialMaxTick = Math.max(...getYTickValues());
            const initialBPath = getSeriesBQ1Path();
            // Combined max is 300 (120+180 and 150+150)
            expect(initialMaxTick).toBeGreaterThanOrEqual(300);

            // Toggle series "a" off via legend -> series "b" drops to baseline and Y domain shrinks (< 300)
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(2);
            legendButtons[0]?.click();
            flushSync();

            expect(bindings.hidden).toEqual(["a"]);
            expect(Math.max(...getYTickValues())).toBeLessThan(initialMaxTick);
            expect(getSeriesBQ1Path()).not.toBe(initialBPath);

            // Toggle series "b" off too -> all hidden renders ChartEmpty with working Show all reset
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

            expect(bindings.hidden).toEqual([]);
            expect(container.querySelector(".cs-chart-empty")).toBeNull();
            expect(Math.max(...getYTickValues())).toBe(initialMaxTick);
            expect(getSeriesBQ1Path()).toBe(initialBPath);

            // loading={true} renders ChartLoading shape="bars"
            props.loading = true;
            flushSync();
            const loadingEl = container.querySelector<HTMLDivElement>(".cs-chart-loading");
            expect(loadingEl).not.toBeNull();
            expect(loadingEl?.dataset.shape).toBe("bars");
            expect(container.querySelector(".cs-chart-canvas")).toBeNull();

            // Empty dataset renders ChartEmpty without reset button
            props.loading = false;
            props.data = [];
            flushSync();
            expect(container.querySelector(".cs-chart-empty")).not.toBeNull();
            expect(container.querySelector(":scope .cs-chart-empty button")).toBeNull();
        });

        it("renders custom children SVG layer, overlay slot, and custom tooltip snippet cleanly with legend/keyboard sync", () => {
            stubBarLayoutRect(560, 280);

            const bindings = $state<{
                active: number | null;
                hovered: string | null;
            }>({
                active: null,
                hovered: null,
            });

            renderHost({
                mode: "bar-chart",
                variant: "elevated",
                size: "md",
                data: GROUPED_BAR_DATA,
                x: "category",
                series: GROUPED_BAR_SERIES,
                tier2CustomLayerText: "Target Quota",
                showOverlay: true,
                tooltipCustomRenderer: (ctx: ChartTooltipContext<ChartDatum>) =>
                    `bar-tip:${ctx.xLabel}:${ctx.items.length}`,
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

            expect(
                container.querySelector(':scope [data-testid="custom-svg-layer"] text')?.textContent,
            ).toBe("Target Quota");
            expect(container.querySelector('[data-testid="tier2-overlay"]')).not.toBeNull();

            // Keyboard scrub activates Q1 -> custom tooltip snippet renders & bar gets data-active
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();

            expect(bindings.active).toBe(0);
            expect(
                container.querySelector('[data-testid="custom-tooltip"]')?.textContent?.trim(),
            ).toBe("bar-tip:Q1:2");
            expect(
                container.querySelector<SVGPathElement>(
                    'path.cs-chart-bar-rect[data-series-id="a"][data-index="0"]',
                )?.dataset.active,
            ).toBe("");

            // Legend hover syncs hoveredSeriesId and dims sibling bars
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            legendButtons[0]?.dispatchEvent(new PointerEvent("pointerenter"));
            flushSync();

            expect(bindings.hovered).toBe("a");
            expect(
                container.querySelectorAll(
                    'path.cs-chart-bar-rect[data-series-id="b"][data-dimmed=""]',
                ),
            ).toHaveLength(4);

            legendButtons[0]?.dispatchEvent(new PointerEvent("pointerleave"));
            flushSync();
            expect(bindings.hovered).toBeNull();
        });
    });
});

function stubM45CanvasRect(width = 560, height = 280): void {
    const rect = {
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
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
}

function getM45PlotOffset(svg: SVGSVGElement | null): { left: number; top: number } {
    const plot = svg?.querySelector<SVGGElement>("g.cs-chart-plot");
    const transform = plot?.getAttribute("transform") ?? "";
    const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(transform);
    return {
        left: match ? Number(match[1]) : 0,
        top: match ? Number(match[2]) : 0,
    };
}

function parseVerticalBarBounds(path: SVGPathElement | null): { x: number; x2: number } {
    const d = path?.getAttribute("d") ?? "";
    const startMatch = /^M(-?\d+(?:\.\d+)?),/.exec(d);
    const x = startMatch ? Number(startMatch[1]) : NaN;
    const arcRightMatch = /0 0 1 (-?\d+(?:\.\d+)?),-?\d+(?:\.\d+)?V/.exec(d);
    if (arcRightMatch) {
        return { x, x2: Number(arcRightMatch[1]) };
    }
    const flatRightMatch = /H(-?\d+(?:\.\d+)?)V/.exec(d);
    const x2 = flatRightMatch ? Number(flatRightMatch[1]) : NaN;
    return { x, x2 };
}

function findBarBySeriesAndIndex(
    bars: readonly SVGPathElement[],
    seriesId: string,
    index: number,
): SVGPathElement | null {
    return (
        bars.find((el) => el.dataset.seriesId === seriesId && el.dataset.index === String(index)) ??
        null
    );
}

describe("Charts M4.5 — Bar Both/Vertical Labels, Item Tooltip Mode & Calibrated Zero-Line", () => {
    interface M45Row extends ChartDatum {
        category: string;
        a: number;
        b: number;
        c?: number;
    }

    const TWO_SERIES_DATA: M45Row[] = [
        { category: "Q1", a: 120, b: 180 },
        { category: "Q2", a: 160, b: 140 },
        { category: "Q3", a: 200, b: 100 },
    ];

    const TWO_SERIES: ChartSeries<M45Row>[] = [
        { id: "a", label: "North" },
        { id: "b", label: "South" },
    ];

    const THREE_SERIES_DATA: M45Row[] = [
        { category: "Jan", a: 40, b: 140, c: 240 },
        { category: "Feb", a: 60, b: 150, c: 260 },
        { category: "Mar", a: 50, b: 160, c: 250 },
    ];

    const THREE_SERIES: ChartSeries<M45Row>[] = [
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
        { id: "c", label: "Gamma" },
    ];

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

    describe("Bar valueLabels='both', relaxed padding guard & 90° vertical inside labels", () => {
        it("renders BOTH inside segment labels and outside stack totals in stacked mode (and above-bar totals in horizontal above layout)", () => {
            const state = new ChartState<M45Row>({
                data: TWO_SERIES_DATA,
                x: "category",
                series: TWO_SERIES,
                orientation: "vertical",
                preferBandX: true,
                stacked: true,
                width: 560,
                height: 300,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBar: true,
                barMode: "stacked" as ChartBarMode,
                barValueLabels: "both" as ChartBarValueLabels,
                barLabelLayout: "gutter" as ChartBarLabelLayout,
                barMaxBarWidth: 52,
            });

            renderHost(props);

            const insideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            const outsideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-value-label"),
            ];

            // All 6 segments fit inside labels AND all 3 stack caps get outside stack totals
            expect(insideLabels).toHaveLength(6);
            expect(outsideLabels).toHaveLength(3);
            expect(outsideLabels.map((el) => el.textContent?.trim())).toEqual(["300", "300", "300"]);
            expect(insideLabels.map((el) => el.textContent?.trim())).toEqual(
                expect.arrayContaining(["120", "180", "160", "140", "200", "100"]),
            );

            // Horizontal stacked + labelLayout="above" + valueLabels="both":
            // keeps inside segment labels AND moves stack totals to flush-right above-bar values (zero .cs-chart-bar-value-label)
            state.orientation = "horizontal";
            props.barLabelLayout = "above";
            flushSync();

            expect(
                container.querySelectorAll("text.cs-chart-bar-inside-label").length,
            ).toBe(6);
            expect(
                container.querySelectorAll("text.cs-chart-bar-value-label"),
            ).toHaveLength(0);
            const aboveValues = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-above-value"),
            ];
            expect(aboveValues).toHaveLength(3);
            expect(aboveValues.map((el) => el.textContent?.trim())).toEqual(["300", "300", "300"]);
        });

        it("renders inside labels where they fit and falls back to outside labels ONLY where inside did not fit in grouped mode (zero duplicates)", () => {
            interface GroupedBothRow extends ChartDatum {
                category: string;
                a: number;
                b: number;
            }
            const mixedData: GroupedBothRow[] = [
                { category: "Q1", a: 500, b: 8 },
                { category: "Q2", a: 12, b: 420 },
            ];

            const state = new ChartState<GroupedBothRow>({
                data: mixedData,
                x: "category",
                series: [
                    { id: "a", label: "North" },
                    { id: "b", label: "South" },
                ],
                orientation: "horizontal",
                preferBandX: true,
                width: 560,
                height: 260,
            });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBar: true,
                barMode: "grouped",
                barValueLabels: "both",
                barMaxBarWidth: 28,
                barFormatLabel: (v: number) => `$${v}`,
            });

            const insideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            const outsideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-value-label"),
            ];

            // Large bars (a@0 = $500, b@1 = $420) get inside labels; tiny bars (b@0 = $8, a@1 = $12) fall back to outside labels
            const insideKeys = insideLabels.map((el) => `${el.dataset.seriesId}:${el.dataset.index}`);
            const outsideKeys = outsideLabels.map((el) => `${el.dataset.seriesId}:${el.dataset.index}`);

            expect(insideKeys).toEqual(["a:0", "b:1"]);
            expect(outsideKeys).toEqual(["a:1", "b:0"]);

            // Strictly disjoint sets: zero bars have both an inside and an outside label
            const overlap = insideKeys.filter((key) => outsideKeys.includes(key));
            expect(overlap).toHaveLength(0);
            expect(insideLabels.length + outsideLabels.length).toBe(4);
        });

        it("supports insideLabelOrientation ('auto', 'horizontal', 'vertical') with -90° rotation and relaxed 16px/6px padding guard", () => {
            interface NarrowRow extends ChartDatum {
                category: string;
                a: number;
            }
            const narrowData: NarrowRow[] = [
                { category: "C1", a: 12_400 },
                { category: "C2", a: 9800 },
            ];

            const state = new ChartState<NarrowRow>({
                data: narrowData,
                x: "category",
                series: [{ id: "a", label: "ARR" }],
                orientation: "vertical",
                preferBandX: true,
                width: 480,
                height: 300,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showBar: true,
                barValueLabels: "inside" as ChartBarValueLabels,
                barInsideLabelOrientation: "auto" as ChartBarInsideLabelOrientation,
                barMaxBarWidth: 22,
                barFormatLabel: (v: number) => `$${v.toLocaleString("en-US")}`,
            });

            renderHost(props);

            // 1. Narrow-but-tall vertical columns under "auto" rotate -90°
            const autoRotated = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            expect(autoRotated).toHaveLength(2);
            for (const label of autoRotated) {
                expect(label.dataset.orientation).toBe("vertical");
                expect(label.getAttribute("x")).toBe("0");
                expect(label.getAttribute("y")).toBe("0");
                expect(label.getAttribute("transform")).toMatch(/^translate\(\d+, \d+\) rotate\(-90\)$/);
            }

            // 2. "horizontal" suppresses narrow-but-tall labels instead of rotating
            props.barInsideLabelOrientation = "horizontal";
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);

            // 3. "vertical" forces -90° even on wide bars that would fit horizontally
            props.barMaxBarWidth = 80;
            props.barInsideLabelOrientation = "vertical";
            flushSync();
            const forcedVertical = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            expect(forcedVertical).toHaveLength(2);
            for (const label of forcedVertical) {
                expect(label.dataset.orientation).toBe("vertical");
                expect(label.getAttribute("transform")).toMatch(/rotate\(-90\)$/);
            }

            // 4. Wide bar under "auto" renders horizontally (no transform)
            props.barInsideLabelOrientation = "auto";
            flushSync();
            const autoHorizontal = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            expect(autoHorizontal).toHaveLength(2);
            for (const label of autoHorizontal) {
                expect(label.dataset.orientation).toBe("horizontal");
                expect(label.getAttribute("transform")).toBeNull();
            }

            // 5. Relaxed thickness threshold: 16px fits horizontally, 15px suppresses; vertical orientation suppressed on horizontal bars
            state.orientation = "horizontal";
            props.barMaxBarWidth = 16;
            props.barInsideLabelOrientation = "auto";
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(2);

            props.barMaxBarWidth = 15;
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);

            props.barMaxBarWidth = 28;
            props.barInsideLabelOrientation = "vertical";
            flushSync();
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);
        });

        it("adds top/right margin headroom for valueLabels='both' on Tier-2 BarChart, clears cleanly on 'both' -> 'none', and forwards insideLabelOrientation='vertical'", () => {
            stubM45CanvasRect(560, 280);

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            const props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: TWO_SERIES_DATA,
                x: "category",
                series: TWO_SERIES,
                orientation: "vertical" as ChartOrientation,
                barMode: "stacked" as ChartBarMode,
                barValueLabels: "none" as ChartBarValueLabels,
                barInsideLabelOrientation: "vertical" as ChartBarInsideLabelOrientation,
                barLabelLayout: "gutter" as ChartBarLabelLayout,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            // 1. Vertical baseline ("none") vs "both" top margin headroom + insideLabelOrientation="vertical" forwarding
            const baselineVertical = readPlotMargins(refs.svg);
            expect(baselineVertical.top).toBeLessThan(24);
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(0);

            props.barValueLabels = "both";
            flushSync();

            const bothVertical = readPlotMargins(refs.svg);
            expect(bothVertical.top).toBe(24);
            expect(bothVertical.plotHeight).toBeLessThan(baselineVertical.plotHeight);
            const outsideTotals = container.querySelectorAll("text.cs-chart-bar-value-label");
            const rotatedInside = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            expect(outsideTotals).toHaveLength(3);
            expect(rotatedInside.length).toBeGreaterThan(0);
            for (const label of rotatedInside) {
                expect(label.dataset.orientation).toBe("vertical");
                expect(label.getAttribute("transform")).toMatch(/rotate\(-90\)$/);
            }

            // Round-trip "both" -> "none" clears top margin headroom and removes all value labels
            props.barValueLabels = "none";
            flushSync();

            const restoredVertical = readPlotMargins(refs.svg);
            expect(restoredVertical.top).toBe(baselineVertical.top);
            expect(restoredVertical.plotHeight).toBe(baselineVertical.plotHeight);
            expect(container.querySelectorAll("text.cs-chart-bar-inside-label")).toHaveLength(0);
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(0);

            // 2. Horizontal gutter baseline ("none") vs "both" right margin headroom & round-trip
            props.orientation = "horizontal";
            flushSync();
            const baselineHorizontal = readPlotMargins(refs.svg);
            expect(baselineHorizontal.right).toBeLessThan(44);

            props.barValueLabels = "both";
            flushSync();
            const bothHorizontal = readPlotMargins(refs.svg);
            expect(bothHorizontal.right).toBe(44);
            expect(bothHorizontal.plotWidth).toBeLessThan(baselineHorizontal.plotWidth);
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(3);

            props.barValueLabels = "none";
            flushSync();
            const restoredHorizontal = readPlotMargins(refs.svg);
            expect(restoredHorizontal.right).toBe(baselineHorizontal.right);
            expect(restoredHorizontal.plotWidth).toBe(baselineHorizontal.plotWidth);
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(0);
        });
    });

    describe("Element-specific tooltipMode='item' (BarChart, LineChart, AreaChart & keyboard)", () => {
        it("highlights and dims sibling series on BarChart bar hover, renders 1-row tooltip, suppresses Total even with showTotal={true}, and toggles cleanly with tooltipMode='axis'", () => {
            stubM45CanvasRect(560, 280);

            const bindings = $state<{ active: number | null }>({ active: null });
            const props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: TWO_SERIES_DATA,
                x: "category",
                series: TWO_SERIES,
                barMode: "stacked" as ChartBarMode,
                tooltipMode: "item" as ChartTooltipMode,
                tier2ShowTotal: true,
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
            });

            renderHost(props);

            const barGroup = container.querySelector<SVGGElement>("g.cs-chart-bar");
            expect(barGroup?.dataset.tooltipMode).toBe("item");

            // Hover specific bar: series "b", index 1 (Q2, South = 140)
            const barB1 = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="b"][data-index="1"]',
            );
            expect(barB1).not.toBeNull();
            barB1?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
            flushSync();

            expect(bindings.active).toBe(1);
            // Sibling series "a" dimmed; active series "b" not dimmed
            expect(
                container.querySelectorAll(
                    'path.cs-chart-bar-rect[data-series-id="a"][data-dimmed=""]',
                ),
            ).toHaveLength(3);
            expect(
                container.querySelectorAll(
                    'path.cs-chart-bar-rect[data-series-id="b"][data-dimmed=""]',
                ),
            ).toHaveLength(0);

            // Tooltip renders 1 row for ONLY "South" and suppresses Total despite showTotal={true} & mode="stacked"
            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip?.dataset.open).toBe("");
            const labels = [
                ...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? []),
            ].map((el) => el.textContent?.trim());
            expect(labels).toEqual(["South"]);
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).toBeNull();

            // Cross-sequence: hover bar (a, 0) -> swaps dimming & 1-row tooltip to "North"
            const barA0 = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="a"][data-index="0"]',
            );
            barA0?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 120, clientY: 160 }));
            flushSync();

            expect(bindings.active).toBe(0);
            expect(
                container.querySelectorAll(
                    'path.cs-chart-bar-rect[data-series-id="b"][data-dimmed=""]',
                ),
            ).toHaveLength(3);
            expect(
                container.querySelectorAll(
                    'path.cs-chart-bar-rect[data-series-id="a"][data-dimmed=""]',
                ),
            ).toHaveLength(0);
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["North"]);
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).toBeNull();

            // Switch tooltipMode "item" -> "axis": restores multi-series rows, Total row, and removes item dimming
            props.tooltipMode = "axis";
            flushSync();

            expect(barGroup?.dataset.tooltipMode).toBe("axis");
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-dimmed=""]'),
            ).toHaveLength(0);
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["North", "South"]);
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).not.toBeNull();

            // Switch back to "item" and leave canvas -> clears activeIndex, activeSeriesId, dimming & closes tooltip
            props.tooltipMode = "item";
            flushSync();
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
            flushSync();

            expect(bindings.active).toBeNull();
            expect(tooltip?.dataset.open).toBeUndefined();
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-dimmed=""]'),
            ).toHaveLength(0);
        });

        it("resolves vertically nearest visible series on LineChart and stacked band on AreaChart in tooltipMode='item', rendering only 1 crosshair dot and dimming siblings", () => {
            stubM45CanvasRect(560, 280);

            // 1. LineChart with two well-separated series (low=40, high=240)
            const refs: { svg: SVGSVGElement | null } = { svg: null };
            const lineHost = renderHost({
                mode: "line-chart",
                variant: "elevated",
                size: "md",
                data: THREE_SERIES_DATA,
                x: "category",
                series: [
                    { id: "a", label: "Alpha" },
                    { id: "c", label: "Gamma" },
                ],
                tooltipMode: "item",
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            const lineCanvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const lineOffset = getM45PlotOffset(refs.svg);

            // Pointer near top of plot (close to Gamma = 240..260)
            lineCanvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: lineOffset.left + 20,
                    clientY: lineOffset.top + 20,
                }),
            );
            flushSync();

            let dots = [
                ...container.querySelectorAll<SVGGElement>("g.cs-chart-point-group"),
            ];
            expect(dots).toHaveLength(1);
            expect(dots[0]?.dataset.seriesId).toBe("c");
            expect(
                container.querySelector<SVGGElement>('g.cs-chart-line-series[data-series-id="a"]')
                    ?.dataset.dimmed,
            ).toBe("");
            expect(
                container.querySelector<SVGGElement>('g.cs-chart-line-series[data-series-id="c"]')
                    ?.dataset.dimmed,
            ).toBeUndefined();
            expect(
                [...container.querySelectorAll(".cs-chart-tooltip-label")].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Gamma"]);

            // Move pointer near bottom of plot (close to Alpha = 40..60) -> switches single dot & dimming to Alpha
            lineCanvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: lineOffset.left + 20,
                    clientY: lineOffset.top + 185,
                }),
            );
            flushSync();

            dots = [...container.querySelectorAll<SVGGElement>("g.cs-chart-point-group")];
            expect(dots).toHaveLength(1);
            expect(dots[0]?.dataset.seriesId).toBe("a");
            expect(
                container.querySelector<SVGGElement>('g.cs-chart-line-series[data-series-id="c"]')
                    ?.dataset.dimmed,
            ).toBe("");
            expect(
                container.querySelector<SVGGElement>('g.cs-chart-line-series[data-series-id="a"]')
                    ?.dataset.dimmed,
            ).toBeUndefined();
            expect(
                [...container.querySelectorAll(".cs-chart-tooltip-label")].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Alpha"]);

            unmount(lineHost);
            mounted.pop();

            // 2. Stacked AreaChart: lower band (a = 0..120) vs upper band (b = 120..300)
            refs.svg = null;
            renderHost({
                mode: "area-chart",
                variant: "elevated",
                size: "md",
                data: TWO_SERIES_DATA,
                x: "category",
                series: TWO_SERIES,
                areaMode: "stacked",
                tooltipMode: "item",
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            const areaCanvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const areaOffset = getM45PlotOffset(refs.svg);

            // Pointer in upper stacked band (near top of 0..300 stack -> series "b")
            areaCanvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: areaOffset.left + 20,
                    clientY: areaOffset.top + 30,
                }),
            );
            flushSync();

            let areaDots = [
                ...container.querySelectorAll<SVGGElement>("g.cs-chart-point-group"),
            ];
            expect(areaDots).toHaveLength(1);
            expect(areaDots[0]?.dataset.seriesId).toBe("b");
            expect(
                container.querySelector<SVGGElement>('g.cs-chart-area-series[data-series-id="a"]')
                    ?.dataset.dimmed,
            ).toBe("");
            expect(
                container.querySelector<SVGGElement>('g.cs-chart-area-series[data-series-id="b"]')
                    ?.dataset.dimmed,
            ).toBeUndefined();
            expect(
                [...container.querySelectorAll(".cs-chart-tooltip-label")].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["South"]);
            expect(container.querySelector(".cs-chart-tooltip-total")).toBeNull();

            // Pointer in lower stacked band (near bottom of 0..300 stack -> series "a")
            areaCanvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: areaOffset.left + 20,
                    clientY: areaOffset.top + 180,
                }),
            );
            flushSync();

            areaDots = [...container.querySelectorAll<SVGGElement>("g.cs-chart-point-group")];
            expect(areaDots).toHaveLength(1);
            expect(areaDots[0]?.dataset.seriesId).toBe("a");
            expect(
                container.querySelector<SVGGElement>('g.cs-chart-area-series[data-series-id="b"]')
                    ?.dataset.dimmed,
            ).toBe("");
            expect(
                [...container.querySelectorAll(".cs-chart-tooltip-label")].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["North"]);
        });

        it("supports keyboard scrubbing in tooltipMode='item': auto-selects first visible series, cycles via ArrowDown/ArrowUp (skipping hidden), and clears both on Escape", () => {
            stubM45CanvasRect(560, 280);

            const bindings = $state<{
                active: number | null;
                hidden: readonly string[];
            }>({
                active: null,
                hidden: [],
            });

            const lineHost = renderHost({
                mode: "line-chart",
                variant: "elevated",
                size: "md",
                data: THREE_SERIES_DATA,
                x: "category",
                series: THREE_SERIES,
                tooltipMode: "item",
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
            });

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const sendKey = (key: string): void => {
                canvas?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
                flushSync();
            };
            const activeDotId = (): string | undefined =>
                container.querySelector<SVGGElement>("g.cs-chart-point-group")?.dataset.seriesId;
            const tooltipLabels = (): string[] =>
                [...container.querySelectorAll(".cs-chart-tooltip-label")].map(
                    (el) => el.textContent?.trim() ?? "",
                );

            // 1. Entering index via ArrowRight auto-selects first visible series ("a")
            sendKey("ArrowRight");
            expect(bindings.active).toBe(0);
            expect(activeDotId()).toBe("a");
            expect(tooltipLabels()).toEqual(["Alpha"]);

            // 2. ArrowDown cycles forward across visible series: a -> b -> c -> a (wraps) without moving index
            sendKey("ArrowDown");
            expect(bindings.active).toBe(0);
            expect(activeDotId()).toBe("b");
            expect(tooltipLabels()).toEqual(["Beta"]);

            sendKey("ArrowDown");
            expect(activeDotId()).toBe("c");
            expect(tooltipLabels()).toEqual(["Gamma"]);

            sendKey("ArrowDown");
            expect(activeDotId()).toBe("a");

            // 3. ArrowUp cycles backward: a -> c -> b
            sendKey("ArrowUp");
            expect(activeDotId()).toBe("c");
            sendKey("ArrowUp");
            expect(activeDotId()).toBe("b");

            // 4. ArrowRight steps activeIndex 0 -> 1 while preserving activeSeriesId ("b")
            sendKey("ArrowRight");
            expect(bindings.active).toBe(1);
            expect(activeDotId()).toBe("b");

            // 5. Hiding active series "b" via legend clears activeSeriesId; next ArrowDown cycles only visible ["a", "c"]
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            legendButtons[1]?.click();
            flushSync();
            expect(bindings.hidden).toEqual(["b"]);

            sendKey("ArrowDown");
            expect(activeDotId()).toBe("a");
            sendKey("ArrowDown");
            expect(activeDotId()).toBe("c");
            sendKey("ArrowDown");
            expect(activeDotId()).toBe("a");

            // 6. Escape clears BOTH activeIndex and activeSeriesId (closes tooltip, removes dots & dimming)
            sendKey("Escape");
            expect(bindings.active).toBeNull();
            expect(container.querySelectorAll("g.cs-chart-point-group")).toHaveLength(0);
            expect(
                container.querySelectorAll('g.cs-chart-line-series[data-dimmed=""]'),
            ).toHaveLength(0);
            expect(
                container.querySelector<HTMLDivElement>(".cs-chart-tooltip")?.dataset.open,
            ).toBeUndefined();

            unmount(lineHost);
            mounted.pop();

            // 7. Horizontal BarChart in tooltipMode="item": ArrowDown steps index, ArrowRight/ArrowLeft cycle series, Escape clears both
            bindings.active = null;
            bindings.hidden = [];
            renderHost({
                mode: "bar-chart",
                variant: "elevated",
                size: "md",
                data: TWO_SERIES_DATA,
                x: "category",
                series: TWO_SERIES,
                orientation: "horizontal",
                tooltipMode: "item",
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
            });

            const hCanvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const sendHKey = (key: string): void => {
                hCanvas?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
                flushSync();
            };

            sendHKey("ArrowDown");
            expect(bindings.active).toBe(0);
            expect(tooltipLabels()).toEqual(["North"]);

            sendHKey("ArrowRight");
            expect(bindings.active).toBe(0);
            expect(tooltipLabels()).toEqual(["South"]);

            sendHKey("ArrowLeft");
            expect(tooltipLabels()).toEqual(["North"]);

            sendHKey("ArrowDown");
            expect(bindings.active).toBe(1);
            expect(tooltipLabels()).toEqual(["North"]);

            sendHKey("Escape");
            expect(bindings.active).toBeNull();
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-dimmed=""]'),
            ).toHaveLength(0);
        });

        it("resolves negative stacked bars in tooltipMode='item' on hover & scrub, renders 1-row tooltip, and anchors on the negative side of zero-baseline", () => {
            interface DivergingRow extends ChartDatum {
                category: string;
                inflow: number;
                outflow: number;
                refunds: number;
            }
            const divergingData: DivergingRow[] = [
                { category: "Q1", inflow: 160, outflow: -90, refunds: -50 },
                { category: "Q2", inflow: 140, outflow: -110, refunds: -60 },
            ];
            const divergingSeries: ChartSeries<DivergingRow>[] = [
                { id: "inflow", label: "Inflow" },
                { id: "outflow", label: "Outflow" },
                { id: "refunds", label: "Refunds" },
            ];

            const state = new ChartState<DivergingRow>({
                data: divergingData,
                x: "category",
                series: divergingSeries,
                orientation: "vertical",
                preferBandX: true,
                stacked: true,
                tooltipMode: "item",
                width: 560,
                height: 300,
            });
            state.setSvgRect({ left: 0, top: 0, width: 560, height: 300 });

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBar: true,
                showTooltip: true,
                tooltipShowTotal: true,
                barMode: "stacked",
                tooltipMode: "item",
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            if (refs.svg) {
                mockElementRect(refs.svg, { left: 0, top: 0, width: 560, height: 300 });
            }

            const zeroY = state.yScale.scale(0);
            expect(state.yScale.crossesZero).toBe(true);

            // 1. Hover negative stacked bar ("refunds" at Q2 = -60, stacked from -110 to -170)
            const negBar = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="refunds"][data-index="1"]',
            );
            expect(negBar).not.toBeNull();
            expect(negBar?.dataset.negative).toBe("");

            negBar?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
            flushSync();

            expect(state.activeIndex).toBe(1);
            expect(state.activeSeriesId).toBe("refunds");
            expect(state.activeAnchor).not.toBeNull();
            // Negative stack midpoint (-140) maps strictly below zeroY in vertical SVG coordinates
            expect(state.activeAnchor?.plotY).toBeGreaterThan(zeroY);
            expect(state.activeAnchor?.plotY).toBeCloseTo(state.yScale.scale(-140), 3);

            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip?.dataset.open).toBe("");
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Refunds"]);
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).toBeNull();

            // 2. Canvas pointer scrub on negative band resolves "outflow" (Q1: 0..-90, midpoint -45)
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const q1CenterX = state.margins.left + state.xScale.center("Q1");
            const outflowMidY = state.margins.top + state.yScale.scale(-45);
            canvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: q1CenterX,
                    clientY: outflowMidY,
                }),
            );
            flushSync();

            expect(state.activeIndex).toBe(0);
            expect(state.activeSeriesId).toBe("outflow");
            expect(state.activeAnchor?.plotY).toBeGreaterThan(zeroY);
            expect(state.activeAnchor?.plotY).toBeCloseTo(state.yScale.scale(-45), 3);
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Outflow"]);

            // 3. Horizontal diverging stacked bar anchors strictly left of zeroX (< zeroX)
            state.orientation = "horizontal";
            flushSync();
            const zeroX = state.yScale.scale(0);
            expect(state.activeAnchor?.plotX).toBeLessThan(zeroX);
            expect(state.activeAnchor?.plotX).toBeCloseTo(state.yScale.scale(-45), 3);
        });

        it("blocks bar hover activation, sibling dimming, and data-tooltip-mode when interactive={false} with tooltipMode='item'", () => {
            // 1. Tier-1 Chart + ChartCanvas(interactive={false}) + ChartBar
            const state = new ChartState<M45Row>({
                data: TWO_SERIES_DATA,
                x: "category",
                series: TWO_SERIES,
                preferBandX: true,
                tooltipMode: "item",
                width: 560,
                height: 280,
            });

            const tier1Host = renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                canvasInteractive: false,
                showBar: true,
                showTooltip: true,
                tooltipMode: "item",
            });

            const barGroup = container.querySelector<SVGGElement>("g.cs-chart-bar");
            expect(barGroup).not.toBeNull();
            expect(barGroup?.dataset.tooltipMode).toBeUndefined();

            const barB1 = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="b"][data-index="1"]',
            );
            expect(barB1).not.toBeNull();

            barB1?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
            barB1?.dispatchEvent(
                new PointerEvent("pointermove", { bubbles: true, clientX: 160, clientY: 140 }),
            );
            flushSync();

            expect(state.activeIndex).toBeNull();
            expect(state.activeSeriesId).toBeNull();
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-dimmed=""]'),
            ).toHaveLength(0);
            expect(
                container.querySelector<HTMLDivElement>(".cs-chart-tooltip")?.dataset.open,
            ).toBeUndefined();

            unmount(tier1Host);
            mounted.pop();

            // 2. Tier-2 BarChart(interactive={false}, tooltipMode="item")
            stubM45CanvasRect(560, 280);
            const bindings = $state<{ active: number | null }>({ active: null });
            renderHost({
                mode: "bar-chart",
                variant: "elevated",
                size: "md",
                data: TWO_SERIES_DATA,
                x: "category",
                series: TWO_SERIES,
                tier2Interactive: false,
                tooltipMode: "item",
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
            });

            const tier2BarGroup = container.querySelector<SVGGElement>("g.cs-chart-bar");
            expect(tier2BarGroup).not.toBeNull();
            expect(tier2BarGroup?.dataset.tooltipMode).toBeUndefined();
            expect(container.querySelector(".cs-chart-tooltip")).toBeNull();

            const tier2Bar = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="a"][data-index="0"]',
            );
            tier2Bar?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
            tier2Bar?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
            flushSync();

            expect(bindings.active).toBeNull();
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-dimmed=""]'),
            ).toHaveLength(0);
        });
    });

    describe("Calm, calibrated Zero-Line (zeroLine='solid' | 'dashed' | 'strong' | false)", () => {
        it("renders ChartGrid .cs-chart-grid-zero with data-style for solid/dashed/strong, omits when false, and forwards via Tier-2 grid option", () => {
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
                gridZeroLine: true as boolean | ChartZeroLineStyle,
            });

            const gridHost = renderHost(props);

            // true (default) -> data-style="solid"
            let zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine).not.toBeNull();
            expect(zeroLine?.dataset.style).toBe("solid");
            expect(isHalfPixel(zeroLine?.getAttribute("y1") ?? null)).toBe(true);

            // explicit "solid" -> data-style="solid"
            props.gridZeroLine = "solid";
            flushSync();
            zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine?.dataset.style).toBe("solid");

            // "dashed" -> data-style="dashed"
            props.gridZeroLine = "dashed";
            flushSync();
            zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine?.dataset.style).toBe("dashed");

            // "strong" -> data-style="strong"
            props.gridZeroLine = "strong";
            flushSync();
            zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine?.dataset.style).toBe("strong");

            // Horizontal orientation preserves data-style on vertical zero-line
            state.orientation = "horizontal";
            flushSync();
            zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine?.dataset.style).toBe("strong");
            expect(zeroLine?.getAttribute("x1")).toBe(zeroLine?.getAttribute("x2"));
            expect(isHalfPixel(zeroLine?.getAttribute("x1") ?? null)).toBe(true);

            // false -> omits .cs-chart-grid-zero completely
            props.gridZeroLine = false;
            flushSync();
            expect(container.querySelector("line.cs-chart-grid-zero")).toBeNull();

            // Round-trip false -> "dashed" remounts cleanly
            props.gridZeroLine = "dashed";
            flushSync();
            zeroLine = container.querySelector<SVGLineElement>("line.cs-chart-grid-zero");
            expect(zeroLine?.dataset.style).toBe("dashed");

            unmount(gridHost);
            mounted.pop();

            // Tier-2 BarChart forwards grid={{ zeroLine: "dashed" | "strong" | false }}
            stubM45CanvasRect(560, 280);
            const tier2Props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: SAMPLE_DATA,
                x: "month",
                series: VARIANCE_SERIES,
                tier2Grid: { zeroLine: "dashed" } as ChartGridOption,
            });
            renderHost(tier2Props);

            expect(
                container.querySelector<SVGLineElement>("line.cs-chart-grid-zero")?.dataset.style,
            ).toBe("dashed");

            tier2Props.tier2Grid = { zeroLine: "strong" };
            flushSync();
            expect(
                container.querySelector<SVGLineElement>("line.cs-chart-grid-zero")?.dataset.style,
            ).toBe("strong");

            tier2Props.tier2Grid = { zeroLine: false };
            flushSync();
            expect(container.querySelector("line.cs-chart-grid-zero")).toBeNull();
        });
    });

    describe("Grouped + Stacked Bars (stack?: string)", () => {
        interface BudgetQuarterRow extends ChartDatum {
            quarter: string;
            planCore: number;
            planBonus: number;
            actualCore: number;
            actualBonus: number;
        }

        const BUDGET_DATA: BudgetQuarterRow[] = [
            { quarter: "Q1", planCore: 80, planBonus: 60, actualCore: 100, actualBonus: 90 },
            { quarter: "Q2", planCore: 70, planBonus: 50, actualCore: 110, actualBonus: 80 },
            { quarter: "Q3", planCore: 90, planBonus: 70, actualCore: 120, actualBonus: 100 },
        ];

        const BUDGET_SERIES: ChartSeries<BudgetQuarterRow>[] = [
            { id: "planCore", label: "Plan Core", stack: "plan" },
            { id: "planBonus", label: "Plan Bonus", stack: "plan" },
            { id: "actualCore", label: "Actual Core", stack: "actual" },
            { id: "actualBonus", label: "Actual Bonus", stack: "actual" },
        ];

        it("renders side-by-side stacked columns with data-stack attributes and non-overlapping X positions per quarter", () => {
            stubM45CanvasRect(640, 320);

            renderHost({
                mode: "bar-chart",
                variant: "elevated",
                size: "md",
                data: BUDGET_DATA,
                x: "quarter",
                series: BUDGET_SERIES,
            });

            const planBars = [
                ...container.querySelectorAll<SVGPathElement>(
                    'path.cs-chart-bar-rect[data-stack="plan"]',
                ),
            ];
            const actualBars = [
                ...container.querySelectorAll<SVGPathElement>(
                    'path.cs-chart-bar-rect[data-stack="actual"]',
                ),
            ];

            expect(planBars).toHaveLength(6); // 2 series * 3 quarters
            expect(actualBars).toHaveLength(6);

            const allBars = [
                ...container.querySelectorAll<SVGPathElement>("path.cs-chart-bar-rect"),
            ];
            const findBar = (seriesId: string, index: number): SVGPathElement | null =>
                allBars.find(
                    (el) => el.dataset.seriesId === seriesId && el.dataset.index === String(index),
                ) ?? null;

            for (let index = 0; index < BUDGET_DATA.length; index++) {
                const planCore = parseVerticalBarBounds(findBar("planCore", index));
                const planBonus = parseVerticalBarBounds(findBar("planBonus", index));
                const actualCore = parseVerticalBarBounds(findBar("actualCore", index));
                const actualBonus = parseVerticalBarBounds(findBar("actualBonus", index));

                // Segments within each stack share exact horizontal bounds
                expect(planCore).toEqual(planBonus);
                expect(actualCore).toEqual(actualBonus);
                // "plan" column sits strictly left of "actual" column without overlapping
                expect(planCore.x2).toBeLessThan(actualCore.x);
            }
        });

        it("renders inside segment values AND separate per-stack outside totals above each stacked column when valueLabels='both'", () => {
            stubM45CanvasRect(640, 340);

            renderHost({
                mode: "bar-chart",
                variant: "elevated",
                size: "md",
                data: BUDGET_DATA,
                x: "quarter",
                series: BUDGET_SERIES,
                barValueLabels: "both" as ChartBarValueLabels,
            });

            const insideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-inside-label"),
            ];
            const outsideLabels = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-value-label"),
            ];

            // All 12 segments fit inside labels; 2 stacked columns * 3 quarters = 6 outside per-stack totals
            expect(insideLabels).toHaveLength(12);
            expect(outsideLabels).toHaveLength(6);

            // Q1: Plan total = 80 + 60 = 140, Actual total = 100 + 90 = 190
            // Q2: Plan total = 70 + 50 = 120, Actual total = 110 + 80 = 190
            // Q3: Plan total = 90 + 70 = 160, Actual total = 120 + 100 = 220
            const expectedPlanTotals = ["140", "120", "160"];
            const expectedActualTotals = ["190", "190", "220"];

            for (let index = 0; index < BUDGET_DATA.length; index++) {
                const planTotal = outsideLabels.find(
                    (el) => el.dataset.seriesId === "planBonus" && el.dataset.index === String(index),
                );
                const actualTotal = outsideLabels.find(
                    (el) =>
                        el.dataset.seriesId === "actualBonus" && el.dataset.index === String(index),
                );

                expect(planTotal?.textContent?.trim()).toBe(expectedPlanTotals[index]);
                expect(actualTotal?.textContent?.trim()).toBe(expectedActualTotals[index]);
                expect(Number(planTotal?.getAttribute("x"))).toBeLessThan(
                    Number(actualTotal?.getAttribute("x")),
                );
            }
        });

        it("recalculates the affected stack on legend toggle and removes the stack slot cleanly when all of its series are hidden", () => {
            stubM45CanvasRect(640, 340);

            const bindings = $state<{ hidden: readonly string[] }>({ hidden: [] });
            renderHost({
                mode: "bar-chart",
                variant: "elevated",
                size: "md",
                data: BUDGET_DATA,
                x: "quarter",
                series: BUDGET_SERIES,
                barValueLabels: "outside" as ChartBarValueLabels,
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
            });

            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(4);

            // 1. Hide "planBonus" (index 1): "plan" recalculates to planCore only (80, 70, 90); "actual" stays (190, 190, 220)
            legendButtons[1]?.click();
            flushSync();

            expect(bindings.hidden).toEqual(["planBonus"]);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-stack="plan"]'),
            ).toHaveLength(3);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-stack="actual"]'),
            ).toHaveLength(6);

            const planOutsideAfterOneHidden = [
                ...container.querySelectorAll<SVGTextElement>(
                    'text.cs-chart-bar-value-label[data-series-id="planCore"]',
                ),
            ].map((el) => el.textContent?.trim());
            const actualOutsideAfterOneHidden = [
                ...container.querySelectorAll<SVGTextElement>(
                    'text.cs-chart-bar-value-label[data-series-id="actualBonus"]',
                ),
            ].map((el) => el.textContent?.trim());

            expect(planOutsideAfterOneHidden).toEqual(["80", "70", "90"]);
            expect(actualOutsideAfterOneHidden).toEqual(["190", "190", "220"]);

            // 2. Hide "planCore" (index 0) too: entire "plan" stack slot is removed, leaving only "actual"
            legendButtons[0]?.click();
            flushSync();

            expect(bindings.hidden).toEqual(["planBonus", "planCore"]);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-stack="plan"]'),
            ).toHaveLength(0);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-stack="actual"]'),
            ).toHaveLength(6);
            expect(
                [...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-value-label")].map(
                    (el) => el.textContent?.trim(),
                ),
            ).toEqual(["190", "190", "220"]);

            // 3. Re-show both "plan" series via legend -> restores both side-by-side stacks
            legendButtons[0]?.click();
            legendButtons[1]?.click();
            flushSync();

            expect(bindings.hidden).toEqual([]);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-stack="plan"]'),
            ).toHaveLength(6);
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-stack="actual"]'),
            ).toHaveLength(6);
        });

        it("activates the exact segment in tooltipMode='item', dims all other series across stacks, and renders a 1-row tooltip", () => {
            stubM45CanvasRect(640, 320);

            const state = new ChartState<BudgetQuarterRow>({
                data: BUDGET_DATA,
                x: "quarter",
                series: BUDGET_SERIES,
                preferBandX: true,
                tooltipMode: "item",
                width: 640,
                height: 320,
            });
            state.setSvgRect({ left: 0, top: 0, width: 640, height: 320 });

            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBar: true,
                showTooltip: true,
                tooltipShowTotal: true,
                tooltipMorph: false,
                tooltipMode: "item",
            });

            // Hover "actualBonus" segment at Q2 (index 1)
            const actualBonusQ2 = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="actualBonus"][data-index="1"]',
            );
            expect(actualBonusQ2).not.toBeNull();
            expect(actualBonusQ2?.dataset.stack).toBe("actual");

            actualBonusQ2?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
            flushSync();

            expect(state.activeIndex).toBe(1);
            expect(state.activeSeriesId).toBe("actualBonus");

            // Only "actualBonus" is un-dimmed; sibling in "actual" ("actualCore") and both "plan" series are dimmed
            const allRects = [
                ...container.querySelectorAll<SVGPathElement>("path.cs-chart-bar-rect"),
            ];
            expect(
                allRects.filter(
                    (el) => el.dataset.seriesId === "actualBonus" && el.dataset.dimmed === "",
                ),
            ).toHaveLength(0);
            for (const otherId of ["planCore", "planBonus", "actualCore"]) {
                expect(
                    allRects.filter(
                        (el) => el.dataset.seriesId === otherId && el.dataset.dimmed === "",
                    ),
                ).toHaveLength(3);
            }

            // Tooltip renders 1 row for "Actual Bonus" with value "80" and suppresses Total
            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip?.dataset.open).toBe("");
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Actual Bonus"]);
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-value") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["80"]);
            expect(tooltip?.querySelector(".cs-chart-tooltip-total")).toBeNull();

            // Cross-sequence: hover "planCore" at Q1 (index 0) -> switches active series & dimming cleanly
            const planCoreQ1 = container.querySelector<SVGPathElement>(
                'path.cs-chart-bar-rect[data-series-id="planCore"][data-index="0"]',
            );
            planCoreQ1?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
            flushSync();

            expect(state.activeIndex).toBe(0);
            expect(state.activeSeriesId).toBe("planCore");
            expect(
                container.querySelectorAll(
                    'path.cs-chart-bar-rect[data-series-id="planCore"][data-dimmed=""]',
                ),
            ).toHaveLength(0);
            expect(
                container.querySelectorAll(
                    'path.cs-chart-bar-rect[data-series-id="actualBonus"][data-dimmed=""]',
                ),
            ).toHaveLength(3);
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Plan Core"]);

            // Leaving canvas clears activeIndex, activeSeriesId, dimming & closes tooltip
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
            flushSync();

            expect(state.activeIndex).toBeNull();
            expect(state.activeSeriesId).toBeNull();
            expect(
                container.querySelectorAll('path.cs-chart-bar-rect[data-dimmed=""]'),
            ).toHaveLength(0);
            expect(tooltip?.dataset.open).toBeUndefined();
        });

        it("transitions horizontal labelLayout='above' between per-stack outside labels (2 slots, right margin headroom) and header above-values (1 slot) on legend toggle", () => {
            stubM45CanvasRect(640, 340);

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            const bindings = $state<{ hidden: readonly string[] }>({ hidden: [] });

            renderHost({
                mode: "bar-chart",
                variant: "elevated",
                size: "md",
                data: BUDGET_DATA,
                x: "quarter",
                series: BUDGET_SERIES,
                orientation: "horizontal" as ChartOrientation,
                barLabelLayout: "above" as ChartBarLabelLayout,
                barValueLabels: "both" as ChartBarValueLabels,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
            });

            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(4);

            // 1. Two stack slots: useAboveHeaderValue is false -> zero .cs-chart-bar-above-value,
            // 6 per-stack .cs-chart-bar-value-label, and right margin headroom = 44
            const twoSlotMargins = readPlotMargins(refs.svg);
            expect(twoSlotMargins.right).toBe(44);
            expect(container.querySelectorAll("text.cs-chart-bar-above-value")).toHaveLength(0);
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(6);

            // 2. Hide both series in "plan" (2 -> 1 stacked slot): switches to .cs-chart-bar-above-value
            // and drops the 44px outside-label right headroom
            legendButtons[0]?.click();
            legendButtons[1]?.click();
            flushSync();

            expect(bindings.hidden).toEqual(["planCore", "planBonus"]);
            const oneSlotMargins = readPlotMargins(refs.svg);
            expect(oneSlotMargins.right).toBeLessThan(44);
            expect(oneSlotMargins.plotWidth).toBeGreaterThan(twoSlotMargins.plotWidth);
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(0);
            expect(
                [
                    ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-above-value"),
                ].map((el) => el.textContent?.trim()),
            ).toEqual(["190", "190", "220"]);

            // 3. Re-show both "plan" series (1 -> 2 slots): restores per-stack outside labels & right headroom
            legendButtons[0]?.click();
            legendButtons[1]?.click();
            flushSync();

            const restoredMargins = readPlotMargins(refs.svg);
            expect(restoredMargins.right).toBe(44);
            expect(container.querySelectorAll("text.cs-chart-bar-above-value")).toHaveLength(0);
            expect(container.querySelectorAll("text.cs-chart-bar-value-label")).toHaveLength(6);
        });

        it("renders mixed named-stack and unstacked series accurately across mode='grouped' and mode='stacked'", () => {
            stubM45CanvasRect(680, 340);

            const mixedSeries: ChartSeries<BudgetQuarterRow>[] = [
                { id: "planCore", label: "Plan Core", stack: "plan" },
                { id: "planBonus", label: "Plan Bonus", stack: "plan" },
                { id: "actualCore", label: "Actual Core" },
                { id: "actualBonus", label: "Actual Bonus" },
            ];

            const props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: BUDGET_DATA,
                x: "quarter",
                series: mixedSeries,
                barMode: "grouped" as ChartBarMode,
                barValueLabels: "both" as ChartBarValueLabels,
            });

            renderHost(props);

            const getBars = (): SVGPathElement[] => [
                ...container.querySelectorAll<SVGPathElement>("path.cs-chart-bar-rect"),
            ];

            // 1. mode="grouped": 3 distinct columns per quarter (plan stack, solo actualCore, solo actualBonus)
            const groupedBars = getBars();
            const gPlanCore = findBarBySeriesAndIndex(groupedBars, "planCore", 0);
            const gPlanBonus = findBarBySeriesAndIndex(groupedBars, "planBonus", 0);
            const gActualCore = findBarBySeriesAndIndex(groupedBars, "actualCore", 0);
            const gActualBonus = findBarBySeriesAndIndex(groupedBars, "actualBonus", 0);

            expect(gPlanCore?.dataset.stack).toBe("plan");
            expect(gPlanBonus?.dataset.stack).toBe("plan");
            expect(gActualCore?.dataset.stack).toBeUndefined();
            expect(gActualBonus?.dataset.stack).toBeUndefined();

            const gPlanBounds = parseVerticalBarBounds(gPlanCore);
            const gActualCoreBounds = parseVerticalBarBounds(gActualCore);
            const gActualBonusBounds = parseVerticalBarBounds(gActualBonus);

            expect(gPlanBounds).toEqual(parseVerticalBarBounds(gPlanBonus));
            expect(gPlanBounds.x2).toBeLessThan(gActualCoreBounds.x);
            expect(gActualCoreBounds.x2).toBeLessThan(gActualBonusBounds.x);

            // In valueLabels="both", only the multi-series "plan" stack emits outside totals;
            // single-series unstacked bars fit inside and emit zero duplicate outside labels.
            const groupedOutside = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-value-label"),
            ];
            expect(groupedOutside).toHaveLength(3);
            expect(groupedOutside.every((el) => el.dataset.seriesId === "planBonus")).toBe(true);
            expect(groupedOutside.map((el) => el.textContent?.trim())).toEqual(["140", "120", "160"]);

            // 2. mode="stacked": unstacked series collapse into 1 shared default stack column while "plan" stays separate
            props.barMode = "stacked";
            flushSync();

            const stackedBars = getBars();
            const sPlanCore = findBarBySeriesAndIndex(stackedBars, "planCore", 0);
            const sPlanBonus = findBarBySeriesAndIndex(stackedBars, "planBonus", 0);
            const sActualCore = findBarBySeriesAndIndex(stackedBars, "actualCore", 0);
            const sActualBonus = findBarBySeriesAndIndex(stackedBars, "actualBonus", 0);

            expect(sPlanCore?.dataset.stack).toBe("plan");
            expect(sActualCore?.dataset.stack).toBeUndefined();
            expect(sActualBonus?.dataset.stack).toBeUndefined();

            const sPlanBounds = parseVerticalBarBounds(sPlanCore);
            const sActualCoreBounds = parseVerticalBarBounds(sActualCore);
            const sActualBonusBounds = parseVerticalBarBounds(sActualBonus);

            expect(sPlanBounds).toEqual(parseVerticalBarBounds(sPlanBonus));
            expect(sActualCoreBounds).toEqual(sActualBonusBounds);
            expect(sPlanBounds.x2).toBeLessThan(sActualCoreBounds.x);

            // Both "plan" and the default unstacked slot now have 2 stacked series -> 6 outside per-stack totals
            const stackedOutside = [
                ...container.querySelectorAll<SVGTextElement>("text.cs-chart-bar-value-label"),
            ];
            expect(stackedOutside).toHaveLength(6);
            expect(
                stackedOutside
                    .filter((el) => el.dataset.seriesId === "actualBonus")
                    .map((el) => el.textContent?.trim()),
            ).toEqual(["190", "190", "220"]);
        });

        it("resolves canvas-level pointermove scrubbing across diverging named stacks in tooltipMode='item'", () => {
            interface DivergingStackRow extends ChartDatum {
                quarter: string;
                planCore: number;
                planBonus: number;
                actualCore: number;
                actualRefunds: number;
            }

            const divergingData: DivergingStackRow[] = [
                {
                    quarter: "Q1",
                    planCore: 60,
                    planBonus: 120,
                    actualCore: -50,
                    actualRefunds: -90,
                },
                {
                    quarter: "Q2",
                    planCore: 80,
                    planBonus: 100,
                    actualCore: -40,
                    actualRefunds: -80,
                },
            ];

            const divergingSeries: ChartSeries<DivergingStackRow>[] = [
                { id: "planCore", label: "Plan Core", stack: "plan" },
                { id: "planBonus", label: "Plan Bonus", stack: "plan" },
                { id: "actualCore", label: "Actual Core", stack: "actual" },
                { id: "actualRefunds", label: "Actual Refunds", stack: "actual" },
            ];

            const state = new ChartState<DivergingStackRow>({
                data: divergingData,
                x: "quarter",
                series: divergingSeries,
                orientation: "vertical",
                preferBandX: true,
                tooltipMode: "item",
                width: 600,
                height: 320,
            });
            state.setSvgRect({ left: 0, top: 0, width: 600, height: 320 });

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            renderHost({
                variant: "elevated",
                size: "md",
                state,
                showCanvas: true,
                showBar: true,
                showTooltip: true,
                tooltipMorph: false,
                tooltipMode: "item",
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            if (refs.svg) {
                mockElementRect(refs.svg, { left: 0, top: 0, width: 600, height: 320 });
            }

            expect(state.hasNamedStacks).toBe(true);
            expect(state.yScale.crossesZero).toBe(true);
            const zeroY = state.yScale.scale(0);

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const q1ClientX = state.margins.left + state.xScale.center("Q1");

            // 1. Canvas-level scrub into negative "actualRefunds" band (-50..-140, midpoint -95)
            const refundsMidY = state.margins.top + state.yScale.scale(-95);
            canvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: q1ClientX,
                    clientY: refundsMidY,
                }),
            );
            flushSync();

            expect(state.activeIndex).toBe(0);
            expect(state.activeSeriesId).toBe("actualRefunds");
            expect(state.activeAnchor?.plotY).toBeGreaterThan(zeroY);
            expect(state.activeAnchor?.plotY).toBeCloseTo(state.yScale.scale(-95), 3);
            expect(
                [...container.querySelectorAll(".cs-chart-tooltip-label")].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Actual Refunds"]);

            // 2. Canvas-level scrub into positive "planBonus" band (60..180, midpoint 120)
            const planBonusMidY = state.margins.top + state.yScale.scale(120);
            canvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: q1ClientX,
                    clientY: planBonusMidY,
                }),
            );
            flushSync();

            expect(state.activeIndex).toBe(0);
            expect(state.activeSeriesId).toBe("planBonus");
            expect(state.activeAnchor?.plotY).toBeLessThan(zeroY);
            expect(state.activeAnchor?.plotY).toBeCloseTo(state.yScale.scale(120), 3);
            expect(
                [...container.querySelectorAll(".cs-chart-tooltip-label")].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Plan Bonus"]);
        });
    });
});

function stubM5CanvasRect(width: number, height: number): void {
    const rect = {
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
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
}

function readM5PlotLayout(svg: SVGSVGElement | null): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    plotWidth: number;
    plotHeight: number;
} {
    const plot = svg?.querySelector<SVGGElement>("g.cs-chart-plot");
    const transform = plot?.getAttribute("transform") ?? "";
    const match = /translate\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/.exec(transform);
    const left = match ? Number(match[1]) : 0;
    const top = match ? Number(match[2]) : 0;
    const clipRect = svg?.querySelector<SVGRectElement>(":scope > defs > clipPath > rect");
    const plotWidth = Number(clipRect?.getAttribute("width") ?? 0);
    const plotHeight = Number(clipRect?.getAttribute("height") ?? 0);
    const svgWidth = Number(svg?.getAttribute("width") ?? 0);
    const svgHeight = Number(svg?.getAttribute("height") ?? 0);
    return {
        left,
        top,
        right: svgWidth - left - plotWidth,
        bottom: svgHeight - top - plotHeight,
        plotWidth,
        plotHeight,
    };
}

function assertSvgPrecedes(earlier: Element | null, later: Element | null): void {
    expect(earlier).not.toBeNull();
    expect(later).not.toBeNull();
    if (!earlier || !later) return;
    const relation = earlier.compareDocumentPosition(later);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
}

function formatExecCurrency(v: unknown): string {
    return `$${Math.round(Number(v) / 1000)}k`;
}

function formatExecPercent(v: unknown): string {
    return `${Math.round(Number(v))}%`;
}

describe("Charts M5 — Reference Lines, Reference Bands, Annotations, tooltipMode='none' & ComposedChart", () => {
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

    describe("tooltipMode='none'", () => {
        it("suppresses opening ChartTooltip in Tier-1 while keeping hover, keyboard scrubbing, crosshair, and legend interaction active", () => {
            stubM5CanvasRect(560, 280);

            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                tooltipMode: "none",
                width: 560,
                height: 280,
            });
            state.setSvgRect({ left: 0, top: 0, width: 560, height: 280 });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                tooltipMode: "none" as ChartTooltipMode,
                showCanvas: true,
                showLine: true,
                showCrosshair: true,
                showLegend: true,
                showTooltip: true,
                tooltipMorph: false,
            });

            renderHost(props);

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip).not.toBeNull();
            expect(tooltip?.dataset.open).toBeUndefined();
            expect(tooltip?.getAttribute("aria-hidden")).toBe("true");

            // Pointer scrub activates index & crosshair, but keeps tooltip closed and unpopulated
            canvas?.dispatchEvent(
                new PointerEvent("pointermove", {
                    bubbles: true,
                    clientX: state.margins.left + state.xScale.center("Feb"),
                    clientY: state.margins.top + 80,
                }),
            );
            flushSync();

            expect(state.activeIndex).toBe(1);
            expect(container.querySelector("line.cs-chart-crosshair")).not.toBeNull();
            expect(container.querySelectorAll(".cs-chart-point-group").length).toBeGreaterThan(0);
            expect(tooltip?.dataset.open).toBeUndefined();
            expect(tooltip?.getAttribute("aria-hidden")).toBe("true");
            expect(tooltip?.querySelector(".cs-chart-tooltip-header")).toBeNull();
            expect(tooltip?.querySelector(".cs-chart-tooltip-list")).toBeNull();

            // Keyboard scrub updates activeIndex without opening tooltip
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();
            expect(state.activeIndex).toBe(2);
            expect(tooltip?.dataset.open).toBeUndefined();

            // Legend interaction (hover isolation & toggle) remains fully functional
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(2);
            legendButtons[0]?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
            flushSync();
            expect(state.hoveredSeriesId).toBe("revenue");

            legendButtons[1]?.click();
            flushSync();
            expect(state.hiddenSeriesIds).toEqual(["margin"]);
            expect(legendButtons[1]?.getAttribute("aria-pressed")).toBe("false");

            // Cross-sequence: switching tooltipMode "none" -> "axis" -> "none" opens then closes tooltip while keeping activeIndex
            props.tooltipMode = "axis";
            flushSync();
            expect(tooltip?.dataset.open).toBe("");
            expect(tooltip?.getAttribute("aria-hidden")).toBeNull();
            expect(tooltip?.querySelector(".cs-chart-tooltip-header")?.textContent?.trim()).toBe("Mar");

            props.tooltipMode = "none";
            flushSync();
            expect(state.activeIndex).toBe(2);
            expect(container.querySelector("line.cs-chart-crosshair")).not.toBeNull();
            expect(tooltip?.dataset.open).toBeUndefined();
            expect(tooltip?.getAttribute("aria-hidden")).toBe("true");
        });

        it("suppresses ChartTooltip in Tier-2 BarChart when tooltipMode='none' while keeping scrubbing, hover band, onPointClick, and legend working", () => {
            stubM5CanvasRect(560, 280);

            const onPointClick = vi.fn();
            const bindings = $state<{
                active: number | null;
                hidden: readonly string[];
            }>({ active: null, hidden: [] });

            const props = $state({
                mode: "bar-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: SAMPLE_DATA,
                x: "month",
                series: [
                    { id: "revenue", label: "Revenue" },
                    { id: "variance", label: "Variance" },
                ] as ChartSeries<RevenueRow>[],
                tooltipMode: "none" as ChartTooltipMode,
                onPointClick,
                get activeIndex() {
                    return bindings.active;
                },
                set activeIndex(v: number | null) {
                    bindings.active = v;
                },
                get hiddenSeriesIds() {
                    return bindings.hidden;
                },
                set hiddenSeriesIds(v: readonly string[]) {
                    bindings.hidden = v;
                },
            });

            renderHost(props);

            expect(container.querySelector(".cs-chart-tooltip")).toBeNull();

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();

            expect(bindings.active).toBe(0);
            expect(container.querySelector(".cs-chart-hover-band")).not.toBeNull();
            expect(container.querySelector(".cs-chart-tooltip")).toBeNull();

            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            flushSync();
            expect(onPointClick).toHaveBeenCalledTimes(1);
            expect(onPointClick).toHaveBeenCalledWith(SAMPLE_DATA[0], 0);

            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            legendButtons[1]?.click();
            flushSync();
            expect(bindings.hidden).toEqual(["variance"]);

            // Cross-sequence: switching to "axis" mounts and opens tooltip immediately for active index
            props.tooltipMode = "axis";
            flushSync();
            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip).not.toBeNull();
            expect(tooltip?.dataset.open).toBe("");

            // Back to "none" unmounts tooltip without losing activeIndex
            props.tooltipMode = "none";
            flushSync();
            expect(bindings.active).toBe(0);
            expect(container.querySelector(".cs-chart-tooltip")).toBeNull();
        });
    });

    describe("ChartReferenceLine", () => {
        it("renders axis='y', axis='y2', and axis='x' lines snapped via snapHalf with crispEdges, dashed vs solid, ref, and {...rest}", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 560,
                height: 280,
            });

            const refs: { refLine: SVGGElement | null; svg: SVGSVGElement | null } = {
                refLine: null,
                svg: null,
            };

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showRefLine: true,
                refLineAxis: "y" as "x" | "y" | "y2",
                refLineValue: 180 as string | number,
                refLineLabel: "Target",
                refLineDashed: true,
                refLineAttrs: { "data-testid": "ref-line", class: "custom-ref-line" },
                get refLineRef() {
                    return refs.refLine;
                },
                set refLineRef(v: SVGGElement | null) {
                    refs.refLine = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            // 1. axis="y" (horizontal line, dashed by default)
            let group = container.querySelector<SVGGElement>('[data-testid="ref-line"]');
            let rule = group?.querySelector<SVGLineElement>("line.cs-chart-ref-line-rule");
            expect(group).not.toBeNull();
            expect(refs.refLine).toBe(group);
            expect(group?.classList.contains("cs-chart-ref-line")).toBe(true);
            expect(group?.classList.contains("custom-ref-line")).toBe(true);
            expect(group?.dataset.axis).toBe("y");

            const expectedY = Math.floor(state.yScale.scale(180)) + 0.5;
            expect(rule?.getAttribute("shape-rendering")).toBeNull();
            expect(rule?.getAttribute("stroke-dasharray")).toBe("4 3");
            expect(rule?.getAttribute("x1")).toBe("0");
            expect(Number(rule?.getAttribute("x2"))).toBe(state.plotWidth);
            expect(Number(rule?.getAttribute("y1"))).toBe(expectedY);
            expect(rule?.getAttribute("y1")).toBe(rule?.getAttribute("y2"));
            expect(isHalfPixel(rule?.getAttribute("y1") ?? null)).toBe(true);

            // Pure-SVG 0.5px-inset pill + text, zero foreignObject / filter
            const refLinePill = group?.querySelector<SVGRectElement>("rect.cs-chart-ref-line-pill");
            expect(refLinePill).not.toBeNull();
            expect(isHalfPixel(refLinePill?.getAttribute("x") ?? null)).toBe(true);
            expect(isHalfPixel(refLinePill?.getAttribute("y") ?? null)).toBe(true);
            expect(group?.querySelector("text.cs-chart-ref-line-label")?.textContent?.trim()).toBe(
                "Target",
            );
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            // 2. dashed={false} -> solid line
            props.refLineDashed = false;
            flushSync();
            expect(rule?.getAttribute("stroke-dasharray")).toBeNull();

            // 3. axis="y2" maps against independent y2Scale
            props.refLineAxis = "y2";
            props.refLineValue = 0.28;
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="ref-line"]');
            rule = group?.querySelector<SVGLineElement>("line.cs-chart-ref-line-rule");
            expect(group?.dataset.axis).toBe("y2");
            const y2Scale = state.y2Scale;
            expect(y2Scale).not.toBeNull();
            const expectedY2 = Math.floor((y2Scale?.scale(0.28) ?? 0)) + 0.5;
            expect(Number(rule?.getAttribute("y1"))).toBe(expectedY2);
            expect(isHalfPixel(rule?.getAttribute("y1") ?? null)).toBe(true);

            // 4. axis="x" renders vertical snapped line
            props.refLineAxis = "x";
            props.refLineValue = "Mar";
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="ref-line"]');
            rule = group?.querySelector<SVGLineElement>("line.cs-chart-ref-line-rule");
            expect(group?.dataset.axis).toBe("x");
            const expectedX = Math.floor(state.xScale.center("Mar")) + 0.5;
            expect(Number(rule?.getAttribute("x1"))).toBe(expectedX);
            expect(rule?.getAttribute("x1")).toBe(rule?.getAttribute("x2"));
            expect(isHalfPixel(rule?.getAttribute("x1") ?? null)).toBe(true);
            expect(rule?.getAttribute("y1")).toBe("0");
            expect(Number(rule?.getAttribute("y2"))).toBe(state.plotHeight);

            // 5. Horizontal orientation flips axis="y" to vertical and axis="x" to horizontal
            state.orientation = "horizontal";
            props.refLineAxis = "y";
            props.refLineValue = 180;
            flushSync();
            rule = container.querySelector<SVGLineElement>("line.cs-chart-ref-line-rule");
            expect(rule?.getAttribute("x1")).toBe(rule?.getAttribute("x2"));
            expect(isHalfPixel(rule?.getAttribute("x1") ?? null)).toBe(true);
            expect(rule?.getAttribute("y1")).toBe("0");
            expect(Number(rule?.getAttribute("y2"))).toBe(state.plotHeight);

            // 6. Hiding right-axis series makes axis="y2" omit rendering cleanly
            state.orientation = "vertical";
            state.toggleSeries("margin");
            props.refLineAxis = "y2";
            props.refLineValue = 0.28;
            flushSync();
            expect(state.y2Scale).toBeNull();
            expect(container.querySelector('[data-testid="ref-line"]')).toBeNull();

            // 7. Out-of-range value outside the plot domain omits rendering cleanly
            props.refLineAxis = "y";
            props.refLineValue = 9999;
            flushSync();
            expect(container.querySelector('[data-testid="ref-line"]')).toBeNull();

            props.refLineValue = -9999;
            flushSync();
            expect(container.querySelector('[data-testid="ref-line"]')).toBeNull();
        });

        it("supports semantic tones, custom color, and labelPosition='start' | 'center' | 'end' with edge clamping", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 560,
                height: 280,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showRefLine: true,
                refLineAxis: "y" as "x" | "y" | "y2",
                refLineValue: 180 as string | number,
                refLineLabel: "Goal 180",
                refLineLabelPosition: "start" as "start" | "center" | "end",
                refLineTone: "positive" as ChartTone | undefined,
                refLineColor: undefined as string | undefined,
            });

            renderHost(props);

            // Verify all semantic tones
            for (const tone of CHART_TONES) {
                props.refLineTone = tone;
                flushSync();
                const g = container.querySelector<SVGGElement>("g.cs-chart-ref-line");
                expect(g?.dataset.tone).toBe(tone);
                expect(g?.dataset.customColor).toBeUndefined();
            }

            // Custom color sets data-custom-color and --cs-chart-ref-color
            props.refLineColor = "oklch(0.6 0.2 260)";
            flushSync();
            const customG = container.querySelector<SVGGElement>("g.cs-chart-ref-line");
            expect(customG?.dataset.customColor).toBe("");
            expect(customG?.style.getPropertyValue("--cs-chart-ref-color")).toBe(
                "oklch(0.6 0.2 260)",
            );

            // labelPosition: start < center < end along X for horizontal line
            const readPillX = (): number =>
                Number(
                    container
                        .querySelector<SVGRectElement>("rect.cs-chart-ref-line-pill")
                        ?.getAttribute("x"),
                );

            props.refLineLabelPosition = "start";
            flushSync();
            const startX = readPillX();

            props.refLineLabelPosition = "center";
            flushSync();
            const centerX = readPillX();

            props.refLineLabelPosition = "end";
            flushSync();
            const endX = readPillX();

            expect(startX).toBeLessThan(centerX);
            expect(centerX).toBeLessThan(endX);

            // labelPosition on vertical line (axis="x"): end (top) < center < start (bottom)
            const readPillY = (): number =>
                Number(
                    container
                        .querySelector<SVGRectElement>("rect.cs-chart-ref-line-pill")
                        ?.getAttribute("y"),
                );

            props.refLineAxis = "x";
            props.refLineValue = "Feb";
            props.refLineLabelPosition = "end";
            flushSync();
            const vEndY = readPillY();

            props.refLineLabelPosition = "center";
            flushSync();
            const vCenterY = readPillY();

            props.refLineLabelPosition = "start";
            flushSync();
            const vStartY = readPillY();

            expect(vEndY).toBeLessThan(vCenterY);
            expect(vCenterY).toBeLessThan(vStartY);
        });
    });

    describe("ChartReferenceBand", () => {
        it("renders axis='y', axis='y2', and axis='x' bands with crisp unclamped corridor edges, tag pill + centered label, tones/color, ref, and {...rest}", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 560,
                height: 280,
            });

            const refs: { refBand: SVGGElement | null; svg: SVGSVGElement | null } = {
                refBand: null,
                svg: null,
            };

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showRefBand: true,
                refBandAxis: "y" as "x" | "y" | "y2",
                refBandFrom: 120 as string | number,
                refBandTo: 220 as string | number,
                refBandLabel: "Target Corridor" as string | undefined,
                refBandTone: "positive" as ChartTone | undefined,
                refBandColor: undefined as string | undefined,
                refBandAttrs: { "data-testid": "ref-band", class: "custom-ref-band" } as Record<
                    string,
                    unknown
                >,
                get refBandRef() {
                    return refs.refBand;
                },
                set refBandRef(v: SVGGElement | null) {
                    refs.refBand = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            // 1. axis="y" with inverted Y domain (yScale(120) > yScale(220)) -> height > 0, integer snapped,
            //    2 crisp unclamped corridor edge hairlines, and 0.5px-inset tag pill + centered label
            let group = container.querySelector<SVGGElement>('[data-testid="ref-band"]');
            let rect = group?.querySelector<SVGRectElement>("rect.cs-chart-ref-band-rect");
            let edges = [
                ...(group?.querySelectorAll<SVGLineElement>("line.cs-chart-ref-band-edge") ?? []),
            ];
            let tagRect = group?.querySelector<SVGRectElement>("rect.cs-chart-ref-band-tag");
            let labelEl = group?.querySelector<SVGTextElement>("text.cs-chart-ref-band-label");

            expect(group).not.toBeNull();
            expect(refs.refBand).toBe(group);
            expect(group?.classList.contains("cs-chart-ref-band")).toBe(true);
            expect(group?.classList.contains("custom-ref-band")).toBe(true);
            expect(group?.dataset.axis).toBe("y");
            expect(group?.dataset.part).toBe("all");
            expect(group?.dataset.tone).toBe("positive");

            const h1 = Number(rect?.getAttribute("height"));
            const y1 = Number(rect?.getAttribute("y"));
            expect(h1).toBeGreaterThan(0);
            expect(isIntegerAttr(rect?.getAttribute("x") ?? null)).toBe(true);
            expect(isIntegerAttr(rect?.getAttribute("y") ?? null)).toBe(true);
            expect(isIntegerAttr(rect?.getAttribute("width") ?? null)).toBe(true);
            expect(isIntegerAttr(rect?.getAttribute("height") ?? null)).toBe(true);

            expect(edges).toHaveLength(2);
            for (const edge of edges) {
                expect(edge.getAttribute("shape-rendering")).toBe("crispEdges");
                expect(edge.getAttribute("y1")).toBe(edge.getAttribute("y2"));
                expect(isHalfPixel(edge.getAttribute("y1"))).toBe(true);
            }

            expect(tagRect).not.toBeNull();
            expect(isHalfPixel(tagRect?.getAttribute("x") ?? null)).toBe(true);
            expect(isHalfPixel(tagRect?.getAttribute("y") ?? null)).toBe(true);
            expect(labelEl?.textContent?.trim()).toBe("Target Corridor");
            expect(labelEl?.getAttribute("text-anchor")).toBe("middle");
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            // Clamping one boundary past the plot edge omits only the clamped edge hairline
            props.refBandFrom = 120;
            props.refBandTo = 9999;
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="ref-band"]');
            edges = [
                ...(group?.querySelectorAll<SVGLineElement>("line.cs-chart-ref-band-edge") ?? []),
            ];
            expect(edges).toHaveLength(1);
            expect(edges[0]?.getAttribute("shape-rendering")).toBe("crispEdges");

            // Reversed from > to produces identical geometry
            props.refBandFrom = 220;
            props.refBandTo = 120;
            flushSync();
            rect = container.querySelector<SVGRectElement>("rect.cs-chart-ref-band-rect");
            expect(Number(rect?.getAttribute("y"))).toBe(y1);
            expect(Number(rect?.getAttribute("height"))).toBe(h1);

            // 2. axis="y2" maps against y2Scale
            props.refBandAxis = "y2";
            props.refBandFrom = 0.2;
            props.refBandTo = 0.3;
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="ref-band"]');
            rect = group?.querySelector<SVGRectElement>("rect.cs-chart-ref-band-rect");
            expect(group?.dataset.axis).toBe("y2");
            expect(Number(rect?.getAttribute("height"))).toBeGreaterThan(0);
            expect(isIntegerAttr(rect?.getAttribute("y") ?? null)).toBe(true);
            expect(isIntegerAttr(rect?.getAttribute("height") ?? null)).toBe(true);

            // 3. axis="x" renders vertical band across categories with vertical crisp edges + centered tag label
            props.refBandAxis = "x";
            props.refBandFrom = "Feb";
            props.refBandTo = "Mar";
            props.refBandColor = "oklch(0.65 0.18 150)";
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="ref-band"]');
            rect = group?.querySelector<SVGRectElement>("rect.cs-chart-ref-band-rect");
            edges = [
                ...(group?.querySelectorAll<SVGLineElement>("line.cs-chart-ref-band-edge") ?? []),
            ];
            tagRect = group?.querySelector<SVGRectElement>("rect.cs-chart-ref-band-tag");
            labelEl = group?.querySelector<SVGTextElement>("text.cs-chart-ref-band-label");
            expect(group?.dataset.axis).toBe("x");
            expect(group?.dataset.customColor).toBe("");
            expect(group?.style.getPropertyValue("--cs-chart-ref-color")).toBe(
                "oklch(0.65 0.18 150)",
            );
            expect(Number(rect?.getAttribute("width"))).toBeGreaterThan(0);
            expect(Number(rect?.getAttribute("height"))).toBe(Math.round(state.plotHeight));
            expect(edges).toHaveLength(2);
            for (const edge of edges) {
                expect(edge.getAttribute("shape-rendering")).toBe("crispEdges");
                expect(edge.getAttribute("x1")).toBe(edge.getAttribute("x2"));
                expect(isHalfPixel(edge.getAttribute("x1"))).toBe(true);
            }
            expect(tagRect).not.toBeNull();
            expect(labelEl?.getAttribute("text-anchor")).toBe("middle");

            // 4. Thin band (< 24px height) suppresses tag pill and label to prevent overflow
            props.refBandAxis = "y";
            props.refBandFrom = 100;
            props.refBandTo = 105;
            flushSync();
            expect(container.querySelector("rect.cs-chart-ref-band-rect")).not.toBeNull();
            expect(container.querySelector("rect.cs-chart-ref-band-tag")).toBeNull();
            expect(container.querySelector("text.cs-chart-ref-band-label")).toBeNull();

            // 5. Missing y2Scale omits band cleanly
            state.toggleSeries("margin");
            props.refBandAxis = "y2";
            props.refBandFrom = 0.2;
            props.refBandTo = 0.3;
            flushSync();
            expect(container.querySelector('[data-testid="ref-band"]')).toBeNull();
        });

        it("renders part='fill', part='label', and part='all' cleanly without cross-bleeding elements", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: SAMPLE_SERIES,
                width: 560,
                height: 280,
            });

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showRefBand: true,
                refBandAxis: "y" as const,
                refBandFrom: 120,
                refBandTo: 220,
                refBandLabel: "Corridor" as string | undefined,
                refBandAttrs: { "data-testid": "ref-band-part", part: "fill" } as Record<
                    string,
                    unknown
                >,
            });

            renderHost(props);

            // 1. part="fill" renders rect + crisp edges only (no tag pill or label)
            let group = container.querySelector<SVGGElement>('[data-testid="ref-band-part"]');
            expect(group?.dataset.part).toBe("fill");
            expect(group?.querySelector("rect.cs-chart-ref-band-rect")).not.toBeNull();
            expect(group?.querySelectorAll("line.cs-chart-ref-band-edge")).toHaveLength(2);
            expect(group?.querySelector("rect.cs-chart-ref-band-tag")).toBeNull();
            expect(group?.querySelector("text.cs-chart-ref-band-label")).toBeNull();

            // 2. part="label" renders tag pill + centered label only (no fill rect or edges)
            props.refBandAttrs = { "data-testid": "ref-band-part", part: "label" };
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="ref-band-part"]');
            expect(group?.dataset.part).toBe("label");
            expect(group?.querySelector("rect.cs-chart-ref-band-rect")).toBeNull();
            expect(group?.querySelectorAll("line.cs-chart-ref-band-edge")).toHaveLength(0);
            expect(group?.querySelector("rect.cs-chart-ref-band-tag")).not.toBeNull();
            expect(group?.querySelector("text.cs-chart-ref-band-label")?.textContent?.trim()).toBe(
                "Corridor",
            );

            // 3. part="label" with omitted label omits the <g> cleanly
            props.refBandLabel = undefined;
            flushSync();
            expect(container.querySelector('[data-testid="ref-band-part"]')).toBeNull();

            // 4. part="all" renders fill + edges + tag + label together
            props.refBandLabel = "Corridor";
            props.refBandAttrs = { "data-testid": "ref-band-part", part: "all" };
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="ref-band-part"]');
            expect(group?.dataset.part).toBe("all");
            expect(group?.querySelector("rect.cs-chart-ref-band-rect")).not.toBeNull();
            expect(group?.querySelectorAll("line.cs-chart-ref-band-edge")).toHaveLength(2);
            expect(group?.querySelector("rect.cs-chart-ref-band-tag")).not.toBeNull();
            expect(group?.querySelector("text.cs-chart-ref-band-label")?.textContent?.trim()).toBe(
                "Corridor",
            );
        });
    });

    describe("ChartAnnotation", () => {
        it("maps (x, y) on yAxis='left' and yAxis='right', renders halo + anchor dot + badge dot + path leader (stem, Q elbow, straight fallback) + 0.5px-inset clamped pill, ref, and {...rest}", () => {
            const state = new ChartState<RevenueRow>({
                data: SAMPLE_DATA,
                x: "month",
                series: DUAL_AXIS_SERIES,
                width: 560,
                height: 280,
            });

            const refs: { annotation: SVGGElement | null; svg: SVGSVGElement | null } = {
                annotation: null,
                svg: null,
            };

            const props = $state({
                variant: "elevated" as const,
                size: "md" as const,
                state,
                showCanvas: true,
                showAnnotation: true,
                annotationX: "Feb" as string | number,
                annotationY: 140,
                annotationYAxis: "left" as "left" | "right",
                annotationDx: 0,
                annotationDy: -36,
                annotationLabel: "Mid Peak",
                annotationTone: "accent" as ChartTone | undefined,
                annotationColor: undefined as string | undefined,
                annotationAttrs: { "data-testid": "peak-ann", class: "custom-ann" },
                get annotationRef() {
                    return refs.annotation;
                },
                set annotationRef(v: SVGGElement | null) {
                    refs.annotation = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            renderHost(props);

            // 1. yAxis="left": halo (r=8), anchor dot (r=4), badge dot (r=2.5), 0.5px-inset pill,
            //    and vertical-stem path leader starting at ANCHOR_RING_CLEARANCE = 6.5px
            let group = container.querySelector<SVGGElement>('[data-testid="peak-ann"]');
            const halo = group?.querySelector<SVGCircleElement>("circle.cs-chart-annotation-halo");
            let dot = group?.querySelector<SVGCircleElement>("circle.cs-chart-annotation-dot");
            const badgeDot = group?.querySelector<SVGCircleElement>(
                "circle.cs-chart-annotation-badge-dot",
            );
            let leader = group?.querySelector<SVGPathElement>("path.cs-chart-annotation-leader");
            let pill = group?.querySelector<SVGRectElement>("rect.cs-chart-annotation-pill");
            const text = group?.querySelector<SVGTextElement>("text.cs-chart-annotation-text");

            expect(group).not.toBeNull();
            expect(refs.annotation).toBe(group);
            expect(group?.classList.contains("cs-chart-annotation")).toBe(true);
            expect(group?.classList.contains("custom-ann")).toBe(true);
            expect(group?.dataset.tone).toBe("accent");
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            const expectedCx = state.xScale.center("Feb");
            const expectedCy = state.yScale.scale(140);
            expect(Number(halo?.getAttribute("cx"))).toBeCloseTo(expectedCx, 3);
            expect(Number(halo?.getAttribute("cy"))).toBeCloseTo(expectedCy, 3);
            expect(Number(halo?.getAttribute("r"))).toBe(8);
            expect(Number(dot?.getAttribute("cx"))).toBeCloseTo(expectedCx, 3);
            expect(Number(dot?.getAttribute("cy"))).toBeCloseTo(expectedCy, 3);
            expect(Number(dot?.getAttribute("r"))).toBe(4);
            expect(Number(badgeDot?.getAttribute("r"))).toBe(2.5);
            expect(text?.textContent?.trim()).toBe("Mid Peak");
            expect(pill).not.toBeNull();
            expect(isHalfPixel(pill?.getAttribute("x") ?? null)).toBe(true);
            expect(isHalfPixel(pill?.getAttribute("y") ?? null)).toBe(true);
            expect(leader).not.toBeNull();

            // Vertical stem: M anchorX (anchorY - 6.5) L anchorX edgeY (no Q elbow)
            const stemD = leader?.getAttribute("d") ?? "";
            expect(stemD).not.toContain("Q");
            const stemStart = readLeaderStart(leader);
            expect(stemStart.x).toBeCloseTo(expectedCx, 3);
            expect(Math.hypot(stemStart.x - expectedCx, stemStart.y - expectedCy)).toBeCloseTo(
                6.5,
                2,
            );

            // 1b. Rounded Q elbow leader when pill is offset both horizontally and vertically
            props.annotationDx = 120;
            props.annotationDy = -48;
            flushSync();
            leader = container.querySelector<SVGPathElement>("path.cs-chart-annotation-leader");
            const elbowD = leader?.getAttribute("d") ?? "";
            expect(elbowD).toContain(" Q ");
            const elbowStart = readLeaderStart(leader);
            expect(elbowStart.x).toBeCloseTo(expectedCx, 3);
            expect(Math.hypot(elbowStart.x - expectedCx, elbowStart.y - expectedCy)).toBeCloseTo(
                6.5,
                2,
            );

            // 1c. Straight fallback leader when pill is horizontally offset with near-zero vertical delta
            props.annotationDx = 120;
            props.annotationDy = 0;
            flushSync();
            leader = container.querySelector<SVGPathElement>("path.cs-chart-annotation-leader");
            const straightD = leader?.getAttribute("d") ?? "";
            expect(straightD).not.toContain("Q");
            const straightStart = readLeaderStart(leader);
            expect(
                Math.hypot(straightStart.x - expectedCx, straightStart.y - expectedCy),
            ).toBeCloseTo(6.5, 2);

            // 2. Extreme negative and positive dx/dy clamp pill strictly within PLOT_CLAMP_INSET = 4
            //    (with 0.5px stroke inset on <rect>: x = pillX + 0.5, width = pillW - 1)
            props.annotationDx = -999;
            props.annotationDy = -999;
            flushSync();
            pill = container.querySelector<SVGRectElement>("rect.cs-chart-annotation-pill");
            expect(Number(pill?.getAttribute("x"))).toBe(4.5);
            expect(Number(pill?.getAttribute("y"))).toBe(4.5);

            props.annotationDx = 999;
            props.annotationDy = 999;
            flushSync();
            pill = container.querySelector<SVGRectElement>("rect.cs-chart-annotation-pill");
            const pillW = Number(pill?.getAttribute("width")) + 1;
            const pillH = Number(pill?.getAttribute("height")) + 1;
            expect(Number(pill?.getAttribute("x"))).toBe(
                Math.round(state.plotWidth - pillW - 4) + 0.5,
            );
            expect(Number(pill?.getAttribute("y"))).toBe(
                Math.round(state.plotHeight - pillH - 4) + 0.5,
            );

            // 3. Zero offset (pill overlaps anchor) omits leader path cleanly
            props.annotationDx = 0;
            props.annotationDy = 0;
            flushSync();
            expect(container.querySelector("path.cs-chart-annotation-leader")).toBeNull();

            // 4. yAxis="right" maps against y2Scale
            props.annotationYAxis = "right";
            props.annotationY = 0.28;
            props.annotationDy = -28;
            props.annotationColor = "oklch(0.6 0.2 30)";
            flushSync();
            group = container.querySelector<SVGGElement>('[data-testid="peak-ann"]');
            dot = group?.querySelector<SVGCircleElement>("circle.cs-chart-annotation-dot");
            expect(group?.dataset.customColor).toBe("");
            expect(group?.style.getPropertyValue("--cs-chart-annotation-color")).toBe(
                "oklch(0.6 0.2 30)",
            );
            expect(state.y2Scale).not.toBeNull();
            expect(Number(dot?.getAttribute("cy"))).toBeCloseTo(state.y2Scale?.scale(0.28) ?? 0, 3);

            // 5. Missing y2Scale or empty label omits rendering cleanly
            state.toggleSeries("margin");
            flushSync();
            expect(container.querySelector('[data-testid="peak-ann"]')).toBeNull();

            state.showAllSeries();
            props.annotationLabel = "";
            flushSync();
            expect(container.querySelector('[data-testid="peak-ann"]')).toBeNull();
        });
    });

    describe("Declarative referenceLines, referenceBands & annotations on LineChart, AreaChart & BarChart", () => {
        const refBands: ChartReferenceBandConfig[] = [
            { id: "sla", axis: "y", from: 140, to: 220, label: "Target Zone", tone: "positive" },
        ];
        const refLines: ChartReferenceLineConfig[] = [
            { id: "goal", axis: "y", value: 200, label: "Goal", tone: "caution" },
        ];
        const annots: ChartAnnotationConfig[] = [
            { id: "peak", x: "Mar", y: 240, label: "Peak", tone: "accent" },
        ];

        for (const chartCase of [
            { mode: "line-chart" as const, markSelector: "g.cs-chart-line" },
            { mode: "area-chart" as const, markSelector: "g.cs-chart-area" },
            { mode: "bar-chart" as const, markSelector: "g.cs-chart-bar" },
        ]) {
            it(`renders bands behind marks and reference lines / annotations above marks in ${chartCase.mode}`, () => {
                stubM5CanvasRect(600, 300);

                const refs: { svg: SVGSVGElement | null } = { svg: null };
                renderHost({
                    mode: chartCase.mode,
                    variant: "elevated",
                    size: "md",
                    data: SAMPLE_DATA,
                    x: "month",
                    series: SAMPLE_SERIES,
                    referenceBands: refBands,
                    referenceLines: refLines,
                    annotations: annots,
                    get svgRef() {
                        return refs.svg;
                    },
                    set svgRef(v: SVGSVGElement | null) {
                        refs.svg = v;
                    },
                });

                const bandFill = container.querySelector('g.cs-chart-ref-band[data-part="fill"]');
                const marks = container.querySelector(chartCase.markSelector);
                const refLine = container.querySelector("g.cs-chart-ref-line");
                const bandLabel = container.querySelector('g.cs-chart-ref-band[data-part="label"]');
                const annotation = container.querySelector("g.cs-chart-annotation");

                assertSvgPrecedes(bandFill, marks);
                assertSvgPrecedes(marks, refLine);
                assertSvgPrecedes(refLine, bandLabel);
                assertSvgPrecedes(bandLabel, annotation);

                expect(bandFill?.querySelector("rect.cs-chart-ref-band-rect")).not.toBeNull();
                expect(bandFill?.querySelector(".cs-chart-ref-band-label")).toBeNull();
                expect(bandLabel?.querySelector("rect.cs-chart-ref-band-rect")).toBeNull();
                expect(bandLabel?.querySelector("rect.cs-chart-ref-band-tag")).not.toBeNull();
                expect(
                    bandLabel?.querySelector(".cs-chart-ref-band-label")?.textContent?.trim(),
                ).toBe("Target Zone");
                expect(
                    refLine?.querySelector(".cs-chart-ref-line-label")?.textContent?.trim(),
                ).toBe("Goal");
                expect(
                    annotation?.querySelector(".cs-chart-annotation-text")?.textContent?.trim(),
                ).toBe("Peak");
                expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);
            });
        }
    });

    describe("ComposedChart (Dual Y-Axis)", () => {
        interface ExecRow extends ChartDatum {
            month: string;
            revenue: number;
            pipeline: number;
            marginPct: number;
        }

        const EXEC_DATA: ExecRow[] = [
            { month: "Jan", revenue: 120_000, pipeline: 150_000, marginPct: 24 },
            { month: "Feb", revenue: 180_000, pipeline: 210_000, marginPct: 31 },
            { month: "Mar", revenue: 240_000, pipeline: 260_000, marginPct: 38 },
            { month: "Apr", revenue: 210_000, pipeline: 230_000, marginPct: 35 },
        ];

        const EXEC_SERIES: ChartSeries<ExecRow>[] = [
            { id: "pipeline", label: "Pipeline", type: "area", yAxis: "left" },
            { id: "revenue", label: "Revenue", type: "bar", yAxis: "left" },
            { id: "marginPct", label: "Margin %", type: "line", yAxis: "right" },
        ];

        it("renders mixed area + bar + line series with dual Y/Y2 axes, deterministic SVG layer order, dynamic margin.right, ref/svgRef, {...rest}, and unified dual-axis tooltip", () => {
            stubM5CanvasRect(680, 340);

            const refs: { chart: HTMLElement | null; svg: SVGSVGElement | null } = {
                chart: null,
                svg: null,
            };

            renderHost({
                mode: "composed-chart",
                variant: "soft",
                size: "lg",
                data: EXEC_DATA,
                x: "month",
                series: EXEC_SERIES,
                yAxis: { label: "USD", format: formatExecCurrency },
                y2Axis: { label: "Margin", format: formatExecPercent },
                referenceBands: [
                    { id: "target-band", axis: "y2", from: 25, to: 35, label: "SLA", tone: "positive" },
                ],
                referenceLines: [
                    { id: "budget", axis: "y", value: 200_000, label: "Budget", tone: "caution" },
                ],
                annotations: [
                    { id: "peak-margin", x: "Mar", y: 38, yAxis: "right", label: "Peak 38%", tone: "accent" },
                ],
                tier2Title: "Executive Overview",
                tier2Description: "Revenue vs Margin",
                showActions: true,
                tier2CustomLayerText: "Custom SVG Marker",
                showOverlay: true,
                chartClass: "exec-composed-chart",
                chartAttrs: { "data-testid": "exec-composed", "data-region": "emea" },
                get chartRef() {
                    return refs.chart;
                },
                set chartRef(v: HTMLElement | null) {
                    refs.chart = v;
                },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            const figure = container.querySelector<HTMLElement>('[data-testid="exec-composed"]');
            expect(figure).not.toBeNull();
            expect(figure?.tagName).toBe("FIGURE");
            expect(figure?.dataset.variant).toBe("soft");
            expect(figure?.dataset.size).toBe("lg");
            expect(figure?.dataset.region).toBe("emea");
            expect(figure?.classList.contains("exec-composed-chart")).toBe(true);
            expect(refs.chart).toBe(figure);
            expect(refs.svg).not.toBeNull();
            expect(refs.svg?.querySelectorAll("foreignObject, filter")).toHaveLength(0);

            // Header, actions, custom SVG layer, and overlay all render
            expect(container.querySelector(".cs-chart-title")?.textContent?.trim()).toBe(
                "Executive Overview",
            );
            expect(container.querySelector('[data-testid="tier2-action-btn"]')).not.toBeNull();
            expect(container.querySelector('[data-testid="custom-svg-layer"]')).not.toBeNull();
            expect(container.querySelector('[data-testid="tier2-overlay"]')).not.toBeNull();

            // Independent left ($) and right (%) axes auto-rendered
            const leftAxis = container.querySelector<SVGGElement>(
                'g.cs-chart-layer-axes[data-position="left"]',
            );
            const rightAxis = container.querySelector<SVGGElement>(
                'g.cs-chart-layer-axes[data-position="right"]',
            );
            expect(leftAxis).not.toBeNull();
            expect(rightAxis).not.toBeNull();

            const leftTicks = [
                ...(leftAxis?.querySelectorAll("text.cs-chart-axis-tick-text") ?? []),
            ].map((el) => el.textContent?.trim());
            const rightTicks = [
                ...(rightAxis?.querySelectorAll("text.cs-chart-axis-tick-text") ?? []),
            ].map((el) => el.textContent?.trim());
            expect(leftTicks.length).toBeGreaterThan(0);
            expect(rightTicks.length).toBeGreaterThan(0);
            expect(leftTicks.every((t) => t?.startsWith("$"))).toBe(true);
            expect(rightTicks.every((t) => t?.endsWith("%"))).toBe(true);

            // Dynamic margin.right accommodates Y2 ticks + label
            const layoutWithY2 = readM5PlotLayout(refs.svg);
            expect(layoutWithY2.right).toBeGreaterThanOrEqual(40);

            // Deterministic SVG layer order:
            // ChartGrid -> ChartReferenceBand[part="fill"] -> ChartArea[part="fill"] -> ChartBar
            // -> ChartArea[part="line"] -> ChartLine -> ChartReferenceLine
            // -> ChartReferenceBand[part="label"] -> ChartAnnotation -> children
            const grid = container.querySelector("g.cs-chart-layer-grid");
            const bandFill = container.querySelector('g.cs-chart-ref-band[data-part="fill"]');
            const areaFill = container.querySelector('g.cs-chart-area[data-part="fill"]');
            const bar = container.querySelector("g.cs-chart-bar");
            const areaLine = container.querySelector('g.cs-chart-area[data-part="line"]');
            const line = container.querySelector("g.cs-chart-line");
            const refLine = container.querySelector("g.cs-chart-ref-line");
            const bandLabel = container.querySelector('g.cs-chart-ref-band[data-part="label"]');
            const annotation = container.querySelector("g.cs-chart-annotation");
            const customLayer = container.querySelector('[data-testid="custom-svg-layer"]');

            assertSvgPrecedes(grid, bandFill);
            assertSvgPrecedes(bandFill, areaFill);
            assertSvgPrecedes(areaFill, bar);
            assertSvgPrecedes(bar, areaLine);
            assertSvgPrecedes(areaLine, line);
            assertSvgPrecedes(line, refLine);
            assertSvgPrecedes(refLine, bandLabel);
            assertSvgPrecedes(bandLabel, annotation);
            assertSvgPrecedes(annotation, customLayer);

            expect(areaFill?.querySelector("path.cs-chart-area-fill")).not.toBeNull();
            expect(areaFill?.querySelector("path.cs-chart-line-path")).toBeNull();
            expect(areaLine?.querySelector("path.cs-chart-line-path")).not.toBeNull();
            expect(areaLine?.querySelector("path.cs-chart-area-fill")).toBeNull();

            // Keyboard scrub activates unified tooltip showing formatted values from BOTH axes ($ and %)
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();

            const tooltip = container.querySelector<HTMLDivElement>(".cs-chart-tooltip");
            expect(tooltip?.dataset.open).toBe("");
            expect(tooltip?.querySelector(".cs-chart-tooltip-header")?.textContent?.trim()).toBe("Jan");
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-label") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["Pipeline", "Revenue", "Margin %"]);
            expect(
                [...(tooltip?.querySelectorAll(".cs-chart-tooltip-value") ?? [])].map((el) =>
                    el.textContent?.trim(),
                ),
            ).toEqual(["$150k", "$120k", "24%"]);
        });

        it("supports tooltipMode='axis' | 'item' | 'none' and custom tooltip snippet on ComposedChart", () => {
            stubM5CanvasRect(640, 320);

            const props = $state({
                mode: "composed-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: EXEC_DATA,
                x: "month",
                series: EXEC_SERIES,
                yAxis: { format: formatExecCurrency },
                y2Axis: { format: formatExecPercent },
                tooltipMode: "axis" as ChartTooltipMode,
                tooltipCustomRenderer: undefined as
                    | ((ctx: ChartTooltipContext<ChartDatum>) => string)
                    | undefined,
            });

            renderHost(props);

            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();

            // 1. tooltipMode="axis" -> all 3 series in tooltip
            expect(container.querySelectorAll(".cs-chart-tooltip-label")).toHaveLength(3);

            // 2. tooltipMode="item" -> single active series in tooltip
            props.tooltipMode = "item";
            flushSync();
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
            flushSync();
            expect(container.querySelectorAll(".cs-chart-tooltip-label")).toHaveLength(1);

            // 3. tooltipMode="none" -> removes tooltip completely while crosshair remains active
            props.tooltipMode = "none";
            flushSync();
            expect(container.querySelector(".cs-chart-tooltip")).toBeNull();
            expect(container.querySelector("g.cs-chart-layer-crosshair")).not.toBeNull();

            // 4. Custom tooltip snippet when tooltipMode="axis"
            props.tooltipMode = "axis";
            props.tooltipCustomRenderer = (ctx) =>
                `${ctx.xLabel}: ${ctx.items.map((item) => item.formatted).join(" | ")}`;
            flushSync();
            expect(container.querySelector('[data-testid="custom-tooltip"]')?.textContent).toBe(
                "Jan: $150k | $120k | 24%",
            );
        });

        it("removes right Y2 axis and reclaims margin.right when all right-axis series are hidden via legend, and restores on re-show / Show all reset", () => {
            stubM5CanvasRect(680, 340);

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            const bindings = $state<{
                hidden: readonly string[];
                active: number | null;
                hovered: string | null;
            }>({
                hidden: [],
                active: null,
                hovered: null,
            });

            renderHost({
                mode: "composed-chart",
                variant: "elevated",
                size: "md",
                data: EXEC_DATA,
                x: "month",
                series: EXEC_SERIES,
                yAxis: { format: formatExecCurrency },
                y2Axis: { label: "Margin %", format: formatExecPercent },
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
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

            const initialLayout = readM5PlotLayout(refs.svg);
            expect(
                container.querySelector('g.cs-chart-layer-axes[data-position="right"]'),
            ).not.toBeNull();

            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(3);

            // 1. Hide the only right-axis series ("marginPct") -> right axis disappears & margin.right shrinks
            legendButtons[2]?.click();
            flushSync();

            expect(bindings.hidden).toEqual(["marginPct"]);
            expect(
                container.querySelector('g.cs-chart-layer-axes[data-position="right"]'),
            ).toBeNull();
            expect(container.querySelector("g.cs-chart-line")).toBeNull();
            const layoutWithoutY2 = readM5PlotLayout(refs.svg);
            expect(layoutWithoutY2.right).toBeLessThan(initialLayout.right);
            expect(layoutWithoutY2.plotWidth).toBeGreaterThan(initialLayout.plotWidth);

            // 2. Re-show "marginPct" -> right axis & margin.right restore identically
            legendButtons[2]?.click();
            flushSync();

            expect(bindings.hidden).toEqual([]);
            expect(
                container.querySelector('g.cs-chart-layer-axes[data-position="right"]'),
            ).not.toBeNull();
            expect(container.querySelector("g.cs-chart-line")).not.toBeNull();
            const restoredLayout = readM5PlotLayout(refs.svg);
            expect(restoredLayout.right).toBe(initialLayout.right);

            // 3. Hide ALL series -> renders ChartEmpty with Show all reset button
            legendButtons[0]?.click();
            legendButtons[1]?.click();
            legendButtons[2]?.click();
            flushSync();

            expect(bindings.hidden).toEqual(["pipeline", "revenue", "marginPct"]);
            expect(container.querySelector(".cs-chart-empty")).not.toBeNull();
            expect(container.querySelector(".cs-chart-canvas")).toBeNull();

            const resetBtn = container.querySelector<HTMLButtonElement>(
                ":scope .cs-chart-empty button",
            );
            expect(resetBtn).not.toBeNull();
            resetBtn?.click();
            flushSync();

            expect(bindings.hidden).toEqual([]);
            expect(container.querySelector(".cs-chart-empty")).toBeNull();
            expect(
                container.querySelector('g.cs-chart-layer-axes[data-position="right"]'),
            ).not.toBeNull();
        });

        it("handles loading and empty states cleanly on ComposedChart", () => {
            stubM5CanvasRect(600, 300);

            const props = $state({
                mode: "composed-chart" as const,
                variant: "elevated" as const,
                size: "md" as const,
                data: EXEC_DATA as readonly ExecRow[],
                x: "month",
                series: EXEC_SERIES,
                loading: true,
                emptyTitle: "No metrics",
                emptyDescription: "Adjust your date range",
            });

            renderHost(props);

            const figure = container.querySelector<HTMLElement>("figure.cs-chart");
            expect(figure?.dataset.loading).toBe("");
            expect(container.querySelector(".cs-chart-loading")).not.toBeNull();
            expect(container.querySelector(".cs-chart-canvas")).toBeNull();
            expect(container.querySelector(".cs-chart-tooltip")).toBeNull();

            // Transition to empty data
            props.loading = false;
            props.data = [];
            flushSync();

            expect(figure?.dataset.loading).toBeUndefined();
            expect(figure?.dataset.empty).toBe("");
            expect(container.querySelector(".cs-chart-empty")).not.toBeNull();
            expect(container.querySelector(".cs-chart-empty")?.textContent).toContain("No metrics");
            expect(container.querySelector(".cs-chart-empty")?.textContent).toContain(
                "Adjust your date range",
            );
            expect(container.querySelector(".cs-chart-canvas")).toBeNull();
        });

        it("keeps barMode='stacked' + areaMode='overlay' (and untyped line) domains & crosshair dots unstacked, and hides hover band when all bars are hidden", () => {
            interface MixedStackRow extends ChartDatum {
                quarter: string;
                barA: number;
                barB: number;
                areaA: number;
                areaB: number;
                trend: number;
            }

            const mixedData: MixedStackRow[] = [
                { quarter: "Q1", barA: 40, barB: 60, areaA: 90, areaB: 95, trend: 80 },
                { quarter: "Q2", barA: 50, barB: 50, areaA: 80, areaB: 85, trend: 70 },
            ];

            const mixedSeries: ChartSeries<MixedStackRow>[] = [
                { id: "barA", label: "Bar A", type: "bar" },
                { id: "barB", label: "Bar B", type: "bar" },
                { id: "areaA", label: "Area A", type: "area" },
                { id: "areaB", label: "Area B", type: "area" },
                { id: "trend", label: "Trend" },
            ];

            stubM5CanvasRect(640, 320);

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            renderHost({
                mode: "composed-chart",
                variant: "elevated",
                size: "md",
                data: mixedData,
                x: "quarter",
                series: mixedSeries,
                barMode: "stacked" as ChartBarMode,
                areaMode: "overlay" as ChartAreaMode,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            const readMaxLeftTick = (): number => {
                const ticks = [
                    ...container.querySelectorAll<SVGTextElement>(
                        ':scope g.cs-chart-layer-axes[data-position="left"] text.cs-chart-axis-tick-text',
                    ),
                ]
                    .map((el) => Number((el.textContent ?? "").replaceAll(",", "").trim()))
                    .filter((v) => Number.isFinite(v));
                return Math.max(...ticks);
            };

            const readDotCy = (seriesId: string): number =>
                Number(
                    container
                        .querySelector<SVGCircleElement>(
                            `g.cs-chart-point-group[data-series-id="${CSS.escape(seriesId)}"] circle.cs-chart-point-dot`,
                        )
                        ?.getAttribute("cy"),
                );

            // Stacked bars sum to 100; overlay areas (90, 95) and untyped line (80) must NOT sum to 185/265
            const maxTick = readMaxLeftTick();
            expect(maxTick).toBeGreaterThanOrEqual(100);
            expect(maxTick).toBeLessThan(150);

            const layout = readM5PlotLayout(refs.svg);

            // Activate Q1 via keyboard scrub -> hover band is shown and crosshair dots land at unstacked yScale(value)
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();

            expect(container.querySelector(".cs-chart-hover-band")).not.toBeNull();
            expect(readDotCy("areaA")).toBeCloseTo(layout.plotHeight * (1 - 90 / maxTick), 1);
            expect(readDotCy("areaB")).toBeCloseTo(layout.plotHeight * (1 - 95 / maxTick), 1);
            expect(readDotCy("trend")).toBeCloseTo(layout.plotHeight * (1 - 80 / maxTick), 1);
            expect(readDotCy("areaB")).toBeLessThan(readDotCy("areaA"));
            expect(readDotCy("areaA")).toBeLessThan(readDotCy("trend"));

            // Hide both stacked bar series via legend -> category hover band disappears while overlay areas & line remain unstacked
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            expect(legendButtons).toHaveLength(5);
            legendButtons[0]?.click();
            legendButtons[1]?.click();
            flushSync();

            expect(container.querySelector(".cs-chart-hover-band")).toBeNull();
            const maxTickNoBars = readMaxLeftTick();
            expect(maxTickNoBars).toBeGreaterThanOrEqual(95);
            expect(maxTickNoBars).toBeLessThan(150);

            const layoutNoBars = readM5PlotLayout(refs.svg);
            expect(readDotCy("areaA")).toBeCloseTo(
                layoutNoBars.plotHeight * (1 - 90 / maxTickNoBars),
                1,
            );
            expect(readDotCy("areaB")).toBeCloseTo(
                layoutNoBars.plotHeight * (1 - 95 / maxTickNoBars),
                1,
            );
            expect(readDotCy("trend")).toBeCloseTo(
                layoutNoBars.plotHeight * (1 - 80 / maxTickNoBars),
                1,
            );

            // Re-showing a bar series restores the category hover band cleanly
            legendButtons[0]?.click();
            flushSync();
            expect(container.querySelector(".cs-chart-hover-band")).not.toBeNull();
        });

        it("keeps areaMode='stacked' + barMode='grouped' domains accurate, stacks area crosshair dots on cumulative y1, and keeps grouped bars unstacked", () => {
            interface StackedAreaGroupedBarRow extends ChartDatum {
                quarter: string;
                areaA: number;
                areaB: number;
                barA: number;
                barB: number;
            }

            const comboData: StackedAreaGroupedBarRow[] = [
                { quarter: "Q1", areaA: 60, areaB: 80, barA: 100, barB: 110 },
                { quarter: "Q2", areaA: 50, areaB: 70, barA: 90, barB: 95 },
            ];

            const comboSeries: ChartSeries<StackedAreaGroupedBarRow>[] = [
                { id: "areaA", label: "Area A", type: "area" },
                { id: "areaB", label: "Area B", type: "area" },
                { id: "barA", label: "Bar A", type: "bar" },
                { id: "barB", label: "Bar B", type: "bar" },
            ];

            stubM5CanvasRect(640, 320);

            const refs: { svg: SVGSVGElement | null } = { svg: null };
            renderHost({
                mode: "composed-chart",
                variant: "elevated",
                size: "md",
                data: comboData,
                x: "quarter",
                series: comboSeries,
                areaMode: "stacked" as ChartAreaMode,
                barMode: "grouped" as ChartBarMode,
                get svgRef() {
                    return refs.svg;
                },
                set svgRef(v: SVGSVGElement | null) {
                    refs.svg = v;
                },
            });

            const readMaxLeftTick = (): number => {
                const ticks = [
                    ...container.querySelectorAll<SVGTextElement>(
                        ':scope g.cs-chart-layer-axes[data-position="left"] text.cs-chart-axis-tick-text',
                    ),
                ]
                    .map((el) => Number((el.textContent ?? "").replaceAll(",", "").trim()))
                    .filter((v) => Number.isFinite(v));
                return Math.max(...ticks);
            };

            const readDotCy = (seriesId: string): number =>
                Number(
                    container
                        .querySelector<SVGCircleElement>(
                            `g.cs-chart-point-group[data-series-id="${CSS.escape(seriesId)}"] circle.cs-chart-point-dot`,
                        )
                        ?.getAttribute("cy"),
                );

            const parseBarMinX = (seriesId: string, index: number): number => {
                const path = container.querySelector<SVGPathElement>(
                    `path.cs-chart-bar-rect[data-series-id="${CSS.escape(seriesId)}"][data-index="${CSS.escape(String(index))}"]`,
                );
                const d = path?.getAttribute("d") ?? "";
                const match = /^M\s*(-?\d+(?:\.\d+)?)/.exec(d);
                return match ? Number(match[1]) : NaN;
            };

            // Stacked areas sum to 140 (60 + 80); grouped bars (100, 110) must NOT sum to 210
            const maxTick = readMaxLeftTick();
            expect(maxTick).toBeGreaterThanOrEqual(140);
            expect(maxTick).toBeLessThan(200);

            // Grouped bars sit side-by-side at distinct X coordinates (unstacked)
            expect(parseBarMinX("barA", 0)).toBeLessThan(parseBarMinX("barB", 0));

            const layout = readM5PlotLayout(refs.svg);

            // Activate Q1 -> stacked area crosshair dots land on cumulative y1 (60 and 140)
            const canvas = container.querySelector<HTMLDivElement>(".cs-chart-canvas");
            canvas?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            flushSync();

            const areaACy = readDotCy("areaA");
            const areaBCy = readDotCy("areaB");
            expect(areaACy).toBeCloseTo(layout.plotHeight * (1 - 60 / maxTick), 1);
            expect(areaBCy).toBeCloseTo(layout.plotHeight * (1 - 140 / maxTick), 1);
            expect(areaBCy).toBeLessThan(areaACy);

            // Toggling areaA off drops areaB from cumulative 140 down to its solo value 80, and shrinks Y domain to grouped bar max (110)
            const legendButtons = [
                ...container.querySelectorAll<HTMLButtonElement>("button.cs-chart-legend-item"),
            ];
            legendButtons[0]?.click();
            flushSync();

            const maxTickAfterToggle = readMaxLeftTick();
            expect(maxTickAfterToggle).toBeGreaterThanOrEqual(110);
            expect(maxTickAfterToggle).toBeLessThan(maxTick);

            const layoutAfterToggle = readM5PlotLayout(refs.svg);
            expect(readDotCy("areaB")).toBeCloseTo(
                layoutAfterToggle.plotHeight * (1 - 80 / maxTickAfterToggle),
                1,
            );
        });
    });
});
