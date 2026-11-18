<script lang="ts">
    import type { Component } from "svelte";
    import { untrack } from "svelte";
    import type { MouseEventHandler } from "svelte/elements";

    import {
        Card,
        CardTitle,
        getCardContext,
        hasCardContext,
        type CardContext,
        type CardOrientation,
        type CardSize,
        type CardVariant,
    } from "../card/index.ts";
    import type { CloseButtonSize, CloseButtonVariant } from "../close-button/index.ts";
    import type { ProgressAppearance, ProgressColor, ProgressSize, ProgressVariant } from "../progress/index.ts";
    import Self from "./KpiCardTestHost.internal.svelte";
    import KpiCardTestIcon from "./KpiCardTestIcon.internal.svelte";
    import {
        getKpiCardContext,
        hasKpiCardContext,
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
        type KpiCardContext,
        type KpiCardDeltaTrend,
        type KpiCardDeltaVariant,
        type KpiCardGroupColumns,
        type KpiCardIconComponentProps,
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

    interface Props {
        mode?: "full" | "probe" | "card-probe" | "card-wraps-kpi";
        probeId?: string;

        variant?: KpiCardVariant;
        size?: KpiCardSize;
        layout?: KpiCardLayout;
        kpiClass?: string;
        kpiAttrs?: Record<string, unknown>;
        kpiRef?: HTMLDivElement | null;

        showHeader?: boolean;
        headerClass?: string;
        headerAttrs?: Record<string, unknown>;
        headerRef?: HTMLDivElement | null;

        showIcon?: boolean;
        iconComponent?: Component<KpiCardIconComponentProps>;
        iconColor?: KpiCardColor;
        iconStrokeWidth?: number | string;
        iconAttrs?: Record<string, unknown>;
        iconRef?: HTMLSpanElement | null;

        labelText?: string;
        labelAs?: KpiCardLabelElement;
        labelAttrs?: Record<string, unknown>;
        labelRef?: HTMLHeadingElement | HTMLSpanElement | HTMLDivElement | null;

        showMetric?: boolean;
        metricAttrs?: Record<string, unknown>;
        metricRef?: HTMLDivElement | null;

        showValue?: boolean;
        valueText?: string;
        valuePrefix?: string;
        valueSuffix?: string;
        valueAttrs?: Record<string, unknown>;
        valueRef?: HTMLDivElement | null;

        showDelta?: boolean;
        deltaText?: string;
        deltaTrend?: KpiCardDeltaTrend;
        deltaColor?: KpiCardColor;
        deltaVariant?: KpiCardDeltaVariant;
        deltaShowIcon?: boolean;
        deltaIcon?: Component<KpiCardIconComponentProps>;
        deltaAttrs?: Record<string, unknown>;
        deltaRef?: HTMLSpanElement | null;

        showComparison?: boolean;
        comparisonText?: string;
        comparisonAttrs?: Record<string, unknown>;
        comparisonRef?: HTMLParagraphElement | null;

        showTarget?: boolean;
        targetValue?: number | null;
        targetMin?: number;
        targetMax?: number;
        targetAppearance?: ProgressAppearance;
        targetVariant?: ProgressVariant;
        targetColor?: ProgressColor;
        targetSize?: ProgressSize;
        targetSegments?: number;
        targetLabel?: string;
        targetReadout?: string;
        targetChildrenText?: string;
        targetAttrs?: Record<string, unknown>;
        targetRef?: HTMLDivElement | null;

        showVisual?: boolean;
        visualPlacement?: KpiCardVisualPlacement;
        visualVariant?: KpiCardVisualVariant;
        visualRatio?: KpiCardVisualRatio;
        visualBleed?: boolean;
        visualAttrs?: Record<string, unknown>;
        visualRef?: HTMLDivElement | null;

        showBreakdown?: boolean;
        breakdownVariant?: KpiCardBreakdownVariant;
        breakdownColumns?: KpiCardBreakdownColumns;
        breakdownAttrs?: Record<string, unknown>;
        breakdownRef?: HTMLDivElement | null;

        showBody?: boolean;
        bodyText?: string;
        bodyAttrs?: Record<string, unknown>;
        bodyRef?: HTMLDivElement | null;

        showFooter?: boolean;
        footerMeta?: string;
        footerAttrs?: Record<string, unknown>;
        footerRef?: HTMLDivElement | null;

        showActions?: boolean;
        actionsAlign?: KpiCardActionsAlign;
        actionsOrientation?: KpiCardActionsOrientation;
        actionsAttrs?: Record<string, unknown>;
        actionsRef?: HTMLDivElement | null;

        showOrnament?: boolean;
        ornamentPlacement?: KpiCardOrnamentPlacement;
        ornamentShape?: KpiCardOrnamentShape;
        ornamentAttrs?: Record<string, unknown>;
        ornamentRef?: HTMLDivElement | null;

        showClose?: boolean;
        closeVariant?: CloseButtonVariant;
        closeSize?: CloseButtonSize;
        closeDisabled?: boolean;
        closeAttrs?: Record<string, unknown>;
        closeRef?: HTMLButtonElement | null;
        onCloseClick?: MouseEventHandler<HTMLButtonElement>;

        showProbe?: boolean;

        showInnerKpiCard?: boolean;
        innerVariant?: KpiCardVariant;
        innerSize?: KpiCardSize;
        innerLayout?: KpiCardLayout;
        innerAttrs?: Record<string, unknown>;
        showInnerDelta?: boolean;
        innerDeltaVariant?: KpiCardDeltaVariant;
        showInnerProbe?: boolean;

        showDeepKpiCard?: boolean;
        deepVariant?: KpiCardVariant;
        deepSize?: KpiCardSize;
        deepLayout?: KpiCardLayout;
        deepAttrs?: Record<string, unknown>;
        showDeepProbe?: boolean;

        showInnerGroup?: boolean;
        groupColumns?: KpiCardGroupColumns;
        groupAttrs?: Record<string, unknown>;
        groupCardAttrs?: Record<string, unknown>;

        showInnerCard?: boolean;
        cardVariant?: CardVariant;
        cardSize?: CardSize;
        cardOrientation?: CardOrientation;
        cardAttrs?: Record<string, unknown>;
    }

    let {
        mode = "full",
        probeId = "kpi-context-probe",

        variant = "elevated",
        size = "md",
        layout,
        kpiClass,
        kpiAttrs = {},
        kpiRef = $bindable(null),

        showHeader = false,
        headerClass,
        headerAttrs = {},
        headerRef = $bindable(null),

        showIcon = false,
        iconComponent = KpiCardTestIcon,
        iconColor,
        iconStrokeWidth,
        iconAttrs = {},
        iconRef = $bindable(null),

        labelText = "Revenue",
        labelAs,
        labelAttrs = {},
        labelRef = $bindable(null),

        showMetric = false,
        metricAttrs = {},
        metricRef = $bindable(null),

        showValue = false,
        valueText = "42,500",
        valuePrefix,
        valueSuffix,
        valueAttrs = {},
        valueRef = $bindable(null),

        showDelta = false,
        deltaText = "+12%",
        deltaTrend,
        deltaColor,
        deltaVariant,
        deltaShowIcon,
        deltaIcon,
        deltaAttrs = {},
        deltaRef = $bindable(null),

        showComparison = false,
        comparisonText = "vs. previous 30d",
        comparisonAttrs = {},
        comparisonRef = $bindable(null),

        showTarget = false,
        targetValue,
        targetMin,
        targetMax,
        targetAppearance,
        targetVariant,
        targetColor,
        targetSize,
        targetSegments,
        targetLabel,
        targetReadout,
        targetChildrenText,
        targetAttrs = {},
        targetRef = $bindable(null),

        showVisual = false,
        visualPlacement,
        visualVariant,
        visualRatio,
        visualBleed,
        visualAttrs = {},
        visualRef = $bindable(null),

        showBreakdown = false,
        breakdownVariant,
        breakdownColumns,
        breakdownAttrs = {},
        breakdownRef = $bindable(null),

        showBody = false,
        bodyText = "Additional metric details",
        bodyAttrs = {},
        bodyRef = $bindable(null),

        showFooter = false,
        footerMeta = "Updated 2m ago",
        footerAttrs = {},
        footerRef = $bindable(null),

        showActions = false,
        actionsAlign,
        actionsOrientation,
        actionsAttrs = {},
        actionsRef = $bindable(null),

        showOrnament = false,
        ornamentPlacement,
        ornamentShape,
        ornamentAttrs = {},
        ornamentRef = $bindable(null),

        showClose = false,
        closeVariant = "soft",
        closeSize,
        closeDisabled = false,
        closeAttrs = {},
        closeRef = $bindable(null),
        onCloseClick,

        showProbe = false,

        showInnerKpiCard = false,
        innerVariant = "soft",
        innerSize = "sm",
        innerLayout = "stack",
        innerAttrs = {},
        showInnerDelta = false,
        innerDeltaVariant,
        showInnerProbe = false,

        showDeepKpiCard = false,
        deepVariant = "sunken",
        deepSize = "sm",
        deepLayout = "stack",
        deepAttrs = {},
        showDeepProbe = false,

        showInnerGroup = false,
        groupColumns = "auto",
        groupAttrs = {},
        groupCardAttrs = {},

        showInnerCard = false,
        cardVariant = "soft",
        cardSize = "sm",
        cardOrientation = "vertical",
        cardAttrs = {},
    }: Props = $props();

    function readKpiContextProbe(): { hasCtx: boolean; threwOnGet: boolean; ctx: KpiCardContext | undefined } {
        const hasCtx = hasKpiCardContext();
        let threwOnGet = false;
        let ctx: KpiCardContext | undefined;
        try {
            ctx = getKpiCardContext();
        } catch {
            threwOnGet = true;
        }
        return { hasCtx, threwOnGet, ctx };
    }

    function readCardProbe(): {
        hasCardCtx: boolean;
        cardCtx: CardContext | undefined;
        hasKpiCtx: boolean;
        kpiCtx: KpiCardContext | undefined;
    } {
        return {
            hasCardCtx: hasCardContext(),
            cardCtx: hasCardContext() ? getCardContext() : undefined,
            hasKpiCtx: hasKpiCardContext(),
            kpiCtx: hasKpiCardContext() ? getKpiCardContext() : undefined,
        };
    }

    const probe = untrack(() => (mode === "probe" ? readKpiContextProbe() : undefined));
    const cardProbe = untrack(() => (mode === "card-probe" ? readCardProbe() : undefined));
</script>

{#snippet valueBlock()}
    <KpiCardValue bind:ref={valueRef} prefix={valuePrefix} suffix={valueSuffix} {...valueAttrs}>
        {valueText}
    </KpiCardValue>
{/snippet}

{#snippet deltaBlock()}
    <KpiCardDelta
        bind:ref={deltaRef}
        trend={deltaTrend}
        color={deltaColor}
        variant={deltaVariant}
        showIcon={deltaShowIcon}
        icon={deltaIcon}
        {...deltaAttrs}
    >
        {deltaText}
    </KpiCardDelta>
{/snippet}

{#if mode === "probe" && probe}
    <div
        data-testid={probeId}
        data-has-context={String(probe.hasCtx)}
        data-threw-on-get={String(probe.threwOnGet)}
        data-ctx-variant={probe.ctx?.variant}
        data-ctx-size={probe.ctx?.size}
        data-ctx-layout={probe.ctx?.layout}
        data-ctx-nested={probe.ctx !== undefined ? String(probe.ctx.nested) : undefined}
    ></div>
{:else if mode === "card-probe" && cardProbe}
    <div
        data-testid={probeId}
        data-has-card-ctx={String(cardProbe.hasCardCtx)}
        data-card-size={cardProbe.cardCtx?.size}
        data-has-kpi-ctx={String(cardProbe.hasKpiCtx)}
        data-kpi-size={cardProbe.kpiCtx?.size}
    ></div>
{:else if mode === "card-wraps-kpi"}
    <Card variant={cardVariant} size={cardSize} orientation={cardOrientation} {...cardAttrs}>
        {#if showInnerGroup}
            <KpiCardGroup columns={groupColumns} {...groupAttrs}>
                <KpiCard variant={innerVariant} size={innerSize} layout={innerLayout} {...groupCardAttrs}>
                    <KpiCardDelta trend="up" data-testid="group-kpi-delta">+4%</KpiCardDelta>
                    <Self mode="probe" probeId="group-kpi-probe" />
                </KpiCard>
            </KpiCardGroup>
        {:else}
            <KpiCard variant={innerVariant} size={innerSize} layout={innerLayout} {...innerAttrs}>
                <KpiCardDelta trend="up" data-testid="card-kpi-delta">+8%</KpiCardDelta>
                <Self mode="probe" probeId="card-kpi-probe" />
            </KpiCard>
        {/if}
    </Card>
{:else}
    <KpiCard bind:ref={kpiRef} {variant} {size} {layout} class={kpiClass} {...kpiAttrs}>
        {#if showOrnament}
            <KpiCardOrnament
                bind:ref={ornamentRef}
                placement={ornamentPlacement}
                shape={ornamentShape}
                {...ornamentAttrs}
            >
                <span data-testid="ornament-glyph">*</span>
            </KpiCardOrnament>
        {/if}

        {#if showClose}
            <KpiCardClose
                bind:ref={closeRef}
                variant={closeVariant}
                size={closeSize}
                disabled={closeDisabled}
                onclick={onCloseClick}
                {...closeAttrs}
            />
        {/if}

        {#if showHeader}
            <KpiCardHeader bind:ref={headerRef} class={headerClass} {...headerAttrs}>
                {#if showIcon}
                    <KpiCardIcon
                        bind:ref={iconRef}
                        icon={iconComponent}
                        color={iconColor}
                        strokeWidth={iconStrokeWidth}
                        {...iconAttrs}
                    />
                {/if}
                {#if labelText}
                    <KpiCardLabel bind:ref={labelRef} as={labelAs} {...labelAttrs}>
                        {labelText}
                    </KpiCardLabel>
                {/if}
            </KpiCardHeader>
        {/if}

        {#if showMetric}
            <KpiCardMetric bind:ref={metricRef} {...metricAttrs}>
                {#if showValue}
                    {@render valueBlock()}
                {/if}
                {#if showDelta}
                    {@render deltaBlock()}
                {/if}
            </KpiCardMetric>
        {:else}
            {#if showValue}
                {@render valueBlock()}
            {/if}
            {#if showDelta}
                {@render deltaBlock()}
            {/if}
        {/if}

        {#if showComparison}
            <KpiCardComparison bind:ref={comparisonRef} {...comparisonAttrs}>
                {comparisonText}
            </KpiCardComparison>
        {/if}

        {#if showTarget}
            {#if targetChildrenText}
                <KpiCardTarget
                    bind:ref={targetRef}
                    value={targetValue}
                    min={targetMin}
                    max={targetMax}
                    appearance={targetAppearance}
                    variant={targetVariant}
                    color={targetColor}
                    size={targetSize}
                    segments={targetSegments}
                    label={targetLabel}
                    target={targetReadout}
                    {...targetAttrs}
                >
                    <span data-testid="target-custom-child">{targetChildrenText}</span>
                </KpiCardTarget>
            {:else}
                <KpiCardTarget
                    bind:ref={targetRef}
                    value={targetValue}
                    min={targetMin}
                    max={targetMax}
                    appearance={targetAppearance}
                    variant={targetVariant}
                    color={targetColor}
                    size={targetSize}
                    segments={targetSegments}
                    label={targetLabel}
                    target={targetReadout}
                    {...targetAttrs}
                />
            {/if}
        {/if}

        {#if showVisual}
            <KpiCardVisual
                bind:ref={visualRef}
                placement={visualPlacement}
                variant={visualVariant}
                ratio={visualRatio}
                bleed={visualBleed}
                {...visualAttrs}
            >
                <svg viewBox="0 0 100 24" data-testid="visual-svg"></svg>
            </KpiCardVisual>
        {/if}

        {#if showBreakdown}
            <KpiCardBreakdown
                bind:ref={breakdownRef}
                variant={breakdownVariant}
                columns={breakdownColumns}
                {...breakdownAttrs}
            >
                <KpiCardBreakdownItem label="Direct" value="18,200" share="43%" dotColor="accent" />
                <KpiCardBreakdownItem label="Organic" value="24,300" share="57%" dotColor="positive" />
            </KpiCardBreakdown>
        {/if}

        {#if showBody}
            <KpiCardBody bind:ref={bodyRef} {...bodyAttrs}>
                <p>{bodyText}</p>
            </KpiCardBody>
        {/if}

        {#if showFooter}
            <KpiCardFooter bind:ref={footerRef} {...footerAttrs}>
                {#if footerMeta}
                    <span data-testid="footer-meta">{footerMeta}</span>
                {/if}
                {#if showActions}
                    <KpiCardActions
                        bind:ref={actionsRef}
                        align={actionsAlign}
                        orientation={actionsOrientation}
                        {...actionsAttrs}
                    >
                        <button type="button">Inspect</button>
                    </KpiCardActions>
                {/if}
            </KpiCardFooter>
        {:else if showActions}
            <KpiCardActions
                bind:ref={actionsRef}
                align={actionsAlign}
                orientation={actionsOrientation}
                {...actionsAttrs}
            >
                <button type="button">Action</button>
            </KpiCardActions>
        {/if}

        {#if showProbe}
            <Self mode="probe" />
        {/if}

        {#if showInnerKpiCard}
            <KpiCard variant={innerVariant} size={innerSize} layout={innerLayout} {...innerAttrs}>
                {#if showInnerDelta}
                    <KpiCardDelta trend="up" variant={innerDeltaVariant} data-testid="inner-delta">+5%</KpiCardDelta>
                {/if}
                {#if showInnerProbe}
                    <Self mode="probe" probeId="inner-kpi-probe" />
                {/if}
                {#if showDeepKpiCard}
                    <KpiCard variant={deepVariant} size={deepSize} layout={deepLayout} {...deepAttrs}>
                        {#if showDeepProbe}
                            <Self mode="probe" probeId="deep-kpi-probe" />
                        {/if}
                    </KpiCard>
                {/if}
            </KpiCard>
        {/if}

        {#if showInnerGroup}
            <KpiCardGroup columns={groupColumns} {...groupAttrs}>
                <KpiCard variant={innerVariant} size={innerSize} layout={innerLayout} {...groupCardAttrs}>
                    <KpiCardDelta trend="up" data-testid="group-inner-delta">+3%</KpiCardDelta>
                    <Self mode="probe" probeId="group-inner-probe" />
                </KpiCard>
            </KpiCardGroup>
        {/if}

        {#if showInnerCard}
            <Card variant={cardVariant} size={cardSize} orientation={cardOrientation} {...cardAttrs}>
                <CardTitle data-testid="inner-card-title">Nested generic card</CardTitle>
                <Self mode="card-probe" probeId="inner-card-probe" />
            </Card>
        {/if}
    </KpiCard>
{/if}
