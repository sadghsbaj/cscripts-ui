<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { Progress } from "../progress/index.ts";
    import { getKpiCardContext, hasKpiCardContext, type KpiCardTargetProps } from "./index.ts";

    let {
        ref = $bindable(null),
        value,
        min = 0,
        max = 100,
        appearance = "bar",
        variant,
        color = "accent",
        size,
        segments,
        label,
        target,
        class: className,
        children,
        ...rest
    }: KpiCardTargetProps = $props();

    const labelId = $props.id();
    const kpiCard = hasKpiCardContext() ? getKpiCardContext() : undefined;

    const resolvedVariant = $derived(
        variant ?? (kpiCard?.variant === "sunken" || kpiCard?.variant === "soft" ? "elevated" : "soft")
    );
    const resolvedSize = $derived(size ?? (kpiCard?.size === "lg" ? "md" : "sm"));
</script>

<div bind:this={ref} {...rest} class={["cs-kpi-card-target", className]}>
    {#if label || target}
        <div class="cs-kpi-card-target-meta">
            {#if label}
                <span id={labelId} class="cs-kpi-card-target-label">{label}</span>
            {/if}
            {#if target}
                <span class="cs-kpi-card-target-readout">{target}</span>
            {/if}
        </div>
    {/if}

    {#if value !== undefined || !children}
        <Progress
            {appearance}
            variant={resolvedVariant}
            {color}
            size={resolvedSize}
            {value}
            {min}
            {max}
            {segments}
            aria-labelledby={label ? labelId : undefined}
            aria-label={label ? undefined : t({ de: "Zielerreichung", en: "Target progress" })}
        />
    {/if}

    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-target {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-inline-size: 0;
        }

        .cs-kpi-card-target-meta {
            display: flex;
            gap: 8px;
            align-items: baseline;
            justify-content: space-between;
            min-inline-size: 0;
            font-size: var(--cs-kpi-card-comparison-size, var(--cs-text-xs));
            line-height: var(--cs-kpi-card-comparison-lh, 16px);
        }

        .cs-kpi-card-target-label {
            min-inline-size: 0;
            color: var(--cs-color-text-weak);
            overflow-wrap: break-word;
        }

        .cs-kpi-card-target-readout {
            flex-shrink: 0;
            margin-inline-start: auto;
            color: var(--cs-color-text-main);
            font-variant-numeric: tabular-nums lining-nums;
            font-weight: 500;
        }
    }
</style>
