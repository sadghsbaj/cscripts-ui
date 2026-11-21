<script module lang="ts">
    export const id = "charts";
    export const label = "Charts";
</script>

<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "cs/svelte/card";
    import {
        AreaChart,
        BarChart,
        BulletChart,
        CHART_AREA_MODES,
        CHART_BAR_LABEL_LAYOUTS,
        CHART_BAR_MODES,
        CHART_BAR_VALUE_LABELS,
        CHART_CURVES,
        CHART_LOADING_SHAPES,
        CHART_SIZES,
        CHART_TOOLTIP_MODES,
        CHART_VARIANTS,
        CHART_ZERO_LINE_STYLES,
        Chart,
        ChartActions,
        ChartAxis,
        ChartCanvas,
        ChartCrosshair,
        ChartDescription,
        ChartEmpty,
        ChartGrid,
        ChartHeader,
        ChartLegend,
        ChartLoading,
        ChartOverlay,
        ChartState,
        ChartTitle,
        ChartTooltip,
        ComposedChart,
        DonutChart,
        HeatmapChart,
        LineChart,
        Sparkline,
        WaterfallChart,
        type ChartAnnotationConfig,
        type ChartAreaMode,
        type ChartBarLabelLayout,
        type ChartBarMode,
        type ChartBarValueLabelsMode,
        type ChartCurve,
        type ChartHeatmapRamp,
        type ChartLoadingShape,
        type ChartMonotoneHue,
        type ChartReferenceBandConfig,
        type ChartReferenceLineConfig,
        type ChartSeries,
        type ChartSize,
        type ChartSparklineType,
        type ChartTone,
        type ChartTooltipMode,
        type ChartVariant,
        type ChartWaterfallRowType,
        type ChartXValue,
        type ChartZeroLineStyle,
    } from "cs/svelte/charts";
    import {
        KpiCard,
        KpiCardComparison,
        KpiCardDelta,
        KpiCardGroup,
        KpiCardHeader,
        KpiCardLabel,
        KpiCardMetric,
        KpiCardValue,
        KpiCardVisual,
    } from "cs/svelte/kpi-card";
    import { NumberMorph, type NumberMorphFormat } from "cs/svelte/number-morph";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    interface ArrTimeDatum {
        date: Date;
        actual: number | null;
        forecast: number;
    }

    interface RetentionDatum {
        month: string;
        retention: number;
    }

    interface ActiveTeamsDatum {
        date: Date;
        enterprise: number;
        midMarket: number;
    }

    interface CloudTrafficDatum {
        date: Date;
        enterprise: number;
        growth: number;
        starter: number;
    }

    const ARR_TIME_DATA: readonly ArrTimeDatum[] = [
        { date: new Date(2026, 0, 1), actual: 410, forecast: 405 },
        { date: new Date(2026, 1, 1), actual: 438, forecast: 432 },
        { date: new Date(2026, 2, 1), actual: 472, forecast: 460 },
        { date: new Date(2026, 3, 1), actual: 495, forecast: 488 },
        { date: new Date(2026, 4, 1), actual: null, forecast: 518 },
        { date: new Date(2026, 5, 1), actual: 544, forecast: 548 },
        { date: new Date(2026, 6, 1), actual: 582, forecast: 576 },
        { date: new Date(2026, 7, 1), actual: 614, forecast: 604 },
        { date: new Date(2026, 8, 1), actual: 642, forecast: 634 },
        { date: new Date(2026, 9, 1), actual: 678, forecast: 666 },
        { date: new Date(2026, 10, 1), actual: 712, forecast: 698 },
        { date: new Date(2026, 11, 1), actual: 748, forecast: 732 },
    ];

    const ARR_TIME_SERIES: readonly ChartSeries<ArrTimeDatum>[] = [
        { id: "actual", label: "Actual ARR" },
        { id: "forecast", label: "Forecast", dashed: true },
    ];

    const RETENTION_DATA: readonly RetentionDatum[] = [
        { month: "Jul", retention: 112 },
        { month: "Aug", retention: 114 },
        { month: "Sep", retention: 113 },
        { month: "Oct", retention: 117 },
        { month: "Nov", retention: 119 },
        { month: "Dec", retention: 122 },
    ];

    const RETENTION_SERIES: readonly ChartSeries<RetentionDatum>[] = [
        { id: "retention", label: "Net Retention" },
    ];

    const ACTIVE_TEAMS_DATA: readonly ActiveTeamsDatum[] = [
        { date: new Date(2026, 6, 1), enterprise: 1420, midMarket: 980 },
        { date: new Date(2026, 7, 1), enterprise: 1510, midMarket: 1040 },
        { date: new Date(2026, 8, 1), enterprise: 1590, midMarket: 1120 },
        { date: new Date(2026, 9, 1), enterprise: 1680, midMarket: 1190 },
        { date: new Date(2026, 10, 1), enterprise: 1760, midMarket: 1270 },
        { date: new Date(2026, 11, 1), enterprise: 1890, midMarket: 1350 },
    ];

    const ACTIVE_TEAMS_SERIES: readonly ChartSeries<ActiveTeamsDatum>[] = [
        { id: "enterprise", label: "Enterprise" },
        { id: "midMarket", label: "Mid-Market" },
    ];

    const CLOUD_TRAFFIC_DATA: readonly CloudTrafficDatum[] = [
        { date: new Date(2026, 0, 1), enterprise: 320, growth: 180, starter: 95 },
        { date: new Date(2026, 1, 1), enterprise: 348, growth: 196, starter: 102 },
        { date: new Date(2026, 2, 1), enterprise: 382, growth: 215, starter: 114 },
        { date: new Date(2026, 3, 1), enterprise: 374, growth: 228, starter: 118 },
        { date: new Date(2026, 4, 1), enterprise: 416, growth: 246, starter: 126 },
        { date: new Date(2026, 5, 1), enterprise: 452, growth: 268, starter: 134 },
        { date: new Date(2026, 6, 1), enterprise: 488, growth: 292, starter: 142 },
        { date: new Date(2026, 7, 1), enterprise: 526, growth: 318, starter: 154 },
    ];

    const CLOUD_TRAFFIC_SERIES: readonly ChartSeries<CloudTrafficDatum>[] = [
        { id: "enterprise", label: "Enterprise" },
        { id: "growth", label: "Growth" },
        { id: "starter", label: "Starter" },
    ];

    interface QuarterlyBookingsDatum {
        quarter: string;
        enterprise: number;
        midMarket: number;
        selfServe: number;
    }

    interface PlanVsActualDatum {
        quarter: string;
        planCloud: number;
        planServices: number;
        actualCloud: number;
        actualServices: number;
    }

    interface BudgetVarianceDatum {
        month: string;
        gains: number;
        overruns: number;
    }

    interface DepartmentSpendDatum {
        department: string;
        spend: number;
    }

    const QUARTERLY_BOOKINGS_DATA: readonly QuarterlyBookingsDatum[] = [
        { quarter: "Q1", enterprise: 340_000, midMarket: 215_000, selfServe: 118_000 },
        { quarter: "Q2", enterprise: 392_000, midMarket: 248_000, selfServe: 136_000 },
        { quarter: "Q3", enterprise: 428_000, midMarket: 272_000, selfServe: 154_000 },
        { quarter: "Q4", enterprise: 486_000, midMarket: 304_000, selfServe: 178_000 },
    ];

    const QUARTERLY_BOOKINGS_SERIES: readonly ChartSeries<QuarterlyBookingsDatum>[] = [
        { id: "enterprise", label: "Enterprise", format: formatUsdCompact },
        { id: "midMarket", label: "Mid-Market", format: formatUsdCompact },
        { id: "selfServe", label: "Self-Serve", format: formatUsdCompact },
    ];

    const PLAN_VS_ACTUAL_DATA: readonly PlanVsActualDatum[] = [
        { quarter: "Q1", planCloud: 280_000, planServices: 140_000, actualCloud: 310_000, actualServices: 155_000 },
        { quarter: "Q2", planCloud: 320_000, planServices: 160_000, actualCloud: 345_000, actualServices: 148_000 },
        { quarter: "Q3", planCloud: 365_000, planServices: 175_000, actualCloud: 392_000, actualServices: 184_000 },
        { quarter: "Q4", planCloud: 410_000, planServices: 195_000, actualCloud: 448_000, actualServices: 212_000 },
    ];

    const PLAN_VS_ACTUAL_SERIES: readonly ChartSeries<PlanVsActualDatum>[] = [
        { id: "planCloud", label: "Plan Cloud", stack: "plan" },
        { id: "planServices", label: "Plan Services", stack: "plan" },
        { id: "actualCloud", label: "Actual Cloud", stack: "actual" },
        { id: "actualServices", label: "Actual Services", stack: "actual" },
    ];

    const BUDGET_VARIANCE_DATA: readonly BudgetVarianceDatum[] = [
        { month: "Jan", gains: 42_000, overruns: -18_000 },
        { month: "Feb", gains: 28_000, overruns: -34_000 },
        { month: "Mar", gains: 64_000, overruns: -12_000 },
        { month: "Apr", gains: 19_000, overruns: -48_000 },
        { month: "May", gains: 51_000, overruns: -22_000 },
        { month: "Jun", gains: 74_000, overruns: -15_000 },
        { month: "Jul", gains: 36_000, overruns: -29_000 },
        { month: "Aug", gains: 58_000, overruns: -11_000 },
    ];

    const BUDGET_VARIANCE_SERIES: readonly ChartSeries<BudgetVarianceDatum>[] = [
        { id: "gains", label: "Savings", tone: "positive" },
        { id: "overruns", label: "Overruns", tone: "negative" },
    ];

    const DEPARTMENT_SPEND_DATA: readonly DepartmentSpendDatum[] = [
        { department: "Enterprise Cloud Infrastructure", spend: 840_000 },
        { department: "Global Supply Chain Operations", spend: 690_000 },
        { department: "Platform Security & Compliance", spend: 560_000 },
        { department: "Customer Success & Enablement", spend: 430_000 },
        { department: "Data Engineering & Analytics", spend: 385_000 },
        { department: "Developer Experience & Tooling", spend: 295_000 },
    ];

    const DEPARTMENT_SPEND_SERIES: readonly ChartSeries<DepartmentSpendDatum>[] = [
        { id: "spend", label: "Annual Spend" },
    ];

    interface RevenueMarginDatum {
        month: string;
        revenue: number;
        costs: number;
        marginPct: number;
    }

    const REVENUE_MARGIN_DATA: readonly RevenueMarginDatum[] = [
        { month: "Jan", revenue: 265_000, costs: 84_800, marginPct: 68 },
        { month: "Feb", revenue: 282_000, costs: 87_400, marginPct: 69 },
        { month: "Mar", revenue: 308_000, costs: 92_400, marginPct: 70 },
        { month: "Apr", revenue: 296_000, costs: 91_800, marginPct: 69 },
        { month: "May", revenue: 338_000, costs: 98_000, marginPct: 71 },
        { month: "Jun", revenue: 395_000, costs: 106_700, marginPct: 73 },
        { month: "Jul", revenue: 364_000, costs: 101_900, marginPct: 72 },
        { month: "Aug", revenue: 382_000, costs: 103_100, marginPct: 73 },
    ];

    const REVENUE_MARGIN_SERIES: readonly ChartSeries<RevenueMarginDatum>[] = [
        { id: "revenue", label: "Revenue", type: "bar" },
        { id: "costs", label: "Direct Costs", type: "area" },
        { id: "marginPct", label: "Gross Margin", type: "line", yAxis: "right" },
    ];

    const REVENUE_MARGIN_BANDS: readonly ChartReferenceBandConfig[] = [
        {
            id: "target-sla",
            axis: "y2",
            from: 68,
            to: 74,
            tone: "positive",
            label: "Target SLA",
        },
    ];

    const REVENUE_MARGIN_LINES: readonly ChartReferenceLineConfig[] = [
        {
            id: "revenue-budget",
            axis: "y",
            value: 320_000,
            tone: "caution",
            label: "Budget $320k",
            labelPosition: "start",
        },
    ];

    const REVENUE_MARGIN_ANNOTATIONS: readonly ChartAnnotationConfig[] = [
        {
            id: "enterprise-launch",
            x: "Jun",
            y: 395_000,
            yAxis: "left",
            dx: 0,
            dy: -34,
            tone: "accent",
            label: "Enterprise Launch",
        },
    ];

    interface ControllingMonthlyDatum {
        month: string;
        revenue: number;
        isForecast: boolean;
        attainment: number;
    }

    const CONTROLLING_MONTHLY_DATA: readonly ControllingMonthlyDatum[] = [
        { month: "Jan", revenue: 312_000, isForecast: false, attainment: 102 },
        { month: "Feb", revenue: 328_000, isForecast: false, attainment: 104 },
        { month: "Mar", revenue: 356_000, isForecast: false, attainment: 108 },
        { month: "Apr", revenue: 334_000, isForecast: false, attainment: 95 },
        { month: "May", revenue: 372_000, isForecast: false, attainment: 103 },
        { month: "Jun", revenue: 398_000, isForecast: false, attainment: 107 },
        { month: "Jul", revenue: 365_000, isForecast: false, attainment: 88 },
        { month: "Aug", revenue: 384_000, isForecast: false, attainment: 93 },
        { month: "Sep", revenue: 418_000, isForecast: false, attainment: 105 },
        { month: "Oct", revenue: 436_000, isForecast: true, attainment: 101 },
        { month: "Nov", revenue: 454_000, isForecast: true, attainment: 96 },
        { month: "Dec", revenue: 482_000, isForecast: true, attainment: 106 },
    ];

    function getAttainmentTone(
        attainment: number,
    ): Extract<ChartTone, "positive" | "caution" | "negative"> {
        if (attainment >= 100) return "positive";
        if (attainment >= 90) return "caution";
        return "negative";
    }

    const ACTUAL_FORECAST_SERIES: readonly ChartSeries<ControllingMonthlyDatum>[] = [
        {
            id: "revenue",
            label: "Revenue",
            tone: "accent",
            pattern: (datum) => (datum.isForecast ? "hatch" : "solid"),
        },
    ];

    const ATTAINMENT_SERIES: readonly ChartSeries<ControllingMonthlyDatum>[] = [
        {
            id: "attainment",
            label: "Plan Attainment",
            tone: (datum) => getAttainmentTone(datum.attainment),
        },
    ];

    const ATTAINMENT_TARGET_LINES: readonly ChartReferenceLineConfig[] = [
        {
            id: "plan-target",
            axis: "y",
            value: 100,
            tone: "base",
            label: "Target 100%",
            labelPosition: "end",
            dashed: true,
        },
    ];

    interface RevenueSegmentDatum {
        segment: string;
        revenue: number;
    }

    interface BudgetAllocationDatum {
        category: string;
        amount: number;
    }

    interface InvoiceStatusDatum {
        status: string;
        count: number;
        tone: ChartTone;
    }

    const REVENUE_SEGMENT_DATA: readonly RevenueSegmentDatum[] = [
        { segment: "Enterprise", revenue: 1_420_000 },
        { segment: "Mid-Market", revenue: 890_000 },
        { segment: "Self-Serve", revenue: 540_000 },
        { segment: "Services", revenue: 310_000 },
        { segment: "Partners", revenue: 215_000 },
    ];

    const BUDGET_ALLOCATION_DATA: readonly BudgetAllocationDatum[] = [
        { category: "Engineering", amount: 460_000 },
        { category: "Infrastructure", amount: 280_000 },
        { category: "Go-to-Market", amount: 195_000 },
        { category: "Operations", amount: 125_000 },
    ];

    const INVOICE_STATUS_DATA: readonly InvoiceStatusDatum[] = [
        { status: "Paid on Time", count: 318, tone: "positive" },
        { status: "Pending Review", count: 64, tone: "caution" },
        { status: "Past Due", count: 28, tone: "negative" },
    ];

    const DONUT_CURRENCY_FORMAT = {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
    } as const;

    const SPARKLINE_MRR: readonly number[] = [
        118.4, 120.2, 121.8, 124.5, 123.9, 126.4, 129.1, 131.6, 133.2, 135.8, 138.4, 140.1, 141.5, 142.8,
    ];

    const SPARKLINE_LATENCY: readonly number[] = [
        148, 144, 152, 139, 136, 142, 134, 129, 131, 126, 124, 121, 122, 118,
    ];

    const SPARKLINE_INCIDENTS: readonly number[] = [2, 1, 3, 2, 0, 1, 4, 2, 1, 3, 2, 5, 2, 4];

    const SPARKLINE_DAYS: readonly string[] = [
        "May 1",
        "May 2",
        "May 3",
        "May 4",
        "May 5",
        "May 6",
        "May 7",
        "May 8",
        "May 9",
        "May 10",
        "May 11",
        "May 12",
        "May 13",
        "May 14",
    ];

    interface SparklineServiceRow {
        id: string;
        name: string;
        region: string;
        type: ChartSparklineType;
        tone: ChartTone;
        data: readonly number[];
        target?: number;
        prefix?: string;
        suffix?: string;
        format?: NumberMorphFormat;
    }

    const SPARKLINE_SERVICES: readonly SparklineServiceRow[] = [
        {
            id: "checkout",
            name: "Checkout API",
            region: "eu-central-1",
            type: "area",
            tone: "positive",
            data: [412, 428, 435, 449, 442, 468, 476, 485, 492, 508, 514, 526, 538, 546],
            suffix: " req/s",
            format: { maximumFractionDigits: 0 },
        },
        {
            id: "auth",
            name: "Auth Gateway",
            region: "us-east-1",
            type: "line",
            tone: "accent",
            data: [94, 92, 96, 89, 88, 91, 86, 84, 85, 82, 83, 80, 79, 78],
            target: 90,
            suffix: " ms",
            format: { maximumFractionDigits: 0 },
        },
        {
            id: "search",
            name: "Search Index",
            region: "eu-west-1",
            type: "bar",
            tone: "caution",
            data: [12, 9, 15, 11, 8, 14, 19, 13, 10, 16, 12, 21, 14, 17],
            suffix: " retries",
            format: { maximumFractionDigits: 0 },
        },
        {
            id: "webhooks",
            name: "Webhook Queue",
            region: "ap-northeast-1",
            type: "line",
            tone: "negative",
            data: [1.4, 1.5, 1.3, 1.6, 1.8, 1.7, 2, 2.2, 2.1, 2.4, 2.6, 2.5, 2.8, 2.9],
            target: 2,
            suffix: "% err",
            format: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
        },
    ];

    interface WaterfallBridgeDatum {
        step: string;
        amount: number | null;
        type: ChartWaterfallRowType;
    }

    const ARR_BRIDGE_DATA: readonly WaterfallBridgeDatum[] = [
        { step: "Opening ARR", amount: 2_400_000, type: "start" },
        { step: "New Logos", amount: 680_000, type: "delta" },
        { step: "Expansion", amount: 420_000, type: "delta" },
        { step: "Gross ARR", amount: null, type: "subtotal" },
        { step: "Contraction", amount: -165_000, type: "delta" },
        { step: "Churn", amount: -235_000, type: "delta" },
        { step: "Net ARR", amount: null, type: "total" },
    ];

    const EBITDA_BRIDGE_DATA: readonly WaterfallBridgeDatum[] = [
        { step: "FY25 EBITDA", amount: 820_000, type: "start" },
        { step: "Q1 Ops", amount: 185_000, type: "delta" },
        { step: "Q2 Ops", amount: 240_000, type: "delta" },
        { step: "H1 Subtotal", amount: null, type: "subtotal" },
        { step: "Q3 Hiring", amount: -310_000, type: "delta" },
        { step: "Q4 Ops", amount: 295_000, type: "delta" },
        { step: "FY26 EBITDA", amount: null, type: "total" },
    ];

    interface PlantKpiDatum {
        metric: string;
        unit: string;
        actual: number;
        target: number;
        prior: number;
        ranges: readonly number[];
        max: number;
    }

    interface RegionalQuotaDatum {
        region: string;
        actual: number;
        target: number;
        prior: number;
        ranges: readonly number[];
    }

    const PLANT_KPI_DATA: readonly PlantKpiDatum[] = [
        {
            metric: "OEE",
            unit: "%",
            actual: 86,
            target: 85,
            prior: 81,
            ranges: [60, 80, 100],
            max: 100,
        },
        {
            metric: "Throughput",
            unit: "t/h",
            actual: 142,
            target: 150,
            prior: 136,
            ranges: [90, 130, 180],
            max: 180,
        },
        {
            metric: "First-Pass Yield",
            unit: "%",
            actual: 97.4,
            target: 96,
            prior: 94.8,
            ranges: [80, 92, 100],
            max: 100,
        },
        {
            metric: "Energy Efficiency",
            unit: "%",
            actual: 74,
            target: 88,
            prior: 79,
            ranges: [60, 80, 100],
            max: 100,
        },
        {
            metric: "Line Utilization",
            unit: "%",
            actual: 84,
            target: 90,
            prior: 82,
            ranges: [60, 80, 100],
            max: 100,
        },
    ];

    const REGIONAL_QUOTA_DATA: readonly RegionalQuotaDatum[] = [
        {
            region: "North America",
            actual: 1_840_000,
            target: 1_750_000,
            prior: 1_620_000,
            ranges: [1_000_000, 1_500_000, 2_000_000],
        },
        {
            region: "EMEA",
            actual: 1_420_000,
            target: 1_500_000,
            prior: 1_310_000,
            ranges: [1_000_000, 1_500_000, 2_000_000],
        },
        {
            region: "DACH",
            actual: 1_180_000,
            target: 1_100_000,
            prior: 980_000,
            ranges: [1_000_000, 1_500_000, 2_000_000],
        },
        {
            region: "APAC",
            actual: 860_000,
            target: 1_050_000,
            prior: 910_000,
            ranges: [1_000_000, 1_500_000, 2_000_000],
        },
    ];

    const BULLET_NUMBER_FORMAT: NumberMorphFormat = {
        maximumFractionDigits: 1,
    };

    const BULLET_CURRENCY_FORMAT: NumberMorphFormat = {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
    };

    function resolveBulletTone(datum: { actual: number; target: number }): ChartTone {
        if (datum.actual >= datum.target) return "positive";
        if (datum.actual >= datum.target * 0.9) return "caution";
        return "negative";
    }

    type HeatmapSequentialRamp = Exclude<ChartHeatmapRamp, "diverging">;

    const HEATMAP_SEQUENTIAL_RAMPS: readonly HeatmapSequentialRamp[] = [
        "accent",
        "teal",
        "emerald",
        "amber",
        "rose",
        "slate",
    ];

    interface CohortRetentionCellDatum {
        cohort: string;
        month: string;
        retention: number | null;
    }

    const COHORT_RETENTION_DATA: readonly CohortRetentionCellDatum[] = [
        { cohort: "Jan '26", month: "M0", retention: 100 },
        { cohort: "Jan '26", month: "M1", retention: 94 },
        { cohort: "Jan '26", month: "M2", retention: 89 },
        { cohort: "Jan '26", month: "M3", retention: 85 },
        { cohort: "Jan '26", month: "M4", retention: 82 },
        { cohort: "Jan '26", month: "M5", retention: 79 },
        { cohort: "Feb '26", month: "M0", retention: 100 },
        { cohort: "Feb '26", month: "M1", retention: 92 },
        { cohort: "Feb '26", month: "M2", retention: 87 },
        { cohort: "Feb '26", month: "M3", retention: 83 },
        { cohort: "Feb '26", month: "M4", retention: 80 },
        { cohort: "Feb '26", month: "M5", retention: null },
        { cohort: "Mar '26", month: "M0", retention: 100 },
        { cohort: "Mar '26", month: "M1", retention: 95 },
        { cohort: "Mar '26", month: "M2", retention: 91 },
        { cohort: "Mar '26", month: "M3", retention: 88 },
        { cohort: "Mar '26", month: "M4", retention: null },
        { cohort: "Mar '26", month: "M5", retention: null },
        { cohort: "Apr '26", month: "M0", retention: 100 },
        { cohort: "Apr '26", month: "M1", retention: 91 },
        { cohort: "Apr '26", month: "M2", retention: 86 },
        { cohort: "Apr '26", month: "M3", retention: null },
        { cohort: "Apr '26", month: "M4", retention: null },
        { cohort: "Apr '26", month: "M5", retention: null },
        { cohort: "May '26", month: "M0", retention: 100 },
        { cohort: "May '26", month: "M1", retention: 96 },
        { cohort: "May '26", month: "M2", retention: null },
        { cohort: "May '26", month: "M3", retention: null },
        { cohort: "May '26", month: "M4", retention: null },
        { cohort: "May '26", month: "M5", retention: null },
    ];

    interface MarginVarianceCellDatum {
        region: string;
        quarter: string;
        variance: number;
    }

    const MARGIN_VARIANCE_DATA: readonly MarginVarianceCellDatum[] = [
        { region: "DACH", quarter: "Q1", variance: 0.042 },
        { region: "DACH", quarter: "Q2", variance: 0.058 },
        { region: "DACH", quarter: "Q3", variance: 0.031 },
        { region: "DACH", quarter: "Q4", variance: 0.064 },
        { region: "North America", quarter: "Q1", variance: 0.018 },
        { region: "North America", quarter: "Q2", variance: -0.024 },
        { region: "North America", quarter: "Q3", variance: 0.036 },
        { region: "North America", quarter: "Q4", variance: 0.051 },
        { region: "UK & Ireland", quarter: "Q1", variance: -0.015 },
        { region: "UK & Ireland", quarter: "Q2", variance: -0.038 },
        { region: "UK & Ireland", quarter: "Q3", variance: -0.012 },
        { region: "UK & Ireland", quarter: "Q4", variance: 0.022 },
        { region: "Nordics", quarter: "Q1", variance: 0.029 },
        { region: "Nordics", quarter: "Q2", variance: 0.014 },
        { region: "Nordics", quarter: "Q3", variance: -0.046 },
        { region: "Nordics", quarter: "Q4", variance: -0.019 },
    ];

    const HEATMAP_RETENTION_FORMAT: NumberMorphFormat = {
        maximumFractionDigits: 0,
    };

    const HEATMAP_VARIANCE_FORMAT: NumberMorphFormat = {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
    };

    interface MonthlyDatum {
        month: string;
        revenue: number;
        expenses: number;
    }

    interface RegionalDatum {
        region: string;
        netCashflow: number;
        marginPct: number;
    }

    interface CategoryDatum {
        category: string;
        budget: number;
    }

    interface RevenueMixDatum {
        month: string;
        subscriptions: number;
        usage: number;
        services: number;
    }

    const REVENUE_MIX_DATA: readonly RevenueMixDatum[] = [
        { month: "Jan", subscriptions: 48_200, usage: 18_400, services: 9600 },
        { month: "Feb", subscriptions: 52_600, usage: 21_100, services: 10_400 },
        { month: "Mar", subscriptions: 57_900, usage: 24_800, services: 11_200 },
        { month: "Apr", subscriptions: 55_400, usage: 22_900, services: 10_800 },
        { month: "May", subscriptions: 64_800, usage: 27_600, services: 12_500 },
        { month: "Jun", subscriptions: 71_500, usage: 31_200, services: 14_100 },
    ];

    const REVENUE_MIX_SERIES: readonly ChartSeries<RevenueMixDatum>[] = [
        { id: "subscriptions", label: "Subscriptions", type: "line" },
        { id: "usage", label: "Usage", type: "bar" },
        { id: "services", label: "Services", dashed: true },
    ];

    const TOOLTIP_CURRENCY_FORMAT = {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    } as const;

    const MONTHLY_DATA: readonly MonthlyDatum[] = [
        { month: "Jan", revenue: 42_000, expenses: 28_000 },
        { month: "Feb", revenue: 48_500, expenses: 30_200 },
        { month: "Mar", revenue: 54_200, expenses: 33_400 },
        { month: "Apr", revenue: 51_800, expenses: 31_900 },
        { month: "May", revenue: 63_400, expenses: 36_100 },
        { month: "Jun", revenue: 72_100, expenses: 39_800 },
    ];

    const MONTHLY_SERIES: readonly ChartSeries<MonthlyDatum>[] = [
        { id: "revenue", label: "Revenue" },
        { id: "expenses", label: "Expenses" },
    ];

    const REGIONAL_DATA: readonly RegionalDatum[] = [
        { region: "DACH Enterprise", netCashflow: 1_250_000, marginPct: 34 },
        { region: "Nordics Commercial", netCashflow: 680_000, marginPct: 28 },
        { region: "Benelux Strategic", netCashflow: -320_000, marginPct: -8 },
        { region: "UK & Ireland", netCashflow: 940_000, marginPct: 31 },
        { region: "France Mid-Market", netCashflow: -180_000, marginPct: -4 },
        { region: "Iberia Growth", netCashflow: 410_000, marginPct: 19 },
        { region: "Central Europe", netCashflow: 790_000, marginPct: 26 },
    ];

    const REGIONAL_SERIES: readonly ChartSeries<RegionalDatum>[] = [
        { id: "netCashflow", label: "Net Cashflow", yAxis: "left" },
        { id: "marginPct", label: "Operating Margin", yAxis: "right" },
    ];

    const WRAPPED_CATEGORY_DATA: readonly CategoryDatum[] = [
        { category: "Cloud Infrastructure", budget: 480_000 },
        { category: "Enterprise Security", budget: 360_000 },
        { category: "Developer Platform", budget: 520_000 },
        { category: "Customer Success", budget: 290_000 },
        { category: "Data Analytics", budget: 410_000 },
    ];

    const TRUNCATED_CATEGORY_DATA: readonly CategoryDatum[] = [
        { category: "Global Enterprise Licensing", budget: 820_000 },
        { category: "Managed Infrastructure Services", budget: 640_000 },
        { category: "Dedicated Support & Advisory", budget: 390_000 },
        { category: "Automated Compliance Suite", budget: 510_000 },
        { category: "Embedded Analytics Runtime", budget: 450_000 },
    ];

    const CATEGORY_SERIES: readonly ChartSeries<CategoryDatum>[] = [{ id: "budget", label: "Annual Budget" }];

    const VARIANT_META: Record<ChartVariant, { title: string; description: string; badge: string }> = {
        elevated: {
            title: "Monthly Revenue",
            description: "Elevated surface on canvas",
            badge: "elevated",
        },
        soft: {
            title: "Net Bookings",
            description: "Soft tonal surface",
            badge: "soft",
        },
        sunken: {
            title: "Operating Costs",
            description: "Recessed well surface",
            badge: "sunken",
        },
        transparent: {
            title: "Gross Margin",
            description: "Frameless flush surface",
            badge: "transparent",
        },
    };

    const SIZE_META: Record<ChartSize, { title: string; description: string }> = {
        sm: { title: "Daily Orders", description: "Compact tile density" },
        md: { title: "Monthly Revenue", description: "Default balanced density" },
        lg: { title: "Annual Cashflow", description: "Editorial analytical density" },
    };

    const CATEGORICAL_SLOTS = [
        { slot: 1, name: "Accent" },
        { slot: 2, name: "Teal" },
        { slot: 3, name: "Amber" },
        { slot: 4, name: "Violet" },
        { slot: 5, name: "Rose" },
        { slot: 6, name: "Sky" },
        { slot: 7, name: "Emerald" },
        { slot: 8, name: "Orange" },
        { slot: 9, name: "Fuchsia" },
        { slot: 10, name: "Slate" },
    ] as const;

    const MONOTONE_PREVIEW_HUES: readonly ChartMonotoneHue[] = ["accent", "teal", "emerald", "slate"];
    const MONOTONE_STEPS = [1, 2, 3, 4, 5, 6] as const;

    const SEMANTIC_TONES: readonly { tone: Extract<ChartTone, "positive" | "caution" | "negative">; label: string }[] = [
        { tone: "positive", label: "Positive" },
        { tone: "caution", label: "Caution" },
        { tone: "negative", label: "Negative" },
    ];

    const deNumber = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
    const usdCompact = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 0,
    });

    function formatEur(value: ChartXValue): string {
        if (typeof value !== "number") return String(value);
        const sign = value < 0 ? "-" : "";
        return `${sign}€${deNumber.format(Math.abs(value))}`;
    }

    function formatUsdCompact(value: ChartXValue): string {
        if (typeof value !== "number") return String(value);
        return usdCompact.format(value);
    }

    function formatUsdSignedCompact(value: ChartXValue): string {
        if (typeof value !== "number") return String(value);
        if (value === 0) return "$0";
        const prefix = value > 0 ? "+" : "-";
        return `${prefix}${usdCompact.format(Math.abs(value))}`;
    }

    function formatPercent(value: ChartXValue): string {
        if (typeof value !== "number") return String(value);
        return `${value}%`;
    }

    const interactiveChart = new ChartState<RevenueMixDatum>({
        variant: "elevated",
        size: "md",
        data: REVENUE_MIX_DATA,
        x: "month",
        preferBandX: true,
        series: REVENUE_MIX_SERIES,
    });

    const nestedInteractiveChart = new ChartState<RevenueMixDatum>({
        variant: "sunken",
        size: "sm",
        data: REVENUE_MIX_DATA,
        x: "month",
        preferBandX: true,
        series: REVENUE_MIX_SERIES,
    });

    type PreviewStateMode = "ready" | "empty" | "all-hidden" | "loading";

    const stateChart = new ChartState<MonthlyDatum>({
        variant: "elevated",
        size: "md",
        data: MONTHLY_DATA,
        x: "month",
        series: MONTHLY_SERIES,
        yAxis: { format: formatUsdCompact },
    });

    let isLoadingState = $state(false);
    let isEmptyDataState = $state(false);
    let loadingShape = $state<ChartLoadingShape>("bars");

    const activeStateMode = $derived.by((): PreviewStateMode => {
        if (isLoadingState) return "loading";
        if (isEmptyDataState) return "empty";
        if (stateChart.allSeriesHidden) return "all-hidden";
        return "ready";
    });

    function setStateMode(mode: PreviewStateMode): void {
        isLoadingState = mode === "loading";
        isEmptyDataState = mode === "empty";
        stateChart.data = mode === "empty" ? [] : MONTHLY_DATA;
        stateChart.hiddenSeriesIds = mode === "all-hidden" ? MONTHLY_SERIES.map((item) => item.id) : [];
    }

    let lineCurve = $state<ChartCurve>("monotone");
    let lineTooltipMode = $state<ChartTooltipMode>("axis");
    let connectNulls = $state(false);
    let lineDirectLabels = $state(false);
    let areaMode = $state<ChartAreaMode>("stacked");
    let barMode = $state<ChartBarMode>("grouped");
    let barValueLabels = $state<ChartBarValueLabelsMode>("none");
    let barTooltipMode = $state<ChartTooltipMode>("axis");
    let groupedStackedValueLabels = $state<ChartBarValueLabelsMode>("both");
    let groupedStackedTooltipMode = $state<ChartTooltipMode>("axis");
    let divergingZeroLine = $state<ChartZeroLineStyle>("solid");
    let horizontalLabelLayout = $state<ChartBarLabelLayout>("gutter");
    let composedTooltipMode = $state<ChartTooltipMode>("axis");
    let selectedControllingIndex = $state<number | null>(null);
    const selectedControllingDatum = $derived(
        selectedControllingIndex !== null
            ? (CONTROLLING_MONTHLY_DATA[selectedControllingIndex] ?? null)
            : null,
    );
    let donutShape = $state<"donut" | "pie">("donut");
    let donutGap = $state(false);
    let donutValueLabels = $state(false);
    let sparklineActiveIndices = $state<Record<string, number | null>>({
        checkout: null,
        auth: null,
        search: null,
        webhooks: null,
    });
    let waterfallConnectors = $state(true);
    let waterfallValueLabels = $state(true);
    let selectedQuotaIndex = $state<number | null>(null);
    const selectedQuotaDatum = $derived(
        selectedQuotaIndex !== null ? (REGIONAL_QUOTA_DATA[selectedQuotaIndex] ?? null) : null,
    );
    let heatmapRamp = $state<HeatmapSequentialRamp>("accent");
    let heatmapValueLabels = $state(true);
    let selectedVarianceCellIndex = $state<number | null>(null);
    const selectedVarianceCell = $derived(
        selectedVarianceCellIndex !== null
            ? (MARGIN_VARIANCE_DATA[selectedVarianceCellIndex] ?? null)
            : null,
    );

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const lineChartCode = `<script lang="ts">
    import {
        LineChart,
        type ChartCurve,
        type ChartSeries,
        type ChartTooltipMode,
    } from "cs/svelte/charts";

    let curve = $state<ChartCurve>("monotone");
    let tooltipMode = $state<ChartTooltipMode>("axis");
    let connectNulls = $state(false);
    let directLabels = $state(false);

    const series: ChartSeries<ArrTimeDatum>[] = [
        { id: "actual", label: "Actual ARR" },
        { id: "forecast", label: "Forecast", dashed: true },
    ];
${closeScript}

<LineChart
    variant="elevated"
    size="md"
    title="Annual Recurring Revenue"
    description="Monthly actuals vs. baseline forecast ($k)"
    {data}
    x="date"
    {series}
    {curve}
    {tooltipMode}
    {connectNulls}
    {directLabels}
    legend={directLabels ? "none" : "top"}
    height={280}
/>`;

    const areaChartCode = `<script lang="ts">
    import { AreaChart, type ChartAreaMode } from "cs/svelte/charts";

    let mode = $state<ChartAreaMode>("stacked");
${closeScript}

<AreaChart
    variant="elevated"
    size="md"
    title="Cloud Usage"
    description="Monthly compute units by tier"
    {data}
    x="date"
    {series}
    {mode}
    height={290}
/>`;

    const barChartCode = `<script lang="ts">
    import {
        BarChart,
        type ChartBarMode,
        type ChartBarValueLabelsMode,
        type ChartTooltipMode,
    } from "cs/svelte/charts";

    let mode = $state<ChartBarMode>("grouped");
    let valueLabels = $state<ChartBarValueLabelsMode>("none");
    let tooltipMode = $state<ChartTooltipMode>("axis");
${closeScript}

<BarChart
    variant="elevated"
    size="md"
    title="Quarterly Bookings"
    description="Revenue by sales channel"
    {data}
    x="quarter"
    {series}
    {mode}
    {valueLabels}
    {tooltipMode}
    yAxis={mode === "percent" ? undefined : { format: formatUsdCompact }}
    height={290}
/>`;

    const groupedStackedBarCode = `<script lang="ts">
    import {
        BarChart,
        type ChartBarValueLabelsMode,
        type ChartSeries,
        type ChartTooltipMode,
    } from "cs/svelte/charts";

    let valueLabels = $state<ChartBarValueLabelsMode>("both");
    let tooltipMode = $state<ChartTooltipMode>("axis");

    const series: ChartSeries<PlanVsActualDatum>[] = [
        { id: "planCloud", label: "Plan Cloud", stack: "plan" },
        { id: "planServices", label: "Plan Services", stack: "plan" },
        { id: "actualCloud", label: "Actual Cloud", stack: "actual" },
        { id: "actualServices", label: "Actual Services", stack: "actual" },
    ];
${closeScript}

<BarChart
    variant="elevated"
    size="md"
    title="Plan vs. Actual"
    description="Quarterly cloud and services revenue against budget"
    {data}
    x="quarter"
    {series}
    {valueLabels}
    {tooltipMode}
    yAxis={{ format: formatUsdCompact }}
    height={300}
/>`;

    const divergingBarCode = `<script lang="ts">
    import { BarChart, type ChartSeries, type ChartZeroLineStyle } from "cs/svelte/charts";

    let zeroLine = $state<ChartZeroLineStyle>("solid");

    const series: ChartSeries<BudgetVarianceDatum>[] = [
        { id: "gains", label: "Savings", tone: "positive" },
        { id: "overruns", label: "Overruns", tone: "negative" },
    ];
${closeScript}

<BarChart
    variant="elevated"
    size="md"
    title="Budget Variance"
    description="Monthly operating savings vs. cost overruns"
    {data}
    x="month"
    {series}
    mode="stacked"
    grid={{ zeroLine }}
    yAxis={{ format: formatUsdSignedCompact }}
    height={280}
/>`;

    const horizontalBarCode = `<script lang="ts">
    import { BarChart, type ChartBarLabelLayout } from "cs/svelte/charts";

    let labelLayout = $state<ChartBarLabelLayout>("gutter");
${closeScript}

<BarChart
    variant="elevated"
    size="md"
    title="Department Spend"
    description="Annualized operating allocation by organization"
    {data}
    x="department"
    {series}
    orientation="horizontal"
    {labelLayout}
    valueLabels="outside"
    legend="none"
    yAxis={{ format: formatUsdCompact }}
    height={320}
/>`;

    const composedChartCode = `<script lang="ts">
    import {
        ComposedChart,
        type ChartAnnotationConfig,
        type ChartReferenceBandConfig,
        type ChartReferenceLineConfig,
        type ChartSeries,
        type ChartTooltipMode,
    } from "cs/svelte/charts";

    let tooltipMode = $state<ChartTooltipMode>("axis");

    const series: ChartSeries<RevenueMarginDatum>[] = [
        { id: "revenue", label: "Revenue", type: "bar" },
        { id: "costs", label: "Direct Costs", type: "area" },
        { id: "marginPct", label: "Gross Margin", type: "line", yAxis: "right" },
    ];

    const referenceBands: ChartReferenceBandConfig[] = [
        { axis: "y2", from: 68, to: 74, tone: "positive", label: "Target SLA" },
    ];

    const referenceLines: ChartReferenceLineConfig[] = [
        { axis: "y", value: 320_000, tone: "caution", label: "Budget $320k", labelPosition: "start" },
    ];

    const annotations: ChartAnnotationConfig[] = [
        { x: "Jun", y: 395_000, yAxis: "left", dx: 0, dy: -34, tone: "accent", label: "Enterprise Launch" },
    ];
${closeScript}

<ComposedChart
    variant="elevated"
    size="md"
    title="Revenue & Margin"
    description="Monthly revenue and direct costs against gross margin target"
    {data}
    x="month"
    {series}
    {referenceBands}
    {referenceLines}
    {annotations}
    {tooltipMode}
    yAxis={{ format: formatUsdCompact, label: "Revenue ($)", domain: [0, 480_000] }}
    y2Axis={{ format: formatPercent, label: "Gross Margin", domain: [50, 80] }}
    height={320}
/>`;

    const controllingCode = `<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { BarChart, type ChartSeries } from "cs/svelte/charts";

    let selectedIndex = $state<number | null>(null);
    const selectedDatum = $derived(selectedIndex !== null ? data[selectedIndex] ?? null : null);

    const actualForecastSeries: ChartSeries<ControllingMonthlyDatum>[] = [
        {
            id: "revenue",
            label: "Revenue",
            tone: "accent",
            pattern: (datum) => (datum.isForecast ? "hatch" : "solid"),
        },
    ];

    const attainmentSeries: ChartSeries<ControllingMonthlyDatum>[] = [
        {
            id: "attainment",
            label: "Plan Attainment",
            tone: (datum) =>
                datum.attainment >= 100
                    ? "positive"
                    : datum.attainment >= 90
                      ? "caution"
                      : "negative",
        },
    ];
${closeScript}

<BarChart
    variant="elevated"
    size="md"
    title="Revenue Actual vs. Forecast"
    description="Jan–Sep actuals and Q4 forecast"
    {data}
    x="month"
    series={actualForecastSeries}
    legend="none"
    selectable={true}
    bind:selectedIndex
    yAxis={{ format: formatUsdCompact }}
    height={260}
>
    {#snippet actions()}
        <Badge variant="soft" color={selectedDatum ? "accent" : "base"} size="sm">
            <BadgeLabel>
                {selectedDatum
                    ? \`\${selectedDatum.month}: \${formatUsdCompact(selectedDatum.revenue)} (\${selectedDatum.isForecast ? "Forecast" : "Actual"})\`
                    : "FY 2026"}
            </BadgeLabel>
        </Badge>
    {/snippet}
</BarChart>`;

    const donutChartCode = `<script lang="ts">
    import { DonutChart } from "cs/svelte/charts";

    let shape = $state<"donut" | "pie">("donut");
    let hasGap = $state(false);
    let valueLabels = $state(false);

    const currencyFormat = {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
    } as const;
${closeScript}

<DonutChart
    variant="elevated"
    size="md"
    title="Revenue by Segment"
    description="Annual recurring revenue distribution across customer tiers"
    {data}
    name="segment"
    value="revenue"
    innerRadiusRatio={shape === "donut" ? 0.68 : 0}
    gap={hasGap ? 4 : 0}
    centerMode="auto"
    {valueLabels}
    centerLabel="Total ARR"
    numberFormat={currencyFormat}
    locales="en-US"
    legend="end"
    height={280}
/>`;

    const sparklineCode = `<script lang="ts">
    import { Sparkline } from "cs/svelte/charts";
    import {
        KpiCard,
        KpiCardComparison,
        KpiCardDelta,
        KpiCardGroup,
        KpiCardHeader,
        KpiCardLabel,
        KpiCardMetric,
        KpiCardValue,
        KpiCardVisual,
    } from "cs/svelte/kpi-card";
    import { NumberMorph } from "cs/svelte/number-morph";

    let activeIndex = $state<number | null>(null);
    const activeValue = $derived(latencyData[activeIndex ?? latencyData.length - 1]);
${closeScript}

<KpiCardGroup columns={3}>
    <KpiCard variant="elevated" size="md">
        <KpiCardHeader>
            <KpiCardLabel>Monthly Recurring Revenue</KpiCardLabel>
        </KpiCardHeader>
        <KpiCardMetric>
            <KpiCardValue>$142.8k</KpiCardValue>
            <KpiCardDelta trend="up">+12.4%</KpiCardDelta>
        </KpiCardMetric>
        <KpiCardComparison>vs. last 14 days</KpiCardComparison>
        <KpiCardVisual>
            <Sparkline data={mrrData} type="area" tone="positive" height={52} />
        </KpiCardVisual>
    </KpiCard>

    <KpiCard variant="elevated" size="md">
        <KpiCardHeader>
            <KpiCardLabel>API Latency (p95)</KpiCardLabel>
        </KpiCardHeader>
        <KpiCardMetric>
            <KpiCardValue><NumberMorph value={activeValue} suffix=" ms" /></KpiCardValue>
            <KpiCardDelta trend="down" color="positive">-8.2%</KpiCardDelta>
        </KpiCardMetric>
        <KpiCardComparison>SLA target 140 ms</KpiCardComparison>
        <KpiCardVisual>
            <Sparkline
                data={latencyData}
                type="line"
                tone="accent"
                target={140}
                height={52}
                interactive
                bind:activeIndex
            />
        </KpiCardVisual>
    </KpiCard>
</KpiCardGroup>`;

    const waterfallChartCode = `<script lang="ts">
    import { WaterfallChart, type ChartWaterfallRowType } from "cs/svelte/charts";

    interface BridgeStep {
        step: string;
        amount: number | null;
        type: ChartWaterfallRowType;
    }

    const data: BridgeStep[] = [
        { step: "Opening ARR", amount: 2_400_000, type: "start" },
        { step: "New Logos", amount: 680_000, type: "delta" },
        { step: "Expansion", amount: 420_000, type: "delta" },
        { step: "Gross ARR", amount: null, type: "subtotal" },
        { step: "Contraction", amount: -165_000, type: "delta" },
        { step: "Churn", amount: -235_000, type: "delta" },
        { step: "Net ARR", amount: null, type: "total" },
    ];

    let connectors = $state(true);
    let valueLabels = $state(true);
${closeScript}

<WaterfallChart
    variant="elevated"
    size="md"
    title="ARR Bridge"
    description="FY 2026 recurring revenue movement from opening to closing ARR"
    {data}
    x="step"
    value="amount"
    type="type"
    {connectors}
    {valueLabels}
    numberFormat={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
    locales="en-US"
    yAxis={{ label: "ARR ($)" }}
    height={300}
/>`;

    const bulletChartCode = `<script lang="ts">
    import { BulletChart, type ChartTone } from "cs/svelte/charts";

    interface PlantKpiDatum {
        metric: string;
        unit: string;
        actual: number;
        target: number;
        prior: number;
        ranges: readonly number[];
        max: number;
    }

    const kpis: PlantKpiDatum[] = [
        { metric: "OEE", unit: "%", actual: 86, target: 85, prior: 81, ranges: [60, 80, 100], max: 100 },
        { metric: "Throughput", unit: "t/h", actual: 142, target: 150, prior: 136, ranges: [90, 130, 180], max: 180 },
        { metric: "First-Pass Yield", unit: "%", actual: 97.4, target: 96, prior: 94.8, ranges: [80, 92, 100], max: 100 },
        { metric: "Energy Efficiency", unit: "%", actual: 74, target: 88, prior: 79, ranges: [60, 80, 100], max: 100 },
        { metric: "Line Utilization", unit: "%", actual: 84, target: 90, prior: 82, ranges: [60, 80, 100], max: 100 },
    ];

    let selectedIndex = $state<number | null>(null);

    function resolveTone(datum: { actual: number; target: number }): ChartTone {
        if (datum.actual >= datum.target) return "positive";
        if (datum.actual >= datum.target * 0.9) return "caution";
        return "negative";
    }
${closeScript}

<BulletChart
    variant="elevated"
    size="md"
    title="Plant Operations KPIs"
    description="Q4 actuals against target and prior-quarter benchmark"
    data={kpis}
    label="metric"
    unit="unit"
    actual="actual"
    target="target"
    comparative="prior"
    ranges="ranges"
    max="max"
    tone={resolveTone}
    numberFormat={{ maximumFractionDigits: 1 }}
    locales="en-US"
/>

<BulletChart
    variant="elevated"
    size="md"
    title="Regional Sales Quota"
    description="Q4 closed bookings against regional quota"
    data={regionalQuota}
    label="region"
    actual="actual"
    target="target"
    comparative="prior"
    ranges="ranges"
    tone={resolveTone}
    sharedScale={true}
    selectable={true}
    bind:selectedIndex
    numberFormat={{ style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }}
    locales="en-US"
/>`;

    const heatmapChartCode = `<script lang="ts">
    import { HeatmapChart, type ChartHeatmapRamp } from "cs/svelte/charts";

    let ramp = $state<Exclude<ChartHeatmapRamp, "diverging">>("accent");
    let valueLabels = $state(true);
    let selectedIndex = $state<number | null>(null);
${closeScript}

<HeatmapChart
    variant="elevated"
    size="md"
    title="Cohort Retention Matrix"
    description="Monthly account retention by signup cohort (%)"
    data={cohortRetention}
    x="month"
    y="cohort"
    value="retention"
    mode="sequential"
    {ramp}
    domain={[75, 100]}
    {valueLabels}
    numberFormat={{ maximumFractionDigits: 0 }}
    locales="en-US"
/>

<HeatmapChart
    variant="elevated"
    size="md"
    title="Regional Margin Variance"
    description="Operating margin variance vs. plan around 0% pivot"
    data={marginVariance}
    x="quarter"
    y="region"
    value="variance"
    mode="diverging"
    pivot={0}
    selectable={true}
    bind:selectedIndex
    numberFormat={{
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
    }}
    locales="en-US"
/>`;

    const interactiveCode = `<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import {
        Chart,
        ChartAxis,
        ChartCanvas,
        ChartCrosshair,
        ChartDescription,
        ChartEmpty,
        ChartGrid,
        ChartHeader,
        ChartLegend,
        ChartOverlay,
        ChartState,
        ChartTitle,
        ChartTooltip,
    } from "cs/svelte/charts";

    const chart = new ChartState({ data, x: "month", preferBandX: true, series });
${closeScript}

<Chart variant="elevated" size="md" state={chart}>
    <ChartHeader>
        <ChartTitle>Revenue Mix</ChartTitle>
        <ChartDescription>First half recurring and usage bookings</ChartDescription>
    </ChartHeader>
    <ChartLegend position="top" />
    {#if chart.allSeriesHidden}
        <ChartEmpty />
    {:else}
        <ChartCanvas height={260}>
            <ChartGrid />
            <ChartAxis position="left" />
            <ChartAxis position="bottom" />
            <ChartCrosshair />
            {#snippet overlay()}
                <ChartOverlay>
                    <Badge variant="soft" color="positive" size="sm" class="absolute top-2 right-2">
                        <BadgeLabel>+24% H1</BadgeLabel>
                    </Badge>
                </ChartOverlay>
            {/snippet}
        </ChartCanvas>
    {/if}
    <ChartTooltip
        showTotal
        numberFormat={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
        locales="en-US"
    />
</Chart>`;

    const variantsCode = `<script lang="ts">
    import {
        Chart,
        ChartAxis,
        ChartCanvas,
        ChartDescription,
        ChartGrid,
        ChartHeader,
        ChartTitle,
    } from "cs/svelte/charts";
${closeScript}

<Chart variant="elevated" size="md" {data} x="month" {series}>
    <ChartHeader>
        <ChartTitle>Monthly Revenue</ChartTitle>
        <ChartDescription>First half performance</ChartDescription>
    </ChartHeader>
    <ChartCanvas>
        <ChartGrid />
        <ChartAxis position="left" />
        <ChartAxis position="bottom" />
    </ChartCanvas>
</Chart>`;

    const nestedCode = `<Card variant="elevated" size="md">
    <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Quarterly performance breakdown</CardDescription>
    </CardHeader>
    <CardBody>
        <Chart variant="sunken" size="md" {data} x="month" {series}>
            <ChartCanvas>
                <ChartGrid />
                <ChartAxis position="left" />
                <ChartAxis position="bottom" />
            </ChartCanvas>
        </Chart>
    </CardBody>
</Card>`;

    const statesCode = `<Chart variant="elevated" size="md" state={chartState} loading={isLoading}>
    <ChartHeader>
        <ChartTitle>Revenue Pipeline</ChartTitle>
    </ChartHeader>
    {#if isLoading}
        <ChartLoading shape="bars" />
    {:else if chartState.isEmpty || chartState.allSeriesHidden}
        <ChartEmpty />
    {:else}
        <ChartCanvas>
            <ChartGrid />
            <ChartAxis position="left" />
            <ChartAxis position="bottom" />
        </ChartCanvas>
    {/if}
</Chart>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Charts"
        description="Borderless OKLCH chart shell, line, area, bar, composed, donut, and sparkline presets, reference overlays, responsive SVG canvas, interactive crosshair, top-layer tooltip, and legend."
    />

    <PreviewSection
        title="Line Chart"
        description="Multi-series time scale with dashed forecast, null-gap bridging, curve presets, and monotone single-hue styling."
        code={lineChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <LineChart
                variant="elevated"
                size="md"
                title="Annual Recurring Revenue"
                description="Monthly actuals vs. baseline forecast ($k)"
                data={ARR_TIME_DATA}
                x="date"
                series={ARR_TIME_SERIES}
                curve={lineCurve}
                tooltipMode={lineTooltipMode}
                {connectNulls}
                directLabels={lineDirectLabels}
                legend={lineDirectLabels ? "none" : "top"}
                height={280}
            >
                {#snippet actions()}
                    <SegmentedControl size="xs" bind:value={lineCurve} aria-label="Line curve">
                        {#each CHART_CURVES as curve (curve)}
                            <SegmentedControlItem value={curve}>
                                <SegmentedControlLabel class="capitalize">{curve}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                    <SegmentedControl size="xs" bind:value={lineTooltipMode} aria-label="Tooltip mode">
                        {#each CHART_TOOLTIP_MODES as mode (mode)}
                            <SegmentedControlItem value={mode}>
                                <SegmentedControlLabel class="capitalize">{mode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                    <ToggleButton variant="soft" color="accent" size="xs" bind:pressed={connectNulls}>
                        <ToggleButtonLabel>Connect nulls</ToggleButtonLabel>
                    </ToggleButton>
                    <ToggleButton variant="soft" color="accent" size="xs" bind:pressed={lineDirectLabels}>
                        <ToggleButtonLabel>Direct labels</ToggleButtonLabel>
                    </ToggleButton>
                {/snippet}
            </LineChart>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="elevated" size="md">
                    <CardHeader>
                        <CardTitle>Net Retention</CardTitle>
                        <CardDescription>Trailing six-month cohort rate (%)</CardDescription>
                    </CardHeader>
                    <CardBody>
                        <LineChart
                            variant="sunken"
                            size="sm"
                            monotone="teal"
                            data={RETENTION_DATA}
                            x="month"
                            series={RETENTION_SERIES}
                            legend="none"
                            height={196}
                        />
                    </CardBody>
                </Card>

                <LineChart
                    variant="elevated"
                    size="sm"
                    monotone="accent"
                    title="Weekly Active Teams"
                    description="Enterprise and mid-market workspaces"
                    data={ACTIVE_TEAMS_DATA}
                    x="date"
                    series={ACTIVE_TEAMS_SERIES}
                    legend="bottom"
                    height={208}
                />
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Area Chart"
        description="Vertical OKLCH gradients with overlay, stacked, and 100% stacked modes, live stacked totals, and interactive legend filtering."
        code={areaChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <AreaChart
                variant="elevated"
                size="md"
                title="Cloud Usage"
                description="Monthly compute units by tier"
                data={CLOUD_TRAFFIC_DATA}
                x="date"
                series={CLOUD_TRAFFIC_SERIES}
                mode={areaMode}
                height={290}
            >
                {#snippet actions()}
                    <SegmentedControl size="xs" bind:value={areaMode} aria-label="Area mode">
                        {#each CHART_AREA_MODES as mode (mode)}
                            <SegmentedControlItem value={mode}>
                                <SegmentedControlLabel class="capitalize">{mode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                {/snippet}
            </AreaChart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Bar Chart"
        description="Grouped, stacked, and 100% stacked vertical columns with hover band, morphing tooltip totals, and optional value labels."
        code={barChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <BarChart
                variant="elevated"
                size="md"
                title="Quarterly Bookings"
                description="Revenue by sales channel"
                data={QUARTERLY_BOOKINGS_DATA}
                x="quarter"
                series={QUARTERLY_BOOKINGS_SERIES}
                mode={barMode}
                valueLabels={barValueLabels}
                tooltipMode={barTooltipMode}
                yAxis={barMode === "percent" ? undefined : { format: formatUsdCompact }}
                height={290}
            >
                {#snippet actions()}
                    <SegmentedControl size="xs" bind:value={barMode} aria-label="Bar mode">
                        {#each CHART_BAR_MODES as mode (mode)}
                            <SegmentedControlItem value={mode}>
                                <SegmentedControlLabel class="capitalize">{mode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                    <SegmentedControl size="xs" bind:value={barValueLabels} aria-label="Value labels">
                        {#each CHART_BAR_VALUE_LABELS as labelMode (labelMode)}
                            <SegmentedControlItem value={labelMode}>
                                <SegmentedControlLabel class="capitalize">{labelMode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                    <SegmentedControl size="xs" bind:value={barTooltipMode} aria-label="Tooltip mode">
                        {#each CHART_TOOLTIP_MODES as mode (mode)}
                            <SegmentedControlItem value={mode}>
                                <SegmentedControlLabel class="capitalize">{mode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                {/snippet}
            </BarChart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Grouped & Stacked"
        description="Named series stacks sitting side-by-side per category with per-stack totals and inside segment labels."
        code={groupedStackedBarCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <BarChart
                variant="elevated"
                size="md"
                title="Plan vs. Actual"
                description="Quarterly cloud and services revenue against budget"
                data={PLAN_VS_ACTUAL_DATA}
                x="quarter"
                series={PLAN_VS_ACTUAL_SERIES}
                valueLabels={groupedStackedValueLabels}
                tooltipMode={groupedStackedTooltipMode}
                yAxis={{ format: formatUsdCompact }}
                height={300}
            >
                {#snippet actions()}
                    <SegmentedControl
                        size="xs"
                        bind:value={groupedStackedValueLabels}
                        aria-label="Grouped stacked value labels"
                    >
                        {#each CHART_BAR_VALUE_LABELS as labelMode (labelMode)}
                            <SegmentedControlItem value={labelMode}>
                                <SegmentedControlLabel class="capitalize">{labelMode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                    <SegmentedControl
                        size="xs"
                        bind:value={groupedStackedTooltipMode}
                        aria-label="Grouped stacked tooltip mode"
                    >
                        {#each CHART_TOOLTIP_MODES as mode (mode)}
                            <SegmentedControlItem value={mode}>
                                <SegmentedControlLabel class="capitalize">{mode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                {/snippet}
            </BarChart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Diverging Variance"
        description="Positive and negative stacked columns diverging around a crisp zero baseline with semantic tones."
        code={divergingBarCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <BarChart
                variant="elevated"
                size="md"
                title="Budget Variance"
                description="Monthly operating savings vs. cost overruns"
                data={BUDGET_VARIANCE_DATA}
                x="month"
                series={BUDGET_VARIANCE_SERIES}
                mode="stacked"
                grid={{ zeroLine: divergingZeroLine }}
                yAxis={{ format: formatUsdSignedCompact }}
                height={280}
            >
                {#snippet actions()}
                    <SegmentedControl size="xs" bind:value={divergingZeroLine} aria-label="Zero line style">
                        {#each CHART_ZERO_LINE_STYLES as style (style)}
                            <SegmentedControlItem value={style}>
                                <SegmentedControlLabel class="capitalize">{style}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                {/snippet}
            </BarChart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Horizontal Bars"
        description="Long category labels switching between truncated left gutter ticks and full-width inline above-bar headers."
        code={horizontalBarCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <BarChart
                variant="elevated"
                size="md"
                title="Department Spend"
                description="Annualized operating allocation by organization"
                data={DEPARTMENT_SPEND_DATA}
                x="department"
                series={DEPARTMENT_SPEND_SERIES}
                orientation="horizontal"
                labelLayout={horizontalLabelLayout}
                valueLabels="outside"
                legend="none"
                yAxis={{ format: formatUsdCompact }}
                height={320}
            >
                {#snippet actions()}
                    <SegmentedControl
                        size="xs"
                        bind:value={horizontalLabelLayout}
                        aria-label="Category label layout"
                    >
                        {#each CHART_BAR_LABEL_LAYOUTS as layout (layout)}
                            <SegmentedControlItem value={layout}>
                                <SegmentedControlLabel class="capitalize">{layout}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                {/snippet}
            </BarChart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Composed & Overlays"
        description="Mixed bar, area, and dual-axis line series with target SLA bands, budget reference lines, and point callout annotations."
        code={composedChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <ComposedChart
                variant="elevated"
                size="md"
                title="Revenue & Margin"
                description="Monthly revenue and direct costs against gross margin target"
                data={REVENUE_MARGIN_DATA}
                x="month"
                series={REVENUE_MARGIN_SERIES}
                referenceBands={REVENUE_MARGIN_BANDS}
                referenceLines={REVENUE_MARGIN_LINES}
                annotations={REVENUE_MARGIN_ANNOTATIONS}
                tooltipMode={composedTooltipMode}
                yAxis={{ format: formatUsdCompact, label: "Revenue ($)", domain: [0, 480_000] }}
                y2Axis={{ format: formatPercent, label: "Gross Margin", domain: [50, 80] }}
                height={320}
            >
                {#snippet actions()}
                    <SegmentedControl
                        size="xs"
                        bind:value={composedTooltipMode}
                        aria-label="Composed chart tooltip mode"
                    >
                        {#each CHART_TOOLTIP_MODES as mode (mode)}
                            <SegmentedControlItem value={mode}>
                                <SegmentedControlLabel class="capitalize">{mode}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                {/snippet}
            </ComposedChart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Controlling & IBCS"
        description="IBCS actual vs. forecast hatching, conditional threshold coloring, and synchronized click-to-select cross-filtering."
        code={controllingCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart
                    variant="elevated"
                    size="md"
                    title="Revenue Actual vs. Forecast"
                    description="Jan–Sep actuals and Q4 forecast"
                    data={CONTROLLING_MONTHLY_DATA}
                    x="month"
                    series={ACTUAL_FORECAST_SERIES}
                    legend="none"
                    selectable={true}
                    bind:selectedIndex={selectedControllingIndex}
                    yAxis={{ format: formatUsdCompact }}
                    height={260}
                >
                    {#snippet actions()}
                        {#if selectedControllingDatum}
                            <Badge variant="soft" color="accent" size="sm">
                                <BadgeLabel>
                                    {selectedControllingDatum.month}: {formatUsdCompact(
                                        selectedControllingDatum.revenue,
                                    )} ({selectedControllingDatum.isForecast ? "Forecast" : "Actual"})
                                </BadgeLabel>
                            </Badge>
                        {:else}
                            <Badge variant="soft" color="base" size="sm">
                                <BadgeLabel>FY 2026</BadgeLabel>
                            </Badge>
                        {/if}
                    {/snippet}
                </BarChart>

                <BarChart
                    variant="elevated"
                    size="md"
                    title="Plan Attainment"
                    description="Monthly target realization (%)"
                    data={CONTROLLING_MONTHLY_DATA}
                    x="month"
                    series={ATTAINMENT_SERIES}
                    referenceLines={ATTAINMENT_TARGET_LINES}
                    legend="none"
                    selectable={true}
                    bind:selectedIndex={selectedControllingIndex}
                    yAxis={{ format: formatPercent, domain: [0, 120] }}
                    height={260}
                >
                    {#snippet actions()}
                        {#if selectedControllingDatum}
                            <Badge
                                variant="soft"
                                color={getAttainmentTone(selectedControllingDatum.attainment)}
                                size="sm"
                            >
                                <BadgeLabel>
                                    {selectedControllingDatum.month}: {selectedControllingDatum.attainment}%
                                </BadgeLabel>
                            </Badge>
                        {:else}
                            <Badge variant="soft" color="base" size="sm">
                                <BadgeLabel>Target 100%</BadgeLabel>
                            </Badge>
                        {/if}
                    {/snippet}
                </BarChart>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Donut & Pie"
        description="Interactive donut and pie rings with morphing center KPI, percentage legend filtering, monotone ramps, and semantic slice tones."
        code={donutChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <DonutChart
                variant="elevated"
                size="md"
                title="Revenue by Segment"
                description="Annual recurring revenue distribution across customer tiers"
                data={REVENUE_SEGMENT_DATA}
                name="segment"
                value="revenue"
                innerRadiusRatio={donutShape === "donut" ? 0.68 : 0}
                gap={donutGap ? 4 : 0}
                valueLabels={donutValueLabels}
                centerLabel="Total ARR"
                numberFormat={DONUT_CURRENCY_FORMAT}
                locales="en-US"
                legend="end"
                height={280}
            >
                {#snippet actions()}
                    <SegmentedControl size="xs" bind:value={donutShape} aria-label="Chart shape">
                        <SegmentedControlItem value="donut">
                            <SegmentedControlLabel>Donut</SegmentedControlLabel>
                        </SegmentedControlItem>
                        <SegmentedControlItem value="pie">
                            <SegmentedControlLabel>Pie</SegmentedControlLabel>
                        </SegmentedControlItem>
                    </SegmentedControl>
                    <ToggleButton variant="soft" color="accent" size="xs" bind:pressed={donutGap}>
                        <ToggleButtonLabel>Gap</ToggleButtonLabel>
                    </ToggleButton>
                    <ToggleButton variant="soft" color="accent" size="xs" bind:pressed={donutValueLabels}>
                        <ToggleButtonLabel>Value labels</ToggleButtonLabel>
                    </ToggleButton>
                {/snippet}
            </DonutChart>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="elevated" size="md">
                    <CardHeader>
                        <CardTitle>Budget Allocation</CardTitle>
                        <CardDescription>Quarterly operating spend by department</CardDescription>
                    </CardHeader>
                    <CardBody>
                        <DonutChart
                            variant="sunken"
                            size="sm"
                            monotone="teal"
                            data={BUDGET_ALLOCATION_DATA}
                            name="category"
                            value="amount"
                            centerLabel="Budget"
                            numberFormat={DONUT_CURRENCY_FORMAT}
                            locales="en-US"
                            legend="end"
                            height={208}
                        />
                    </CardBody>
                </Card>

                <DonutChart
                    variant="elevated"
                    size="sm"
                    title="Invoice Status"
                    description="Current billing cycle health across accounts"
                    data={INVOICE_STATUS_DATA}
                    name="status"
                    value="count"
                    tone="tone"
                    centerLabel="Invoices"
                    legend="bottom"
                    height={208}
                />
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sparklines"
        description="Zero-chrome line, area, and bar micro-trends inside KPI cards and interactive table rows."
        code={sparklineCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <KpiCardGroup columns="auto">
                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>Monthly Recurring Revenue</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue>$142.8k</KpiCardValue>
                        <KpiCardDelta trend="up">+12.4%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardComparison>vs. last 14 days</KpiCardComparison>
                    <KpiCardVisual>
                        <Sparkline
                            data={SPARKLINE_MRR}
                            type="area"
                            tone="positive"
                            height={52}
                            label="Monthly recurring revenue trend"
                        />
                    </KpiCardVisual>
                </KpiCard>

                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>API Latency (p95)</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue>118 ms</KpiCardValue>
                        <KpiCardDelta trend="down" color="positive">-8.2%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardComparison>SLA target 140 ms</KpiCardComparison>
                    <KpiCardVisual>
                        <Sparkline
                            data={SPARKLINE_LATENCY}
                            type="line"
                            tone="accent"
                            target={140}
                            height={52}
                            label="API p95 latency trend"
                        />
                    </KpiCardVisual>
                </KpiCard>

                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>Daily Incidents</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue>4</KpiCardValue>
                        <KpiCardDelta trend="up" color="caution">+2</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardComparison>Last 14 days</KpiCardComparison>
                    <KpiCardVisual>
                        <Sparkline
                            data={SPARKLINE_INCIDENTS}
                            type="bar"
                            tone="caution"
                            height={52}
                            label="Daily incidents trend"
                        />
                    </KpiCardVisual>
                </KpiCard>
            </KpiCardGroup>

            <Card variant="elevated" size="md">
                <CardHeader>
                    <CardTitle>Service Telemetry</CardTitle>
                    <CardDescription>14-day endpoint activity</CardDescription>
                </CardHeader>
                <CardBody>
                    <div class="flex flex-col divide-y divide-base-weak">
                        {#each SPARKLINE_SERVICES as row (row.id)}
                            <div class="grid grid-cols-[minmax(0,1fr)_140px_112px] sm:grid-cols-[minmax(0,1fr)_180px_128px] items-center gap-4 py-3 first:pt-0 last:pb-0">
                                <div class="min-w-0 flex flex-col">
                                    <span class="text-sm font-medium text-strong truncate">{row.name}</span>
                                    <span class="text-xs text-weak truncate">{row.region}</span>
                                </div>
                                <Sparkline
                                    data={row.data}
                                    type={row.type}
                                    tone={row.tone}
                                    target={row.target}
                                    height={28}
                                    interactive
                                    bind:activeIndex={sparklineActiveIndices[row.id]}
                                    label={`${row.name} 14-day trend`}
                                />
                                <div class="flex flex-col items-end tabular-nums">
                                    <span class="text-sm font-semibold text-strong">
                                        <NumberMorph
                                            value={row.data[sparklineActiveIndices[row.id] ?? row.data.length - 1] ?? 0}
                                            prefix={row.prefix}
                                            suffix={row.suffix}
                                            format={row.format}
                                        />
                                    </span>
                                    <span class="text-xs text-weak">
                                        {SPARKLINE_DAYS[sparklineActiveIndices[row.id] ?? row.data.length - 1] ?? ""}
                                    </span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </CardBody>
            </Card>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Waterfall"
        description="Cumulative financial bridges with start, positive and negative delta, subtotal, and total bars, dashed step connectors, and morphing running-total tooltips."
        code={waterfallChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <WaterfallChart
                variant="elevated"
                size="md"
                title="ARR Bridge"
                description="FY 2026 recurring revenue movement from opening to closing ARR"
                data={ARR_BRIDGE_DATA}
                x="step"
                value="amount"
                type="type"
                connectors={waterfallConnectors}
                valueLabels={waterfallValueLabels}
                numberFormat={TOOLTIP_CURRENCY_FORMAT}
                locales="en-US"
                yAxis={{ label: "ARR ($)" }}
                height={300}
            >
                {#snippet actions()}
                    <ToggleButton variant="soft" color="accent" size="xs" bind:pressed={waterfallConnectors}>
                        <ToggleButtonLabel>Connectors</ToggleButtonLabel>
                    </ToggleButton>
                    <ToggleButton variant="soft" color="accent" size="xs" bind:pressed={waterfallValueLabels}>
                        <ToggleButtonLabel>Labels</ToggleButtonLabel>
                    </ToggleButton>
                {/snippet}
            </WaterfallChart>

            <WaterfallChart
                variant="elevated"
                size="md"
                title="Q1–Q4 EBITDA Bridge"
                description="Quarterly operating earnings progression with H1 subtotal"
                data={EBITDA_BRIDGE_DATA}
                x="step"
                value="amount"
                type="type"
                totalTone="accent"
                numberFormat={TOOLTIP_CURRENCY_FORMAT}
                locales="en-US"
                yAxis={{ label: "EBITDA ($)" }}
                height={270}
            />
        </div>
    </PreviewSection>

    <PreviewSection
        title="Bullet"
        description="Compact target-vs-actual KPI tracks with qualitative range bands, comparative prior-period markers, and shared-scale comparison."
        code={bulletChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <BulletChart
                    variant="elevated"
                    size="md"
                    title="Plant Operations KPIs"
                    description="Q4 actuals against target and prior-quarter benchmark"
                    data={PLANT_KPI_DATA}
                    label="metric"
                    unit="unit"
                    actual="actual"
                    target="target"
                    comparative="prior"
                    ranges="ranges"
                    max="max"
                    tone={resolveBulletTone}
                    numberFormat={BULLET_NUMBER_FORMAT}
                    locales="en-US"
                />

                <BulletChart
                    variant="elevated"
                    size="md"
                    title="Regional Sales Quota"
                    description="Q4 closed bookings against regional quota"
                    data={REGIONAL_QUOTA_DATA}
                    label="region"
                    actual="actual"
                    target="target"
                    comparative="prior"
                    ranges="ranges"
                    tone={resolveBulletTone}
                    sharedScale={true}
                    selectable={true}
                    bind:selectedIndex={selectedQuotaIndex}
                    numberFormat={BULLET_CURRENCY_FORMAT}
                    locales="en-US"
                >
                    {#snippet actions()}
                        <Badge variant="soft" color={selectedQuotaDatum ? "accent" : "base"} size="sm">
                            <BadgeLabel>
                                {selectedQuotaDatum
                                    ? `${selectedQuotaDatum.region}: ${formatUsdCompact(selectedQuotaDatum.actual)}`
                                    : "Q4 FY26"}
                            </BadgeLabel>
                        </Badge>
                    {/snippet}
                </BulletChart>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Heatmap & Matrix"
        description="Sequential and diverging 2D matrices with OKLCH color ramps, contrast-safe cell values, gliding legend notch, and 2D keyboard navigation."
        code={heatmapChartCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <HeatmapChart
                variant="elevated"
                size="md"
                title="Cohort Retention Matrix"
                description="Monthly account retention by signup cohort (%)"
                data={COHORT_RETENTION_DATA}
                x="month"
                y="cohort"
                value="retention"
                mode="sequential"
                ramp={heatmapRamp}
                domain={[75, 100]}
                valueLabels={heatmapValueLabels}
                numberFormat={HEATMAP_RETENTION_FORMAT}
                locales="en-US"
            >
                {#snippet actions()}
                    <SegmentedControl size="xs" bind:value={heatmapRamp} aria-label="Heatmap color ramp">
                        {#each HEATMAP_SEQUENTIAL_RAMPS as ramp (ramp)}
                            <SegmentedControlItem value={ramp}>
                                <SegmentedControlLabel class="capitalize">{ramp}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                    <ToggleButton variant="soft" color="accent" size="xs" bind:pressed={heatmapValueLabels}>
                        <ToggleButtonLabel>Values</ToggleButtonLabel>
                    </ToggleButton>
                {/snippet}
            </HeatmapChart>

            <HeatmapChart
                variant="elevated"
                size="md"
                title="Regional Margin Variance"
                description="Operating margin variance vs. plan around 0% pivot"
                data={MARGIN_VARIANCE_DATA}
                x="quarter"
                y="region"
                value="variance"
                mode="diverging"
                pivot={0}
                selectable={true}
                bind:selectedIndex={selectedVarianceCellIndex}
                numberFormat={HEATMAP_VARIANCE_FORMAT}
                locales="en-US"
            >
                {#snippet actions()}
                    <Badge
                        variant="soft"
                        color={selectedVarianceCell
                            ? selectedVarianceCell.variance >= 0
                                ? "positive"
                                : "negative"
                            : "base"}
                        size="sm"
                    >
                        <BadgeLabel>
                            {selectedVarianceCell
                                ? `${selectedVarianceCell.region} ${selectedVarianceCell.quarter}: ${new Intl.NumberFormat("en-US", HEATMAP_VARIANCE_FORMAT).format(selectedVarianceCell.variance)}`
                                : "FY 2026"}
                        </BadgeLabel>
                    </Badge>
                {/snippet}
            </HeatmapChart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Interactive"
        description="Pointer and keyboard crosshair scrubbing, top-layer morphing tooltip, interactive legend filtering, and plot-aligned overlays."
        code={interactiveCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <Chart variant="elevated" size="md" state={interactiveChart}>
                <ChartHeader>
                    <ChartTitle>Revenue Mix</ChartTitle>
                    <ChartDescription>First half recurring and usage bookings</ChartDescription>
                </ChartHeader>
                <ChartLegend position="top" />
                {#if interactiveChart.allSeriesHidden}
                    <ChartEmpty description="Toggle a series above or reset to restore the chart." />
                {:else}
                    <ChartCanvas height={260}>
                        <ChartGrid />
                        <ChartAxis position="left" />
                        <ChartAxis position="bottom" />
                        <ChartCrosshair />
                        {#snippet overlay()}
                            <ChartOverlay>
                                <Badge variant="soft" color="positive" size="sm" class="absolute top-2 right-2">
                                    <BadgeLabel>+24% H1</BadgeLabel>
                                </Badge>
                            </ChartOverlay>
                        {/snippet}
                    </ChartCanvas>
                {/if}
                <ChartTooltip showTotal numberFormat={TOOLTIP_CURRENCY_FORMAT} locales="en-US" />
            </Chart>

            <div class="max-w-lg">
                <Card variant="elevated" size="md">
                    <CardHeader>
                        <CardTitle>Q2 Billing</CardTitle>
                        <CardDescription>Monthly revenue breakdown</CardDescription>
                    </CardHeader>
                    <CardBody>
                        <Chart variant="sunken" size="sm" state={nestedInteractiveChart}>
                            {#if nestedInteractiveChart.allSeriesHidden}
                                <ChartEmpty description="Restore all series to continue." />
                            {:else}
                                <ChartCanvas height={190}>
                                    <ChartGrid />
                                    <ChartAxis position="left" />
                                    <ChartAxis position="bottom" />
                                    <ChartCrosshair />
                                </ChartCanvas>
                            {/if}
                            <ChartLegend position="bottom" />
                            <ChartTooltip showTotal numberFormat={TOOLTIP_CURRENCY_FORMAT} locales="en-US" />
                        </Chart>
                    </CardBody>
                </Card>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Shell Variants"
        description="Four surface variants matching Card and KpiCard shell geometry."
        code={variantsCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {#each CHART_VARIANTS as variant (variant)}
                    <Chart
                        {variant}
                        size="sm"
                        data={MONTHLY_DATA}
                        x="month"
                        series={MONTHLY_SERIES}
                        yAxis={{ format: formatUsdCompact }}
                    >
                        <ChartHeader>
                            <ChartTitle>{VARIANT_META[variant].title}</ChartTitle>
                            <ChartDescription>{VARIANT_META[variant].description}</ChartDescription>
                            <ChartActions>
                                <Badge variant="soft" color="base" size="sm">
                                    <BadgeLabel>{VARIANT_META[variant].badge}</BadgeLabel>
                                </Badge>
                            </ChartActions>
                        </ChartHeader>
                        <ChartCanvas>
                            <ChartGrid />
                            <ChartAxis position="left" />
                            <ChartAxis position="bottom" />
                        </ChartCanvas>
                    </Chart>
                {/each}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection title="Sizes" description="Three density scales controlling padding, typography, and plot height.">
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            {#each CHART_SIZES as size (size)}
                <Chart
                    variant="elevated"
                    {size}
                    data={MONTHLY_DATA}
                    x="month"
                    series={MONTHLY_SERIES}
                    yAxis={{ format: formatUsdCompact }}
                >
                    <ChartHeader>
                        <ChartTitle>{SIZE_META[size].title}</ChartTitle>
                        <ChartDescription>{SIZE_META[size].description}</ChartDescription>
                        <ChartActions>
                            <Badge variant="soft" color="base" size="sm">
                                <BadgeLabel class="uppercase">{size}</BadgeLabel>
                            </Badge>
                        </ChartActions>
                    </ChartHeader>
                    <ChartCanvas>
                        <ChartGrid />
                        <ChartAxis position="left" />
                        <ChartAxis position="bottom" />
                    </ChartCanvas>
                </Chart>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Nested in Card"
        description="Sunken and transparent charts inside elevated cards with concentric squircle radii and no double shadows."
        code={nestedCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="elevated" size="md">
                    <CardHeader>
                        <CardTitle>Revenue & Costs</CardTitle>
                        <CardDescription>First half financial overview</CardDescription>
                    </CardHeader>
                    <CardBody>
                        <Chart
                            variant="sunken"
                            size="md"
                            data={MONTHLY_DATA}
                            x="month"
                            series={MONTHLY_SERIES}
                            yAxis={{ format: formatUsdCompact }}
                        >
                            <ChartHeader>
                                <ChartTitle>Monthly Breakdown</ChartTitle>
                                <ChartDescription>USD consolidated</ChartDescription>
                            </ChartHeader>
                            <ChartCanvas height={200}>
                                <ChartGrid />
                                <ChartAxis position="left" />
                                <ChartAxis position="bottom" />
                            </ChartCanvas>
                        </Chart>
                    </CardBody>
                </Card>

                <Card variant="elevated" size="md">
                    <CardHeader>
                        <CardTitle>Quarterly Bookings</CardTitle>
                        <CardDescription>Direct flush canvas inside card body</CardDescription>
                    </CardHeader>
                    <CardBody>
                        <Chart
                            variant="transparent"
                            size="md"
                            data={MONTHLY_DATA}
                            x="month"
                            series={MONTHLY_SERIES}
                            yAxis={{ format: formatUsdCompact }}
                        >
                            <ChartCanvas height={252}>
                                <ChartGrid />
                                <ChartAxis position="left" />
                                <ChartAxis position="bottom" />
                            </ChartCanvas>
                        </Chart>
                    </CardBody>
                </Card>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Color Palettes"
        description="Calibrated OKLCH categorical slots, interleaved monotone ramps, and semantic status tokens adapting to Light and Dark mode."
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <Chart variant="elevated" size="md">
                <ChartHeader>
                    <ChartTitle>Categorical Palette</ChartTitle>
                    <ChartDescription>10 ordered series tokens</ChartDescription>
                </ChartHeader>
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {#each CATEGORICAL_SLOTS as item (item.slot)}
                        <div class="flex items-center gap-2.5 rounded-xl bg-sunken px-3 py-2.5">
                            <span
                                class="size-4 shrink-0 rounded-full"
                                style:background-color="var(--cs-chart-series-{item.slot})"
                                aria-hidden="true"
                            ></span>
                            <div class="min-w-0 flex flex-col">
                                <span class="text-xs font-medium text-strong truncate">{item.name}</span>
                                <span class="text-[11px] text-weak tabular-nums">series-{item.slot}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            </Chart>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {#each MONOTONE_PREVIEW_HUES as hue (hue)}
                    <Chart variant="elevated" size="sm" monotone={hue}>
                        <ChartHeader>
                            <ChartTitle class="capitalize">{hue}</ChartTitle>
                            <ChartDescription>Interleaved monotone ramp</ChartDescription>
                        </ChartHeader>
                        <div class="grid grid-cols-6 gap-2">
                            {#each MONOTONE_STEPS as step (step)}
                                <div class="flex flex-col items-center gap-1.5">
                                    <span
                                        class="w-full h-8 rounded-lg"
                                        style:background-color="var(--cs-chart-series-{step})"
                                        aria-hidden="true"
                                    ></span>
                                    <span class="text-[11px] text-weak tabular-nums">{step}</span>
                                </div>
                            {/each}
                        </div>
                    </Chart>
                {/each}
            </div>

            <Chart variant="elevated" size="sm" palette="semantic">
                <ChartHeader>
                    <ChartTitle>Semantic Status</ChartTitle>
                    <ChartDescription>Solid mark and soft pill tokens</ChartDescription>
                </ChartHeader>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {#each SEMANTIC_TONES as item (item.tone)}
                        <div class="flex items-center justify-between gap-3 rounded-xl bg-sunken px-3.5 py-2.5">
                            <div class="flex items-center gap-2.5">
                                <span
                                    class="size-4 shrink-0 rounded-full"
                                    style:background-color="var(--cs-chart-{item.tone})"
                                    aria-hidden="true"
                                ></span>
                                <span class="text-xs font-medium text-strong">{item.label}</span>
                            </div>
                            <span
                                class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style:background-color="var(--cs-chart-{item.tone}-soft)"
                                style:color="var(--cs-chart-{item.tone}-fg)"
                            >
                                {item.tone}
                            </span>
                        </div>
                    {/each}
                </div>
            </Chart>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Long Labels & Dual Y"
        description="Dynamic margins for German currency ticks, zero-crossing baselines, dual Y axes, and angled, wrapped, or truncated categories."
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <Chart
                variant="elevated"
                size="md"
                data={REGIONAL_DATA}
                x="region"
                preferBandX
                series={REGIONAL_SERIES}
                xAxis={{ tickAngle: -35 }}
                yAxis={{ format: formatEur, label: "Net Cashflow" }}
                y2Axis={{ format: formatPercent, label: "Margin %" }}
            >
                <ChartHeader>
                    <ChartTitle>Regional Cashflow & Margin</ChartTitle>
                    <ChartDescription>Q3 variance across European markets</ChartDescription>
                </ChartHeader>
                <ChartCanvas height={290}>
                    <ChartGrid horizontal zeroLine />
                    <ChartAxis position="left" />
                    <ChartAxis position="right" />
                    <ChartAxis position="bottom" />
                </ChartCanvas>
            </Chart>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart
                    variant="elevated"
                    size="md"
                    data={WRAPPED_CATEGORY_DATA}
                    x="category"
                    preferBandX
                    series={CATEGORY_SERIES}
                    xAxis={{ wrapTicks: true, maxTickWidth: 88 }}
                    yAxis={{ format: formatEur }}
                >
                    <ChartHeader>
                        <ChartTitle>Department Budgets</ChartTitle>
                        <ChartDescription>Two-line wrapped category ticks</ChartDescription>
                    </ChartHeader>
                    <ChartCanvas height={240}>
                        <ChartGrid />
                        <ChartAxis position="left" />
                        <ChartAxis position="bottom" />
                    </ChartCanvas>
                </Chart>

                <Chart
                    variant="elevated"
                    size="md"
                    data={TRUNCATED_CATEGORY_DATA}
                    x="category"
                    preferBandX
                    series={CATEGORY_SERIES}
                    xAxis={{ maxTickWidth: 72 }}
                    yAxis={{ format: formatEur }}
                >
                    <ChartHeader>
                        <ChartTitle>Product Line Allocation</ChartTitle>
                        <ChartDescription>Ellipsis-truncated ticks with full SVG titles</ChartDescription>
                    </ChartHeader>
                    <ChartCanvas height={240}>
                        <ChartGrid />
                        <ChartAxis position="left" />
                        <ChartAxis position="bottom" />
                    </ChartCanvas>
                </Chart>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Empty & Loading"
        description="Toggle between ready, empty data, all-series-hidden with reset, and loading shimmer shapes."
        code={statesCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <Chart variant="elevated" size="md" state={stateChart} loading={isLoadingState}>
                <ChartHeader>
                    <ChartTitle>Revenue Pipeline</ChartTitle>
                    <ChartDescription>Projected bookings for H1</ChartDescription>
                    <ChartActions>
                        {#if isLoadingState}
                            <SegmentedControl size="xs" bind:value={loadingShape} aria-label="Loading shape">
                                {#each CHART_LOADING_SHAPES as shape (shape)}
                                    <SegmentedControlItem value={shape}>
                                        <SegmentedControlLabel class="capitalize">{shape}</SegmentedControlLabel>
                                    </SegmentedControlItem>
                                {/each}
                            </SegmentedControl>
                        {/if}
                        <SegmentedControl
                            size="xs"
                            bind:value={() => activeStateMode, (next) => setStateMode(next)}
                            aria-label="Chart state"
                        >
                            <SegmentedControlItem value="ready">
                                <SegmentedControlLabel>Ready</SegmentedControlLabel>
                            </SegmentedControlItem>
                            <SegmentedControlItem value="empty">
                                <SegmentedControlLabel>Empty</SegmentedControlLabel>
                            </SegmentedControlItem>
                            <SegmentedControlItem value="all-hidden">
                                <SegmentedControlLabel>All hidden</SegmentedControlLabel>
                            </SegmentedControlItem>
                            <SegmentedControlItem value="loading">
                                <SegmentedControlLabel>Loading</SegmentedControlLabel>
                            </SegmentedControlItem>
                        </SegmentedControl>
                    </ChartActions>
                </ChartHeader>

                {#if isLoadingState}
                    <ChartLoading shape={loadingShape} />
                {:else if stateChart.isEmpty || stateChart.allSeriesHidden}
                    <ChartEmpty
                        description={stateChart.allSeriesHidden
                            ? "Enable at least one series to view the chart."
                            : "Adjust the selected period to populate this view."}
                    />
                {:else}
                    <ChartCanvas>
                        <ChartGrid />
                        <ChartAxis position="left" />
                        <ChartAxis position="bottom" />
                    </ChartCanvas>
                {/if}
            </Chart>
        </div>
    </PreviewSection>
</div>
