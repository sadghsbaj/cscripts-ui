<script lang="ts">
    import { Card, type CardSize, type CardVariant } from "../card/index.ts";
    import type { NumberMorphFormat } from "../number-morph/index.ts";
    import {
        AreaChart,
        Chart,
        ChartActions,
        ChartArea,
        ChartAxis,
        ChartCanvas,
        ChartCrosshair,
        ChartDescription,
        ChartEmpty,
        ChartGrid,
        ChartHeader,
        ChartLegend,
        ChartLine,
        ChartLoading,
        ChartOverlay,
        ChartTitle,
        ChartTooltip,
        LineChart,
        type ChartAreaMode,
        type ChartAxisConfig,
        type ChartCurve,
        type ChartDatum,
        type ChartGridOption,
        type ChartLegendMarker,
        type ChartLegendPlacement,
        type ChartLegendPosition,
        type ChartLineDotsMode,
        type ChartMargins,
        type ChartMonotoneHue,
        type ChartOrientation,
        type ChartPalette,
        type ChartSeries,
        type ChartSize,
        type ChartState,
        type ChartTickAngle,
        type ChartTitleElement,
        type ChartTooltipContext,
        type ChartVariant,
        type ChartXScaleType,
        type ChartXValue,
    } from "./index.ts";

    interface Props {
        mode?:
            | "cartesian"
            | "nested-in-card"
            | "standalone-empty"
            | "standalone-loading"
            | "one-way-controlled"
            | "uncontrolled"
            | "line-chart"
            | "area-chart";

        cardVariant?: CardVariant;
        cardSize?: CardSize;

        variant?: ChartVariant;
        size?: ChartSize;
        palette?: ChartPalette;
        monotone?: ChartMonotoneHue;
        state?: ChartState<ChartDatum>;
        data?: readonly ChartDatum[];
        x?: string | ((datum: ChartDatum, index: number) => ChartXValue);
        xScaleType?: ChartXScaleType;
        preferBandX?: boolean;
        series?: readonly ChartSeries<ChartDatum>[];
        xAxis?: ChartAxisConfig;
        yAxis?: ChartAxisConfig;
        y2Axis?: ChartAxisConfig;
        orientation?: ChartOrientation;
        stacked?: boolean;
        margin?: Partial<ChartMargins>;
        hiddenSeriesIds?: readonly string[];
        activeIndex?: number | null;
        hoveredSeriesId?: string | null;
        loading?: boolean;
        empty?: boolean;
        label?: string;
        labelledBy?: string;
        chartClass?: string;
        chartAttrs?: Record<string, unknown>;
        chartRef?: HTMLElement | null;

        showHeader?: boolean;
        headerClass?: string;
        headerAttrs?: Record<string, unknown>;
        headerRef?: HTMLDivElement | null;
        titleText?: string;
        titleAs?: ChartTitleElement;
        titleAttrs?: Record<string, unknown>;
        titleRef?: HTMLHeadingElement | HTMLDivElement | null;
        descriptionText?: string;
        descriptionAttrs?: Record<string, unknown>;
        descriptionRef?: HTMLParagraphElement | null;
        showActions?: boolean;
        actionsAttrs?: Record<string, unknown>;
        actionsRef?: HTMLDivElement | null;

        showCanvas?: boolean;
        canvasHeight?: number | string;
        canvasAspectRatio?: string;
        canvasInteractive?: boolean;
        canvasOrientation?: ChartOrientation;
        canvasMargin?: Partial<ChartMargins>;
        canvasLabel?: string;
        canvasLabelledBy?: string;
        onPointClick?: (datum: ChartDatum, index: number) => void;
        canvasAttrs?: Record<string, unknown>;
        canvasRef?: HTMLDivElement | null;
        svgRef?: SVGSVGElement | null;
        showOverlay?: boolean;
        showCustomMark?: boolean;

        showCrosshair?: boolean;
        crosshairVertical?: boolean;
        crosshairHorizontal?: boolean;
        crosshairBand?: boolean;
        crosshairShowDots?: boolean;
        crosshairAttrs?: Record<string, unknown>;
        crosshairRef?: SVGGElement | null;

        showTooltip?: boolean;
        tooltipShowTotal?: boolean;
        tooltipMorph?: boolean;
        tooltipFormatX?: (value: ChartXValue) => string;
        tooltipFormatTotal?: (value: number) => string;
        tooltipNumberFormat?: NumberMorphFormat;
        tooltipLocales?: Intl.LocalesArgument;
        tooltipOffset?: number;
        tooltipCustomRenderer?: (ctx: ChartTooltipContext<ChartDatum>) => string;
        tooltipAttrs?: Record<string, unknown>;
        tooltipRef?: HTMLDivElement | null;

        showLegend?: boolean;
        legendPosition?: ChartLegendPlacement;
        legendAlign?: "start" | "center" | "end";
        legendInteractive?: boolean;
        legendMarker?: ChartLegendMarker;
        legendCustomContent?: string;
        legendAttrs?: Record<string, unknown>;
        legendRef?: HTMLDivElement | null;

        showChartOverlay?: boolean;
        chartOverlayContent?: string;
        chartOverlayAttrs?: Record<string, unknown>;
        chartOverlayRef?: HTMLDivElement | null;

        showGrid?: boolean;
        gridHorizontal?: boolean;
        gridVertical?: boolean;
        gridZeroLine?: boolean;
        gridTickCount?: number;
        gridAttrs?: Record<string, unknown>;
        gridRef?: SVGGElement | null;

        showBottomAxis?: boolean;
        bottomAxisLabel?: string;
        bottomAxisTickCount?: number;
        bottomAxisFormat?: (value: ChartXValue) => string;
        bottomAxisTickAngle?: ChartTickAngle;
        bottomAxisWrapTicks?: boolean;
        bottomAxisMaxTickWidth?: number;
        bottomAxisHideLine?: boolean;
        bottomAxisAttrs?: Record<string, unknown>;
        bottomAxisRef?: SVGGElement | null;

        showLeftAxis?: boolean;
        leftAxisLabel?: string;
        leftAxisTickCount?: number;
        leftAxisFormat?: (value: ChartXValue) => string;
        leftAxisMaxTickWidth?: number;
        leftAxisHideLine?: boolean;
        leftAxisRef?: SVGGElement | null;

        showRightAxis?: boolean;
        rightAxisLabel?: string;
        rightAxisTickCount?: number;
        rightAxisFormat?: (value: ChartXValue) => string;
        rightAxisMaxTickWidth?: number;
        rightAxisHideLine?: boolean;
        rightAxisRef?: SVGGElement | null;

        showEmpty?: boolean;
        showEmptyWhenAllHidden?: boolean;
        emptyTitle?: string;
        emptyDescription?: string;
        emptyHideReset?: boolean;
        emptyCustomContent?: string;
        onEmptyReset?: () => void;
        emptyAttrs?: Record<string, unknown>;
        emptyRef?: HTMLDivElement | null;

        showLoading?: boolean;
        loadingLabel?: string;
        loadingCustomContent?: string;
        loadingAttrs?: Record<string, unknown>;
        loadingRef?: HTMLDivElement | null;

        showLine?: boolean;
        lineSeriesId?: string;
        lineCurve?: ChartCurve;
        lineStrokeWidth?: number;
        lineDashed?: boolean;
        lineConnectNulls?: boolean;
        lineShowDots?: ChartLineDotsMode;
        lineShowLabels?: boolean;
        lineFormatLabel?: (
            value: number,
            datum: ChartDatum,
            series: ChartSeries<ChartDatum>,
        ) => string;
        lineAttrs?: Record<string, unknown>;
        lineRef?: SVGGElement | null;

        showArea?: boolean;
        areaSeriesId?: string;
        areaMode?: ChartAreaMode;
        areaCurve?: ChartCurve;
        areaGradient?: boolean;
        areaShowLine?: boolean;
        areaStrokeWidth?: number;
        areaDashed?: boolean;
        areaConnectNulls?: boolean;
        areaShowDots?: ChartLineDotsMode;
        areaAttrs?: Record<string, unknown>;
        areaRef?: SVGGElement | null;

        tier2Grid?: ChartGridOption;
        tier2Legend?: ChartLegendPosition;
        tier2Tooltip?: boolean;
        tier2ShowTotal?: boolean;
        tier2Title?: string;
        tier2Description?: string;
        tier2Height?: number | string;
        tier2AspectRatio?: string;
        tier2Interactive?: boolean;
        tier2CustomLayerText?: string;
    }

    let {
        mode = "cartesian",

        cardVariant = "elevated",
        cardSize = "md",

        variant = "elevated",
        size = "md",
        palette = "categorical",
        monotone,
        state: chartState,
        data,
        x,
        xScaleType,
        preferBandX,
        series,
        xAxis,
        yAxis,
        y2Axis,
        orientation,
        stacked,
        margin,
        hiddenSeriesIds = $bindable(),
        activeIndex = $bindable(),
        hoveredSeriesId = $bindable(),
        loading = false,
        empty,
        label,
        labelledBy,
        chartClass,
        chartAttrs = {},
        chartRef = $bindable(null),

        showHeader = false,
        headerClass,
        headerAttrs = {},
        headerRef = $bindable(null),
        titleText = "Monthly Revenue",
        titleAs,
        titleAttrs = {},
        titleRef = $bindable(null),
        descriptionText,
        descriptionAttrs = {},
        descriptionRef = $bindable(null),
        showActions = false,
        actionsAttrs = {},
        actionsRef = $bindable(null),

        showCanvas = false,
        canvasHeight,
        canvasAspectRatio,
        canvasInteractive = true,
        canvasOrientation,
        canvasMargin,
        canvasLabel,
        canvasLabelledBy,
        onPointClick,
        canvasAttrs = {},
        canvasRef = $bindable(null),
        svgRef = $bindable(null),
        showOverlay = false,
        showCustomMark = false,

        showCrosshair = false,
        crosshairVertical,
        crosshairHorizontal,
        crosshairBand,
        crosshairShowDots = true,
        crosshairAttrs = {},
        crosshairRef = $bindable(null),

        showTooltip = false,
        tooltipShowTotal = false,
        tooltipMorph = true,
        tooltipFormatX,
        tooltipFormatTotal,
        tooltipNumberFormat,
        tooltipLocales,
        tooltipOffset,
        tooltipCustomRenderer,
        tooltipAttrs = {},
        tooltipRef = $bindable(null),

        showLegend = false,
        legendPosition = "top",
        legendAlign = "start",
        legendInteractive = true,
        legendMarker = "auto",
        legendCustomContent,
        legendAttrs = {},
        legendRef = $bindable(null),

        showChartOverlay = false,
        chartOverlayContent = "Plot overlay",
        chartOverlayAttrs = {},
        chartOverlayRef = $bindable(null),

        showGrid = false,
        gridHorizontal = true,
        gridVertical = false,
        gridZeroLine = true,
        gridTickCount,
        gridAttrs = {},
        gridRef = $bindable(null),

        showBottomAxis = false,
        bottomAxisLabel,
        bottomAxisTickCount,
        bottomAxisFormat,
        bottomAxisTickAngle,
        bottomAxisWrapTicks,
        bottomAxisMaxTickWidth,
        bottomAxisHideLine,
        bottomAxisAttrs = {},
        bottomAxisRef = $bindable(null),

        showLeftAxis = false,
        leftAxisLabel,
        leftAxisTickCount,
        leftAxisFormat,
        leftAxisMaxTickWidth,
        leftAxisHideLine,
        leftAxisRef = $bindable(null),

        showRightAxis = false,
        rightAxisLabel,
        rightAxisTickCount,
        rightAxisFormat,
        rightAxisMaxTickWidth,
        rightAxisHideLine,
        rightAxisRef = $bindable(null),

        showEmpty = false,
        showEmptyWhenAllHidden = false,
        emptyTitle,
        emptyDescription,
        emptyHideReset = false,
        emptyCustomContent,
        onEmptyReset,
        emptyAttrs = {},
        emptyRef = $bindable(null),

        showLoading = false,
        loadingLabel,
        loadingCustomContent,
        loadingAttrs = {},
        loadingRef = $bindable(null),

        showLine = false,
        lineSeriesId,
        lineCurve,
        lineStrokeWidth,
        lineDashed,
        lineConnectNulls,
        lineShowDots,
        lineShowLabels,
        lineFormatLabel,
        lineAttrs = {},
        lineRef = $bindable(null),

        showArea = false,
        areaSeriesId,
        areaMode,
        areaCurve,
        areaGradient,
        areaShowLine,
        areaStrokeWidth,
        areaDashed,
        areaConnectNulls,
        areaShowDots,
        areaAttrs = {},
        areaRef = $bindable(null),

        tier2Grid = true,
        tier2Legend = "top",
        tier2Tooltip = true,
        tier2ShowTotal,
        tier2Title,
        tier2Description,
        tier2Height,
        tier2AspectRatio,
        tier2Interactive = true,
        tier2CustomLayerText,
    }: Props = $props();
</script>

{#snippet chartContent()}
    <Chart
        bind:ref={chartRef}
        bind:hiddenSeriesIds
        bind:activeIndex
        bind:hoveredSeriesId
        {variant}
        {size}
        {palette}
        {monotone}
        state={chartState}
        {data}
        {x}
        {xScaleType}
        {preferBandX}
        {series}
        {xAxis}
        {yAxis}
        {y2Axis}
        {orientation}
        {stacked}
        {margin}
        {loading}
        {empty}
        {label}
        {labelledBy}
        class={chartClass}
        {...chartAttrs}
    >
        {#if showHeader}
            <ChartHeader bind:ref={headerRef} class={headerClass} {...headerAttrs}>
                {#if titleText}
                    <ChartTitle bind:ref={titleRef} as={titleAs} {...titleAttrs}>
                        {titleText}
                    </ChartTitle>
                {/if}
                {#if descriptionText}
                    <ChartDescription bind:ref={descriptionRef} {...descriptionAttrs}>
                        {descriptionText}
                    </ChartDescription>
                {/if}
                {#if showActions}
                    <ChartActions bind:ref={actionsRef} {...actionsAttrs}>
                        <button type="button">Export</button>
                    </ChartActions>
                {/if}
            </ChartHeader>
        {/if}

        {#if showLegend}
            {#if legendCustomContent}
                <ChartLegend
                    bind:ref={legendRef}
                    position={legendPosition}
                    align={legendAlign}
                    interactive={legendInteractive}
                    marker={legendMarker}
                    {...legendAttrs}
                >
                    <span data-testid="custom-legend">{legendCustomContent}</span>
                </ChartLegend>
            {:else}
                <ChartLegend
                    bind:ref={legendRef}
                    position={legendPosition}
                    align={legendAlign}
                    interactive={legendInteractive}
                    marker={legendMarker}
                    {...legendAttrs}
                />
            {/if}
        {/if}

        {#if showCanvas}
            <ChartCanvas
                bind:ref={canvasRef}
                bind:svgRef
                height={canvasHeight}
                aspectRatio={canvasAspectRatio}
                interactive={canvasInteractive}
                orientation={canvasOrientation}
                margin={canvasMargin}
                label={canvasLabel}
                labelledBy={canvasLabelledBy}
                {onPointClick}
                {...canvasAttrs}
            >
                {#if showGrid}
                    <ChartGrid
                        bind:ref={gridRef}
                        horizontal={gridHorizontal}
                        vertical={gridVertical}
                        zeroLine={gridZeroLine}
                        tickCount={gridTickCount}
                        {...gridAttrs}
                    />
                {/if}

                {#if showBottomAxis}
                    <ChartAxis
                        bind:ref={bottomAxisRef}
                        position="bottom"
                        label={bottomAxisLabel}
                        tickCount={bottomAxisTickCount}
                        format={bottomAxisFormat}
                        tickAngle={bottomAxisTickAngle}
                        wrapTicks={bottomAxisWrapTicks}
                        maxTickWidth={bottomAxisMaxTickWidth}
                        hideLine={bottomAxisHideLine}
                        {...bottomAxisAttrs}
                    />
                {/if}

                {#if showLeftAxis}
                    <ChartAxis
                        bind:ref={leftAxisRef}
                        position="left"
                        label={leftAxisLabel}
                        tickCount={leftAxisTickCount}
                        format={leftAxisFormat}
                        maxTickWidth={leftAxisMaxTickWidth}
                        hideLine={leftAxisHideLine}
                    />
                {/if}

                {#if showRightAxis}
                    <ChartAxis
                        bind:ref={rightAxisRef}
                        position="right"
                        label={rightAxisLabel}
                        tickCount={rightAxisTickCount}
                        format={rightAxisFormat}
                        maxTickWidth={rightAxisMaxTickWidth}
                        hideLine={rightAxisHideLine}
                    />
                {/if}

                {#if showLine}
                    <ChartLine
                        bind:ref={lineRef}
                        seriesId={lineSeriesId}
                        curve={lineCurve}
                        strokeWidth={lineStrokeWidth}
                        dashed={lineDashed}
                        connectNulls={lineConnectNulls}
                        showDots={lineShowDots}
                        showLabels={lineShowLabels}
                        formatLabel={lineFormatLabel}
                        {...lineAttrs}
                    />
                {/if}

                {#if showArea}
                    <ChartArea
                        bind:ref={areaRef}
                        seriesId={areaSeriesId}
                        mode={areaMode}
                        curve={areaCurve}
                        gradient={areaGradient}
                        showLine={areaShowLine}
                        strokeWidth={areaStrokeWidth}
                        dashed={areaDashed}
                        connectNulls={areaConnectNulls}
                        showDots={areaShowDots}
                        {...areaAttrs}
                    />
                {/if}

                {#if showCustomMark}
                    <circle data-testid="custom-mark" cx="10" cy="10" r="4" />
                {/if}

                {#if showCrosshair}
                    <ChartCrosshair
                        bind:ref={crosshairRef}
                        vertical={crosshairVertical}
                        horizontal={crosshairHorizontal}
                        band={crosshairBand}
                        showDots={crosshairShowDots}
                        {...crosshairAttrs}
                    />
                {/if}

                {#snippet overlay()}
                    {#if showOverlay}
                        <div data-testid="canvas-overlay">Overlay content</div>
                    {/if}
                    {#if showChartOverlay}
                        <ChartOverlay bind:ref={chartOverlayRef} {...chartOverlayAttrs}>
                            <span data-testid="chart-overlay-child">{chartOverlayContent}</span>
                        </ChartOverlay>
                    {/if}
                {/snippet}
            </ChartCanvas>
        {/if}

        {#if showTooltip}
            {#if tooltipCustomRenderer}
                <ChartTooltip
                    bind:ref={tooltipRef}
                    showTotal={tooltipShowTotal}
                    morph={tooltipMorph}
                    formatX={tooltipFormatX}
                    formatTotal={tooltipFormatTotal}
                    numberFormat={tooltipNumberFormat}
                    locales={tooltipLocales}
                    offset={tooltipOffset}
                    {...tooltipAttrs}
                >
                    {#snippet children(ctx)}
                        <div data-testid="custom-tooltip">{tooltipCustomRenderer(ctx)}</div>
                    {/snippet}
                </ChartTooltip>
            {:else}
                <ChartTooltip
                    bind:ref={tooltipRef}
                    showTotal={tooltipShowTotal}
                    morph={tooltipMorph}
                    formatX={tooltipFormatX}
                    formatTotal={tooltipFormatTotal}
                    numberFormat={tooltipNumberFormat}
                    locales={tooltipLocales}
                    offset={tooltipOffset}
                    {...tooltipAttrs}
                />
            {/if}
        {/if}

        {#if showEmpty || (showEmptyWhenAllHidden && chartState?.allSeriesHidden)}
            {#if emptyCustomContent}
                <ChartEmpty
                    bind:ref={emptyRef}
                    title={emptyTitle}
                    description={emptyDescription}
                    hideReset={emptyHideReset}
                    onReset={onEmptyReset}
                    {...emptyAttrs}
                >
                    <span data-testid="custom-empty">{emptyCustomContent}</span>
                </ChartEmpty>
            {:else}
                <ChartEmpty
                    bind:ref={emptyRef}
                    title={emptyTitle}
                    description={emptyDescription}
                    hideReset={emptyHideReset}
                    onReset={onEmptyReset}
                    {...emptyAttrs}
                />
            {/if}
        {/if}

        {#if showLoading}
            {#if loadingCustomContent}
                <ChartLoading bind:ref={loadingRef} label={loadingLabel} {...loadingAttrs}>
                    <span data-testid="custom-loading">{loadingCustomContent}</span>
                </ChartLoading>
            {:else}
                <ChartLoading bind:ref={loadingRef} label={loadingLabel} {...loadingAttrs} />
            {/if}
        {/if}
    </Chart>
{/snippet}

{#snippet customTier2Tooltip(ctx: ChartTooltipContext<ChartDatum>)}
    <div data-testid="custom-tooltip">{tooltipCustomRenderer?.(ctx)}</div>
{/snippet}

{#snippet customTier2Actions()}
    <button type="button" data-testid="tier2-action-btn">Export CSV</button>
{/snippet}

{#snippet customTier2Layer()}
    {#if tier2CustomLayerText}
        <g data-testid="custom-svg-layer">
            <text x="12" y="16">{tier2CustomLayerText}</text>
        </g>
    {/if}
{/snippet}

{#snippet customTier2Overlay()}
    {#if showOverlay}
        <div data-testid="tier2-overlay">Tier 2 Overlay</div>
    {/if}
{/snippet}

{#if mode === "nested-in-card"}
    <Card variant={cardVariant} size={cardSize}>
        {@render chartContent()}
    </Card>
{:else if mode === "standalone-empty"}
    {#if emptyCustomContent}
        <ChartEmpty
            bind:ref={emptyRef}
            title={emptyTitle}
            description={emptyDescription}
            hideReset={emptyHideReset}
            onReset={onEmptyReset}
            {...emptyAttrs}
        >
            <span data-testid="custom-empty">{emptyCustomContent}</span>
        </ChartEmpty>
    {:else}
        <ChartEmpty
            bind:ref={emptyRef}
            title={emptyTitle}
            description={emptyDescription}
            hideReset={emptyHideReset}
            onReset={onEmptyReset}
            {...emptyAttrs}
        />
    {/if}
{:else if mode === "standalone-loading"}
    {#if loadingCustomContent}
        <ChartLoading bind:ref={loadingRef} label={loadingLabel} {...loadingAttrs}>
            <span data-testid="custom-loading">{loadingCustomContent}</span>
        </ChartLoading>
    {:else}
        <ChartLoading bind:ref={loadingRef} label={loadingLabel} {...loadingAttrs} />
    {/if}
{:else if mode === "one-way-controlled"}
    <Chart
        bind:ref={chartRef}
        {variant}
        {size}
        state={chartState}
        {data}
        {x}
        {series}
        {hiddenSeriesIds}
        {activeIndex}
        {hoveredSeriesId}
        {...chartAttrs}
    />
{:else if mode === "uncontrolled"}
    <Chart
        bind:ref={chartRef}
        {variant}
        {size}
        state={chartState}
        {data}
        {x}
        {series}
        {...chartAttrs}
    />
{:else if mode === "line-chart"}
    <LineChart
        bind:ref={chartRef}
        bind:svgRef
        bind:hiddenSeriesIds
        bind:activeIndex
        bind:hoveredSeriesId
        {variant}
        {size}
        data={data ?? []}
        x={x ?? "x"}
        series={series ?? []}
        {xScaleType}
        curve={lineCurve}
        strokeWidth={lineStrokeWidth}
        showDots={lineShowDots}
        connectNulls={lineConnectNulls}
        showLabels={lineShowLabels}
        formatLabel={lineFormatLabel}
        grid={tier2Grid}
        {xAxis}
        {yAxis}
        {y2Axis}
        legend={tier2Legend}
        tooltip={tooltipCustomRenderer ? customTier2Tooltip : tier2Tooltip}
        showTotal={tier2ShowTotal}
        {palette}
        {monotone}
        title={tier2Title}
        description={tier2Description}
        actions={showActions ? customTier2Actions : undefined}
        height={tier2Height}
        aspectRatio={tier2AspectRatio}
        {margin}
        {loading}
        {empty}
        {emptyTitle}
        {emptyDescription}
        interactive={tier2Interactive}
        {onPointClick}
        {label}
        {labelledBy}
        children={tier2CustomLayerText ? customTier2Layer : undefined}
        overlay={showOverlay ? customTier2Overlay : undefined}
        class={chartClass}
        {...chartAttrs}
    />
{:else if mode === "area-chart"}
    <AreaChart
        bind:ref={chartRef}
        bind:svgRef
        bind:hiddenSeriesIds
        bind:activeIndex
        bind:hoveredSeriesId
        {variant}
        {size}
        data={data ?? []}
        x={x ?? "x"}
        series={series ?? []}
        {xScaleType}
        mode={areaMode}
        curve={areaCurve}
        gradient={areaGradient}
        showLine={areaShowLine}
        strokeWidth={areaStrokeWidth}
        showDots={areaShowDots}
        connectNulls={areaConnectNulls}
        grid={tier2Grid}
        {xAxis}
        {yAxis}
        {y2Axis}
        legend={tier2Legend}
        tooltip={tooltipCustomRenderer ? customTier2Tooltip : tier2Tooltip}
        showTotal={tier2ShowTotal}
        {palette}
        {monotone}
        title={tier2Title}
        description={tier2Description}
        actions={showActions ? customTier2Actions : undefined}
        height={tier2Height}
        aspectRatio={tier2AspectRatio}
        {margin}
        {loading}
        {empty}
        {emptyTitle}
        {emptyDescription}
        interactive={tier2Interactive}
        {onPointClick}
        {label}
        {labelledBy}
        children={tier2CustomLayerText ? customTier2Layer : undefined}
        overlay={showOverlay ? customTier2Overlay : undefined}
        class={chartClass}
        {...chartAttrs}
    />
{:else}
    {@render chartContent()}
{/if}
