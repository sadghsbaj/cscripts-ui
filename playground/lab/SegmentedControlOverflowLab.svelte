<script lang="ts">
    import { RotateCcw } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import {
        SegmentedControl,
        SegmentedControlItem,
        SegmentedControlLabel,
        type SegmentedControlWidth,
    } from "cs/svelte/segmented-control";

    interface ViewportDiagnostics {
        scrollWidth: number;
        clientWidth: number;
        maxScroll: number;
        hasScrollPrev: boolean;
        hasScrollNext: boolean;
        bugReproduced: boolean;
    }

    const INITIAL_PERIODS = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];

    // Scenario A: Dynamic Periods
    let periods = $state<string[]>([...INITIAL_PERIODS]);
    let selectedA = $state<string>(INITIAL_PERIODS.at(-1) ?? "");
    let widthA = $state<SegmentedControlWidth>("content");
    let nextPeriodCounter = $state(1);
    let refA = $state<HTMLDivElement | null>(null);
    let diagA = $state<ViewportDiagnostics>(emptyDiagnostics());

    // Scenario B: Dynamic Label Shrink
    const STATIC_PREFIX = ["Q1", "Q2", "Q3"] as const;
    let selectedB = $state<string>("target");
    let isShortLabel = $state(false);
    let refB = $state<HTMLDivElement | null>(null);
    let diagB = $state<ViewportDiagnostics>(emptyDiagnostics());

    function emptyDiagnostics(): ViewportDiagnostics {
        return {
            scrollWidth: 0,
            clientWidth: 0,
            maxScroll: 0,
            hasScrollPrev: false,
            hasScrollNext: false,
            bugReproduced: false,
        };
    }

    function readViewportDiagnostics(root: HTMLDivElement | null): ViewportDiagnostics {
        const viewport = root?.querySelector<HTMLElement>(".cs-segmented-control-viewport");
        if (!viewport) return emptyDiagnostics();

        const scrollWidth = viewport.scrollWidth;
        const clientWidth = viewport.clientWidth;
        const maxScroll = scrollWidth - clientWidth;
        const hasScrollPrev = viewport.hasAttribute("data-scroll-prev");
        const hasScrollNext = viewport.hasAttribute("data-scroll-next");

        return {
            scrollWidth,
            clientWidth,
            maxScroll,
            hasScrollPrev,
            hasScrollNext,
            bugReproduced: maxScroll <= 1 && hasScrollNext,
        };
    }

    $effect(() => {
        const update = () => {
            diagA = readViewportDiagnostics(refA);
            diagB = readViewportDiagnostics(refB);
        };
        update();
        const intervalId = setInterval(update, 100);
        return () => clearInterval(intervalId);
    });

    function deleteLastPeriod(): void {
        if (periods.length <= 1) return;
        const removed = periods.at(-1);
        periods = periods.slice(0, -1);
        if (selectedA === removed) {
            selectedA = periods.at(-1) ?? "";
        }
    }

    function deleteSecondToLastPeriod(): void {
        if (periods.length <= 1) return;
        const targetIdx = periods.length - 2;
        const removed = periods[targetIdx];
        periods = [...periods.slice(0, targetIdx), ...periods.slice(targetIdx + 1)];
        if (selectedA === removed) {
            selectedA = periods.at(-1) ?? "";
        }
    }

    function addPeriod(): void {
        const year = 2026 + Math.floor((nextPeriodCounter - 1) / 4);
        const quarter = ((nextPeriodCounter - 1) % 4) + 1;
        nextPeriodCounter += 1;
        periods = [...periods, `Q${quarter} ${year}`];
    }

    function resetPeriods(): void {
        periods = [...INITIAL_PERIODS];
        selectedA = INITIAL_PERIODS.at(-1) ?? "";
        nextPeriodCounter = 1;
    }

    function toggleWidthA(): void {
        widthA = widthA === "content" ? "equal" : "content";
    }

    function toggleLabelB(): void {
        isShortLabel = !isShortLabel;
    }
</script>

{#snippet diagnosticPanel(label: string, diag: ViewportDiagnostics)}
    <div class="rounded-lg border border-base-200 bg-base-50/70 p-3 text-xs font-mono flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-sans font-semibold text-text-strong">{label}</span>
            {#if diag.bugReproduced}
                <span
                    class="rounded-full bg-negative-soft px-2.5 py-0.5 font-sans font-semibold text-negative-strong"
                >
                    BUG REPRODUZIERT: Chevron aktiv obwohl nicht scrollbar!
                </span>
            {:else}
                <span class="rounded-full bg-base-200/80 px-2.5 py-0.5 font-sans font-medium text-text-weak">
                    OK (kein Phantom-Chevron)
                </span>
            {/if}
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-text-weak">
            <div>
                scrollWidth: <span class="text-text-strong font-semibold">{diag.scrollWidth}px</span>
            </div>
            <div>
                clientWidth: <span class="text-text-strong font-semibold">{diag.clientWidth}px</span>
            </div>
            <div>
                maxScroll: <span class="text-text-strong font-semibold">{diag.maxScroll}px</span>
            </div>
            <div class="flex items-center gap-2">
                <span>
                    prev:
                    <span class={diag.hasScrollPrev ? "text-caution-strong font-semibold" : "text-text-strong"}>
                        {diag.hasScrollPrev ? "an" : "aus"}
                    </span>
                </span>
                <span>
                    next:
                    <span class={diag.hasScrollNext ? "text-negative-strong font-semibold" : "text-text-strong"}>
                        {diag.hasScrollNext ? "an" : "aus"}
                    </span>
                </span>
            </div>
        </div>
    </div>
{/snippet}

<section class="w-full max-w-3xl rounded-2xl border border-base-200 bg-surface p-6 shadow-sm flex flex-col gap-8">
    <header class="flex flex-col gap-1">
        <h2 class="text-lg font-semibold text-text-strong">SegmentedControl Phantom-Overflow Reproduktion</h2>
        <p class="text-sm text-text-weak">
            Reproduziert hängende Scroll-Chevrons (<code>data-scroll-next</code>), wenn der Track schrumpft während der
            Indicator noch über 180ms animiert.
        </p>
    </header>

    <!-- Scenario A -->
    <div class="flex flex-col gap-4 border-t border-base-200 pt-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
                <h3 class="text-sm font-semibold text-text-strong">Szenario A — Dynamische Perioden (Add / Delete)</h3>
                <p class="text-xs text-text-weak">
                    Letzte Periode ist aktiv. Beim Löschen gleitet der Indicator nach links, während der Track schrumpft.
                </p>
            </div>
            <Button size="xs" variant="secondary" onclick={toggleWidthA}>
                width: {widthA}
            </Button>
        </div>

        <div class={widthA === "equal" ? "w-[420px] max-w-full" : "w-fit max-w-full"}>
            <SegmentedControl bind:ref={refA} bind:value={selectedA} size="md" width={widthA}>
                {#each periods as period (period)}
                    <SegmentedControlItem value={period}>
                        <SegmentedControlLabel>{period}</SegmentedControlLabel>
                    </SegmentedControlItem>
                {/each}
            </SegmentedControl>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" disabled={periods.length <= 1} onclick={deleteLastPeriod}>
                Letzte Option löschen
            </Button>
            <Button size="sm" variant="secondary" disabled={periods.length <= 1} onclick={deleteSecondToLastPeriod}>
                Vorletzte Option löschen
            </Button>
            <Button size="sm" variant="secondary" onclick={addPeriod}>Option hinzufügen</Button>
            <Button size="sm" variant="ghost" onclick={resetPeriods}>
                <ButtonIcon icon={RotateCcw} />
                Reset
            </Button>
        </div>

        {@render diagnosticPanel("Live-Diagnose (Szenario A)", diagA)}
    </div>

    <!-- Scenario B -->
    <div class="flex flex-col gap-4 border-t border-base-200 pt-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
                <h3 class="text-sm font-semibold text-text-strong">Szenario B — Dynamisches Label-Schrumpfen</h3>
                <p class="text-xs text-text-weak">
                    Die letzte aktive Option wechselt zwischen langem und kurzem Label.
                </p>
            </div>
            <Button size="sm" variant="secondary" onclick={toggleLabelB}>Label verkürzen / zurücksetzen</Button>
        </div>

        <div class="w-fit max-w-full">
            <SegmentedControl bind:ref={refB} bind:value={selectedB} size="md" width="content">
                {#each STATIC_PREFIX as item (item)}
                    <SegmentedControlItem value={item}>
                        <SegmentedControlLabel>{item}</SegmentedControlLabel>
                    </SegmentedControlItem>
                {/each}
                <SegmentedControlItem value="target">
                    <SegmentedControlLabel>
                        {isShortLabel ? "Q4" : "Ganzjähriger Zeitraum 2025/2026"}
                    </SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>
        </div>

        {@render diagnosticPanel("Live-Diagnose (Szenario B)", diagB)}
    </div>
</section>
