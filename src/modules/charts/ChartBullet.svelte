<script lang="ts" generics="TDatum = ChartDatum">
    import {
        buildRoundedBarPath,
        computeBulletRows,
        getBulletSizeMetrics,
        snapInt,
        type BulletRangeInput,
        type BulletRowInput,
        type ChartBulletRowGeometry,
    } from "./chart-geometry.internal.ts";
    import { measureTextWidth, truncateTextToWidth } from "./chart-measure.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import {
        CHART_BAR_PATTERNS,
        CHART_TONES,
        resolveToneColor,
        type ChartBarPattern,
        type ChartDatum,
        type ChartSize,
        type ChartTone,
    } from "./chart-state.svelte.ts";
    import { getChartContext, hasChartContext } from "./chart.context.ts";
    import type {
        ChartBulletItem,
        ChartBulletProps,
        ChartBulletRange,
        ChartBulletRow,
    } from "./index.ts";

    interface HatchPatternDef {
        readonly id: string;
        readonly color: string;
    }

    interface NormalizedBulletItem {
        readonly index: number;
        readonly label: string;
        readonly subtitle?: string;
        readonly unit?: string;
        readonly actual: number;
        readonly target: number;
        readonly comparative: number | null;
        readonly ranges: readonly ChartBulletRange[];
        readonly rangeInputs: readonly BulletRangeInput[];
        readonly max?: number;
        readonly color: string;
        readonly pattern: ChartBarPattern;
        readonly datum: TDatum;
    }

    interface PreparedBulletRow {
        readonly geometry: ChartBulletRowGeometry;
        readonly row: ChartBulletRow<TDatum>;
        readonly renderBarPath: string;
        readonly hatchPatternId: string | null;
        readonly displayLabel: string;
        readonly truncatedLabel: boolean;
        readonly metaText: string | null;
        readonly formattedActual: string;
        readonly formattedTarget: string;
        readonly formattedVariance: string | null;
        readonly varianceSign: "positive" | "negative" | "neutral";
        readonly active: boolean;
        readonly selected: boolean;
        readonly dimmed: boolean;
        readonly clipId: string;
        readonly barDelay: string;
        readonly targetDelay: string;
    }

    let {
        ref = $bindable(null),
        items,
        data,
        label,
        subtitle,
        unit,
        actual,
        target,
        comparative,
        ranges,
        max,
        tone,
        color,
        pattern,
        width,
        size,
        sharedScale = false,
        showReadout = true,
        showVariance = false,
        minBarLength = 2,
        formatValue,
        interactive = true,
        selectable = false,
        activeIndex,
        selectedIndex,
        onRowHover,
        onRowClick,
        class: className,
        ...rest
    }: ChartBulletProps<TDatum> = $props();

    const chart = hasChartContext() ? getChartContext<TDatum>() : undefined;
    const uid = $props.id();

    const resolvedSize = $derived<ChartSize>(size ?? chart?.size ?? "md");
    const metrics = $derived(getBulletSizeMetrics(resolvedSize));

    const resolvedWidth = $derived.by((): number => {
        if (width !== undefined) return width;
        if (!chart) return 0;
        return chart.plotWidth > 0 ? chart.plotWidth : chart.containerWidth;
    });

    const effectiveActiveIndex = $derived(
        activeIndex !== undefined ? activeIndex : (chart?.activeIndex ?? null),
    );
    const effectiveSelectedIndex = $derived(
        selectedIndex !== undefined ? selectedIndex : (chart?.selectedIndex ?? null),
    );
    const hasSelection = $derived(effectiveSelectedIndex !== null);

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
    }

    function extractText(
        accessor: keyof TDatum | ((datum: TDatum, index: number) => string | undefined) | undefined,
        datum: TDatum,
        index: number,
    ): string | undefined {
        if (accessor === undefined) return undefined;
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined) return undefined;
        const str = String(raw).trim();
        return str.length > 0 ? str : undefined;
    }

    function extractNumber(
        accessor:
            | keyof TDatum
            | ((datum: TDatum, index: number) => number | null | undefined)
            | undefined,
        datum: TDatum,
        index: number,
    ): number | null {
        if (accessor === undefined) return null;
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
            return null;
        }
        const numeric = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(numeric) ? numeric : null;
    }

    function extractRanges(
        datum: TDatum,
        index: number,
    ): readonly (number | ChartBulletRange)[] | undefined {
        if (ranges === undefined) return undefined;
        const raw = typeof ranges === "function" ? ranges(datum, index) : readKey(datum, ranges);
        if (!Array.isArray(raw)) return undefined;
        return raw as readonly (number | ChartBulletRange)[];
    }

    function normalizeRanges(
        rawRanges: readonly (number | ChartBulletRange)[] | undefined,
    ): {
        readonly publicRanges: readonly ChartBulletRange[];
        readonly inputs: readonly BulletRangeInput[];
    } {
        if (!rawRanges || rawRanges.length === 0) {
            return { publicRanges: [], inputs: [] };
        }
        const publicRanges: ChartBulletRange[] = [];
        for (const entry of rawRanges) {
            if (typeof entry === "number") {
                if (Number.isFinite(entry) && entry > 0) {
                    publicRanges.push({ to: entry });
                }
            } else if (Number.isFinite(entry.to) && entry.to > 0) {
                publicRanges.push(entry);
            }
        }
        publicRanges.sort((a, b) => a.to - b.to);

        const inputs: BulletRangeInput[] = publicRanges.map((entry) => {
            const resolvedColor =
                entry.color ?? (entry.tone !== undefined ? resolveToneColor(entry.tone) : undefined);
            return resolvedColor !== undefined
                ? { to: entry.to, color: resolvedColor }
                : { to: entry.to };
        });

        return { publicRanges, inputs };
    }

    function resolveRowColor(
        explicitColor: string | undefined,
        explicitTone: ChartTone | undefined,
    ): string {
        if (explicitColor !== undefined && explicitColor.length > 0) return explicitColor;
        if (explicitTone !== undefined) return resolveToneColor(explicitTone);
        return "var(--cs-chart-series-1)";
    }

    function extractItemColor(datum: TDatum, index: number): string | undefined {
        if (color === undefined) return undefined;
        const raw = typeof color === "function" ? color(datum, index) : color;
        return typeof raw === "string" && raw.length > 0 ? raw : undefined;
    }

    function extractItemTone(datum: TDatum, index: number): ChartTone | undefined {
        if (tone === undefined) return undefined;
        const raw = typeof tone === "function" ? tone(datum, index) : tone;
        if (typeof raw === "string" && (CHART_TONES as readonly string[]).includes(raw)) {
            return raw as ChartTone;
        }
        return undefined;
    }

    function extractItemPattern(datum: TDatum, index: number): ChartBarPattern {
        if (pattern === undefined) return "solid";
        const raw = typeof pattern === "function" ? pattern(datum, index) : pattern;
        if (
            typeof raw === "string" &&
            (CHART_BAR_PATTERNS as readonly string[]).includes(raw)
        ) {
            return raw as ChartBarPattern;
        }
        return "solid";
    }

    const normalizedItems = $derived.by((): readonly NormalizedBulletItem[] => {
        if (items && items.length > 0) {
            return items.map((entry: ChartBulletItem<TDatum>, index: number) => {
                const datum = (entry.datum ?? (entry as unknown as TDatum)) as TDatum;
                const rowIndex = entry.index ?? index;
                const { publicRanges, inputs } = normalizeRanges(entry.ranges);
                const resolvedColor = resolveRowColor(
                    entry.color ?? extractItemColor(datum, rowIndex),
                    entry.tone ?? extractItemTone(datum, rowIndex),
                );
                const resolvedPattern = entry.pattern ?? extractItemPattern(datum, rowIndex);

                return {
                    index: rowIndex,
                    label: entry.label,
                    ...(entry.subtitle !== undefined && { subtitle: entry.subtitle }),
                    ...(entry.unit !== undefined && { unit: entry.unit }),
                    actual: Number.isFinite(entry.actual) ? Math.max(0, entry.actual) : 0,
                    target: Number.isFinite(entry.target) ? Math.max(0, entry.target) : 0,
                    comparative:
                        typeof entry.comparative === "number" && Number.isFinite(entry.comparative)
                            ? Math.max(0, entry.comparative)
                            : null,
                    ranges: publicRanges,
                    rangeInputs: inputs,
                    ...(entry.max !== undefined && { max: entry.max }),
                    color: resolvedColor,
                    pattern: resolvedPattern,
                    datum,
                };
            });
        }

        const sourceData = data ?? chart?.data ?? [];
        if (sourceData.length === 0) return [];

        return sourceData.map((datum, index) => {
            const rowLabel = extractText(label, datum, index) ?? String(index + 1);
            const rowSubtitle = extractText(subtitle, datum, index);
            const rowUnit = extractText(unit, datum, index);
            const rowActual = Math.max(0, extractNumber(actual, datum, index) ?? 0);
            const rowTarget = Math.max(0, extractNumber(target, datum, index) ?? 0);
            const rawComp = extractNumber(comparative, datum, index);
            const rowComparative = rawComp !== null ? Math.max(0, rawComp) : null;
            const rawMax = extractNumber(max, datum, index);
            const { publicRanges, inputs } = normalizeRanges(extractRanges(datum, index));
            const resolvedColor = resolveRowColor(
                extractItemColor(datum, index),
                extractItemTone(datum, index),
            );
            const resolvedPattern = extractItemPattern(datum, index);

            return {
                index,
                label: rowLabel,
                ...(rowSubtitle !== undefined && { subtitle: rowSubtitle }),
                ...(rowUnit !== undefined && { unit: rowUnit }),
                actual: rowActual,
                target: rowTarget,
                comparative: rowComparative,
                ranges: publicRanges,
                rangeInputs: inputs,
                ...(rawMax !== null && { max: rawMax }),
                color: resolvedColor,
                pattern: resolvedPattern,
                datum,
            };
        });
    });

    const geometryInputs = $derived<readonly BulletRowInput[]>(
        normalizedItems.map((item) => ({
            index: item.index,
            label: item.label,
            ...(item.subtitle !== undefined && { subtitle: item.subtitle }),
            ...(item.unit !== undefined && { unit: item.unit }),
            actual: item.actual,
            target: item.target,
            comparative: item.comparative,
            ranges: item.rangeInputs,
            ...(item.max !== undefined && { max: item.max }),
        })),
    );

    const layout = $derived.by(() => {
        if (resolvedWidth <= 0 || geometryInputs.length === 0) {
            return computeBulletRows({
                items: [],
                width: 0,
            });
        }

        // Reserve 3px horizontal margin when selectable/selected so 2.5px selection ring never clips.
        const horizontalPad = selectable || hasSelection ? 3 : 0;

        return computeBulletRows({
            items: geometryInputs,
            width: resolvedWidth,
            rowHeight: metrics.rowHeight,
            rowGap: metrics.rowGap,
            trackHeight: metrics.trackHeight,
            trackRadius: metrics.trackRadius,
            barRadius: metrics.barRadius,
            minBarLength,
            sharedScale,
            paddingLeft: horizontalPad,
            paddingRight: horizontalPad,
        });
    });

    function formatVal(val: number, datum?: TDatum): string {
        if (formatValue) return formatValue(val, datum);
        return formatDefaultTick(val);
    }

    function formatSignedDelta(delta: number, datum?: TDatum): string {
        const formatted = formatVal(Math.abs(delta), datum);
        if (delta > 0) return `+${formatted}`;
        if (delta < 0) return `-${formatted}`;
        return formatted;
    }

    function buildInsetBarPath(rowGeom: ChartBulletRowGeometry, inset: number): string {
        if (rowGeom.barWidth <= inset * 2 || rowGeom.barHeight <= inset * 2) {
            return rowGeom.barPath;
        }
        return buildRoundedBarPath(
            rowGeom.barX + inset,
            rowGeom.barY + inset,
            rowGeom.barWidth - inset * 2,
            rowGeom.barHeight - inset * 2,
            Math.max(0, rowGeom.barRadius - inset),
            "right",
        );
    }

    const preparedData = $derived.by((): {
        readonly rows: readonly PreparedBulletRow[];
        readonly hatchPatterns: readonly HatchPatternDef[];
    } => {
        const hatchPatterns: HatchPatternDef[] = [];
        const hatchIdByColor: Record<string, string> = Object.create(null);
        const rows: PreparedBulletRow[] = [];

        const labelFont = { fontSize: metrics.labelFontSize, fontWeight: 500 };
        const readoutFont = { fontSize: metrics.labelFontSize, fontWeight: 600 };
        const metaFont = { fontSize: Math.max(10, metrics.labelFontSize - 1), fontWeight: 400 };

        for (const [idx, rowGeom] of layout.rows.entries()) {
            const source = normalizedItems[idx];
            if (!source) continue;

            let hatchPatternId: string | null = null;
            if (source.pattern === "hatch") {
                const existing = hatchIdByColor[source.color];
                if (existing !== undefined) {
                    hatchPatternId = existing;
                } else {
                    const nextId = `cs-chart-bullet-hatch-${uid}-${hatchPatterns.length}`;
                    hatchIdByColor[source.color] = nextId;
                    hatchPatterns.push({ id: nextId, color: source.color });
                    hatchPatternId = nextId;
                }
            }

            const renderBarPath =
                rowGeom.barPath.length === 0
                    ? ""
                    : source.pattern === "outline"
                      ? buildInsetBarPath(rowGeom, 0.75)
                      : source.pattern === "hatch"
                        ? buildInsetBarPath(rowGeom, 0.5)
                        : rowGeom.barPath;

            const formattedActual = formatVal(source.actual, source.datum);
            const formattedTarget = formatVal(source.target, source.datum);
            const variance = source.actual - source.target;
            const formattedVariance = showVariance
                ? formatSignedDelta(variance, source.datum)
                : null;
            const varianceSign: "positive" | "negative" | "neutral" =
                variance > 0 ? "positive" : variance < 0 ? "negative" : "neutral";

            const readoutText = showReadout
                ? formattedVariance !== null
                    ? `${formattedActual} / ${formattedTarget} (${formattedVariance})`
                    : `${formattedActual} / ${formattedTarget}`
                : "";
            const readoutWidth = showReadout ? measureTextWidth(readoutText, readoutFont) + 12 : 0;
            const maxLabelWidth = Math.max(24, rowGeom.trackWidth - readoutWidth);

            const truncated = truncateTextToWidth(source.label, maxLabelWidth, labelFont);

            const rawMeta = source.subtitle ?? source.unit;
            let metaText: string | null = null;
            if (rawMeta && !truncated.truncated) {
                const remaining = maxLabelWidth - truncated.width - 8;
                if (remaining >= 24) {
                    const fittedMeta = truncateTextToWidth(rawMeta, remaining, metaFont);
                    metaText = fittedMeta.text.length > 0 ? fittedMeta.text : null;
                }
            }

            const row: ChartBulletRow<TDatum> = {
                index: source.index,
                label: source.label,
                ...(source.subtitle !== undefined && { subtitle: source.subtitle }),
                ...(source.unit !== undefined && { unit: source.unit }),
                actual: source.actual,
                target: source.target,
                comparative: source.comparative,
                ranges: source.ranges,
                max: rowGeom.domainMax,
                color: source.color,
                pattern: source.pattern,
                datum: source.datum,
            };

            const isActive = effectiveActiveIndex === source.index;
            const isSelected = effectiveSelectedIndex === source.index;
            const isDimmed = hasSelection && !isSelected && !isActive;

            rows.push({
                geometry: rowGeom,
                row,
                renderBarPath,
                hatchPatternId,
                displayLabel: truncated.text,
                truncatedLabel: truncated.truncated,
                metaText,
                formattedActual,
                formattedTarget,
                formattedVariance,
                varianceSign,
                active: isActive,
                selected: isSelected,
                dimmed: isDimmed,
                clipId: `cs-chart-bullet-clip-${uid}-${source.index}`,
                barDelay: `${Math.min(idx * 45, 220)}ms`,
                targetDelay: `${Math.min(120 + idx * 45, 340)}ms`,
            });
        }

        return { rows, hatchPatterns };
    });

    const preparedRows = $derived(preparedData.rows);
    const hatchPatterns = $derived(preparedData.hatchPatterns);

    const sharedAxisY = $derived.by((): number => {
        const lastRow = layout.rows.at(-1);
        if (!lastRow) return 0;
        return snapInt(lastRow.trackY + lastRow.trackHeight + 14);
    });

    function handleRowEnter(prepared: PreparedBulletRow): void {
        if (!interactive) return;
        onRowHover?.(prepared.row.index, prepared.row);
    }

    function handleRowClick(prepared: PreparedBulletRow): void {
        if (!interactive) return;
        onRowClick?.(prepared.row.datum, prepared.row.index, prepared.row);
    }
</script>

{#if resolvedWidth > 0 && preparedRows.length > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-bullet", className]}
        data-size={resolvedSize}
        data-has-selection={hasSelection ? "" : undefined}
        data-interactive={interactive ? "" : undefined}
    >
        <defs>
            {#each preparedRows as prepared (prepared.clipId)}
                <clipPath id={prepared.clipId}>
                    <rect
                        x={prepared.geometry.trackX}
                        y={prepared.geometry.trackY}
                        width={prepared.geometry.trackWidth}
                        height={prepared.geometry.trackHeight}
                        rx={prepared.geometry.trackRadius}
                        ry={prepared.geometry.trackRadius}
                    />
                </clipPath>
            {/each}

            {#each hatchPatterns as def (def.id)}
                <pattern
                    id={def.id}
                    width="8"
                    height="8"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
                    <rect
                        width="8"
                        height="8"
                        class="cs-chart-hatch-bg"
                        style:fill={def.color}
                    />
                    <rect
                        x="0"
                        y="0"
                        width="2.25"
                        height="8"
                        class="cs-chart-hatch-stripe"
                        style:fill={def.color}
                    />
                </pattern>
            {/each}
        </defs>

        {#each preparedRows as prepared (prepared.row.index)}
            {let g = $derived(prepared.geometry)}
            <g
                class="cs-chart-bullet-row"
                data-index={prepared.row.index}
                data-active={prepared.active ? "" : undefined}
                data-selected={prepared.selected ? "" : undefined}
                data-dimmed={prepared.dimmed ? "" : undefined}
            >
                <text
                    class="cs-chart-bullet-label"
                    x={g.trackX}
                    y={g.headerY}
                    text-anchor="start"
                    data-active={prepared.active ? "" : undefined}
                    data-selected={prepared.selected ? "" : undefined}
                >
                    {#if prepared.truncatedLabel}
                        <title>{prepared.row.label}</title>
                    {/if}
                    {prepared.displayLabel}
                    {#if prepared.metaText}
                        <tspan class="cs-chart-bullet-subtitle" dx="6">{prepared.metaText}</tspan>
                    {/if}
                </text>

                {#if showReadout}
                    <text
                        class="cs-chart-bullet-readout"
                        x={g.trackX + g.trackWidth}
                        y={g.headerY}
                        text-anchor="end"
                        data-active={prepared.active ? "" : undefined}
                        data-selected={prepared.selected ? "" : undefined}
                    >
                        <tspan class="cs-chart-bullet-actual-text">{prepared.formattedActual}</tspan><tspan
                            class="cs-chart-bullet-target-text"
                            dx="3">/ {prepared.formattedTarget}</tspan>{#if prepared.formattedVariance !== null}<tspan
                                class="cs-chart-bullet-variance-text"
                                data-sign={prepared.varianceSign}
                                dx="4">({prepared.formattedVariance})</tspan>{/if}
                    </text>
                {/if}

                <g
                    class="cs-chart-bullet-track"
                    clip-path="url(#{prepared.clipId})"
                    aria-hidden="true"
                >
                    {#each g.bands as band, bandIdx (`${prepared.row.index}-${bandIdx}`)}
                        <rect
                            class="cs-chart-bullet-range"
                            data-tier={band.tier}
                            x={band.x}
                            y={g.trackY}
                            width={band.width}
                            height={g.trackHeight}
                            style:fill={band.color}
                        />
                    {/each}
                </g>

                {#if prepared.renderBarPath.length > 0}
                    <path
                        class="cs-chart-bullet-bar"
                        role="presentation"
                        d={prepared.renderBarPath}
                        data-index={prepared.row.index}
                        data-pattern={prepared.row.pattern !== "solid"
                            ? prepared.row.pattern
                            : undefined}
                        data-active={prepared.active ? "" : undefined}
                        data-selected={prepared.selected ? "" : undefined}
                        data-dimmed={prepared.dimmed ? "" : undefined}
                        fill={prepared.hatchPatternId
                            ? `url(#${prepared.hatchPatternId})`
                            : undefined}
                        style:fill={prepared.hatchPatternId ? undefined : prepared.row.color}
                        style:stroke={prepared.row.pattern !== "solid"
                            ? prepared.row.color
                            : undefined}
                        style:--cs-chart-bar-origin="{g.barX}px 0px"
                        style:--cs-chart-bar-delay={prepared.barDelay}
                    />
                {/if}

                {#if g.comparativeX !== null && g.comparativeY !== null && g.comparativeHeight !== null}
                    <rect
                        class="cs-chart-bullet-comparative"
                        x={g.comparativeX - 0.75}
                        y={g.comparativeY}
                        width="1.5"
                        height={g.comparativeHeight}
                        rx="0.75"
                        aria-hidden="true"
                    />
                {/if}

                <rect
                    class="cs-chart-bullet-target"
                    x={g.targetX - g.targetWidth / 2}
                    y={g.targetY}
                    width={g.targetWidth}
                    height={g.targetHeight}
                    rx="1.25"
                    style:--cs-chart-bullet-target-delay={prepared.targetDelay}
                    aria-hidden="true"
                />

                {#if prepared.selected}
                    <rect
                        class="cs-chart-selection-ring"
                        x={g.trackX - 2.5}
                        y={g.trackY - 2.5}
                        width={g.trackWidth + 5}
                        height={g.trackHeight + 5}
                        rx={g.trackRadius + 2.5}
                        ry={g.trackRadius + 2.5}
                        aria-hidden="true"
                    />
                {/if}

                {#if interactive}
                    <rect
                        class="cs-chart-bullet-hit"
                        role="presentation"
                        x={0}
                        y={g.rowY}
                        width={resolvedWidth}
                        height={g.rowHeight}
                        fill="transparent"
                        onpointerenter={() => handleRowEnter(prepared)}
                        onpointermove={() => handleRowEnter(prepared)}
                        onclick={() => handleRowClick(prepared)}
                    />
                {/if}
            </g>
        {/each}

        {#if sharedScale && layout.sharedTicks.length > 0}
            <g class="cs-chart-bullet-axis" aria-hidden="true">
                {#each layout.sharedTicks as tick, tickIdx (tick.value)}
                    {let anchor = $derived(
                        tickIdx === 0
                            ? "start"
                            : tickIdx === layout.sharedTicks.length - 1
                              ? "end"
                              : "middle",
                    )}
                    <text
                        class="cs-chart-bullet-tick"
                        x={tick.x}
                        y={sharedAxisY}
                        text-anchor={anchor}
                    >
                        {formatVal(tick.value)}
                    </text>
                {/each}
            </g>
        {/if}
    </g>
{/if}
