import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ChartTestHost from "./ChartTestHost.internal.svelte";
import { clearMeasureCache } from "./chart-measure.internal.ts";
import {
    CHART_SIZES,
    CHART_VARIANTS,
    ChartLoading,
    ChartState,
    type ChartDatum,
    type ChartLoadingShape,
    type ChartSeries,
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
