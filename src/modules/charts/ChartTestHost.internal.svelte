<script lang="ts">
    import { Card, type CardSize, type CardVariant } from "../card/index.ts";
    import {
        Chart,
        ChartActions,
        ChartAxis,
        ChartCanvas,
        ChartDescription,
        ChartEmpty,
        ChartGrid,
        ChartHeader,
        ChartLoading,
        ChartTitle,
        type ChartAxisConfig,
        type ChartDatum,
        type ChartMargins,
        type ChartMonotoneHue,
        type ChartOrientation,
        type ChartPalette,
        type ChartSeries,
        type ChartSize,
        type ChartState,
        type ChartTickAngle,
        type ChartTitleElement,
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
            | "uncontrolled";

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
        canvasAttrs?: Record<string, unknown>;
        canvasRef?: HTMLDivElement | null;
        svgRef?: SVGSVGElement | null;
        showOverlay?: boolean;
        showCustomMark?: boolean;

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
        canvasAttrs = {},
        canvasRef = $bindable(null),
        svgRef = $bindable(null),
        showOverlay = false,
        showCustomMark = false,

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

                {#if showCustomMark}
                    <circle data-testid="custom-mark" cx="10" cy="10" r="4" />
                {/if}

                {#snippet overlay()}
                    {#if showOverlay}
                        <div data-testid="canvas-overlay">Overlay content</div>
                    {/if}
                {/snippet}
            </ChartCanvas>
        {/if}

        {#if showEmpty}
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
{:else}
    {@render chartContent()}
{/if}
