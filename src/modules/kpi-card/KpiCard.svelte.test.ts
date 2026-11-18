import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { CardSize } from "../card/index.ts";
import type { CloseButtonSize, CloseButtonVariant } from "../close-button/index.ts";
import type { ProgressAppearance, ProgressColor, ProgressSize, ProgressVariant } from "../progress/index.ts";
import KpiCardTestHost from "./KpiCardTestHost.internal.svelte";
import KpiCardTestIcon from "./KpiCardTestIcon.internal.svelte";
import {
    KPI_CARD_ACTIONS_ALIGNS,
    KPI_CARD_ACTIONS_ORIENTATIONS,
    KPI_CARD_BREAKDOWN_COLUMNS,
    KPI_CARD_BREAKDOWN_VARIANTS,
    KPI_CARD_COLORS,
    KPI_CARD_DELTA_TRENDS,
    KPI_CARD_DELTA_VARIANTS,
    KPI_CARD_GROUP_COLUMNS,
    KPI_CARD_LABEL_ELEMENTS,
    KPI_CARD_LAYOUTS,
    KPI_CARD_ORNAMENT_PLACEMENTS,
    KPI_CARD_ORNAMENT_SHAPES,
    KPI_CARD_SIZES,
    KPI_CARD_VARIANTS,
    KPI_CARD_VISUAL_PLACEMENTS,
    KPI_CARD_VISUAL_RATIOS,
    KPI_CARD_VISUAL_VARIANTS,
    KpiCard,
    KpiCardActions,
    KpiCardBody,
    KpiCardBreakdown,
    KpiCardBreakdownItem,
    KpiCardClose,
    KpiCardComparison,
    KpiCardDelta,
    KpiCardFooter,
    KpiCardGroup,
    KpiCardHeader,
    KpiCardIcon,
    KpiCardLabel,
    KpiCardMetric,
    KpiCardOrnament,
    KpiCardTarget,
    KpiCardValue,
    KpiCardVisual,
    type KpiCardActionsAlign,
    type KpiCardActionsOrientation,
    type KpiCardBreakdownColumns,
    type KpiCardBreakdownVariant,
    type KpiCardColor,
    type KpiCardDeltaTrend,
    type KpiCardDeltaVariant,
    type KpiCardGroupColumns,
    type KpiCardLabelElement,
    type KpiCardLayout,
    type KpiCardOrnamentPlacement,
    type KpiCardOrnamentShape,
    type KpiCardSize,
    type KpiCardVariant,
    type KpiCardVisualPlacement,
    type KpiCardVisualRatio,
    type KpiCardVisualVariant,
} from "./index.ts";

describe("KpiCard Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("Public exports & canonical option lists", () => {
        test("exports all canonical option lists", () => {
            expect(KPI_CARD_VARIANTS).toEqual(["elevated", "soft", "sunken", "transparent"]);
            expect(KPI_CARD_SIZES).toEqual(["sm", "md", "lg"]);
            expect(KPI_CARD_LAYOUTS).toEqual(["stack", "split", "inline", "hero"]);
            expect(KPI_CARD_LABEL_ELEMENTS).toEqual(["h2", "h3", "h4", "h5", "h6", "span", "div"]);
            expect(KPI_CARD_COLORS).toEqual(["base", "accent", "positive", "caution", "negative"]);
            expect(KPI_CARD_DELTA_VARIANTS).toEqual(["soft", "plain", "dot"]);
            expect(KPI_CARD_DELTA_TRENDS).toEqual(["up", "down", "flat"]);
            expect(KPI_CARD_VISUAL_PLACEMENTS).toEqual(["bottom", "top", "end", "start"]);
            expect(KPI_CARD_VISUAL_VARIANTS).toEqual(["transparent", "soft", "sunken"]);
            expect(KPI_CARD_VISUAL_RATIOS).toEqual(["auto", "16/9", "21/9", "4/3", "3/1", "1/1"]);
            expect(KPI_CARD_BREAKDOWN_VARIANTS).toEqual(["plain", "soft", "sunken"]);
            expect(KPI_CARD_BREAKDOWN_COLUMNS).toEqual([1, 2, 3, 4, "auto"]);
            expect(KPI_CARD_ACTIONS_ALIGNS).toEqual(["start", "end", "stretch"]);
            expect(KPI_CARD_ACTIONS_ORIENTATIONS).toEqual(["horizontal", "vertical"]);
            expect(KPI_CARD_ORNAMENT_PLACEMENTS).toEqual(["bottom-left", "bottom-right", "top-right", "inset"]);
            expect(KPI_CARD_ORNAMENT_SHAPES).toEqual(["circle", "none"]);
            expect(KPI_CARD_GROUP_COLUMNS).toEqual([1, 2, 3, 4, "auto"]);
        });
    });

    describe("Root KpiCard contract", () => {
        test("renders div.cs-kpi-card with default stack layout, custom class, rest attributes, and ref binding", () => {
            let ref: HTMLDivElement | null = null;

            const instance = mount(KpiCard, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    class: "custom-kpi",
                    id: "kpi-root",
                    role: "region",
                    "aria-label": "Monthly revenue",
                    "data-testid": "revenue-kpi",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>("div.cs-kpi-card");
            expect(root).not.toBeNull();
            expect(root?.tagName).toBe("DIV");
            expect(root?.classList.contains("cs-kpi-card")).toBe(true);
            expect(root?.classList.contains("custom-kpi")).toBe(true);
            expect(root?.dataset.variant).toBe("elevated");
            expect(root?.dataset.size).toBe("md");
            expect(root?.dataset.layout).toBe("stack");
            expect(root?.hasAttribute("data-nested")).toBe(false);
            expect(root?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("");
            expect(root?.getAttribute("id")).toBe("kpi-root");
            expect(root?.getAttribute("role")).toBe("region");
            expect(root?.getAttribute("aria-label")).toBe("Monthly revenue");
            expect(root?.dataset.testid).toBe("revenue-kpi");
            expect(root?.querySelector(".cs-kpi-card-split")).toBeNull();
            expect(ref).toBe(root);

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("reactively updates data-variant, data-size, and data-layout across all canonical values", () => {
            let variant = $state<KpiCardVariant>("elevated");
            let size = $state<KpiCardSize>("sm");
            let layout = $state<KpiCardLayout>("stack");

            const instance = mount(KpiCard, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get size() {
                        return size;
                    },
                    get layout() {
                        return layout;
                    },
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>("div.cs-kpi-card");
            expect(root).not.toBeNull();

            for (const nextVariant of KPI_CARD_VARIANTS) {
                variant = nextVariant;
                flushSync();
                expect(root?.dataset.variant).toBe(nextVariant);
            }

            for (const nextSize of KPI_CARD_SIZES) {
                size = nextSize;
                flushSync();
                expect(root?.dataset.size).toBe(nextSize);
            }

            for (const nextLayout of KPI_CARD_LAYOUTS) {
                layout = nextLayout;
                flushSync();
                expect(root?.dataset.layout).toBe(nextLayout);
            }

            unmount(instance);
        });

        test("renders .cs-kpi-card-split wrapper exclusively for layout='split' and swaps cleanly on reactive layout changes", () => {
            let layout = $state<KpiCardLayout>("stack");

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get layout() {
                        return layout;
                    },
                    showHeader: true,
                    showValue: true,
                    showProbe: true,
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>(".cs-kpi-card");
            expect(root?.querySelector(".cs-kpi-card-split")).toBeNull();
            expect(root?.querySelector(".cs-kpi-card-header")?.parentElement).toBe(root);
            expect(root?.querySelector(".cs-kpi-card-value")?.parentElement).toBe(root);

            // Switch stack -> split: wrapper appears and holds children
            layout = "split";
            flushSync();

            const splitWrapper = root?.querySelector<HTMLDivElement>(":scope > .cs-kpi-card-split");
            expect(splitWrapper).not.toBeNull();
            expect(root?.querySelector(".cs-kpi-card-header")?.parentElement).toBe(splitWrapper);
            expect(root?.querySelector(".cs-kpi-card-value")?.parentElement).toBe(splitWrapper);
            expect(root?.querySelector<HTMLDivElement>('[data-testid="kpi-context-probe"]')?.dataset.ctxLayout).toBe(
                "split"
            );

            // Switch split -> inline and hero: wrapper disappears and children sit directly under .cs-kpi-card
            for (const nonSplit of ["inline", "hero", "stack"] as const) {
                layout = nonSplit;
                flushSync();
                expect(root?.querySelector(".cs-kpi-card-split")).toBeNull();
                expect(root?.querySelector(".cs-kpi-card-header")?.parentElement).toBe(root);
                expect(root?.querySelector(".cs-kpi-card-value")?.parentElement).toBe(root);
                expect(
                    root?.querySelector<HTMLDivElement>('[data-testid="kpi-context-probe"]')?.dataset.ctxLayout
                ).toBe(nonSplit);
            }

            unmount(instance);
        });
    });

    describe("Concentric nesting & cross-nesting (surface-radius)", () => {
        test("nested KpiCard > KpiCard > KpiCard computes concentric --cs-kpi-card-nested-radius and isolates contexts", () => {
            let outerVariant = $state<KpiCardVariant>("elevated");
            let outerSize = $state<KpiCardSize>("lg");
            let outerLayout = $state<KpiCardLayout>("stack");

            let innerVariant = $state<KpiCardVariant>("soft");
            let innerSize = $state<KpiCardSize>("sm");
            let innerLayout = $state<KpiCardLayout>("stack");

            const deepSize: KpiCardSize = "md";

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    get variant() {
                        return outerVariant;
                    },
                    get size() {
                        return outerSize;
                    },
                    get layout() {
                        return outerLayout;
                    },
                    kpiAttrs: { "data-testid": "outer-kpi" },
                    showDelta: true,
                    deltaTrend: "up",
                    deltaAttrs: { "data-testid": "outer-delta" },
                    showProbe: true,

                    showInnerKpiCard: true,
                    get innerVariant() {
                        return innerVariant;
                    },
                    get innerSize() {
                        return innerSize;
                    },
                    get innerLayout() {
                        return innerLayout;
                    },
                    innerAttrs: { "data-testid": "inner-kpi" },
                    showInnerDelta: true,
                    showInnerProbe: true,

                    showDeepKpiCard: true,
                    deepVariant: "sunken",
                    get deepSize() {
                        return deepSize;
                    },
                    deepAttrs: { "data-testid": "deep-kpi" },
                    showDeepProbe: true,
                },
            });
            flushSync();

            const outer = container.querySelector<HTMLDivElement>('[data-testid="outer-kpi"]');
            const inner = container.querySelector<HTMLDivElement>('[data-testid="inner-kpi"]');
            const deep = container.querySelector<HTMLDivElement>('[data-testid="deep-kpi"]');

            const outerProbe = container.querySelector<HTMLDivElement>('[data-testid="kpi-context-probe"]');
            const innerProbe = container.querySelector<HTMLDivElement>('[data-testid="inner-kpi-probe"]');
            const deepProbe = container.querySelector<HTMLDivElement>('[data-testid="deep-kpi-probe"]');

            const outerDelta = container.querySelector<HTMLSpanElement>('[data-testid="outer-delta"]');
            const innerDelta = container.querySelector<HTMLSpanElement>('[data-testid="inner-delta"]');

            // Outer is standalone; inner & deep are nested with concentric radii (lg=12px -> max(8, 12-12)=8px)
            expect(outer?.hasAttribute("data-nested")).toBe(false);
            expect(outer?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("");
            expect(outerProbe?.dataset.ctxNested).toBe("false");
            expect(outerDelta?.dataset.variant).toBe("soft");

            expect(inner?.dataset.nested).toBe("");
            expect(inner?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("12px");
            expect(innerProbe?.dataset.ctxNested).toBe("true");
            expect(innerDelta?.dataset.variant).toBe("plain");

            expect(deep?.dataset.nested).toBe("");
            expect(deep?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("8px");
            expect(deepProbe?.dataset.ctxNested).toBe("true");

            // Reactively step outer size lg -> md -> sm and check inner radius updates without leaking into inner context
            outerSize = "md";
            outerVariant = "transparent";
            outerLayout = "hero";
            flushSync();

            expect(inner?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("10px");
            expect(deep?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("8px");
            expect(outerProbe?.dataset.ctxVariant).toBe("transparent");
            expect(outerProbe?.dataset.ctxSize).toBe("md");
            expect(outerProbe?.dataset.ctxLayout).toBe("hero");
            expect(innerProbe?.dataset.ctxVariant).toBe("soft");
            expect(innerProbe?.dataset.ctxSize).toBe("sm");
            expect(innerProbe?.dataset.ctxLayout).toBe("stack");

            outerSize = "sm";
            flushSync();
            expect(inner?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("8px");

            // Mutate inner without leaking into outer or deep (re-query innerProbe because split wraps children)
            innerVariant = "elevated";
            innerSize = "lg";
            innerLayout = "split";
            flushSync();

            const remountedInnerProbe = container.querySelector<HTMLDivElement>('[data-testid="inner-kpi-probe"]');
            expect(remountedInnerProbe?.dataset.ctxVariant).toBe("elevated");
            expect(remountedInnerProbe?.dataset.ctxSize).toBe("lg");
            expect(remountedInnerProbe?.dataset.ctxLayout).toBe("split");
            expect(outerProbe?.dataset.ctxSize).toBe("sm");
            expect(deepProbe?.dataset.ctxSize).toBe("md");
            expect(deep?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("8px");

            unmount(instance);
        });

        test("KpiCard > KpiCardGroup > KpiCard sets data-nested on group and preserves concentric radius for child cards", () => {
            let outerSize = $state<KpiCardSize>("lg");

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    get size() {
                        return outerSize;
                    },
                    showInnerGroup: true,
                    groupColumns: 2,
                    groupAttrs: { "data-testid": "nested-group" },
                    groupCardAttrs: { "data-testid": "grouped-kpi" },
                    innerVariant: "soft",
                    innerSize: "sm",
                },
            });
            flushSync();

            const group = container.querySelector<HTMLDivElement>('[data-testid="nested-group"]');
            const childKpi = container.querySelector<HTMLDivElement>('[data-testid="grouped-kpi"]');
            const childDelta = container.querySelector<HTMLSpanElement>('[data-testid="group-inner-delta"]');
            const childProbe = container.querySelector<HTMLDivElement>('[data-testid="group-inner-probe"]');

            expect(group?.dataset.nested).toBe("");
            expect(group?.dataset.columns).toBe("2");
            expect(childKpi?.dataset.nested).toBe("");
            expect(childKpi?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("12px");
            expect(childDelta?.dataset.variant).toBe("plain");
            expect(childProbe?.dataset.ctxNested).toBe("true");

            outerSize = "md";
            flushSync();
            expect(childKpi?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("10px");

            outerSize = "sm";
            flushSync();
            expect(childKpi?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("8px");

            unmount(instance);
        });

        test("Card > KpiCard and Card > KpiCardGroup > KpiCard propagate surface-radius concentrically", () => {
            let cardSize = $state<CardSize>("lg");
            let showInnerGroup = $state(false);

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    mode: "card-wraps-kpi",
                    cardVariant: "elevated",
                    get cardSize() {
                        return cardSize;
                    },
                    cardAttrs: { "data-testid": "outer-generic-card" },
                    innerVariant: "soft",
                    innerSize: "sm",
                    innerAttrs: { "data-testid": "kpi-in-card" },
                    get showInnerGroup() {
                        return showInnerGroup;
                    },
                    groupAttrs: { "data-testid": "group-in-card" },
                    groupCardAttrs: { "data-testid": "kpi-in-card-group" },
                },
            });
            flushSync();

            const outerCard = container.querySelector<HTMLDivElement>('[data-testid="outer-generic-card"]');
            const kpiInCard = container.querySelector<HTMLDivElement>('[data-testid="kpi-in-card"]');
            const deltaInCard = container.querySelector<HTMLSpanElement>('[data-testid="card-kpi-delta"]');
            const probeInCard = container.querySelector<HTMLDivElement>('[data-testid="card-kpi-probe"]');

            expect(outerCard?.hasAttribute("data-nested")).toBe(false);
            expect(kpiInCard?.dataset.nested).toBe("");
            expect(kpiInCard?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("12px");
            expect(deltaInCard?.dataset.variant).toBe("plain");
            expect(probeInCard?.dataset.ctxNested).toBe("true");

            cardSize = "md";
            flushSync();
            expect(kpiInCard?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("10px");

            cardSize = "sm";
            flushSync();
            expect(kpiInCard?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("8px");

            // Switch to Card > KpiCardGroup > KpiCard
            showInnerGroup = true;
            cardSize = "lg";
            flushSync();

            const groupInCard = container.querySelector<HTMLDivElement>('[data-testid="group-in-card"]');
            const kpiInGroup = container.querySelector<HTMLDivElement>('[data-testid="kpi-in-card-group"]');
            expect(groupInCard?.dataset.nested).toBe("");
            expect(kpiInGroup?.dataset.nested).toBe("");
            expect(kpiInGroup?.style.getPropertyValue("--cs-kpi-card-nested-radius")).toBe("12px");

            unmount(instance);
        });

        test("KpiCard > Card propagates concentric --cs-card-nested-radius and keeps Card/KpiCard contexts isolated", () => {
            let kpiSize = $state<KpiCardSize>("lg");
            let cardSize = $state<CardSize>("sm");

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    get size() {
                        return kpiSize;
                    },
                    kpiAttrs: { "data-testid": "outer-kpi-surface" },
                    showInnerCard: true,
                    cardVariant: "soft",
                    get cardSize() {
                        return cardSize;
                    },
                    cardAttrs: { "data-testid": "inner-generic-card" },
                },
            });
            flushSync();

            const outerKpi = container.querySelector<HTMLDivElement>('[data-testid="outer-kpi-surface"]');
            const innerCard = container.querySelector<HTMLDivElement>('[data-testid="inner-generic-card"]');
            const probe = container.querySelector<HTMLDivElement>('[data-testid="inner-card-probe"]');

            expect(outerKpi?.hasAttribute("data-nested")).toBe(false);
            expect(innerCard?.dataset.nested).toBe("");
            expect(innerCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("12px");
            expect(probe?.dataset.hasCardCtx).toBe("true");
            expect(probe?.dataset.cardSize).toBe("sm");
            expect(probe?.dataset.hasKpiCtx).toBe("true");
            expect(probe?.dataset.kpiSize).toBe("lg");

            kpiSize = "md";
            cardSize = "lg";
            flushSync();

            expect(innerCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("10px");
            expect(probe?.dataset.cardSize).toBe("lg");
            expect(probe?.dataset.kpiSize).toBe("md");

            kpiSize = "sm";
            flushSync();
            expect(innerCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("8px");

            unmount(instance);
        });
    });

    describe("Header, Icon & Label", () => {
        test("KpiCardHeader renders div.cs-kpi-card-header with ref, class, and rest attributes", () => {
            let ref: HTMLDivElement | null = null;

            const instance = mount(KpiCardHeader, {
                target: container,
                props: {
                    class: "custom-header",
                    "data-testid": "kpi-header",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const header = container.querySelector<HTMLDivElement>("div.cs-kpi-card-header");
            expect(header).not.toBeNull();
            expect(header?.classList.contains("custom-header")).toBe(true);
            expect(header?.dataset.testid).toBe("kpi-header");
            expect(ref).toBe(header);

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("KpiCardLabel defaults to <h3> and supports all 'as' elements, ref, class, and rest props", () => {
            let as = $state<KpiCardLabelElement | undefined>(undefined);
            let ref: HTMLHeadingElement | HTMLSpanElement | HTMLDivElement | null = null;

            const instance = mount(KpiCardLabel, {
                target: container,
                props: {
                    get as() {
                        return as;
                    },
                    class: "custom-label",
                    id: "kpi-label-1",
                    "data-testid": "kpi-label",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLHeadingElement | HTMLSpanElement | HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            let el = container.querySelector<HTMLElement>(".cs-kpi-card-label");
            expect(el).not.toBeNull();
            expect(el?.tagName).toBe("H3");
            expect(el?.classList.contains("custom-label")).toBe(true);
            expect(el?.getAttribute("id")).toBe("kpi-label-1");
            expect(el?.dataset.testid).toBe("kpi-label");
            expect(ref).toBe(el);

            for (const tag of KPI_CARD_LABEL_ELEMENTS) {
                as = tag;
                flushSync();
                el = container.querySelector<HTMLElement>(".cs-kpi-card-label");
                expect(el?.tagName).toBe(tag.toUpperCase());
                expect(ref).toBe(el);
            }

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("KpiCardIcon sets aria-hidden='true', data-color, contextual strokeWidth, and explicit overrides", () => {
            let size = $state<KpiCardSize>("sm");
            let color = $state<KpiCardColor | undefined>(undefined);
            let strokeWidth = $state<number | string | undefined>(undefined);
            let iconRef: HTMLSpanElement | null = null;

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    get size() {
                        return size;
                    },
                    showHeader: true,
                    showIcon: true,
                    get iconColor() {
                        return color;
                    },
                    get iconStrokeWidth() {
                        return strokeWidth;
                    },
                    iconAttrs: { class: "custom-icon", "data-testid": "kpi-icon" },
                    get iconRef() {
                        return iconRef;
                    },
                    set iconRef(el: HTMLSpanElement | null) {
                        iconRef = el;
                    },
                },
            });
            flushSync();

            const iconEl = container.querySelector<HTMLSpanElement>("span.cs-kpi-card-icon");
            const svgEl = iconEl?.querySelector<SVGSVGElement>("svg");
            expect(iconEl).not.toBeNull();
            expect(iconEl?.getAttribute("aria-hidden")).toBe("true");
            expect(iconEl?.classList.contains("custom-icon")).toBe(true);
            expect(iconEl?.dataset.testid).toBe("kpi-icon");
            expect(iconEl?.dataset.color).toBe("base");
            expect(svgEl?.dataset.strokeWidth).toBe("2.25");
            expect(iconRef).toBe(iconEl);

            size = "md";
            flushSync();
            expect(svgEl?.dataset.strokeWidth).toBe("2.25");

            size = "lg";
            flushSync();
            expect(svgEl?.dataset.strokeWidth).toBe("2");

            // Explicit strokeWidth overrides context, clearing restores context
            strokeWidth = 1.5;
            flushSync();
            expect(svgEl?.dataset.strokeWidth).toBe("1.5");

            strokeWidth = undefined;
            flushSync();
            expect(svgEl?.dataset.strokeWidth).toBe("2");

            for (const nextColor of KPI_CARD_COLORS) {
                color = nextColor;
                flushSync();
                expect(iconEl?.dataset.color).toBe(nextColor);
            }

            unmount(instance);
            expect(iconRef).toBeNull();
        });

        test("KpiCardIcon defaults strokeWidth to 2.25 outside KpiCard context", () => {
            const instance = mount(KpiCardIcon, {
                target: container,
                props: {
                    icon: KpiCardTestIcon,
                },
            });
            flushSync();

            const svgEl = container.querySelector<SVGSVGElement>(":scope .cs-kpi-card-icon svg");
            expect(svgEl?.dataset.strokeWidth).toBe("2.25");

            unmount(instance);
        });
    });

    describe("Metric, Value & Delta", () => {
        test("KpiCardMetric and KpiCardComparison render canonical elements, refs, and rest props", () => {
            let metricRef: HTMLDivElement | null = null;
            let comparisonRef: HTMLParagraphElement | null = null;

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    showMetric: true,
                    metricAttrs: { class: "custom-metric", "data-testid": "metric" },
                    get metricRef() {
                        return metricRef;
                    },
                    set metricRef(el: HTMLDivElement | null) {
                        metricRef = el;
                    },
                    showComparison: true,
                    comparisonText: "vs. last week",
                    comparisonAttrs: { class: "custom-comparison", "data-testid": "comparison" },
                    get comparisonRef() {
                        return comparisonRef;
                    },
                    set comparisonRef(el: HTMLParagraphElement | null) {
                        comparisonRef = el;
                    },
                },
            });
            flushSync();

            const metric = container.querySelector<HTMLDivElement>("div.cs-kpi-card-metric");
            const comparison = container.querySelector<HTMLParagraphElement>("p.cs-kpi-card-comparison");
            expect(metric).not.toBeNull();
            expect(metric?.classList.contains("custom-metric")).toBe(true);
            expect(metric?.dataset.testid).toBe("metric");
            expect(metricRef).toBe(metric);

            expect(comparison).not.toBeNull();
            expect(comparison?.tagName).toBe("P");
            expect(comparison?.classList.contains("custom-comparison")).toBe(true);
            expect(comparison?.dataset.testid).toBe("comparison");
            expect(comparison?.textContent?.trim()).toBe("vs. last week");
            expect(comparisonRef).toBe(comparison);

            unmount(instance);
            expect(metricRef).toBeNull();
            expect(comparisonRef).toBeNull();

            const directMetric = mount(KpiCardMetric, { target: container });
            const directComparison = mount(KpiCardComparison, { target: container });
            flushSync();
            expect(container.querySelector("div.cs-kpi-card-metric")).not.toBeNull();
            expect(container.querySelector("p.cs-kpi-card-comparison")).not.toBeNull();
            unmount(directMetric);
            unmount(directComparison);
        });

        test("KpiCardValue renders prefix and suffix conditionally and forwards ref and rest attributes", () => {
            let prefix = $state<string | undefined>("€");
            let suffix = $state<string | undefined>("k");
            let ref: HTMLDivElement | null = null;

            const instance = mount(KpiCardValue, {
                target: container,
                props: {
                    get prefix() {
                        return prefix;
                    },
                    get suffix() {
                        return suffix;
                    },
                    class: "custom-value",
                    "data-testid": "kpi-value",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const valueEl = container.querySelector<HTMLDivElement>("div.cs-kpi-card-value");
            expect(valueEl).not.toBeNull();
            expect(valueEl?.classList.contains("custom-value")).toBe(true);
            expect(valueEl?.dataset.testid).toBe("kpi-value");
            expect(valueEl?.querySelector(".cs-kpi-card-value-prefix")?.textContent).toBe("€");
            expect(valueEl?.querySelector(".cs-kpi-card-value-suffix")?.textContent).toBe("k");
            expect(ref).toBe(valueEl);

            prefix = undefined;
            suffix = undefined;
            flushSync();
            expect(valueEl?.querySelector(".cs-kpi-card-value-prefix")).toBeNull();
            expect(valueEl?.querySelector(".cs-kpi-card-value-suffix")).toBeNull();

            prefix = "$";
            flushSync();
            expect(valueEl?.querySelector(".cs-kpi-card-value-prefix")?.textContent).toBe("$");
            expect(valueEl?.querySelector(".cs-kpi-card-value-suffix")).toBeNull();

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("KpiCardDelta resolves color from trend, allows inverted metric override, and toggles icon/dot rendering", () => {
            let trend = $state<KpiCardDeltaTrend | undefined>(undefined);
            let color = $state<KpiCardColor | undefined>(undefined);
            let variant = $state<KpiCardDeltaVariant | undefined>(undefined);
            let showIcon = $state<boolean | undefined>(undefined);
            let customIcon = $state<typeof KpiCardTestIcon | undefined>(undefined);
            let ref: HTMLSpanElement | null = null;

            const instance = mount(KpiCardDelta, {
                target: container,
                props: {
                    get trend() {
                        return trend;
                    },
                    get color() {
                        return color;
                    },
                    get variant() {
                        return variant;
                    },
                    get showIcon() {
                        return showIcon;
                    },
                    get icon() {
                        return customIcon;
                    },
                    class: "custom-delta",
                    "data-testid": "kpi-delta",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLSpanElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const delta = container.querySelector<HTMLSpanElement>("span.cs-kpi-card-delta");
            expect(delta).not.toBeNull();
            expect(delta?.classList.contains("custom-delta")).toBe(true);
            expect(delta?.dataset.testid).toBe("kpi-delta");
            expect(delta?.dataset.variant).toBe("soft");
            expect(delta?.dataset.color).toBe("base");
            expect(delta?.hasAttribute("data-trend")).toBe(false);
            expect(delta?.querySelector(".cs-kpi-card-delta-icon")).toBeNull();
            expect(delta?.querySelector(".cs-kpi-card-delta-dot")).toBeNull();
            expect(ref).toBe(delta);

            // Trend -> smart color & icon mapping
            const expectedColors: Record<KpiCardDeltaTrend, KpiCardColor> = {
                up: "positive",
                down: "negative",
                flat: "base",
            };
            for (const nextTrend of KPI_CARD_DELTA_TRENDS) {
                trend = nextTrend;
                flushSync();
                expect(delta?.dataset.trend).toBe(nextTrend);
                expect(delta?.dataset.color).toBe(expectedColors[nextTrend]);
                const iconSvg = delta?.querySelector<SVGSVGElement>("svg.cs-kpi-card-delta-icon");
                expect(iconSvg).not.toBeNull();
                expect(iconSvg?.getAttribute("aria-hidden")).toBe("true");
            }

            // Inverted metric override: down trend with positive color, then clear override
            trend = "down";
            color = "positive";
            flushSync();
            expect(delta?.dataset.trend).toBe("down");
            expect(delta?.dataset.color).toBe("positive");

            color = undefined;
            flushSync();
            expect(delta?.dataset.color).toBe("negative");

            // Custom icon override works with or without trend
            customIcon = KpiCardTestIcon;
            flushSync();
            expect(delta?.querySelector<SVGSVGElement>("svg.cs-kpi-card-delta-icon")?.dataset.strokeWidth).toBe("2.25");

            trend = undefined;
            flushSync();
            expect(delta?.querySelector<SVGSVGElement>("svg.cs-kpi-card-delta-icon")?.dataset.strokeWidth).toBe("2.25");

            // showIcon={false} hides icon
            showIcon = false;
            trend = "up";
            flushSync();
            expect(delta?.querySelector(".cs-kpi-card-delta-icon")).toBeNull();

            // variant="dot" renders dot instead of icon even when showIcon is true
            showIcon = true;
            variant = "dot";
            flushSync();
            expect(delta?.dataset.variant).toBe("dot");
            expect(delta?.querySelector(".cs-kpi-card-delta-icon")).toBeNull();
            const dot = delta?.querySelector<HTMLSpanElement>(".cs-kpi-card-delta-dot");
            expect(dot).not.toBeNull();
            expect(dot?.getAttribute("aria-hidden")).toBe("true");

            // Switching variant="plain" restores custom/trend icon and removes dot
            variant = "plain";
            flushSync();
            expect(delta?.dataset.variant).toBe("plain");
            expect(delta?.querySelector(".cs-kpi-card-delta-dot")).toBeNull();
            expect(delta?.querySelector(".cs-kpi-card-delta-icon")).not.toBeNull();

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("KpiCardDelta defaults variant to 'plain' in inline layout or nested KpiCard, and 'soft' otherwise", () => {
            let layout = $state<KpiCardLayout>("stack");
            let deltaVariant = $state<KpiCardDeltaVariant | undefined>(undefined);
            let innerDeltaVariant = $state<KpiCardDeltaVariant | undefined>(undefined);

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    get layout() {
                        return layout;
                    },
                    showDelta: true,
                    deltaTrend: "up",
                    get deltaVariant() {
                        return deltaVariant;
                    },
                    deltaAttrs: { "data-testid": "ctx-delta" },
                    showInnerKpiCard: true,
                    innerVariant: "soft",
                    innerSize: "sm",
                    innerLayout: "stack",
                    showInnerDelta: true,
                    get innerDeltaVariant() {
                        return innerDeltaVariant;
                    },
                },
            });
            flushSync();

            const getDelta = (): HTMLSpanElement | null =>
                container.querySelector<HTMLSpanElement>('[data-testid="ctx-delta"]');
            const getInnerDelta = (): HTMLSpanElement | null =>
                container.querySelector<HTMLSpanElement>('[data-testid="inner-delta"]');

            expect(getDelta()?.dataset.variant).toBe("soft");
            expect(getInnerDelta()?.dataset.variant).toBe("plain");

            layout = "inline";
            flushSync();
            expect(getDelta()?.dataset.variant).toBe("plain");

            layout = "hero";
            flushSync();
            expect(getDelta()?.dataset.variant).toBe("soft");

            layout = "split";
            flushSync();
            expect(getDelta()?.dataset.variant).toBe("soft");

            // Explicit variant overrides inline context, clearing restores inline default
            layout = "inline";
            deltaVariant = "soft";
            flushSync();
            expect(getDelta()?.dataset.variant).toBe("soft");

            deltaVariant = undefined;
            flushSync();
            expect(getDelta()?.dataset.variant).toBe("plain");

            // Explicit variant="soft" inside a nested KpiCard overrides the nested "plain" default
            innerDeltaVariant = "soft";
            flushSync();
            expect(getInnerDelta()?.dataset.variant).toBe("soft");

            innerDeltaVariant = undefined;
            flushSync();
            expect(getInnerDelta()?.dataset.variant).toBe("plain");

            unmount(instance);
        });
    });

    describe("Target (KpiCardTarget wrapping Progress)", () => {
        test("derives Progress variant and size from KpiCard context and respects explicit overrides", () => {
            let cardVariant = $state<KpiCardVariant>("elevated");
            let cardSize = $state<KpiCardSize>("sm");
            let targetVariant = $state<ProgressVariant | undefined>(undefined);
            let targetSize = $state<ProgressSize | undefined>(undefined);
            let targetRef: HTMLDivElement | null = null;

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    get variant() {
                        return cardVariant;
                    },
                    get size() {
                        return cardSize;
                    },
                    showTarget: true,
                    targetValue: 64,
                    targetLabel: "Quarterly quota",
                    targetReadout: "64%",
                    targetAttrs: { class: "custom-target", "data-testid": "kpi-target" },
                    get targetRef() {
                        return targetRef;
                    },
                    set targetRef(el: HTMLDivElement | null) {
                        targetRef = el;
                    },
                    get targetVariant() {
                        return targetVariant;
                    },
                    get targetSize() {
                        return targetSize;
                    },
                },
            });
            flushSync();

            const targetEl = container.querySelector<HTMLDivElement>("div.cs-kpi-card-target");
            const progressEl = targetEl?.querySelector<HTMLDivElement>(".cs-progress");
            expect(targetEl).not.toBeNull();
            expect(targetEl?.classList.contains("custom-target")).toBe(true);
            expect(targetEl?.dataset.testid).toBe("kpi-target");
            expect(targetRef).toBe(targetEl);

            // elevated/transparent -> soft Progress; soft/sunken -> elevated Progress
            const expectedProgressVariants: Record<KpiCardVariant, ProgressVariant> = {
                elevated: "soft",
                transparent: "soft",
                soft: "elevated",
                sunken: "elevated",
            };
            for (const nextCardVariant of KPI_CARD_VARIANTS) {
                cardVariant = nextCardVariant;
                flushSync();
                expect(progressEl?.dataset.variant).toBe(expectedProgressVariants[nextCardVariant]);
            }

            // sm/md -> sm Progress; lg -> md Progress
            expect(progressEl?.dataset.size).toBe("sm");
            cardSize = "md";
            flushSync();
            expect(progressEl?.dataset.size).toBe("sm");
            cardSize = "lg";
            flushSync();
            expect(progressEl?.dataset.size).toBe("md");

            // Explicit overrides win and restore on clear
            targetVariant = "soft";
            targetSize = "lg";
            flushSync();
            expect(progressEl?.dataset.variant).toBe("soft");
            expect(progressEl?.dataset.size).toBe("lg");

            targetVariant = undefined;
            targetSize = undefined;
            flushSync();
            expect(progressEl?.dataset.variant).toBe("soft");
            expect(progressEl?.dataset.size).toBe("md");

            unmount(instance);
            expect(targetRef).toBeNull();
        });

        test("wires aria-labelledby to label id, falls back to localized aria-label, forwards Progress props, and handles custom children", () => {
            let value = $state<number | null | undefined>(75);
            let min = $state(10);
            let max = $state(110);
            let appearance = $state<ProgressAppearance>("bar");
            let color = $state<ProgressColor>("accent");
            let segments = $state<number | undefined>(undefined);
            let label = $state<string | undefined>("Pipeline goal");
            let target = $state<string | undefined>("75 / 110");

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    showTarget: true,
                    get targetValue() {
                        return value;
                    },
                    get targetMin() {
                        return min;
                    },
                    get targetMax() {
                        return max;
                    },
                    get targetAppearance() {
                        return appearance;
                    },
                    get targetColor() {
                        return color;
                    },
                    get targetSegments() {
                        return segments;
                    },
                    get targetLabel() {
                        return label;
                    },
                    get targetReadout() {
                        return target;
                    },
                },
            });
            flushSync();

            const targetEl = container.querySelector<HTMLDivElement>(".cs-kpi-card-target");
            const labelSpan = targetEl?.querySelector<HTMLSpanElement>(".cs-kpi-card-target-label");
            const readoutSpan = targetEl?.querySelector<HTMLSpanElement>(".cs-kpi-card-target-readout");
            const progressEl = targetEl?.querySelector<HTMLDivElement>(".cs-progress");

            expect(labelSpan?.textContent).toBe("Pipeline goal");
            expect(labelSpan?.id).toBeTruthy();
            expect(readoutSpan?.textContent).toBe("75 / 110");
            expect(progressEl?.getAttribute("role")).toBe("progressbar");
            expect(progressEl?.getAttribute("aria-labelledby")).toBe(labelSpan?.id);
            expect(progressEl?.hasAttribute("aria-label")).toBe(false);
            expect(progressEl?.getAttribute("aria-valuenow")).toBe("75");
            expect(progressEl?.getAttribute("aria-valuemin")).toBe("10");
            expect(progressEl?.getAttribute("aria-valuemax")).toBe("110");
            expect(progressEl?.dataset.appearance).toBe("bar");
            expect(progressEl?.dataset.color).toBe("accent");

            // Dashed appearance & custom segments + reactive min/max forwarding
            appearance = "dashed";
            color = "positive";
            segments = 5;
            min = 0;
            max = 200;
            flushSync();
            expect(progressEl?.dataset.appearance).toBe("dashed");
            expect(progressEl?.dataset.color).toBe("positive");
            expect(progressEl?.getAttribute("aria-valuemin")).toBe("0");
            expect(progressEl?.getAttribute("aria-valuemax")).toBe("200");
            expect(progressEl?.querySelectorAll(".cs-progress-segment")).toHaveLength(5);

            // Removing label switches to fallback localized aria-label; removing target hides meta row
            label = undefined;
            flushSync();
            expect(targetEl?.querySelector(".cs-kpi-card-target-label")).toBeNull();
            expect(progressEl?.hasAttribute("aria-labelledby")).toBe(false);
            expect(progressEl?.getAttribute("aria-label")).toBe("Target progress");
            expect(targetEl?.querySelector(".cs-kpi-card-target-meta")).not.toBeNull();

            target = undefined;
            flushSync();
            expect(targetEl?.querySelector(".cs-kpi-card-target-meta")).toBeNull();

            // Explicit value=0 renders Progress with aria-valuenow="0" (not treated as falsy/omitted)
            value = 0;
            flushSync();
            const zeroProgressEl = targetEl?.querySelector<HTMLDivElement>(".cs-progress");
            expect(zeroProgressEl).not.toBeNull();
            expect(zeroProgressEl?.getAttribute("aria-valuenow")).toBe("0");
            expect(zeroProgressEl?.hasAttribute("data-indeterminate")).toBe(false);

            // Standalone indeterminate Progress when value is undefined and no children
            value = undefined;
            flushSync();
            expect(targetEl?.querySelector(".cs-progress")?.hasAttribute("data-indeterminate")).toBe(true);

            unmount(instance);

            // Custom children suppress Progress ONLY when value === undefined (0 and null both render Progress alongside children)
            let childValue = $state<number | null | undefined>(undefined);
            const customChildInstance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    showTarget: true,
                    get targetValue() {
                        return childValue;
                    },
                    targetChildrenText: "Custom gauge",
                },
            });
            flushSync();

            expect(container.querySelector(":scope .cs-kpi-card-target .cs-progress")).toBeNull();
            expect(container.querySelector('[data-testid="target-custom-child"]')?.textContent).toBe("Custom gauge");

            childValue = null;
            flushSync();
            const nullChildProgress = container.querySelector<HTMLDivElement>(":scope .cs-kpi-card-target .cs-progress");
            expect(nullChildProgress).not.toBeNull();
            expect(nullChildProgress?.hasAttribute("data-indeterminate")).toBe(true);
            expect(nullChildProgress?.hasAttribute("aria-valuenow")).toBe(false);
            expect(container.querySelector('[data-testid="target-custom-child"]')?.textContent).toBe("Custom gauge");

            childValue = 0;
            flushSync();
            const zeroChildProgress = container.querySelector<HTMLDivElement>(":scope .cs-kpi-card-target .cs-progress");
            expect(zeroChildProgress).not.toBeNull();
            expect(zeroChildProgress?.getAttribute("aria-valuenow")).toBe("0");
            expect(zeroChildProgress?.hasAttribute("data-indeterminate")).toBe(false);
            expect(container.querySelector('[data-testid="target-custom-child"]')?.textContent).toBe("Custom gauge");

            childValue = 40;
            flushSync();
            expect(container.querySelector(":scope .cs-kpi-card-target .cs-progress")?.getAttribute("aria-valuenow")).toBe(
                "40"
            );
            expect(container.querySelector('[data-testid="target-custom-child"]')?.textContent).toBe("Custom gauge");

            unmount(customChildInstance);

            // Standalone KpiCardTarget defaults Progress variant="soft", size="sm"
            const standaloneInstance = mount(KpiCardTarget, {
                target: container,
                props: { value: 50 },
            });
            flushSync();

            const standaloneProgress = container.querySelector<HTMLDivElement>(
                ":scope .cs-kpi-card-target .cs-progress"
            );
            expect(standaloneProgress?.dataset.variant).toBe("soft");
            expect(standaloneProgress?.dataset.size).toBe("sm");

            unmount(standaloneInstance);
        });
    });

    describe("Visual, Breakdown, Actions, Ornament, Close & Group", () => {
        test("KpiCardVisual derives placement from KpiCard layout and handles variant, ratio, bleed, and ref", () => {
            let layout = $state<KpiCardLayout>("stack");
            let placement = $state<KpiCardVisualPlacement | undefined>(undefined);
            let variant = $state<KpiCardVisualVariant | undefined>(undefined);
            let ratio = $state<KpiCardVisualRatio | undefined>(undefined);
            let bleed = $state<boolean | undefined>(undefined);
            let visualRef: HTMLDivElement | null = null;

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    get layout() {
                        return layout;
                    },
                    showVisual: true,
                    get visualPlacement() {
                        return placement;
                    },
                    get visualVariant() {
                        return variant;
                    },
                    get visualRatio() {
                        return ratio;
                    },
                    get visualBleed() {
                        return bleed;
                    },
                    visualAttrs: { class: "custom-visual", "data-testid": "kpi-visual" },
                    get visualRef() {
                        return visualRef;
                    },
                    set visualRef(el: HTMLDivElement | null) {
                        visualRef = el;
                    },
                },
            });
            flushSync();

            const getVisual = (): HTMLDivElement | null =>
                container.querySelector<HTMLDivElement>("div.cs-kpi-card-visual");
            expect(getVisual()).not.toBeNull();
            expect(getVisual()?.classList.contains("custom-visual")).toBe(true);
            expect(getVisual()?.dataset.testid).toBe("kpi-visual");
            expect(getVisual()?.dataset.placement).toBe("bottom");
            expect(getVisual()?.dataset.variant).toBe("transparent");
            expect(getVisual()?.dataset.ratio).toBe("auto");
            expect(getVisual()?.hasAttribute("data-bleed")).toBe(false);
            expect(getVisual()?.style.getPropertyValue("--cs-kpi-card-visual-ratio")).toBe("");
            expect(visualRef).toBe(getVisual());

            // Contextual placement across all layouts (split remounts children inside .cs-kpi-card-split)
            layout = "split";
            flushSync();
            expect(getVisual()?.dataset.placement).toBe("end");
            expect(visualRef).toBe(getVisual());

            layout = "inline";
            flushSync();
            expect(getVisual()?.dataset.placement).toBe("end");
            expect(visualRef).toBe(getVisual());

            layout = "hero";
            flushSync();
            expect(getVisual()?.dataset.placement).toBe("bottom");

            // Explicit placement overrides context and clearing restores
            placement = "start";
            flushSync();
            expect(getVisual()?.dataset.placement).toBe("start");

            placement = undefined;
            layout = "split";
            flushSync();
            expect(getVisual()?.dataset.placement).toBe("end");

            for (const nextPlacement of KPI_CARD_VISUAL_PLACEMENTS) {
                placement = nextPlacement;
                flushSync();
                expect(getVisual()?.dataset.placement).toBe(nextPlacement);
            }

            for (const nextVariant of KPI_CARD_VISUAL_VARIANTS) {
                variant = nextVariant;
                flushSync();
                expect(getVisual()?.dataset.variant).toBe(nextVariant);
            }

            for (const nextRatio of KPI_CARD_VISUAL_RATIOS) {
                ratio = nextRatio;
                flushSync();
                if (nextRatio === "auto") {
                    expect(getVisual()?.dataset.ratio).toBe("auto");
                    expect(getVisual()?.style.getPropertyValue("--cs-kpi-card-visual-ratio")).toBe("");
                } else {
                    expect(getVisual()?.hasAttribute("data-ratio")).toBe(false);
                    expect(getVisual()?.style.getPropertyValue("--cs-kpi-card-visual-ratio")).toBe(nextRatio);
                }
            }

            ratio = "3/2";
            flushSync();
            expect(getVisual()?.hasAttribute("data-ratio")).toBe(false);
            expect(getVisual()?.style.getPropertyValue("--cs-kpi-card-visual-ratio")).toBe("3/2");

            ratio = "auto";
            flushSync();
            expect(getVisual()?.dataset.ratio).toBe("auto");
            expect(getVisual()?.style.getPropertyValue("--cs-kpi-card-visual-ratio")).toBe("");

            bleed = true;
            flushSync();
            expect(getVisual()?.dataset.bleed).toBe("");

            bleed = false;
            flushSync();
            expect(getVisual()?.hasAttribute("data-bleed")).toBe(false);

            unmount(instance);
            expect(visualRef).toBeNull();

            // Standalone KpiCardVisual defaults placement to "bottom"
            const standaloneVisual = mount(KpiCardVisual, { target: container });
            flushSync();
            expect(container.querySelector<HTMLDivElement>(".cs-kpi-card-visual")?.dataset.placement).toBe("bottom");
            unmount(standaloneVisual);
        });

        test("KpiCardBreakdown and KpiCardBreakdownItem render variant, columns, dotColor, value/share, and conditional slots", () => {
            let variant = $state<KpiCardBreakdownVariant | undefined>(undefined);
            let columns = $state<KpiCardBreakdownColumns | undefined>(undefined);
            let breakdownRef: HTMLDivElement | null = null;

            const breakdownInstance = mount(KpiCardBreakdown, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get columns() {
                        return columns;
                    },
                    class: "custom-breakdown",
                    "data-testid": "breakdown",
                    get ref() {
                        return breakdownRef;
                    },
                    set ref(el: HTMLDivElement | null) {
                        breakdownRef = el;
                    },
                },
            });
            flushSync();

            const breakdown = container.querySelector<HTMLDivElement>("div.cs-kpi-card-breakdown");
            expect(breakdown).not.toBeNull();
            expect(breakdown?.classList.contains("custom-breakdown")).toBe(true);
            expect(breakdown?.dataset.testid).toBe("breakdown");
            expect(breakdown?.dataset.variant).toBe("plain");
            expect(breakdown?.dataset.columns).toBe("auto");
            expect(breakdownRef).toBe(breakdown);

            for (const nextVariant of KPI_CARD_BREAKDOWN_VARIANTS) {
                variant = nextVariant;
                flushSync();
                expect(breakdown?.dataset.variant).toBe(nextVariant);
            }

            for (const nextColumns of KPI_CARD_BREAKDOWN_COLUMNS) {
                columns = nextColumns;
                flushSync();
                expect(breakdown?.dataset.columns).toBe(String(nextColumns));
            }

            unmount(breakdownInstance);
            expect(breakdownRef).toBeNull();

            // KpiCardBreakdownItem slots & decorative dot
            let dotColor = $state<KpiCardColor | undefined>("accent");
            let label = $state<string | undefined>("Direct");
            let value = $state<string | number | undefined>(1240);
            let share = $state<string | undefined>("45%");
            let itemRef: HTMLDivElement | null = null;

            const itemInstance = mount(KpiCardBreakdownItem, {
                target: container,
                props: {
                    get label() {
                        return label;
                    },
                    get value() {
                        return value;
                    },
                    get share() {
                        return share;
                    },
                    get dotColor() {
                        return dotColor;
                    },
                    class: "custom-item",
                    "data-testid": "breakdown-item",
                    get ref() {
                        return itemRef;
                    },
                    set ref(el: HTMLDivElement | null) {
                        itemRef = el;
                    },
                },
            });
            flushSync();

            const item = container.querySelector<HTMLDivElement>("div.cs-kpi-card-breakdown-item");
            expect(item).not.toBeNull();
            expect(item?.classList.contains("custom-item")).toBe(true);
            expect(item?.dataset.testid).toBe("breakdown-item");
            expect(item?.dataset.dotColor).toBe("accent");
            expect(itemRef).toBe(item);

            const dot = item?.querySelector<HTMLSpanElement>(".cs-kpi-card-breakdown-dot");
            expect(dot).not.toBeNull();
            expect(dot?.getAttribute("aria-hidden")).toBe("true");
            expect(item?.querySelector(".cs-kpi-card-breakdown-label-text")?.textContent).toBe("Direct");
            expect(item?.querySelector(".cs-kpi-card-breakdown-value")?.textContent).toBe("1240");
            expect(item?.querySelector(".cs-kpi-card-breakdown-share")?.textContent).toBe("45%");

            for (const nextColor of KPI_CARD_COLORS) {
                dotColor = nextColor;
                flushSync();
                expect(item?.dataset.dotColor).toBe(nextColor);
            }

            // Omitting dotColor removes dot; omitting label & dotColor removes label container
            dotColor = undefined;
            flushSync();
            expect(item?.hasAttribute("data-dot-color")).toBe(false);
            expect(item?.querySelector(".cs-kpi-card-breakdown-dot")).toBeNull();
            expect(item?.querySelector(".cs-kpi-card-breakdown-label")).not.toBeNull();

            label = undefined;
            flushSync();
            expect(item?.querySelector(".cs-kpi-card-breakdown-label")).toBeNull();

            // Omitting value & share removes end container
            value = undefined;
            share = undefined;
            flushSync();
            expect(item?.querySelector(".cs-kpi-card-breakdown-end")).toBeNull();

            unmount(itemInstance);
            expect(itemRef).toBeNull();
        });

        test("KpiCardActions, KpiCardBody, KpiCardFooter, and KpiCardOrnament expose canonical attributes and refs", () => {
            let align = $state<KpiCardActionsAlign | undefined>(undefined);
            let orientation = $state<KpiCardActionsOrientation | undefined>(undefined);
            let actionsRef: HTMLDivElement | null = null;

            const actionsInstance = mount(KpiCardActions, {
                target: container,
                props: {
                    get align() {
                        return align;
                    },
                    get orientation() {
                        return orientation;
                    },
                    class: "custom-actions",
                    "data-testid": "kpi-actions",
                    get ref() {
                        return actionsRef;
                    },
                    set ref(el: HTMLDivElement | null) {
                        actionsRef = el;
                    },
                },
            });
            flushSync();

            const actions = container.querySelector<HTMLDivElement>("div.cs-kpi-card-actions");
            expect(actions).not.toBeNull();
            expect(actions?.classList.contains("custom-actions")).toBe(true);
            expect(actions?.dataset.testid).toBe("kpi-actions");
            expect(actions?.dataset.align).toBe("end");
            expect(actions?.dataset.orientation).toBe("horizontal");
            expect(actionsRef).toBe(actions);

            for (const nextAlign of KPI_CARD_ACTIONS_ALIGNS) {
                align = nextAlign;
                flushSync();
                expect(actions?.dataset.align).toBe(nextAlign);
            }

            for (const nextOrientation of KPI_CARD_ACTIONS_ORIENTATIONS) {
                orientation = nextOrientation;
                flushSync();
                expect(actions?.dataset.orientation).toBe(nextOrientation);
            }

            unmount(actionsInstance);
            expect(actionsRef).toBeNull();

            // Direct KpiCardActions inside KpiCard (without KpiCardFooter) under layout="inline" and layout="split"
            let directLayout = $state<KpiCardLayout>("inline");
            let directActionsRef: HTMLDivElement | null = null;

            const directActionsHost = mount(KpiCardTestHost, {
                target: container,
                props: {
                    get layout() {
                        return directLayout;
                    },
                    showHeader: true,
                    showValue: true,
                    showFooter: false,
                    showActions: true,
                    actionsAlign: "start",
                    actionsOrientation: "vertical",
                    actionsAttrs: { "data-testid": "direct-actions" },
                    get actionsRef() {
                        return directActionsRef;
                    },
                    set actionsRef(el: HTMLDivElement | null) {
                        directActionsRef = el;
                    },
                },
            });
            flushSync();

            const directRoot = container.querySelector<HTMLDivElement>("div.cs-kpi-card");
            const inlineActions = container.querySelector<HTMLDivElement>('[data-testid="direct-actions"]');
            expect(directRoot?.dataset.layout).toBe("inline");
            expect(directRoot?.querySelector(".cs-kpi-card-footer")).toBeNull();
            expect(inlineActions).not.toBeNull();
            expect(inlineActions?.parentElement).toBe(directRoot);
            expect(inlineActions?.dataset.align).toBe("start");
            expect(inlineActions?.dataset.orientation).toBe("vertical");
            expect(inlineActions?.querySelector("button")?.textContent).toBe("Action");
            expect(directActionsRef).toBe(inlineActions);

            directLayout = "split";
            flushSync();

            const splitContainer = directRoot?.querySelector<HTMLDivElement>(":scope > .cs-kpi-card-split");
            const splitActions = container.querySelector<HTMLDivElement>('[data-testid="direct-actions"]');
            expect(directRoot?.dataset.layout).toBe("split");
            expect(directRoot?.querySelector(".cs-kpi-card-footer")).toBeNull();
            expect(splitContainer).not.toBeNull();
            expect(splitActions).not.toBeNull();
            expect(splitActions?.parentElement).toBe(splitContainer);
            expect(splitActions?.dataset.align).toBe("start");
            expect(splitActions?.dataset.orientation).toBe("vertical");
            expect(splitActions?.querySelector("button")?.textContent).toBe("Action");
            expect(directActionsRef).toBe(splitActions);

            unmount(directActionsHost);
            expect(directActionsRef).toBeNull();

            // Body & Footer via host
            let bodyRef: HTMLDivElement | null = null;
            let footerRef: HTMLDivElement | null = null;

            const hostInstance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    showBody: true,
                    bodyAttrs: { class: "custom-body", "data-testid": "kpi-body" },
                    get bodyRef() {
                        return bodyRef;
                    },
                    set bodyRef(el: HTMLDivElement | null) {
                        bodyRef = el;
                    },
                    showFooter: true,
                    footerAttrs: { class: "custom-footer", "data-testid": "kpi-footer" },
                    get footerRef() {
                        return footerRef;
                    },
                    set footerRef(el: HTMLDivElement | null) {
                        footerRef = el;
                    },
                },
            });
            flushSync();

            const body = container.querySelector<HTMLDivElement>("div.cs-kpi-card-body");
            const footer = container.querySelector<HTMLDivElement>("div.cs-kpi-card-footer");
            expect(body?.classList.contains("custom-body")).toBe(true);
            expect(body?.dataset.testid).toBe("kpi-body");
            expect(bodyRef).toBe(body);

            expect(footer?.classList.contains("custom-footer")).toBe(true);
            expect(footer?.dataset.testid).toBe("kpi-footer");
            expect(footerRef).toBe(footer);

            unmount(hostInstance);
            expect(bodyRef).toBeNull();
            expect(footerRef).toBeNull();

            // Standalone Body/Footer & Ornament
            const bodyDirect = mount(KpiCardBody, { target: container });
            const footerDirect = mount(KpiCardFooter, { target: container });
            flushSync();
            expect(container.querySelector(".cs-kpi-card-body")).not.toBeNull();
            expect(container.querySelector(".cs-kpi-card-footer")).not.toBeNull();
            unmount(bodyDirect);
            unmount(footerDirect);

            let ornamentPlacement = $state<KpiCardOrnamentPlacement | undefined>(undefined);
            let ornamentShape = $state<KpiCardOrnamentShape | undefined>(undefined);
            let ornamentRef: HTMLDivElement | null = null;

            const ornamentInstance = mount(KpiCardOrnament, {
                target: container,
                props: {
                    get placement() {
                        return ornamentPlacement;
                    },
                    get shape() {
                        return ornamentShape;
                    },
                    class: "custom-ornament",
                    "data-testid": "kpi-ornament",
                    get ref() {
                        return ornamentRef;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ornamentRef = el;
                    },
                },
            });
            flushSync();

            const ornament = container.querySelector<HTMLDivElement>("div.cs-kpi-card-ornament");
            expect(ornament).not.toBeNull();
            expect(ornament?.getAttribute("aria-hidden")).toBe("true");
            expect(ornament?.classList.contains("custom-ornament")).toBe(true);
            expect(ornament?.dataset.testid).toBe("kpi-ornament");
            expect(ornament?.dataset.placement).toBe("bottom-left");
            expect(ornament?.dataset.shape).toBe("none");
            expect(ornamentRef).toBe(ornament);

            for (const nextPlacement of KPI_CARD_ORNAMENT_PLACEMENTS) {
                ornamentPlacement = nextPlacement;
                flushSync();
                expect(ornament?.dataset.placement).toBe(nextPlacement);
            }

            for (const nextShape of KPI_CARD_ORNAMENT_SHAPES) {
                ornamentShape = nextShape;
                flushSync();
                expect(ornament?.dataset.shape).toBe(nextShape);
            }

            unmount(ornamentInstance);
            expect(ornamentRef).toBeNull();
        });

        test("KpiCardClose derives proportional size from KpiCard context, handles standalone default, clicks, disabled, and ref", () => {
            let cardSize = $state<KpiCardSize>("sm");
            let closeSize = $state<CloseButtonSize | undefined>(undefined);
            let closeVariant = $state<CloseButtonVariant>("soft");
            let closeDisabled = $state(false);
            let closeRef: HTMLButtonElement | null = null;
            const onCloseClick = vi.fn();

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    get size() {
                        return cardSize;
                    },
                    showClose: true,
                    get closeVariant() {
                        return closeVariant;
                    },
                    get closeSize() {
                        return closeSize;
                    },
                    get closeDisabled() {
                        return closeDisabled;
                    },
                    closeAttrs: { class: "custom-close", "data-testid": "kpi-close" },
                    onCloseClick,
                    get closeRef() {
                        return closeRef;
                    },
                    set closeRef(el: HTMLButtonElement | null) {
                        closeRef = el;
                    },
                },
            });
            flushSync();

            const btn = container.querySelector<HTMLButtonElement>("button.cs-kpi-card-close");
            expect(btn).not.toBeNull();
            expect(btn?.classList.contains("cs-close-button")).toBe(true);
            expect(btn?.classList.contains("custom-close")).toBe(true);
            expect(btn?.dataset.testid).toBe("kpi-close");
            expect(btn?.dataset.variant).toBe("soft");
            expect(btn?.dataset.size).toBe("xs");
            expect(btn?.querySelector(".cs-hit-area")).not.toBeNull();
            expect(closeRef).toBe(btn);

            cardSize = "md";
            flushSync();
            expect(btn?.dataset.size).toBe("sm");

            cardSize = "lg";
            flushSync();
            expect(btn?.dataset.size).toBe("md");

            // Explicit size override wins, clearing restores proportional mapping
            closeSize = "xl";
            flushSync();
            expect(btn?.dataset.size).toBe("xl");

            closeSize = undefined;
            flushSync();
            expect(btn?.dataset.size).toBe("md");

            // Click & disabled handling
            btn?.click();
            flushSync();
            expect(onCloseClick).toHaveBeenCalledTimes(1);

            closeDisabled = true;
            closeVariant = "ghost";
            flushSync();
            expect(btn?.disabled).toBe(true);
            expect(btn?.dataset.variant).toBe("ghost");
            btn?.click();
            flushSync();
            expect(onCloseClick).toHaveBeenCalledTimes(1);

            closeDisabled = false;
            flushSync();
            btn?.click();
            flushSync();
            expect(onCloseClick).toHaveBeenCalledTimes(2);

            unmount(instance);
            expect(closeRef).toBeNull();

            // Standalone KpiCardClose defaults size to "sm"
            const standaloneClose = mount(KpiCardClose, {
                target: container,
                props: { variant: "soft" },
            });
            flushSync();
            expect(container.querySelector<HTMLButtonElement>("button.cs-kpi-card-close")?.dataset.size).toBe("sm");
            unmount(standaloneClose);
        });

        test("KpiCardGroup sets data-columns across 1..4 and 'auto', omits data-nested standalone, and forwards ref", () => {
            let columns = $state<KpiCardGroupColumns | undefined>(undefined);
            let ref: HTMLDivElement | null = null;

            const instance = mount(KpiCardGroup, {
                target: container,
                props: {
                    get columns() {
                        return columns;
                    },
                    class: "custom-group",
                    "data-testid": "kpi-group",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const group = container.querySelector<HTMLDivElement>("div.cs-kpi-card-group");
            expect(group).not.toBeNull();
            expect(group?.classList.contains("custom-group")).toBe(true);
            expect(group?.dataset.testid).toBe("kpi-group");
            expect(group?.dataset.columns).toBe("auto");
            expect(group?.hasAttribute("data-nested")).toBe(false);
            expect(ref).toBe(group);

            for (const nextColumns of KPI_CARD_GROUP_COLUMNS) {
                columns = nextColumns;
                flushSync();
                expect(group?.dataset.columns).toBe(String(nextColumns));
            }

            unmount(instance);
            expect(ref).toBeNull();
        });
    });

    describe("Context helpers & lifecycle", () => {
        test("hasKpiCardContext() and getKpiCardContext() react to variant, size, and layout updates", () => {
            let variant = $state<KpiCardVariant>("elevated");
            let size = $state<KpiCardSize>("sm");
            let layout = $state<KpiCardLayout>("stack");

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get size() {
                        return size;
                    },
                    get layout() {
                        return layout;
                    },
                    showProbe: true,
                },
            });
            flushSync();

            const probe = container.querySelector<HTMLDivElement>('[data-testid="kpi-context-probe"]');
            expect(probe).not.toBeNull();
            expect(probe?.dataset.hasContext).toBe("true");
            expect(probe?.dataset.threwOnGet).toBe("false");
            expect(probe?.dataset.ctxVariant).toBe("elevated");
            expect(probe?.dataset.ctxSize).toBe("sm");
            expect(probe?.dataset.ctxLayout).toBe("stack");
            expect(probe?.dataset.ctxNested).toBe("false");

            variant = "sunken";
            size = "lg";
            layout = "inline";
            flushSync();

            expect(probe?.dataset.ctxVariant).toBe("sunken");
            expect(probe?.dataset.ctxSize).toBe("lg");
            expect(probe?.dataset.ctxLayout).toBe("inline");

            variant = "soft";
            size = "md";
            layout = "split";
            flushSync();

            const splitProbe = container.querySelector<HTMLDivElement>('[data-testid="kpi-context-probe"]');
            expect(splitProbe?.dataset.ctxVariant).toBe("soft");
            expect(splitProbe?.dataset.ctxSize).toBe("md");
            expect(splitProbe?.dataset.ctxLayout).toBe("split");

            unmount(instance);
        });

        test("hasKpiCardContext() returns false and getKpiCardContext() throws outside KpiCard", () => {
            const instance = mount(KpiCardTestHost, {
                target: container,
                props: { mode: "probe" },
            });
            flushSync();

            const probe = container.querySelector<HTMLDivElement>('[data-testid="kpi-context-probe"]');
            expect(probe).not.toBeNull();
            expect(probe?.dataset.hasContext).toBe("false");
            expect(probe?.dataset.threwOnGet).toBe("true");

            unmount(instance);
        });

        test("dynamic mount/unmount of subcomponents preserves sibling refs and context synchronization", () => {
            let variant = $state<KpiCardVariant>("elevated");
            let size = $state<KpiCardSize>("sm");
            let layout = $state<KpiCardLayout>("stack");
            let showVisual = $state(false);
            let showClose = $state(false);
            let showTarget = $state(true);

            const refs: {
                kpi: HTMLDivElement | null;
                visual: HTMLDivElement | null;
                close: HTMLButtonElement | null;
                target: HTMLDivElement | null;
            } = {
                kpi: null,
                visual: null,
                close: null,
                target: null,
            };

            const instance = mount(KpiCardTestHost, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get size() {
                        return size;
                    },
                    get layout() {
                        return layout;
                    },
                    get showVisual() {
                        return showVisual;
                    },
                    get showClose() {
                        return showClose;
                    },
                    get showTarget() {
                        return showTarget;
                    },
                    targetValue: 50,
                    get kpiRef() {
                        return refs.kpi;
                    },
                    set kpiRef(el: HTMLDivElement | null) {
                        refs.kpi = el;
                    },
                    get visualRef() {
                        return refs.visual;
                    },
                    set visualRef(el: HTMLDivElement | null) {
                        refs.visual = el;
                    },
                    get closeRef() {
                        return refs.close;
                    },
                    set closeRef(el: HTMLButtonElement | null) {
                        refs.close = el;
                    },
                    get targetRef() {
                        return refs.target;
                    },
                    set targetRef(el: HTMLDivElement | null) {
                        refs.target = el;
                    },
                },
            });
            flushSync();

            const initialKpi = refs.kpi;
            expect(initialKpi).not.toBeNull();
            expect(refs.visual).toBeNull();
            expect(refs.close).toBeNull();
            expect(refs.target).not.toBeNull();

            // Mutate KpiCard context while visual & close are unmounted, then mount them
            variant = "sunken";
            size = "lg";
            layout = "split";
            showVisual = true;
            showClose = true;
            flushSync();

            expect(refs.kpi).toBe(initialKpi);
            expect(refs.visual?.dataset.placement).toBe("end");
            expect(refs.close?.dataset.size).toBe("md");
            expect(refs.target?.querySelector<HTMLDivElement>(".cs-progress")?.dataset.variant).toBe("elevated");
            expect(refs.target?.querySelector<HTMLDivElement>(".cs-progress")?.dataset.size).toBe("md");

            // Unmount target & visual; close remains synced to KpiCard size
            showTarget = false;
            showVisual = false;
            size = "md";
            flushSync();

            expect(refs.target).toBeNull();
            expect(refs.visual).toBeNull();
            expect(refs.close?.dataset.size).toBe("sm");

            unmount(instance);
            expect(refs.kpi).toBeNull();
            expect(refs.close).toBeNull();
        });
    });
});
