<script module lang="ts">
    export const id = "charts";
    export const label = "Charts";
</script>

<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "cs/svelte/card";
    import {
        CHART_LOADING_SHAPES,
        CHART_SIZES,
        CHART_VARIANTS,
        Chart,
        ChartActions,
        ChartAxis,
        ChartCanvas,
        ChartDescription,
        ChartEmpty,
        ChartGrid,
        ChartHeader,
        ChartLoading,
        ChartState,
        ChartTitle,
        type ChartLoadingShape,
        type ChartMonotoneHue,
        type ChartSeries,
        type ChartSize,
        type ChartTone,
        type ChartVariant,
        type ChartXValue,
    } from "cs/svelte/charts";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

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

    function formatPercent(value: ChartXValue): string {
        if (typeof value !== "number") return String(value);
        return `${value}%`;
    }

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

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
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
        description="Borderless OKLCH chart shell, responsive SVG canvas, snapped Cartesian grid, smart axes, and empty or loading states."
    />

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
