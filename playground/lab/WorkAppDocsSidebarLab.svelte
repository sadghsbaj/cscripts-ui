<script lang="ts">
    import type { Component } from "svelte";
    import {
        ArrowUp,
        Check,
        ChevronRight,
        FileSpreadsheet,
        FolderOpen,
        GitBranch,
        Keyboard,
        LifeBuoy,
        Link2,
        Link2Off,
        Rocket,
        Search,
        X,
    } from "@lucide/svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { HitArea } from "cs/svelte/hit-area";
    import { Kbd } from "cs/svelte/kbd";
    import { ToggleButton, ToggleButtonIcon, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";
    import LabCompare from "./LabCompare.svelte";

    interface SubChapter {
        id: string;
        title: string;
    }

    interface Chapter {
        id: string;
        title: string;
        icon: Component<{ size?: number; strokeWidth?: number }>;
        items: readonly SubChapter[];
    }

    const CHAPTERS: readonly Chapter[] = [
        {
            id: "intro",
            title: "Erste Schritte",
            icon: Rocket,
            items: [
                { id: "voraussetzungen", title: "Voraussetzungen" },
                { id: "schnellstart", title: "Schnellstart" },
            ],
        },
        {
            id: "workspace",
            title: "Arbeitsbereich",
            icon: FolderOpen,
            items: [
                { id: "ordnerstruktur", title: "Ordnerstruktur" },
                { id: "freigaben", title: "Freigaben" },
                { id: "offline", title: "Offline-Modus" },
            ],
        },
        {
            id: "import",
            title: "Datenimport",
            icon: FileSpreadsheet,
            items: [
                { id: "excel", title: "Excel-Vorlagen" },
                { id: "spalten", title: "Spaltenzuordnung" },
            ],
        },
        {
            id: "workflow",
            title: "Freigabe-Workflow",
            icon: GitBranch,
            items: [
                { id: "pruefschritte", title: "Prüfschritte" },
                { id: "benachrichtigungen", title: "Benachrichtigungen" },
            ],
        },
        {
            id: "shortcuts",
            title: "Tastenkürzel",
            icon: Keyboard,
            items: [
                { id: "navigation", title: "Navigation" },
                { id: "bearbeitung", title: "Bearbeitung" },
            ],
        },
        {
            id: "faq",
            title: "Fehlerbehebung",
            icon: LifeBuoy,
            items: [
                { id: "sync", title: "Sync-Probleme" },
                { id: "support", title: "Support" },
            ],
        },
    ];

    let synced = $state(true);

    let sharedChapterId = $state("workspace");
    let sharedSubId = $state<string | null>("ordnerstruktur");

    let c1ChapterId = $state("workspace");
    let c1SubId = $state<string | null>("ordnerstruktur");

    let c2ChapterId = $state("workspace");
    let c2SubId = $state<string | null>("ordnerstruktur");

    let c3ChapterId = $state("workspace");
    let c3SubId = $state<string | null>("ordnerstruktur");

    const activeC1Chapter = $derived(synced ? sharedChapterId : c1ChapterId);
    const activeC1Sub = $derived(synced ? sharedSubId : c1SubId);

    const activeC2Chapter = $derived(synced ? sharedChapterId : c2ChapterId);
    const activeC2Sub = $derived(synced ? sharedSubId : c2SubId);

    const activeC3Chapter = $derived(synced ? sharedChapterId : c3ChapterId);
    const activeC3Sub = $derived(synced ? sharedSubId : c3SubId);

    function selectChapter(concept: 1 | 2 | 3, chapter: Chapter, subId: string | null = chapter.items[0]?.id ?? null): void {
        if (synced) {
            sharedChapterId = chapter.id;
            sharedSubId = subId;
        }
        if (synced || concept === 1) {
            c1ChapterId = chapter.id;
            c1SubId = subId;
        }
        if (synced || concept === 2) {
            c2ChapterId = chapter.id;
            c2SubId = subId;
        }
        if (synced || concept === 3) {
            c3ChapterId = chapter.id;
            c3SubId = subId;
        }
    }

    // =========================================================
    // Concept 1: Vertical SegmentedControl-Tray sliding indicator
    // =========================================================
    const c1ItemEls = new SvelteMap<string, HTMLElement>();
    let c1TrayEl = $state<HTMLDivElement | null>(null);
    let c1IndicatorY = $state(0);
    let c1IndicatorH = $state(0);
    let c1HasIndicator = $state(false);
    let c1Ready = $state(false);

    function registerC1Item(id: string) {
        return (node: HTMLElement) => {
            c1ItemEls.set(id, node);
            return () => {
                if (c1ItemEls.get(id) === node) {
                    c1ItemEls.delete(id);
                }
            };
        };
    }

    function syncC1Indicator(): void {
        const activeEl = c1ItemEls.get(activeC1Chapter);
        if (!activeEl) {
            c1HasIndicator = false;
            return;
        }
        c1IndicatorY = activeEl.offsetTop;
        c1IndicatorH = activeEl.offsetHeight;
        c1HasIndicator = true;
    }

    $effect(() => {
        void activeC1Chapter;
        void activeC1Sub;
        void c1ItemEls.size;
        syncC1Indicator();

        if (!c1Ready && typeof requestAnimationFrame === "function") {
            const frame = requestAnimationFrame(() => {
                c1Ready = true;
            });
            return () => cancelAnimationFrame(frame);
        }
    });

    $effect(() => {
        if (!c1TrayEl || typeof ResizeObserver !== "function") return;
        const activeEl = c1ItemEls.get(activeC1Chapter);
        const observer = new ResizeObserver(() => {
            syncC1Indicator();
        });
        observer.observe(c1TrayEl);
        if (activeEl) observer.observe(activeEl);
        return () => observer.disconnect();
    });

    // =========================================================
    // Concept 2: 3-Zone App Sidebar filter & footer metrics
    // =========================================================
    let c2Filter = $state("");
    let c2InputEl = $state<HTMLInputElement | null>(null);

    const c2FilteredChapters = $derived.by(() => {
        const q = c2Filter.trim().toLowerCase();
        if (!q) return CHAPTERS;
        return CHAPTERS.filter(
            (ch) =>
                ch.title.toLowerCase().includes(q) ||
                ch.items.some((sub) => sub.title.toLowerCase().includes(q))
        );
    });

    const c2ActiveIndex = $derived(
        Math.max(0, CHAPTERS.findIndex((ch) => ch.id === activeC2Chapter))
    );
    const c2ProgressPct = $derived(((c2ActiveIndex + 1) / CHAPTERS.length) * 100);

    function handleGlobalKeydown(event: KeyboardEvent): void {
        if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
            return;
        }
        if (c2InputEl) {
            event.preventDefault();
            c2InputEl.focus();
        }
    }

    // =========================================================
    // Concept 3: Connected Chapter-Rail metrics
    // =========================================================
    const c3ActiveIndex = $derived(
        Math.max(0, CHAPTERS.findIndex((ch) => ch.id === activeC3Chapter))
    );
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#snippet concept1()}
    <div class="w-full max-w-[272px]">
        <div bind:this={c1TrayEl} class="c1-tray">
            <div
                class="c1-indicator"
                data-active={c1HasIndicator ? "" : undefined}
                data-ready={c1Ready ? "" : undefined}
                style:--c1-y="{c1IndicatorY}px"
                style:--c1-h="{c1IndicatorH}px"
                aria-hidden="true"
            ></div>

            {#each CHAPTERS as chapter (chapter.id)}
                <div
                    class="c1-group"
                    data-active={activeC1Chapter === chapter.id ? "" : undefined}
                    {@attach registerC1Item(chapter.id)}
                >
                    <button
                        type="button"
                        class="c1-chapter-btn"
                        aria-expanded={activeC1Chapter === chapter.id}
                        onclick={() => selectChapter(1, chapter)}
                    >
                        <span class="c1-badge" data-active={activeC1Chapter === chapter.id ? "" : undefined}>
                            <chapter.icon size={16} strokeWidth={2} />
                        </span>
                        <span class="c1-title">{chapter.title}</span>
                    </button>

                    <div class="c1-sub-collapse" data-open={activeC1Chapter === chapter.id ? "" : undefined}>
                        <div class="c1-sub-inner">
                            <ul class="c1-sub-list">
                                {#each chapter.items as sub (sub.id)}
                                    <li>
                                        <button
                                            type="button"
                                            class="c1-sub-btn"
                                            data-active={activeC1Chapter === chapter.id && activeC1Sub === sub.id ? "" : undefined}
                                            onclick={() => selectChapter(1, chapter, sub.id)}
                                        >
                                            <span class="c1-sub-dot" aria-hidden="true"></span>
                                            <span>{sub.title}</span>
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/snippet}

{#snippet concept2()}
    <div class="w-full max-w-[272px]">
        <div class="c2-card">
            <!-- Zone 1: Quick-Filter -->
            <div class="c2-zone-top">
                <div class="c2-search-well">
                    <Search size={14} class="c2-search-icon" aria-hidden="true" />
                    <input
                        bind:this={c2InputEl}
                        type="text"
                        class="c2-search-input"
                        placeholder="Kapitel filtern…"
                        aria-label="Kapitel filtern"
                        bind:value={c2Filter}
                        onkeydown={(e) => {
                            if (e.key !== "Escape" || !c2Filter) return;
                            e.stopPropagation();
                            c2Filter = "";
                        }}
                    />
                    {#if c2Filter}
                        <button
                            type="button"
                            class="c2-clear-btn"
                            aria-label="Filter leeren"
                            onclick={() => {
                                c2Filter = "";
                                c2InputEl?.focus();
                            }}
                        >
                            <X size={12} />
                        </button>
                    {:else}
                        <Kbd variant="soft" size="xs">/</Kbd>
                    {/if}
                </div>
            </div>

            <!-- Zone 2: Chapter Navigation -->
            <div class="c2-zone-mid">
                {#if c2FilteredChapters.length === 0}
                    <div class="c2-empty">Keine Treffer</div>
                {:else}
                    {#each c2FilteredChapters as chapter (chapter.id)}
                        <div class="c2-item-wrap">
                            <button
                                type="button"
                                class="c2-chapter-btn"
                                data-active={activeC2Chapter === chapter.id ? "" : undefined}
                                onclick={() => selectChapter(2, chapter)}
                            >
                                <span class="c2-item-left">
                                    <chapter.icon size={15} strokeWidth={2} />
                                    <span class="c2-item-title">{chapter.title}</span>
                                </span>
                                <ChevronRight size={14} class="c2-chevron" aria-hidden="true" />
                            </button>

                            {#if activeC2Chapter === chapter.id || c2Filter.trim().length > 0}
                                <ul class="c2-sub-list">
                                    {#each chapter.items as sub (sub.id)}
                                        <li>
                                            <button
                                                type="button"
                                                class="c2-sub-btn"
                                                data-active={activeC2Chapter === chapter.id && activeC2Sub === sub.id ? "" : undefined}
                                                onclick={() => selectChapter(2, chapter, sub.id)}
                                            >
                                                {sub.title}
                                            </button>
                                        </li>
                                    {/each}
                                </ul>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- Zone 3: Utility Footer -->
            <div class="c2-zone-bottom">
                <div class="c2-progress-track" aria-hidden="true">
                    <div class="c2-progress-fill" style:width="{c2ProgressPct}%"></div>
                </div>
                <div class="c2-footer-row">
                    <span class="c2-counter">{c2ActiveIndex + 1} / {CHAPTERS.length}</span>
                    <button
                        type="button"
                        class="c2-top-btn"
                        disabled={c2ActiveIndex === 0}
                        onclick={() => {
                            const first = CHAPTERS[0];
                            if (first) selectChapter(2, first);
                        }}
                    >
                        <ArrowUp size={13} aria-hidden="true" />
                        <span>Nach oben</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
{/snippet}

{#snippet concept3()}
    <div class="w-full max-w-[272px]">
        <div class="c3-card">
            <div class="c3-header">
                <span class="c3-step-pill">
                    Schritt {c3ActiveIndex + 1} von {CHAPTERS.length}
                </span>
            </div>

            <div class="c3-track">
                {#each CHAPTERS as chapter, index (chapter.id)}
                    <div
                        class="c3-step"
                        data-state={index === c3ActiveIndex ? "active" : index < c3ActiveIndex ? "passed" : "upcoming"}
                    >
                        <div class="c3-rail-col" aria-hidden="true">
                            <span class="c3-node">
                                {#if index < c3ActiveIndex}
                                    <Check size={13} strokeWidth={2.5} />
                                {:else}
                                    <chapter.icon size={14} strokeWidth={2} />
                                {/if}
                            </span>
                            {#if index < CHAPTERS.length - 1}
                                <span class="c3-rail" data-filled={index < c3ActiveIndex ? "" : undefined}></span>
                            {/if}
                        </div>

                        <div class="c3-content-col">
                            <button
                                type="button"
                                class="c3-step-btn"
                                onclick={() => selectChapter(3, chapter)}
                            >
                                <span class="c3-step-title">{chapter.title}</span>
                            </button>

                            <div class="c3-sub-collapse" data-open={index === c3ActiveIndex ? "" : undefined}>
                                <div class="c3-sub-inner">
                                    <ul class="c3-sub-list">
                                        {#each chapter.items as sub (sub.id)}
                                            <li>
                                                <button
                                                    type="button"
                                                    class="c3-sub-btn"
                                                    data-active={index === c3ActiveIndex && activeC3Sub === sub.id ? "" : undefined}
                                                    onclick={() => selectChapter(3, chapter, sub.id)}
                                                >
                                                    {sub.title}
                                                </button>
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/snippet}

<div class="w-full max-w-6xl flex flex-col items-center gap-6">
    <div class="w-full flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-col gap-0.5">
            <h1 class="title-lg text-strong">AppDocs Sidebar — Konzeptvergleich</h1>
            <p class="text-xs text-weak">
                3 interaktive Navigationskonzepte im direkten Vergleich (Light &amp; Dark)
            </p>
        </div>

        <ToggleButton
            size="sm"
            variant="soft"
            color="accent"
            bind:pressed={synced}
            {@attach tooltip({
                text: synced
                    ? "Auswahl über alle 3 Konzepte synchronisiert"
                    : "Jedes Konzept unabhängig bedienbar",
            })}
        >
            <ToggleButtonIcon icon={synced ? Link2 : Link2Off} />
            <ToggleButtonLabel>{synced ? "Synchronisiert" : "Unabhängig"}</ToggleButtonLabel>
            <HitArea size="sm" />
        </ToggleButton>
    </div>

    <LabCompare
        variants={[
            { id: "tray", label: "Konzept 1 — Segmented Tray", content: concept1 },
            { id: "zones", label: "Konzept 2 — 3-Zonen-Sidebar", content: concept2 },
            { id: "rail", label: "Konzept 3 — Chapter-Rail", content: concept3 },
        ]}
    />
</div>

<style>
    /* =========================================================
     * KONZEPT 1: Vertikales SegmentedControl-Tray
     * ========================================================= */
    .c1-tray {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 6px;
        background-color: var(--cs-color-sunken);
        box-shadow: var(--cs-shadow-sunken);
        border-radius: var(--cs-radius-2xl);
        corner-shape: var(--cs-squircle);
        user-select: none;
    }

    .c1-indicator {
        position: absolute;
        inset-inline: 6px;
        top: 0;
        z-index: 0;
        height: var(--c1-h, 0px);
        translate: 0 var(--c1-y, 0px);
        background-color: var(--cs-color-elevated);
        box-shadow: var(--cs-shadow-sm);
        border-radius: var(--cs-radius-xl);
        corner-shape: var(--cs-squircle-soft);
        pointer-events: none;
        opacity: 0;

        &[data-active] {
            opacity: 1;
        }

        &[data-ready] {
            transition:
                translate var(--cs-dur-320) var(--cs-spring-snappy),
                height var(--cs-dur-320) var(--cs-spring-snappy),
                opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);
        }
    }

    .c1-group {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
    }

    .c1-chapter-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 7px 10px;
        border-radius: var(--cs-radius-xl);
        corner-shape: var(--cs-squircle-soft);
        color: var(--cs-color-text-weak);
        font-size: var(--cs-text-sm);
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        transition: color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &:hover {
            color: var(--cs-color-text-strong);
        }

        &:focus-visible {
            outline: 2px solid var(--cs-color-accent-solid);
            outline-offset: -2px;
        }
    }

    .c1-group[data-active] .c1-chapter-btn {
        color: var(--cs-color-text-strong);
    }

    .c1-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border-radius: 7px;
        corner-shape: var(--cs-squircle-soft);
        background-color: var(--cs-color-base-soft);
        color: var(--cs-color-text-weak);
        transition:
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &[data-active] {
            background-color: var(--cs-color-accent-soft);
            color: var(--cs-color-accent-soft-fg);
        }
    }

    .c1-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .c1-sub-collapse {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
            grid-template-rows var(--cs-dur-280) var(--cs-spring-snappy),
            opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &[data-open] {
            grid-template-rows: 1fr;
            opacity: 1;
        }
    }

    .c1-sub-inner {
        overflow: hidden;
    }

    .c1-sub-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0 8px 8px 44px;
    }

    .c1-sub-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 4px 8px;
        border-radius: var(--cs-radius-md);
        corner-shape: var(--cs-squircle-soft);
        font-size: var(--cs-text-xs);
        color: var(--cs-color-text-weak);
        text-align: left;
        cursor: pointer;
        transition:
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &:hover {
            color: var(--cs-color-text-strong);
            background-color: var(--cs-color-base-soft);
        }

        &[data-active] {
            color: var(--cs-color-accent-soft-fg);
            background-color: var(--cs-color-accent-soft);
            font-weight: 500;
        }
    }

    .c1-sub-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background-color: currentColor;
        opacity: 0.6;
        flex-shrink: 0;
    }

    /* =========================================================
     * KONZEPT 2: Interaktive 3-Zonen-App-Sidebar
     * ========================================================= */
    .c2-card {
        display: flex;
        flex-direction: column;
        background-color: var(--cs-color-elevated);
        box-shadow: var(--cs-shadow-elevated);
        border-radius: var(--cs-radius-2xl);
        corner-shape: var(--cs-squircle);
        overflow: hidden;
        user-select: none;
    }

    .c2-zone-top {
        padding: 10px 10px 8px;
    }

    .c2-search-well {
        display: flex;
        align-items: center;
        gap: 7px;
        height: 32px;
        padding: 0 8px 0 10px;
        background-color: var(--cs-color-sunken);
        box-shadow: var(--cs-shadow-sunken);
        border-radius: var(--cs-radius-lg);
        corner-shape: var(--cs-squircle-soft);

        &:focus-within {
            outline: 2px solid var(--cs-color-accent-solid);
            outline-offset: -1px;
        }
    }

    :global(.c2-search-icon) {
        color: var(--cs-color-text-weak);
        flex-shrink: 0;
    }

    .c2-search-input {
        flex: 1 1 auto;
        min-width: 0;
        font-size: var(--cs-text-xs);
        color: var(--cs-color-text-strong);
        background: transparent;
        outline: none;

        &::placeholder {
            color: var(--cs-color-text-weak);
        }
    }

    .c2-clear-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        color: var(--cs-color-text-weak);
        background-color: var(--cs-color-base-soft);
        cursor: pointer;

        &:hover {
            color: var(--cs-color-text-strong);
        }
    }

    .c2-zone-mid {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 4px 10px 10px;
        min-height: 220px;
    }

    .c2-empty {
        padding: 24px 12px;
        text-align: center;
        font-size: var(--cs-text-xs);
        color: var(--cs-color-text-weak);
    }

    .c2-item-wrap {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .c2-chapter-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        padding: 7px 10px;
        border-radius: var(--cs-radius-lg);
        corner-shape: var(--cs-squircle-soft);
        font-size: var(--cs-text-sm);
        font-weight: 500;
        color: var(--cs-color-text-weak);
        cursor: pointer;
        transition:
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &:hover {
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-strong);
        }

        &[data-active] {
            background-color: var(--cs-color-accent-soft);
            color: var(--cs-color-accent-soft-fg);
        }
    }

    .c2-item-left {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
    }

    .c2-item-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.c2-chevron) {
        flex-shrink: 0;
        opacity: 0.45;
        transition:
            transform var(--cs-dur-200) var(--cs-spring-snappy),
            opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);
    }

    .c2-chapter-btn[data-active] :global(.c2-chevron) {
        opacity: 1;
        transform: rotate(90deg);
    }

    .c2-sub-list {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 2px 6px 4px 30px;
    }

    .c2-sub-btn {
        width: 100%;
        padding: 4px 8px;
        border-radius: var(--cs-radius-md);
        corner-shape: var(--cs-squircle-soft);
        font-size: var(--cs-text-xs);
        color: var(--cs-color-text-weak);
        text-align: left;
        cursor: pointer;
        transition:
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &:hover {
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-strong);
        }

        &[data-active] {
            color: var(--cs-color-accent-soft-fg);
            font-weight: 500;
        }
    }

    .c2-zone-bottom {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px 12px 10px;
        background-color: var(--cs-color-sunken);
    }

    .c2-progress-track {
        width: 100%;
        height: 3px;
        border-radius: var(--cs-radius-full);
        background-color: var(--cs-color-base-soft);
        overflow: hidden;
    }

    .c2-progress-fill {
        height: 100%;
        border-radius: var(--cs-radius-full);
        background-color: var(--cs-color-accent-solid);
        transition: width var(--cs-dur-280) var(--cs-spring-snappy);
    }

    .c2-footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .c2-counter {
        font-size: var(--cs-text-xs);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: var(--cs-color-text-weak);
    }

    .c2-top-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: var(--cs-radius-md);
        corner-shape: var(--cs-squircle-soft);
        font-size: var(--cs-text-xs);
        font-weight: 500;
        color: var(--cs-color-text-weak);
        background-color: var(--cs-color-elevated);
        box-shadow: var(--cs-shadow-xs);
        cursor: pointer;
        transition:
            color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &:hover:not(:disabled) {
            color: var(--cs-color-text-strong);
        }

        &:disabled {
            opacity: 0.45;
            cursor: default;
        }
    }

    /* =========================================================
     * KONZEPT 3: Connected Chapter-Rail
     * ========================================================= */
    .c3-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 12px;
        background-color: var(--cs-color-elevated);
        box-shadow: var(--cs-shadow-elevated);
        border-radius: var(--cs-radius-2xl);
        corner-shape: var(--cs-squircle);
        user-select: none;
    }

    .c3-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .c3-step-pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: var(--cs-radius-full);
        background-color: var(--cs-color-accent-soft);
        color: var(--cs-color-accent-soft-fg);
        font-size: var(--cs-text-xs);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .c3-track {
        display: flex;
        flex-direction: column;
    }

    .c3-step {
        display: flex;
        align-items: stretch;
        gap: 10px;
    }

    .c3-rail-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 24px;
        flex-shrink: 0;
    }

    .c3-node {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 7px;
        corner-shape: var(--cs-squircle-soft);
        flex-shrink: 0;
        transition:
            background-color var(--cs-dur-200) var(--cs-ease-effect),
            color var(--cs-dur-200) var(--cs-ease-effect),
            box-shadow var(--cs-dur-200) var(--cs-ease-effect),
            scale var(--cs-dur-200) var(--cs-spring-snappy);
    }

    .c3-step[data-state="upcoming"] .c3-node {
        background-color: var(--cs-color-sunken);
        box-shadow: var(--cs-shadow-sunken);
        color: var(--cs-color-text-weak);
    }

    .c3-step[data-state="passed"] .c3-node {
        background-color: var(--cs-color-accent-soft);
        color: var(--cs-color-accent-soft-fg);
    }

    .c3-step[data-state="active"] .c3-node {
        background-color: var(--cs-color-accent-solid);
        color: var(--cs-color-accent-solid-fg);
        scale: 1.04;
    }

    .c3-rail {
        width: 2px;
        flex: 1 1 auto;
        min-height: 10px;
        margin-block: 3px;
        border-radius: var(--cs-radius-full);
        background-color: var(--cs-color-base-soft);
        transition: background-color var(--cs-dur-240) var(--cs-ease-effect);

        &[data-filled] {
            background-color: var(--cs-color-accent-solid);
        }
    }

    .c3-content-col {
        flex: 1 1 auto;
        min-width: 0;
        padding-bottom: 6px;
    }

    .c3-step-btn {
        display: flex;
        align-items: center;
        width: 100%;
        min-height: 24px;
        padding: 3px 8px;
        border-radius: var(--cs-radius-lg);
        corner-shape: var(--cs-squircle-soft);
        font-size: var(--cs-text-sm);
        font-weight: 500;
        color: var(--cs-color-text-weak);
        text-align: left;
        cursor: pointer;
        transition:
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &:hover {
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-strong);
        }
    }

    .c3-step[data-state="passed"] .c3-step-btn {
        color: var(--cs-color-text-main);
    }

    .c3-step[data-state="active"] .c3-step-btn {
        background-color: var(--cs-color-accent-soft);
        color: var(--cs-color-accent-soft-fg);
        font-weight: 600;
    }

    .c3-step-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .c3-sub-collapse {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
            grid-template-rows var(--cs-dur-280) var(--cs-spring-snappy),
            opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &[data-open] {
            grid-template-rows: 1fr;
            opacity: 1;
        }
    }

    .c3-sub-inner {
        overflow: hidden;
    }

    .c3-sub-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 4px 0 4px 8px;
    }

    .c3-sub-btn {
        width: 100%;
        padding: 4px 8px;
        border-radius: var(--cs-radius-md);
        corner-shape: var(--cs-squircle-soft);
        font-size: var(--cs-text-xs);
        color: var(--cs-color-text-weak);
        text-align: left;
        cursor: pointer;
        transition:
            background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
            color var(--cs-dur-effect-fast) var(--cs-ease-effect);

        &:hover {
            background-color: var(--cs-color-base-soft);
            color: var(--cs-color-text-strong);
        }

        &[data-active] {
            color: var(--cs-color-accent-soft-fg);
            font-weight: 500;
        }
    }
</style>
