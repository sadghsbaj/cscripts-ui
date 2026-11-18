<script module lang="ts">
    export const id = "kpi-card";
    export const label = "KPI Card";
</script>

<script lang="ts">
    import { Activity, RefreshCw, RotateCcw } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "cs/svelte/card";
    import {
        KPI_CARD_LAYOUTS,
        KPI_CARD_SIZES,
        KPI_CARD_VARIANTS,
        KpiCard,
        KpiCardActions,
        KpiCardBreakdown,
        KpiCardBreakdownItem,
        KpiCardClose,
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
        type KpiCardColor,
        type KpiCardDeltaTrend,
        type KpiCardLayout,
        type KpiCardSize,
        type KpiCardVariant,
    } from "cs/svelte/kpi-card";
    import { NumberMorph, NumberMorphGroup } from "cs/svelte/number-morph";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import { Switch } from "cs/svelte/switch";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    interface PlaygroundSnapshot {
        value: number;
        delta: number;
        trend: KpiCardDeltaTrend;
        color: KpiCardColor;
        targetValue: number;
        targetMax: number;
        targetColor: KpiCardColor;
        targetLabel: string;
        linePath: string;
        areaPath: string;
    }

    const INITIAL_SNAPSHOT: PlaygroundSnapshot = {
        value: 148_920.45,
        delta: 0.142,
        trend: "up",
        color: "positive",
        targetValue: 148_920,
        targetMax: 175_000,
        targetColor: "accent",
        targetLabel: "$148.9k / $175k",
        linePath: "M0 44 C 24 41, 44 35, 68 37 C 92 39, 112 24, 136 26 C 160 28, 184 15, 208 17 C 232 19, 256 8, 280 6",
        areaPath:
            "M0 44 C 24 41, 44 35, 68 37 C 92 39, 112 24, 136 26 C 160 28, 184 15, 208 17 C 232 19, 256 8, 280 6 L 280 56 L 0 56 Z",
    };

    const PLAYGROUND_SNAPSHOTS: readonly PlaygroundSnapshot[] = [
        INITIAL_SNAPSHOT,
        {
            value: 98_420.5,
            delta: -0.048,
            trend: "down",
            color: "negative",
            targetValue: 98_420,
            targetMax: 175_000,
            targetColor: "caution",
            targetLabel: "$98.4k / $175k",
            linePath:
                "M0 16 C 24 18, 44 22, 68 20 C 92 18, 112 28, 136 29 C 160 30, 184 34, 208 38 C 232 42, 256 44, 280 46",
            areaPath:
                "M0 16 C 24 18, 44 22, 68 20 C 92 18, 112 28, 136 29 C 160 30, 184 34, 208 38 C 232 42, 256 44, 280 46 L 280 56 L 0 56 Z",
        },
        {
            value: 1_124_680.12,
            delta: 0.286,
            trend: "up",
            color: "positive",
            targetValue: 1_124_680,
            targetMax: 1_250_000,
            targetColor: "positive",
            targetLabel: "$1.12M / $1.25M",
            linePath:
                "M0 48 C 24 44, 44 40, 68 34 C 92 28, 112 30, 136 22 C 160 15, 184 18, 208 11 C 232 6, 256 5, 280 4",
            areaPath:
                "M0 48 C 24 44, 44 40, 68 34 C 92 28, 112 30, 136 22 C 160 15, 184 18, 208 11 C 232 6, 256 5, 280 4 L 280 56 L 0 56 Z",
        },
        {
            value: 136_500,
            delta: 0.002,
            trend: "flat",
            color: "base",
            targetValue: 136_500,
            targetMax: 175_000,
            targetColor: "accent",
            targetLabel: "$136.5k / $175k",
            linePath:
                "M0 28 C 24 27, 44 30, 68 28 C 92 26, 112 29, 136 27 C 160 25, 184 28, 208 27 C 232 26, 256 28, 280 27",
            areaPath:
                "M0 28 C 24 27, 44 30, 68 28 C 92 26, 112 29, 136 27 C 160 25, 184 28, 208 27 C 232 26, 256 28, 280 27 L 280 56 L 0 56 Z",
        },
    ];

    let variant = $state<KpiCardVariant>("elevated");
    let size = $state<KpiCardSize>("md");
    let layout = $state<KpiCardLayout>("stack");
    let showSparkline = $state(true);
    let bleed = $state(false);
    let showTarget = $state(false);
    let showClose = $state(false);
    let snapshotIndex = $state(0);

    let ornamentDismissed = $state(false);

    const activeSnapshot = $derived(PLAYGROUND_SNAPSHOTS[snapshotIndex] ?? INITIAL_SNAPSHOT);

    function cycleSnapshot(): void {
        snapshotIndex = (snapshotIndex + 1) % PLAYGROUND_SNAPSHOTS.length;
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const playgroundCode = $derived.by(() => {
        const layoutAttr = layout === "stack" ? "" : ` layout="${layout}"`;
        const closeBlock = showClose ? '\n    <KpiCardClose variant="soft" />' : "";
        const targetBlock = showTarget
            ? `\n    <KpiCardTarget value={${activeSnapshot.targetValue}} max={${activeSnapshot.targetMax}} color="${activeSnapshot.targetColor}" label="Quarterly goal" target="${activeSnapshot.targetLabel}" />`
            : "";
        const visualBlock = showSparkline
            ? `\n    <KpiCardVisual${bleed ? " bleed" : ""}>\n        <!-- sparkline SVG -->\n    </KpiCardVisual>`
            : "";

        return `<script lang="ts">
    import {
        KpiCard,
        ${showClose ? "KpiCardClose,\n        " : ""}KpiCardDelta,
        KpiCardHeader,
        KpiCardLabel,
        KpiCardMetric,
        ${showTarget ? "KpiCardTarget,\n        " : ""}KpiCardValue${showSparkline ? ",\n        KpiCardVisual" : ""},
    } from "cs/svelte/kpi-card";
    import { NumberMorph, NumberMorphGroup } from "cs/svelte/number-morph";

    let revenue = $state(${activeSnapshot.value});
${closeScript}

<KpiCard variant="${variant}" size="${size}"${layoutAttr}>
    <KpiCardHeader>
        <KpiCardLabel>Monthly Revenue</KpiCardLabel>
    </KpiCardHeader>${closeBlock}
    <KpiCardMetric>
        <NumberMorphGroup class="flex-wrap items-baseline gap-2">
            <KpiCardValue>
                <NumberMorph value={revenue} locales="en-US" format={{ style: "currency", currency: "USD" }} />
            </KpiCardValue>
            <KpiCardDelta trend="${activeSnapshot.trend}" color="${activeSnapshot.color}">
                <NumberMorph value={${activeSnapshot.delta}} format={{ style: "percent", minimumFractionDigits: 1, signDisplay: "always" }} />
            </KpiCardDelta>
        </NumberMorphGroup>
    </KpiCardMetric>${targetBlock}${visualBlock}
</KpiCard>`;
    });

    const layoutsCode = `<KpiCard variant="elevated" size="lg" layout="hero">
    <KpiCardHeader>
        <KpiCardLabel>Annual Run Rate</KpiCardLabel>
        <Badge variant="soft" color="positive" size="sm">
            <BadgeLabel>On pace</BadgeLabel>
        </Badge>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue prefix="$">1,787,040</KpiCardValue>
        <KpiCardDelta trend="up">+21.8%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardVisual placement="bottom" bleed><!-- area sparkline SVG --></KpiCardVisual>
</KpiCard>

<KpiCard variant="elevated" size="md" layout="stack">
    <KpiCardHeader>
        <KpiCardLabel>Active Users</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue>42,810</KpiCardValue>
        <KpiCardDelta trend="up">+8.4%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardVisual><!-- sparkline SVG --></KpiCardVisual>
</KpiCard>

<KpiCard variant="elevated" size="md" layout="split">
    <KpiCardHeader>
        <KpiCardLabel>Weekly Deployments</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue>1,842</KpiCardValue>
        <KpiCardDelta trend="up">+16.2%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardVisual variant="sunken"><!-- bar chart SVG --></KpiCardVisual>
</KpiCard>

<KpiCard variant="elevated" size="md" layout="inline">
    <KpiCardHeader>
        <KpiCardLabel>Conversion Rate</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue suffix="%">3.84</KpiCardValue>
        <KpiCardDelta trend="up">+0.4%</KpiCardDelta>
    </KpiCardMetric>
</KpiCard>`;

    const intentsCode = `<!-- Inverted positive: lower latency is good -->
<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>P95 API Latency</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue suffix="ms">118</KpiCardValue>
        <KpiCardDelta trend="down" color="positive">-24 ms</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardTarget
        value={118}
        max={200}
        appearance="dashed"
        segments={12}
        color="positive"
        label="SLA budget"
        target="118 / 200 ms"
    />
</KpiCard>

<!-- Inverted negative: higher churn is bad -->
<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>Revenue Churn</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue suffix="%">4.2</KpiCardValue>
        <KpiCardDelta trend="up" color="negative">+1.1%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardTarget value={4.2} max={5} color="negative" label="Churn ceiling" target="4.2% / 5.0%" />
</KpiCard>`;

    const nestingCode = `<KpiCard variant="elevated" size="lg" layout="hero">
    <KpiCardHeader>
        <KpiCardLabel>Platform Throughput</KpiCardLabel>
        <Badge variant="soft" color="positive" size="sm"><BadgeLabel>Healthy</BadgeLabel></Badge>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue suffix="req/h">1.42M</KpiCardValue>
        <KpiCardDelta trend="up">+11.4%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardGroup columns={3}>
        <KpiCard variant="sunken" size="sm">
            <KpiCardHeader><KpiCardLabel>Edge Cache Hit</KpiCardLabel></KpiCardHeader>
            <KpiCardMetric>
                <KpiCardValue suffix="%">96.4</KpiCardValue>
                <KpiCardDelta trend="up">+0.8%</KpiCardDelta>
            </KpiCardMetric>
        </KpiCard>
        <KpiCard variant="soft" size="sm">
            <KpiCardHeader><KpiCardLabel>Error Budget</KpiCardLabel></KpiCardHeader>
            <KpiCardMetric>
                <KpiCardValue suffix="%">99.94</KpiCardValue>
                <KpiCardDelta variant="dot" color="positive">Nominal</KpiCardDelta>
            </KpiCardMetric>
        </KpiCard>
    </KpiCardGroup>
</KpiCard>

<Card variant="elevated" size="lg">
    <CardHeader>
        <CardTitle>Billing & Usage</CardTitle>
        <CardDescription>Current cycle telemetry for Acme Workspace.</CardDescription>
    </CardHeader>
    <CardBody>
        <KpiCardGroup columns={2}>
            <KpiCard variant="sunken" size="md">...</KpiCard>
            <KpiCard variant="sunken" size="md">...</KpiCard>
        </KpiCardGroup>
    </CardBody>
</Card>`;

    const breakdownCode = `<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>Channel Attribution</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue prefix="$">148,920</KpiCardValue>
        <KpiCardDelta trend="up">+14.2%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardBreakdown variant="plain" columns={1}>
        <KpiCardBreakdownItem label="Organic Search" value="$92,330" share="62%" dotColor="accent" />
        <KpiCardBreakdownItem label="Direct Traffic" value="$35,740" share="24%" dotColor="positive" />
        <KpiCardBreakdownItem label="Partner Referral" value="$20,850" share="14%" dotColor="caution" />
    </KpiCardBreakdown>
</KpiCard>

<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>Request Latency</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue suffix="ms">210</KpiCardValue>
        <KpiCardDelta trend="down" color="positive">-18 ms</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardBreakdown variant="sunken" columns={3}>
        <KpiCardBreakdownItem label="P50" value="84 ms" dotColor="positive" />
        <KpiCardBreakdownItem label="P90" value="210 ms" dotColor="accent" />
        <KpiCardBreakdownItem label="P99" value="412 ms" dotColor="caution" />
    </KpiCardBreakdown>
</KpiCard>

<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>Daily Active Users</KpiCardLabel>
        <KpiCardIcon icon={Activity} />
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue>38,410</KpiCardValue>
        <KpiCardDelta trend="up">+6.8%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardVisual placement="bottom" bleed><!-- sparkline SVG --></KpiCardVisual>
</KpiCard>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="KPI Card"
        description="Borderless analytics surface sharing Card shell geometry with structured readouts, NumberMorph hooks, semantic deltas, target meters, and concentric nesting."
    />

    <PreviewSection
        title="Interactive Playground"
        description="Configure variant, size, layout, sparkline bleed, target meter, and live NumberMorph updates."
        code={playgroundCode}
    >
        <div class="w-full flex flex-col gap-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Variant</span>
                    <SegmentedControl size="sm" width="equal" bind:value={variant} aria-label="KPI card variant">
                        {#each KPI_CARD_VARIANTS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Size</span>
                    <SegmentedControl size="sm" width="equal" bind:value={size} aria-label="KPI card size">
                        {#each KPI_CARD_SIZES as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="uppercase">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Layout</span>
                    <SegmentedControl size="sm" width="equal" bind:value={layout} aria-label="KPI card layout">
                        {#each KPI_CARD_LAYOUTS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                    <label class="flex items-center gap-2 text-sm text-main select-none">
                        <Switch size="sm" bind:checked={showSparkline} />
                        <span>Sparkline</span>
                    </label>

                    <label class="flex items-center gap-2 text-sm text-main select-none">
                        <Switch size="sm" bind:checked={bleed} disabled={!showSparkline} />
                        <span>Bleed visual</span>
                    </label>

                    <label class="flex items-center gap-2 text-sm text-main select-none">
                        <Switch size="sm" bind:checked={showTarget} />
                        <span>Target bar</span>
                    </label>

                    <label class="flex items-center gap-2 text-sm text-main select-none">
                        <Switch size="sm" bind:checked={showClose} />
                        <span>Close button</span>
                    </label>
                </div>

                <Button variant="secondary" size="sm" onclick={cycleSnapshot}>
                    <ButtonIcon icon={RefreshCw} />
                    <ButtonLabel>Simulate update</ButtonLabel>
                </Button>
            </div>

            <div
                class={[
                    "w-full rounded-2xl squircle-soft p-6 md:p-8 flex justify-center transition-colors",
                    variant === "soft" || variant === "sunken"
                        ? "bg-elevated border border-base-soft"
                        : "bg-canvas border border-transparent",
                ]}
            >
                <div class="w-full max-w-xl">
                    <KpiCard {variant} {size} {layout}>
                        <KpiCardHeader>
                            <KpiCardLabel>Monthly Revenue</KpiCardLabel>
                        </KpiCardHeader>

                        {#if showClose}
                            <KpiCardClose variant="soft" onclick={() => (showClose = false)} />
                        {/if}

                        <KpiCardMetric>
                            <NumberMorphGroup class="flex-wrap items-baseline gap-x-2 gap-y-1.5">
                                <KpiCardValue>
                                    <NumberMorph
                                        value={activeSnapshot.value}
                                        locales="en-US"
                                        format={{ style: "currency", currency: "USD" }}
                                    />
                                </KpiCardValue>
                                <KpiCardDelta trend={activeSnapshot.trend} color={activeSnapshot.color}>
                                    <NumberMorph
                                        value={activeSnapshot.delta}
                                        format={{
                                            style: "percent",
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                            signDisplay: "always",
                                        }}
                                    />
                                </KpiCardDelta>
                            </NumberMorphGroup>
                        </KpiCardMetric>

                        {#if showTarget}
                            <KpiCardTarget
                                value={activeSnapshot.targetValue}
                                max={activeSnapshot.targetMax}
                                color={activeSnapshot.targetColor}
                                label="Quarterly goal"
                                target={activeSnapshot.targetLabel}
                            />
                        {/if}

                        {#if showSparkline}
                            <KpiCardVisual {bleed} variant="transparent">
                                <svg
                                    viewBox="0 0 280 56"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                    class={layout === "inline" ? "w-full h-full" : "w-full h-14"}
                                >
                                    <defs>
                                        <linearGradient id="kpi-playground-area" x1="0" y1="0" x2="0" y2="1">
                                            <stop
                                                offset="0%"
                                                stop-color={activeSnapshot.color === "negative"
                                                    ? "var(--cs-color-negative-solid)"
                                                    : "var(--cs-color-accent-solid)"}
                                                stop-opacity="0.2"
                                            />
                                            <stop
                                                offset="100%"
                                                stop-color={activeSnapshot.color === "negative"
                                                    ? "var(--cs-color-negative-solid)"
                                                    : "var(--cs-color-accent-solid)"}
                                                stop-opacity="0"
                                            />
                                        </linearGradient>
                                    </defs>
                                    {#if layout !== "inline"}
                                        <line
                                            x1="0"
                                            y1="30"
                                            x2="280"
                                            y2="30"
                                            stroke="var(--cs-color-text-weaker)"
                                            stroke-opacity="0.4"
                                            stroke-width="1"
                                            stroke-dasharray="3 3"
                                        />
                                    {/if}
                                    <path d={activeSnapshot.areaPath} fill="url(#kpi-playground-area)" />
                                    <path
                                        d={activeSnapshot.linePath}
                                        fill="none"
                                        stroke={activeSnapshot.color === "negative"
                                            ? "var(--cs-color-negative-solid)"
                                            : "var(--cs-color-accent-solid)"}
                                        stroke-width={layout === "inline" ? "1.75" : "2"}
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </KpiCardVisual>
                        {/if}
                    </KpiCard>
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Layout Modes"
        description="Hero spotlight, vertical stack, side-visual split, and compact inline strip presets."
        code={layoutsCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-4">
            <KpiCard variant="elevated" size="lg" layout="hero">
                <KpiCardHeader>
                    <KpiCardLabel>Annual Run Rate</KpiCardLabel>
                    <Badge variant="soft" color="positive" size="sm">
                        <BadgeLabel>On pace</BadgeLabel>
                    </Badge>
                </KpiCardHeader>

                <KpiCardMetric>
                    <KpiCardValue prefix="$">1,787,040</KpiCardValue>
                    <KpiCardDelta trend="up">+21.8%</KpiCardDelta>
                </KpiCardMetric>

                <KpiCardVisual placement="bottom" bleed>
                    <svg viewBox="0 0 560 72" preserveAspectRatio="none" aria-hidden="true" class="w-full h-18">
                        <defs>
                            <linearGradient id="kpi-hero-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="var(--cs-color-accent-solid)" stop-opacity="0.22" />
                                <stop offset="100%" stop-color="var(--cs-color-accent-solid)" stop-opacity="0" />
                            </linearGradient>
                        </defs>
                        <line
                            x1="0"
                            y1="42"
                            x2="560"
                            y2="42"
                            stroke="var(--cs-color-text-weaker)"
                            stroke-opacity="0.35"
                            stroke-width="1"
                            stroke-dasharray="4 4"
                        />
                        <path
                            d="M0 60 C 56 56, 98 46, 148 48 C 198 50, 232 34, 286 31 C 340 28, 386 22, 434 16 C 476 11, 518 12, 560 6 L 560 72 L 0 72 Z"
                            fill="url(#kpi-hero-grad)"
                        />
                        <path
                            d="M0 60 C 56 56, 98 46, 148 48 C 198 50, 232 34, 286 31 C 340 28, 386 22, 434 16 C 476 11, 518 12, 560 6"
                            fill="none"
                            stroke="var(--cs-color-accent-solid)"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </KpiCardVisual>
            </KpiCard>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KpiCard variant="elevated" size="md" layout="stack">
                    <KpiCardHeader>
                        <KpiCardLabel>Active Users</KpiCardLabel>
                    </KpiCardHeader>

                    <KpiCardMetric>
                        <KpiCardValue>42,810</KpiCardValue>
                        <KpiCardDelta trend="up">+8.4%</KpiCardDelta>
                    </KpiCardMetric>

                    <KpiCardVisual variant="transparent">
                        <svg viewBox="0 0 240 52" preserveAspectRatio="none" aria-hidden="true" class="w-full h-13">
                            <defs>
                                <linearGradient id="kpi-stack-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="var(--cs-color-positive-solid)" stop-opacity="0.2" />
                                    <stop offset="100%" stop-color="var(--cs-color-positive-solid)" stop-opacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0 40 C 30 38, 60 34, 90 36 C 120 38, 150 22, 180 18 C 204 15, 222 10, 240 8 L 240 52 L 0 52 Z"
                                fill="url(#kpi-stack-grad)"
                            />
                            <path
                                d="M0 40 C 30 38, 60 34, 90 36 C 120 38, 150 22, 180 18 C 204 15, 222 10, 240 8"
                                fill="none"
                                stroke="var(--cs-color-positive-solid)"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </KpiCardVisual>
                </KpiCard>

                <KpiCard variant="elevated" size="md" layout="stack">
                    <KpiCardHeader>
                        <KpiCardLabel>Quarterly Quota</KpiCardLabel>
                    </KpiCardHeader>

                    <KpiCardMetric>
                        <KpiCardValue prefix="$">128,400</KpiCardValue>
                        <KpiCardDelta trend="up">+12.4%</KpiCardDelta>
                    </KpiCardMetric>

                    <KpiCardTarget
                        value={128_400}
                        max={150_000}
                        color="accent"
                        label="Q4 goal"
                        target="$128.4k / $150k"
                    />
                </KpiCard>
            </div>

            <KpiCard variant="elevated" size="md" layout="split">
                <KpiCardHeader>
                    <KpiCardLabel>Weekly Deployments</KpiCardLabel>
                </KpiCardHeader>

                <KpiCardMetric>
                    <KpiCardValue>1,842</KpiCardValue>
                    <KpiCardDelta trend="up">+16.2%</KpiCardDelta>
                </KpiCardMetric>

                <KpiCardVisual variant="sunken">
                    <svg viewBox="0 0 120 72" aria-hidden="true" class="w-full h-18">
                        <rect x="6" y="38" width="11" height="28" rx="3" fill="var(--cs-color-sky-400)" opacity="0.55" />
                        <rect x="22" y="28" width="11" height="38" rx="3" fill="var(--cs-color-sky-400)" opacity="0.7" />
                        <rect
                            x="38"
                            y="32"
                            width="11"
                            height="34"
                            rx="3"
                            fill="var(--cs-color-sky-400)"
                            opacity="0.65"
                        />
                        <rect
                            x="54"
                            y="20"
                            width="11"
                            height="46"
                            rx="3"
                            fill="var(--cs-color-sky-500)"
                            opacity="0.82"
                        />
                        <rect
                            x="70"
                            y="24"
                            width="11"
                            height="42"
                            rx="3"
                            fill="var(--cs-color-sky-500)"
                            opacity="0.78"
                        />
                        <rect
                            x="86"
                            y="14"
                            width="11"
                            height="52"
                            rx="3"
                            fill="var(--cs-color-accent-solid)"
                            opacity="0.9"
                        />
                        <rect x="102" y="8" width="11" height="58" rx="3" fill="var(--cs-color-accent-solid)" />
                    </svg>
                </KpiCardVisual>
            </KpiCard>

            <KpiCardGroup columns={2}>
                <KpiCard variant="elevated" size="md" layout="inline">
                    <KpiCardHeader>
                        <KpiCardLabel>Conversion Rate</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue suffix="%">3.84</KpiCardValue>
                        <KpiCardDelta trend="up">+0.4%</KpiCardDelta>
                    </KpiCardMetric>
                </KpiCard>

                <KpiCard variant="elevated" size="md" layout="inline">
                    <KpiCardHeader>
                        <KpiCardLabel>Net Retention</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue suffix="%">118.4</KpiCardValue>
                        <KpiCardDelta trend="up">+2.1%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardVisual variant="transparent">
                        <svg viewBox="0 0 72 28" preserveAspectRatio="none" aria-hidden="true" class="w-full h-full">
                            <defs>
                                <linearGradient id="kpi-inline-grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="var(--cs-color-positive-solid)" stop-opacity="0.2" />
                                    <stop offset="100%" stop-color="var(--cs-color-positive-solid)" stop-opacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0 22 C 12 20, 22 18, 34 15 C 46 12, 58 8, 72 4 L 72 28 L 0 28 Z"
                                fill="url(#kpi-inline-grad)"
                            />
                            <path
                                d="M0 22 C 12 20, 22 18, 34 15 C 46 12, 58 8, 72 4"
                                fill="none"
                                stroke="var(--cs-color-positive-solid)"
                                stroke-width="1.75"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </KpiCardVisual>
                </KpiCard>
            </KpiCardGroup>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Intents & Targets"
        description="Semantic delta polarity paired with clean bar and dashed progress targets."
        code={intentsCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>Qualified Signups</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue>2,840</KpiCardValue>
                        <KpiCardDelta trend="up">+18.4%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardTarget
                        value={2840}
                        max={3000}
                        color="positive"
                        label="Monthly target"
                        target="2,840 / 3,000"
                    />
                </KpiCard>

                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>Trial Conversion</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue suffix="%">24.6</KpiCardValue>
                        <KpiCardDelta trend="down">-3.8%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardTarget
                        value={24.6}
                        max={35}
                        color="negative"
                        label="Conversion goal"
                        target="24.6% / 35.0%"
                    />
                </KpiCard>

                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>Cloud Compute Spend</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue prefix="$">42,890</KpiCardValue>
                        <KpiCardDelta trend="up" color="caution">+12.5%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardTarget
                        value={42_890}
                        max={50_000}
                        appearance="dashed"
                        segments={10}
                        color="caution"
                        label="Monthly budget"
                        target="$42.9k / $50k"
                    />
                </KpiCard>

                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>P95 API Latency</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue suffix="ms">118</KpiCardValue>
                        <KpiCardDelta trend="down" color="positive">-24 ms</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardTarget
                        value={118}
                        max={200}
                        appearance="dashed"
                        segments={12}
                        color="positive"
                        label="SLA budget"
                        target="118 / 200 ms"
                    />
                </KpiCard>

                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>Revenue Churn</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue suffix="%">4.2</KpiCardValue>
                        <KpiCardDelta trend="up" color="negative">+1.1%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardTarget value={4.2} max={5} color="negative" label="Churn ceiling" target="4.2% / 5.0%" />
                </KpiCard>

                <KpiCard variant="elevated" size="md">
                    <KpiCardHeader>
                        <KpiCardLabel>Open Escalations</KpiCardLabel>
                    </KpiCardHeader>
                    <KpiCardMetric>
                        <KpiCardValue>42</KpiCardValue>
                        <KpiCardDelta trend="flat">0.0%</KpiCardDelta>
                    </KpiCardMetric>
                    <KpiCardTarget
                        value={42}
                        max={100}
                        appearance="dashed"
                        segments={10}
                        color="base"
                        label="Queue capacity"
                        target="42 / 100"
                    />
                </KpiCard>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Nesting & Groups"
        description="Concentric sub-KPIs inside elevated KpiCard and Card parents."
        code={nestingCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-6">
            <KpiCard variant="elevated" size="lg" layout="hero">
                <KpiCardHeader>
                    <KpiCardLabel>Platform Throughput</KpiCardLabel>
                    <Badge variant="soft" color="positive" size="sm">
                        <BadgeLabel>Healthy</BadgeLabel>
                    </Badge>
                </KpiCardHeader>

                <KpiCardMetric>
                    <KpiCardValue suffix="req/h">1.42M</KpiCardValue>
                    <KpiCardDelta trend="up">+11.4%</KpiCardDelta>
                </KpiCardMetric>

                <KpiCardGroup columns={3}>
                    <KpiCard variant="sunken" size="sm">
                        <KpiCardHeader>
                            <KpiCardLabel>Edge Cache Hit</KpiCardLabel>
                        </KpiCardHeader>
                        <KpiCardMetric>
                            <KpiCardValue suffix="%">96.4</KpiCardValue>
                            <KpiCardDelta trend="up">+0.8%</KpiCardDelta>
                        </KpiCardMetric>
                    </KpiCard>

                    <KpiCard variant="sunken" size="sm">
                        <KpiCardHeader>
                            <KpiCardLabel>Origin Latency</KpiCardLabel>
                        </KpiCardHeader>
                        <KpiCardMetric>
                            <KpiCardValue suffix="ms">42</KpiCardValue>
                            <KpiCardDelta trend="down" color="positive">-6 ms</KpiCardDelta>
                        </KpiCardMetric>
                    </KpiCard>

                    <KpiCard variant="soft" size="sm">
                        <KpiCardHeader>
                            <KpiCardLabel>Error Budget</KpiCardLabel>
                        </KpiCardHeader>
                        <KpiCardMetric>
                            <KpiCardValue suffix="%">99.94</KpiCardValue>
                            <KpiCardDelta variant="dot" color="positive">Nominal</KpiCardDelta>
                        </KpiCardMetric>
                    </KpiCard>
                </KpiCardGroup>
            </KpiCard>

            <Card variant="elevated" size="lg">
                <CardHeader>
                    <CardTitle>Billing & Usage</CardTitle>
                    <CardDescription>Current cycle telemetry for Acme Workspace.</CardDescription>
                </CardHeader>

                <CardBody>
                    <KpiCardGroup columns={2}>
                        <KpiCard variant="sunken" size="md">
                            <KpiCardHeader>
                                <KpiCardLabel>Active Seats</KpiCardLabel>
                            </KpiCardHeader>
                            <KpiCardMetric>
                                <KpiCardValue suffix="/ 50">48</KpiCardValue>
                                <KpiCardDelta trend="up" color="accent">+4</KpiCardDelta>
                            </KpiCardMetric>
                        </KpiCard>

                        <KpiCard variant="sunken" size="md">
                            <KpiCardHeader>
                                <KpiCardLabel>Storage Used</KpiCardLabel>
                            </KpiCardHeader>
                            <KpiCardMetric>
                                <KpiCardValue suffix="GB">342</KpiCardValue>
                                <KpiCardDelta trend="up" color="base">+18 GB</KpiCardDelta>
                            </KpiCardMetric>
                        </KpiCard>
                    </KpiCardGroup>
                </CardBody>

                <CardFooter>
                    <span class="text-xs text-weak">Cycle renews Nov 30</span>
                    <KpiCardActions>
                        <Button variant="secondary" size="sm">
                            <ButtonLabel>Manage plan</ButtonLabel>
                        </Button>
                    </KpiCardActions>
                </CardFooter>
            </Card>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Breakdowns, Bleed & Surfaces"
        description="Attribution rows, edge-bleed visuals, quiet ornaments, and the four monochrome surface variants."
        code={breakdownCode}
    >
        <div class="w-full flex flex-col gap-6">
            <div class="w-full rounded-2xl squircle-soft bg-canvas p-6 md:p-8 flex flex-col gap-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <KpiCard variant="elevated" size="md">
                        <KpiCardHeader>
                            <KpiCardLabel>Channel Attribution</KpiCardLabel>
                        </KpiCardHeader>

                        <KpiCardMetric>
                            <KpiCardValue prefix="$">148,920</KpiCardValue>
                            <KpiCardDelta trend="up">+14.2%</KpiCardDelta>
                        </KpiCardMetric>

                        <KpiCardBreakdown variant="plain" columns={1}>
                            <KpiCardBreakdownItem
                                label="Organic Search"
                                value="$92,330"
                                share="62%"
                                dotColor="accent"
                            />
                            <KpiCardBreakdownItem
                                label="Direct Traffic"
                                value="$35,740"
                                share="24%"
                                dotColor="positive"
                            />
                            <KpiCardBreakdownItem
                                label="Partner Referral"
                                value="$20,850"
                                share="14%"
                                dotColor="caution"
                            />
                        </KpiCardBreakdown>
                    </KpiCard>

                    <KpiCard variant="elevated" size="md">
                        <KpiCardHeader>
                            <KpiCardLabel>Request Latency</KpiCardLabel>
                        </KpiCardHeader>

                        <KpiCardMetric>
                            <KpiCardValue suffix="ms">210</KpiCardValue>
                            <KpiCardDelta trend="down" color="positive">-18 ms</KpiCardDelta>
                        </KpiCardMetric>

                        <KpiCardBreakdown variant="sunken" columns={3}>
                            <KpiCardBreakdownItem label="P50" value="84 ms" dotColor="positive" />
                            <KpiCardBreakdownItem label="P90" value="210 ms" dotColor="accent" />
                            <KpiCardBreakdownItem label="P99" value="412 ms" dotColor="caution" />
                        </KpiCardBreakdown>
                    </KpiCard>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <KpiCard variant="elevated" size="md">
                        <KpiCardHeader>
                            <KpiCardLabel>Daily Active Users</KpiCardLabel>
                            <KpiCardIcon icon={Activity} />
                        </KpiCardHeader>

                        <KpiCardMetric>
                            <KpiCardValue>38,410</KpiCardValue>
                            <KpiCardDelta trend="up">+6.8%</KpiCardDelta>
                        </KpiCardMetric>

                        <KpiCardVisual placement="bottom" bleed>
                            <svg
                                viewBox="0 0 280 54"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                                class="w-full h-13.5"
                            >
                                <defs>
                                    <linearGradient id="kpi-bleed-grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="0%"
                                            stop-color="var(--cs-color-accent-solid)"
                                            stop-opacity="0.22"
                                        />
                                        <stop
                                            offset="100%"
                                            stop-color="var(--cs-color-accent-solid)"
                                            stop-opacity="0"
                                        />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M0 38 C 28 34, 52 38, 84 28 C 116 18, 140 26, 172 19 C 204 12, 236 15, 280 6 L 280 54 L 0 54 Z"
                                    fill="url(#kpi-bleed-grad)"
                                />
                                <path
                                    d="M0 38 C 28 34, 52 38, 84 28 C 116 18, 140 26, 172 19 C 204 12, 236 15, 280 6"
                                    fill="none"
                                    stroke="var(--cs-color-accent-solid)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </KpiCardVisual>
                    </KpiCard>

                    {#if ornamentDismissed}
                        <div
                            class="rounded-3xl squircle bg-elevated shadow-elevated p-6 flex-center flex-col gap-3 min-h-42"
                        >
                            <span class="text-sm text-weak">Widget dismissed</span>
                            <Button variant="secondary" size="sm" onclick={() => (ornamentDismissed = false)}>
                                <ButtonIcon icon={RotateCcw} />
                                <ButtonLabel>Restore card</ButtonLabel>
                            </Button>
                        </div>
                    {:else}
                        <KpiCard variant="elevated" size="md">
                            <KpiCardOrnament
                                placement="bottom-right"
                                shape="circle"
                                style="--cs-kpi-card-ornament-color: var(--cs-color-emerald-500)"
                            >
                                <Activity />
                            </KpiCardOrnament>

                            <KpiCardHeader>
                                <KpiCardLabel>Realtime Sync</KpiCardLabel>
                            </KpiCardHeader>

                            <KpiCardClose variant="soft" onclick={() => (ornamentDismissed = true)} />

                            <KpiCardMetric>
                                <KpiCardValue suffix="ms">18</KpiCardValue>
                                <KpiCardDelta trend="down" color="positive">-4 ms</KpiCardDelta>
                            </KpiCardMetric>

                            <KpiCardFooter>
                                <span class="text-xs text-weak">Frankfurt cluster</span>
                            </KpiCardFooter>
                        </KpiCard>
                    {/if}
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="rounded-2xl squircle-soft bg-canvas p-4 flex">
                    <KpiCard variant="elevated" size="sm">
                        <KpiCardHeader>
                            <KpiCardLabel>Elevated</KpiCardLabel>
                        </KpiCardHeader>
                        <KpiCardMetric>
                            <KpiCardValue prefix="$">24.8k</KpiCardValue>
                            <KpiCardDelta trend="up">+8.1%</KpiCardDelta>
                        </KpiCardMetric>
                    </KpiCard>
                </div>

                <div class="rounded-2xl squircle-soft bg-elevated border border-base-soft p-4 flex">
                    <KpiCard variant="soft" size="sm">
                        <KpiCardHeader>
                            <KpiCardLabel>Soft</KpiCardLabel>
                        </KpiCardHeader>
                        <KpiCardMetric>
                            <KpiCardValue prefix="$">18.4k</KpiCardValue>
                            <KpiCardDelta trend="up">+4.3%</KpiCardDelta>
                        </KpiCardMetric>
                    </KpiCard>
                </div>

                <div class="rounded-2xl squircle-soft bg-elevated border border-base-soft p-4 flex">
                    <KpiCard variant="sunken" size="sm">
                        <KpiCardHeader>
                            <KpiCardLabel>Sunken</KpiCardLabel>
                        </KpiCardHeader>
                        <KpiCardMetric>
                            <KpiCardValue prefix="$">12.1k</KpiCardValue>
                            <KpiCardDelta trend="down">-1.9%</KpiCardDelta>
                        </KpiCardMetric>
                    </KpiCard>
                </div>

                <div class="rounded-2xl squircle-soft bg-canvas p-4 flex">
                    <KpiCard variant="transparent" size="sm">
                        <KpiCardHeader>
                            <KpiCardLabel>Transparent</KpiCardLabel>
                        </KpiCardHeader>
                        <KpiCardMetric>
                            <KpiCardValue prefix="$">9.6k</KpiCardValue>
                            <KpiCardDelta trend="flat">0.0%</KpiCardDelta>
                        </KpiCardMetric>
                    </KpiCard>
                </div>
            </div>
        </div>
    </PreviewSection>
</div>
