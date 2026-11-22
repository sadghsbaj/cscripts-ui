<script lang="ts">
    import { untrack } from "svelte";
    import { ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, RotateCcw } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { Card } from "cs/svelte/card";
    import { HitArea } from "cs/svelte/hit-area";
    import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from "cs/svelte/select";
    import { TextInput, TextInputField, TextInputIcon } from "cs/svelte/text-input";
    import { tooltip } from "cs/svelte/tooltip";

    export type PageMarginSide = "top" | "bottom" | "left" | "right";
    export type PageMarginsPreset = "normal" | "narrow" | "wide" | "custom";

    export interface PageMarginsProps {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
        class?: string;
    }

    interface MarginPresetValues {
        top: number;
        bottom: number;
        left: number;
        right: number;
    }

    const MIN_MARGIN_CM = 0;
    const MAX_MARGIN_CM = 6;

    const PRESETS: Record<Exclude<PageMarginsPreset, "custom">, MarginPresetValues> = {
        normal: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
        narrow: { top: 1.27, bottom: 1.27, left: 1.27, right: 1.27 },
        wide: { top: 2.5, bottom: 2.5, left: 3.5, right: 3.5 },
    };

    const PRESET_OPTIONS: readonly { value: PageMarginsPreset; label: string; disabled?: boolean }[] = [
        { value: "normal", label: "Normal" },
        { value: "narrow", label: "Narrow" },
        { value: "wide", label: "Wide" },
        { value: "custom", label: "Custom", disabled: true },
    ];

    const SIDE_FIELDS: readonly {
        side: PageMarginSide;
        label: string;
        icon: typeof ArrowUpToLine;
    }[] = [
        { side: "top", label: "Top", icon: ArrowUpToLine },
        { side: "bottom", label: "Bottom", icon: ArrowDownToLine },
        { side: "left", label: "Left", icon: ArrowLeftToLine },
        { side: "right", label: "Right", icon: ArrowRightToLine },
    ];

    const SKELETON_LINE_WIDTHS = ["62%", "100%", "94%", "100%", "80%", "44%"] as const;

    let {
        top = $bindable(PRESETS.normal.top),
        bottom = $bindable(PRESETS.normal.bottom),
        left = $bindable(PRESETS.normal.left),
        right = $bindable(PRESETS.normal.right),
        class: className,
    }: PageMarginsProps = $props();

    const uid = $props.id();

    function formatMargin(value: number): string {
        return String(Number(value.toFixed(2)));
    }

    function clampMargin(value: number): number {
        return Math.min(MAX_MARGIN_CM, Math.max(MIN_MARGIN_CM, value));
    }

    function parseMarginInput(raw: string): number | null {
        const normalized = raw.trim().replace(",", ".");
        if (normalized === "") return null;
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function isMarginInRange(value: number): boolean {
        return value >= MIN_MARGIN_CM && value <= MAX_MARGIN_CM;
    }

    function matchesPreset(values: MarginPresetValues, preset: MarginPresetValues): boolean {
        return (
            Math.abs(values.top - preset.top) < 1e-6 &&
            Math.abs(values.bottom - preset.bottom) < 1e-6 &&
            Math.abs(values.left - preset.left) < 1e-6 &&
            Math.abs(values.right - preset.right) < 1e-6
        );
    }

    let drafts = $state<Record<PageMarginSide, string>>({
        top: formatMargin(top),
        bottom: formatMargin(bottom),
        left: formatMargin(left),
        right: formatMargin(right),
    });

    let invalidSides = $state<Record<PageMarginSide, boolean>>({
        top: false,
        bottom: false,
        left: false,
        right: false,
    });

    let focusedSide = $state<PageMarginSide | null>(null);
    let hoveredSide = $state<PageMarginSide | null>(null);
    const activeSide = $derived<PageMarginSide | null>(hoveredSide ?? focusedSide);

    const activePreset = $derived.by<PageMarginsPreset>(() => {
        if (Object.values(invalidSides).some(Boolean)) return "custom";
        const current = { top, bottom, left, right };
        if (matchesPreset(current, PRESETS.normal)) return "normal";
        if (matchesPreset(current, PRESETS.narrow)) return "narrow";
        if (matchesPreset(current, PRESETS.wide)) return "wide";
        return "custom";
    });

    const isModified = $derived(activePreset !== "normal");

    function getSideValue(side: PageMarginSide): number {
        switch (side) {
            case "top": {
                return top;
            }
            case "bottom": {
                return bottom;
            }
            case "left": {
                return left;
            }
            case "right": {
                return right;
            }
        }
    }

    function setSideValue(side: PageMarginSide, value: number): void {
        switch (side) {
            case "top": {
                top = value;
                break;
            }
            case "bottom": {
                bottom = value;
                break;
            }
            case "left": {
                left = value;
                break;
            }
            case "right": {
                right = value;
                break;
            }
        }
    }

    function applyPreset(presetName: Exclude<PageMarginsPreset, "custom">): void {
        const next = PRESETS[presetName];
        top = next.top;
        bottom = next.bottom;
        left = next.left;
        right = next.right;
        drafts = {
            top: formatMargin(next.top),
            bottom: formatMargin(next.bottom),
            left: formatMargin(next.left),
            right: formatMargin(next.right),
        };
        invalidSides = {
            top: false,
            bottom: false,
            left: false,
            right: false,
        };
    }

    function handlePresetChange(next: PageMarginsPreset): void {
        if (next === "custom") return;
        applyPreset(next);
    }

    function handleSideInput(side: PageMarginSide, raw: string): void {
        drafts[side] = raw;
        const parsed = parseMarginInput(raw);
        if (parsed === null || !isMarginInRange(parsed)) {
            invalidSides[side] = true;
            if (parsed !== null) {
                setSideValue(side, clampMargin(parsed));
            }
            return;
        }
        invalidSides[side] = false;
        setSideValue(side, parsed);
    }

    function handleSideBlur(side: PageMarginSide): void {
        if (focusedSide === side) {
            focusedSide = null;
        }
        const parsed = parseMarginInput(drafts[side]);
        if (parsed !== null && isMarginInRange(parsed)) {
            const rounded = Number(parsed.toFixed(2));
            invalidSides[side] = false;
            setSideValue(side, rounded);
            drafts[side] = formatMargin(rounded);
        } else {
            invalidSides[side] = true;
        }
    }

    $effect(() => {
        const nextValues: Record<PageMarginSide, number> = { top, bottom, left, right };
        untrack(() => {
            for (const { side } of SIDE_FIELDS) {
                const propValue = nextValues[side];
                const parsedDraft = parseMarginInput(drafts[side]);
                const matchesProp = parsedDraft !== null && Math.abs(parsedDraft - propValue) < 1e-6;
                if (matchesProp) continue;
                if (focusedSide === side && (parsedDraft === null || invalidSides[side])) continue;
                drafts[side] = formatMargin(propValue);
                invalidSides[side] = !isMarginInRange(propValue);
            }
        });
    });
</script>

<Card variant="elevated" size="md" class={["cs-page-margins w-[288px]", className]}>
    <!-- Zone 1: Header + Preset Select -->
    <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between min-h-6">
            <h2 class="text-sm font-semibold text-strong leading-none">Page margins</h2>
            <div
                class="cs-page-margins-reset"
                data-visible={isModified ? "" : undefined}
                aria-hidden={!isModified}
            >
                <Button
                    variant="ghost"
                    size="xs"
                    iconOnly
                    aria-label="Reset to Normal"
                    tabindex={isModified ? 0 : -1}
                    onclick={() => applyPreset("normal")}
                    {@attach tooltip({ text: "Reset to Normal", placement: "top", enabled: () => isModified })}
                >
                    <ButtonIcon icon={RotateCcw} />
                    <HitArea size="sm" />
                </Button>
            </div>
        </div>

        <Select
            variant="soft"
            size="sm"
            bind:value={() => activePreset, handlePresetChange}
        >
            <SelectTrigger class="w-full" aria-label="Margin preset">
                <SelectValue placeholder="Preset" />
            </SelectTrigger>
            <SelectContent placement="bottom-start" width="anchor">
                {#each PRESET_OPTIONS as option (option.value)}
                    <SelectItem value={option.value} label={option.label} disabled={option.disabled}>
                        <SelectItemText>{option.label}</SelectItemText>
                    </SelectItem>
                {/each}
            </SelectContent>
        </Select>
    </div>

    <!-- Zone 2: Hero Paper Visualization Stage -->
    <div class="cs-page-margins-well h-[168px] flex-center" aria-hidden="true">
        <div
            class="cs-page-margins-sheet bg-elevated"
            style:--cs-page-margins-top-val={getSideValue("top")}
            style:--cs-page-margins-right-val={getSideValue("right")}
            style:--cs-page-margins-bottom-val={getSideValue("bottom")}
            style:--cs-page-margins-left-val={getSideValue("left")}
        >
            <!-- Layer 3: Active margin strip highlight -->
            {#each SIDE_FIELDS as { side } (side)}
                <div
                    class="cs-page-margins-strip"
                    data-side={side}
                    data-active={activeSide === side ? "" : undefined}
                ></div>
            {/each}

            <!-- Layer 1: Printable content rect + skeleton lines -->
            <div class="cs-page-margins-content">
                {#each SKELETON_LINE_WIDTHS as width, index (index)}
                    <div class="cs-page-margins-skeleton-line" style:width></div>
                {/each}
            </div>

            <!-- Layer 2: Full-bleed hairline margin guides -->
            {#each SIDE_FIELDS as { side } (side)}
                <div
                    class="cs-page-margins-guide"
                    data-side={side}
                    data-active={activeSide === side ? "" : undefined}
                ></div>
            {/each}
        </div>
    </div>

    <!-- Zone 3: 2x2 Margin Inputs Grid -->
    <div class="grid grid-cols-2 gap-2">
        {#each SIDE_FIELDS as { side, label, icon } (side)}
            {const inputId = `${uid}-${side}`}
            <div class="flex flex-col gap-1">
                <label for={inputId} class="text-[11px] font-medium text-weak leading-none">
                    {label}
                </label>
                <TextInput
                    variant="soft"
                    size="sm"
                    invalid={invalidSides[side]}
                    class="cs-page-margins-input w-full"
                    onpointerenter={() => {
                        hoveredSide = side;
                    }}
                    onpointerleave={() => {
                        if (hoveredSide === side) {
                            hoveredSide = null;
                        }
                    }}
                >
                    <TextInputIcon {icon} />
                    <TextInputField
                        id={inputId}
                        inputmode="decimal"
                        class="tabular-nums text-right"
                        bind:value={() => drafts[side], (next) => handleSideInput(side, next)}
                        onfocus={() => {
                            focusedSide = side;
                        }}
                        onblur={() => handleSideBlur(side)}
                    />
                    <span class="text-xs text-weak select-none pointer-events-none shrink-0">cm</span>
                </TextInput>
            </div>
        {/each}
    </div>
</Card>

<style>
    :global(.cs-page-margins) {
        --cs-card-shadow: var(--cs-shadow-floating);
        --cs-card-radius: 24px;
        --cs-card-padding: 16px;
        --cs-card-gap: 14px;
        --cs-card-squircle: var(--cs-squircle);
    }

    .cs-page-margins-reset {
        opacity: 0;
        transform: scale(0.88);
        pointer-events: none;
        transition:
            opacity var(--cs-dur-effect-fast) var(--cs-ease-effect),
            transform var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &[data-visible] {
            opacity: 1;
            transform: scale(1);
            pointer-events: auto;
        }
    }

    .cs-page-margins-well {
        background-color: var(--cs-color-base-soft);
        border-radius: 14px;
        corner-shape: var(--cs-squircle-smooth);
    }

    .cs-page-margins-sheet {
        --cs-page-margins-top: calc(clamp(0, var(--cs-page-margins-top-val), 6) / 29.7 * 100%);
        --cs-page-margins-bottom: calc(clamp(0, var(--cs-page-margins-bottom-val), 6) / 29.7 * 100%);
        --cs-page-margins-left: calc(clamp(0, var(--cs-page-margins-left-val), 6) / 21 * 100%);
        --cs-page-margins-right: calc(clamp(0, var(--cs-page-margins-right-val), 6) / 21 * 100%);

        position: relative;
        width: 100px;
        height: 141px;
        overflow: hidden;
        border-radius: 6px;
        corner-shape: var(--cs-squircle-soft);
        box-shadow:
            var(--cs-shadow-sm),
            0 0 0 1px
                light-dark(
                    color-mix(in oklch, var(--cs-color-base-900) 5%, transparent),
                    color-mix(in oklch, var(--cs-color-base-100) 11%, transparent)
                );
    }

    .cs-page-margins-content {
        position: absolute;
        inset: var(--cs-page-margins-top) var(--cs-page-margins-right) var(--cs-page-margins-bottom)
            var(--cs-page-margins-left);
        display: flex;
        flex-direction: column;
        gap: 4.5px;
        overflow: hidden;
        transition: inset var(--cs-dur-240) var(--cs-spring-snappy);
    }

    .cs-page-margins-skeleton-line {
        flex-shrink: 0;
        height: 2.5px;
        border-radius: 9999px;
        background-color: light-dark(
            color-mix(in oklch, var(--cs-color-base-900) 11%, transparent),
            color-mix(in oklch, var(--cs-color-base-100) 14%, transparent)
        );
    }

    .cs-page-margins-strip {
        position: absolute;
        background-color: var(--cs-color-accent-soft);
        opacity: 0;
        pointer-events: none;
        transition:
            top var(--cs-dur-240) var(--cs-spring-snappy),
            right var(--cs-dur-240) var(--cs-spring-snappy),
            bottom var(--cs-dur-240) var(--cs-spring-snappy),
            left var(--cs-dur-240) var(--cs-spring-snappy),
            width var(--cs-dur-240) var(--cs-spring-snappy),
            height var(--cs-dur-240) var(--cs-spring-snappy),
            opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &[data-side="top"] {
            top: 0;
            right: 0;
            left: 0;
            height: var(--cs-page-margins-top);
        }

        &[data-side="bottom"] {
            right: 0;
            bottom: 0;
            left: 0;
            height: var(--cs-page-margins-bottom);
        }

        &[data-side="left"] {
            top: 0;
            bottom: 0;
            left: 0;
            width: var(--cs-page-margins-left);
        }

        &[data-side="right"] {
            top: 0;
            right: 0;
            bottom: 0;
            width: var(--cs-page-margins-right);
        }

        &[data-active] {
            opacity: 1;
        }
    }

    .cs-page-margins-guide {
        position: absolute;
        pointer-events: none;
        background-color: light-dark(
            color-mix(in oklch, var(--cs-color-base-900) 9%, transparent),
            color-mix(in oklch, var(--cs-color-base-100) 12%, transparent)
        );
        transition:
            top var(--cs-dur-240) var(--cs-spring-snappy),
            right var(--cs-dur-240) var(--cs-spring-snappy),
            bottom var(--cs-dur-240) var(--cs-spring-snappy),
            left var(--cs-dur-240) var(--cs-spring-snappy),
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &[data-side="top"] {
            top: var(--cs-page-margins-top);
            right: 0;
            left: 0;
            height: 1px;
        }

        &[data-side="bottom"] {
            right: 0;
            bottom: var(--cs-page-margins-bottom);
            left: 0;
            height: 1px;
        }

        &[data-side="left"] {
            top: 0;
            bottom: 0;
            left: var(--cs-page-margins-left);
            width: 1px;
        }

        &[data-side="right"] {
            top: 0;
            right: var(--cs-page-margins-right);
            bottom: 0;
            width: 1px;
        }

        &[data-active] {
            background-color: var(--cs-color-accent-solid);
        }
    }

    :global(.cs-page-margins-input) {
        --cs-text-input-icon-size: 12px;
    }

    @media (prefers-reduced-motion: reduce) {
        .cs-page-margins-reset,
        .cs-page-margins-content,
        .cs-page-margins-strip,
        .cs-page-margins-guide {
            transition: none;
        }
    }
</style>
