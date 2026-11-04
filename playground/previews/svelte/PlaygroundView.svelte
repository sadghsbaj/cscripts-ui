<script module>
    export const id = "playground";
    export const label = "Playground";
</script>

<script lang="ts">
    import { onDestroy } from "svelte";
    import { Check, Layers, Play, RotateCcw, Sparkles, Truck, Zap } from "@lucide/svelte";
    import logoUrl from "cs/assets/work/logo.svg";
    import { Button, ButtonIcon, ButtonLabel, WORK_LOCATIONS, WorkLocation, type WorkLocationId } from "cs/svelte";

    const TOOL_CATEGORY = "Pfleiderer Holzeinkauf";
    const TOOL_NAME = "Fracht-Automatisierung";

    const SESSION_STORAGE_KEY = "cs-pfleiderer-boot-session";
    const LOCAL_STORAGE_KEY = "cs-pfleiderer-boot-last-ts";
    const FAST_BOOT_WINDOW_MS = 30 * 60 * 1000;

    const BOOT_SEQUENCE: readonly WorkLocationId[] = ["neumarkt", "baruth", "guetersloh", "arnsberg", "leutkirch"];

    /** Compact geographical cluster positions (Option A). */
    const GEO_CLUSTER_POSITIONS: Record<WorkLocationId, { x: number; y: number; width: string }> = {
        baruth: { x: 66, y: 24, width: "160px" },
        guetersloh: { x: 34, y: 26, width: "145px" },
        arnsberg: { x: 28, y: 55, width: "160px" },
        neumarkt: { x: 65, y: 58, width: "160px" },
        leutkirch: { x: 48, y: 78, width: "140px" },
    };

    /**
     * Realistic Germany compass & latitude/longitude topology (Option C) with harmonized spacing:
     * - Baruth/Mark (52.05°N, 13.50°E) -> Nord-Ost (am weitesten nördlich & östlich)
     * - Gütersloh (51.90°N, 8.38°E)    -> Nord-West (fast gleiche Höhe wie Baruth, im Westen)
     * - Arnsberg (51.39°N, 8.06°E)     -> West (südwestlich unterhalb von Gütersloh)
     * - Neumarkt (49.28°N, 11.46°E)    -> Süd-Ost (Oberpfalz, zwischen Zentrum und Ostkante)
     * - Leutkirch (47.82°N, 10.02°E)   -> Tiefer Süden (Allgäu, südlichster Punkt mittig-südwestlich)
     */
    const REALISTIC_GERMANY_POSITIONS: Record<WorkLocationId, { x: number; y: number; width: string }> = {
        baruth: { x: 77, y: 15, width: "160px" },
        guetersloh: { x: 29, y: 17, width: "138px" },
        arnsberg: { x: 20, y: 50, width: "155px" },
        neumarkt: { x: 65, y: 59, width: "155px" },
        leutkirch: { x: 44, y: 82, width: "132px" },
    };

    type BootPhase = "idle" | "cad" | "lock" | "brand" | "curtain";
    type BootMode = "cold" | "fast" | "warm";
    type StageLayout = "row" | "cluster" | "realistic";

    let phase = $state<BootPhase>("idle");
    let bootMode = $state<BootMode>("cold");
    let stageLayout = $state<StageLayout>("row");
    let lockedCount = $state(0);
    let progress = $state(0);
    let lastSmartDecision = $state("Noch nicht ausgeführt");

    let timers: Array<ReturnType<typeof setTimeout>> = [];

    function clearBootTimers(): void {
        for (const timer of timers) {
            clearTimeout(timer);
        }
        timers = [];
    }

    function schedule(fn: () => void, delayMs: number): void {
        timers.push(setTimeout(fn, delayMs));
    }

    function startBoot(mode: BootMode = "cold"): void {
        clearBootTimers();
        bootMode = mode;

        if (mode === "warm") {
            lockedCount = BOOT_SEQUENCE.length;
            progress = 100;
            phase = "curtain";
            schedule(() => {
                phase = "idle";
            }, 350);
            return;
        }

        const speedMultiplier = mode === "fast" ? 0.4 : 1;
        const scaleTime = (ms: number): number => Math.round(ms * speedMultiplier);

        // Phase 1: CAD-Aufbau (0 ms - 850 ms)
        lockedCount = 0;
        progress = 0;
        phase = "cad";

        schedule(() => {
            progress = 25;
        }, scaleTime(80));

        // Phase 2: "Pam-Pam-Pam" Takt - Werke + Namen unterhalb locken im 85ms Takt ein (ab 550 ms)
        schedule(() => {
            phase = "lock";
        }, scaleTime(550));

        for (const index of BOOT_SEQUENCE.keys()) {
            schedule(
                () => {
                    lockedCount = index + 1;
                    progress = Math.round(30 + ((index + 1) / BOOT_SEQUENCE.length) * 45);
                },
                scaleTime(550 + index * 85)
            );
        }

        // Nach dem letzten Werk (~900 ms) bleiben alle Standorte + Namen für ~550 ms ruhig stehen,
        // bevor in Phase 3 (ab 1.450 ms) das Logo alleine im Zentrum übernimmt.
        schedule(() => {
            phase = "brand";
            progress = 100;
        }, scaleTime(1450));

        // Phase 4: Logo steht ~1 Sekunde ruhig im Fokus, dann öffnet sich der Vorhang (2.450 ms - 2.770 ms)
        schedule(() => {
            phase = "curtain";
        }, scaleTime(2450));

        schedule(() => {
            phase = "idle";
        }, scaleTime(2770));

        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
            localStorage.setItem(LOCAL_STORAGE_KEY, String(Date.now()));
        } catch (error) {
            console.warn(error);
        }
    }

    function triggerSmartBoot(): void {
        try {
            const hasSession = sessionStorage.getItem(SESSION_STORAGE_KEY) === "1";

            if (hasSession) {
                lastSmartDecision = "Warm Reload (350 ms Kurz-Fade, da sessionStorage aktiv)";
                startBoot("warm");
                return;
            }

            const lastTimestamp = Number(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "0");
            const elapsed = Date.now() - lastTimestamp;

            if (lastTimestamp > 0 && elapsed < FAST_BOOT_WINDOW_MS) {
                lastSmartDecision = "Fast Boot (da letzter Start < 30 Min.)";
                startBoot("fast");
                return;
            }

            lastSmartDecision = "Cold Boot (Volles Intro)";
            startBoot("cold");
        } catch {
            startBoot("cold");
        }
    }

    function resetStorageAndColdBoot(): void {
        try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (error) {
            console.warn(error);
        }
        lastSmartDecision = "Speicher geleert -> Cold Boot";
        startBoot("cold");
    }

    function skipBoot(): void {
        if (phase === "idle" || phase === "curtain") return;
        clearBootTimers();
        lockedCount = BOOT_SEQUENCE.length;
        progress = 100;
        phase = "curtain";
        schedule(() => {
            phase = "idle";
        }, 260);
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (phase === "idle" || phase === "curtain") return;
        if ([" ", "Enter", "Escape"].includes(event.key)) {
            event.preventDefault();
            skipBoot();
        }
    }

    const sampleShipments = [
        {
            id: "FR-8492",
            plant: "Neumarkt",
            carrier: "Spedition Holzner GmbH",
            assortment: "Fichte Industrieholz IS N",
            volume: "42,5 Fm",
            status: "Freigegeben",
        },
        {
            id: "FR-8495",
            plant: "Baruth",
            carrier: "Forstlogistik Brandenburg",
            assortment: "Kiefer Industrieholz",
            volume: "38,0 Fm",
            status: "Geprüft",
        },
        {
            id: "FR-8501",
            plant: "Arnsberg",
            carrier: "Sauerland Agrar & Forst",
            assortment: "Buche Industrieholz",
            volume: "29,8 Fm",
            status: "Freigegeben",
        },
        {
            id: "FR-8508",
            plant: "Gütersloh",
            carrier: "Westfalen Timber Transit",
            assortment: "Recyclingholz A1-A2",
            volume: "51,2 t",
            status: "In Prüfung",
        },
        {
            id: "FR-8514",
            plant: "Leutkirch",
            carrier: "Allgäu Forsttransporte",
            assortment: "Tanne / Fichte Frischholz",
            volume: "44,0 Fm",
            status: "Freigegeben",
        },
    ] as const;

    let selectedPlantFilter = $state<string>("Alle Werke");

    onDestroy(() => {
        clearBootTimers();
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative w-full max-w-6xl mx-auto flex flex-col gap-6">
    <!-- Ebene 0: Die eigentliche Applikation (im Hintergrund) -->
    <div
        class="app-workspace flex flex-col gap-6"
        data-boot-state={phase === "idle" ? "ready" : phase === "curtain" ? "entering" : "background"}
    >
        <!-- Island 1: Intro-Steuerung & Test-Kontrollen -->
        <section
            class="bg-elevation-1 shadow-sm border border-elevation-1 rounded-3xl squircle p-6 lg:p-8 flex flex-col gap-5"
        >
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                        <span class="label-xs text-weak">{TOOL_CATEGORY}</span>
                        <span class="dot-sm"></span>
                        <span class="label-xs text-accent-soft-fg">SYSTEM BOOT INTRO TEST</span>
                    </div>
                    <h2 class="title-2xl">Intro-Choreografie & Sitzungs-Simulator</h2>
                </div>

                <div class="flex flex-wrap items-center gap-2.5">
                    <Button size="md" variant="solid" color="accent" onclick={() => startBoot("cold")}>
                        <ButtonIcon icon={Play} />
                        <ButtonLabel>Cold Boot starten</ButtonLabel>
                    </Button>

                    <Button size="md" variant="soft" color="base" onclick={() => startBoot("fast")}>
                        <ButtonIcon icon={Zap} />
                        <ButtonLabel>Fast Boot</ButtonLabel>
                    </Button>

                    <Button size="md" variant="soft" color="base" onclick={triggerSmartBoot}>
                        <ButtonIcon icon={Sparkles} />
                        <ButtonLabel>Smart-Start prüfen</ButtonLabel>
                    </Button>

                    <Button size="md" variant="ghost" color="base" onclick={resetStorageAndColdBoot}>
                        <ButtonIcon icon={RotateCcw} />
                        <ButtonLabel>Speicher Reset</ButtonLabel>
                    </Button>
                </div>
            </div>

            <div
                class="bg-elevation-2 rounded-2xl squircle-smooth p-4 flex flex-wrap items-center justify-between gap-4"
            >
                <div class="flex flex-wrap items-center gap-3">
                    <span class="label-sm">Bühnen-Layout (Ebene 2):</span>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <Button
                            size="sm"
                            variant={stageLayout === "row" ? "soft" : "ghost"}
                            color={stageLayout === "row" ? "accent" : "base"}
                            onclick={() => (stageLayout = "row")}
                        >
                            <ButtonIcon icon={Layers} />
                            <ButtonLabel>Option B: Architektonische Reihe</ButtonLabel>
                        </Button>
                        <Button
                            size="sm"
                            variant={stageLayout === "cluster" ? "soft" : "ghost"}
                            color={stageLayout === "cluster" ? "accent" : "base"}
                            onclick={() => (stageLayout = "cluster")}
                        >
                            <ButtonIcon icon={Layers} />
                            <ButtonLabel>Option A: Geografischer Cluster</ButtonLabel>
                        </Button>
                        <Button
                            size="sm"
                            variant={stageLayout === "realistic" ? "soft" : "ghost"}
                            color={stageLayout === "realistic" ? "accent" : "base"}
                            onclick={() => (stageLayout = "realistic")}
                        >
                            <ButtonIcon icon={Layers} />
                            <ButtonLabel>Option C: Realistisch (Deutschland)</ButtonLabel>
                        </Button>
                    </div>
                </div>

                <p class="description-xs">
                    Smart-Gedächtnis: <strong class="text-main font-500">{lastSmartDecision}</strong>
                </p>
            </div>
        </section>

        <!-- Island 2: Simulierte Arbeitsoberfläche (Fracht-Automatisierung) -->
        <section
            class="bg-elevation-1 shadow-sm border border-elevation-1 rounded-3xl squircle p-6 lg:p-8 flex flex-col gap-6"
        >
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                        <span class="label-xs text-weak">{TOOL_CATEGORY}</span>
                        <span class="dot-sm"></span>
                        <span class="label-xs text-weak">{TOOL_NAME}</span>
                    </div>
                    <h3 class="title-xl">Aktive Werkszufuhren & Frachtbelege</h3>
                </div>

                <div class="bg-elevation-2 rounded-full squircle-smooth p-1 flex flex-wrap items-center gap-1">
                    {#each ["Alle Werke", "Neumarkt", "Baruth", "Gütersloh", "Arnsberg", "Leutkirch"] as filterOption (filterOption)}
                        <Button
                            size="xs"
                            variant={selectedPlantFilter === filterOption ? "soft" : "ghost"}
                            color={selectedPlantFilter === filterOption ? "accent" : "base"}
                            onclick={() => (selectedPlantFilter = filterOption)}
                        >
                            <ButtonLabel>{filterOption}</ButtonLabel>
                        </Button>
                    {/each}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-elevation-2 rounded-2xl squircle-smooth p-5 flex flex-col gap-1">
                    <span class="description-xs">Heutiges Frachtvolumen</span>
                    <span class="title-2xl">205,5 Fm</span>
                </div>
                <div class="bg-elevation-2 rounded-2xl squircle-smooth p-5 flex flex-col gap-1">
                    <span class="description-xs">Verbundene Werke</span>
                    <span class="title-2xl">5 Standorte aktiv</span>
                </div>
                <div class="bg-elevation-2 rounded-2xl squircle-smooth p-5 flex flex-col gap-1">
                    <span class="description-xs">Automatisierungs-Status</span>
                    <div class="flex items-center gap-2">
                        <Check class="size-18px text-success-soft-fg" strokeWidth={2.5} />
                        <span class="title-lg">SAP-Abgleich synchron</span>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                {#each sampleShipments.filter((item) => selectedPlantFilter === "Alle Werke" || item.plant === selectedPlantFilter) as item (item.id)}
                    <div
                        class="bg-elevation-2 rounded-2xl squircle-smooth px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
                    >
                        <div class="flex items-center gap-3.5">
                            <Truck class="size-18px text-weak shrink-0" strokeWidth={2} />
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="label-sm">{item.plant}</span>
                                    <span class="dot-sm"></span>
                                    <span class="description-xs">{item.id}</span>
                                </div>
                                <span class="description-sm">{item.assortment}</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-4">
                            <span class="description-sm">{item.carrier}</span>
                            <span class="label-sm">{item.volume}</span>
                            <span
                                class="px-3 py-1 rounded-full squircle-smooth text-xs font-500 {item.status ===
                                'Freigegeben'
                                    ? 'bg-success-soft text-success-soft-fg'
                                    : 'bg-base-soft text-base-soft-fg'}"
                            >
                                {item.status}
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    </div>
</div>

<!-- Ebene 1 bis 4: Das Vollbild-Intro-Overlay -->
{#if phase !== "idle"}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="boot-stage fixed inset-0 z-50 flex-center overflow-hidden select-none"
        data-phase={phase}
        data-mode={bootMode}
        onclick={skipBoot}
    >
        <!-- Dauerhafte, zweizeilige Tool-Identität oben (Eyebrow + klarer Tool-Titel) -->
        <div class="absolute top-12 inset-x-0 flex flex-col items-center gap-1 pointer-events-none px-6">
            <span class="text-xs font-600 tracking-widest text-weak uppercase">{TOOL_CATEGORY}</span>
            <h2 class="title-xl sm:title-2xl">{TOOL_NAME}</h2>
        </div>

        <!-- Ebene 2: Die Karten- & Standort-Bühne (Zentrum) -->
        <div class="boot-map-layer relative w-full max-w-5xl px-6 -translate-y-4">
            {#if stageLayout === "row"}
                <!-- Option B: Architektonische Reihe (5 Standorte nebeneinander + Name clean darunter) -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 items-end">
                    {#each BOOT_SEQUENCE as locId, index (locId)}
                        {const loc = WORK_LOCATIONS[locId]}
                        {let isLocked = $derived(lockedCount > index)}
                        <div
                            class="boot-location-card flex flex-col items-center gap-4"
                            style="--stagger-ms: {index * 50}ms;"
                            data-locked={isLocked ? "" : undefined}
                        >
                            <div class="relative w-full max-w-165px aspect-square flex-center">
                                <div class="relative w-full">
                                    <WorkLocation location={locId} marker class="boot-location-svg w-full h-auto" />

                                    <div
                                        class="boot-pin-anchor"
                                        style="left: {loc.marker.xPercent}%; top: {loc.marker.yPercent}%;"
                                        data-active={isLocked ? "" : undefined}
                                    >
                                        <span class="boot-sonar-ring"></span>
                                    </div>
                                </div>
                            </div>

                            <span class="boot-location-name">
                                {loc.label}
                            </span>
                        </div>
                    {/each}
                </div>
            {:else}
                <!-- Option A (Cluster) & Option C (Realistische Deutschland-Topologie) -->
                <div
                    class="relative w-full mx-auto {stageLayout === 'realistic'
                        ? 'h-480px max-w-720px'
                        : 'h-450px max-w-620px'}"
                >
                    {#each BOOT_SEQUENCE as locId, index (locId)}
                        {const loc = WORK_LOCATIONS[locId]}
                        {let pos = $derived(
                            stageLayout === "realistic"
                                ? REALISTIC_GERMANY_POSITIONS[locId]
                                : GEO_CLUSTER_POSITIONS[locId]
                        )}
                        {let isLocked = $derived(lockedCount > index)}
                        <div
                            class="boot-location-card absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5"
                            style="left: {pos.x}%; top: {pos.y}%; width: {pos.width}; --stagger-ms: {index * 50}ms;"
                            data-locked={isLocked ? "" : undefined}
                        >
                            <div class="relative w-full">
                                <WorkLocation location={locId} marker class="boot-location-svg w-full h-auto" />

                                <div
                                    class="boot-pin-anchor"
                                    style="left: {loc.marker.xPercent}%; top: {loc.marker.yPercent}%;"
                                    data-active={isLocked ? "" : undefined}
                                >
                                    <span class="boot-sonar-ring"></span>
                                </div>
                            </div>

                            <span class="boot-location-name">
                                {loc.label}
                            </span>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Ebene 3: Nur das Pfleiderer-Logo für sich, zentriert & höher positioniert -->
        <div class="boot-brand-layer absolute inset-0 flex-center pointer-events-none">
            <div class="boot-brand-content -translate-y-12">
                <img src={logoUrl} alt="Pfleiderer" class="h-14 sm:h-18 md:h-20 w-auto object-contain" />
            </div>
        </div>

        <!-- Ebene 4: Das ruhige, markante Lade-HUD unten -->
        <div class="boot-hud absolute bottom-16 inset-x-0 flex flex-col items-center gap-3 px-6 pointer-events-none">
            <div class="boot-progress-track w-280px sm:w-320px h-1.5 rounded-full overflow-hidden">
                <div class="boot-progress-bar h-full rounded-full" style="width: {progress}%;"></div>
            </div>

            <span class="text-xs font-600 tracking-widest text-weak uppercase"> Initialisiere Anwendung... </span>
        </div>

        <!-- Dezente Signatur am unteren Rand -->
        <div class="absolute bottom-5 inset-x-0 flex-center pointer-events-none px-6">
            <span class="text-xs text-weaker">Entwickelt von Colin Schäfer</span>
        </div>
    </div>
{/if}

<style>
    /* =========================================================
     * EBENE 0: APPLIKATION IM HINTERGRUND
     * ========================================================= */
    .app-workspace {
        transition:
            scale 320ms var(--cs-ease-expo-out),
            opacity 320ms var(--cs-ease-quad-out);

        &[data-boot-state="background"] {
            opacity: 0.45;
            scale: 0.98;
            pointer-events: none;
        }

        &[data-boot-state="entering"],
        &[data-boot-state="ready"] {
            opacity: 1;
            scale: 1;
        }
    }

    /* =========================================================
     * EBENE 1: INTRO STAGE (HINTERGRUND & VORHANG-ZOOM)
     * ========================================================= */
    .boot-stage {
        --_speed: 1;
        background-color: var(--cs-color-elevation-0);
        transition:
            opacity calc(300ms * var(--_speed)) var(--cs-ease-quad-out),
            scale calc(300ms * var(--_speed)) var(--cs-ease-expo-out);
        cursor: pointer;

        &[data-mode="fast"] {
            --_speed: 0.4;
        }

        /* Phase 4: Sofortige Klick-Freigabe & 100% -> 104% Zoom auf den Betrachter */
        &[data-phase="curtain"] {
            opacity: 0;
            scale: 1.04;
            pointer-events: none;
        }
    }

    /* =========================================================
     * EBENE 2: KARTEN- & STANDORT-BÜHNE (MODERN ACCENT STYLING)
     * ========================================================= */
    .boot-map-layer {
        transition:
            scale calc(460ms * var(--_speed)) var(--cs-ease-expo-out),
            opacity calc(460ms * var(--_speed)) var(--cs-ease-quad-out),
            filter calc(460ms * var(--_speed)) var(--cs-ease-quad-out);

        /* Phase 3: Karte tritt als edles Wasserzeichen in den Hintergrund zurück */
        .boot-stage[data-phase="brand"] &,
        .boot-stage[data-phase="curtain"] & {
            opacity: 0.14;
            filter: blur(4px);
            scale: 0.96;
        }
    }

    .boot-location-card :global(.boot-location-svg) {
        --cs-work-location-stroke: var(--cs-color-accent-500);
        --cs-work-location-fill: transparent;
        --cs-work-location-stroke-width: 9px;

        /* Clean Accent Marker direkt im SVG (ohne Elevation-1-Rand) */
        --cs-work-location-marker-fill: var(--cs-color-accent-500);
        --cs-work-location-marker-stroke: none;
        --cs-work-location-marker-stroke-width: 0px;
        --cs-work-location-marker-radius: 36px;
        --cs-work-location-marker-scale: 0;
    }

    .boot-location-card :global(.cs-work-location-map) {
        stroke-dasharray: 1;
        stroke-dashoffset: 1;
        transition:
            fill calc(280ms * var(--_speed)) var(--cs-ease-quad-out),
            stroke calc(280ms * var(--_speed)) var(--cs-ease-quad-out);
        animation: cad-draw calc(850ms * var(--_speed)) var(--cs-ease-cubic-out) forwards;
        animation-delay: var(--stagger-ms, 0ms);
    }

    .boot-location-card :global(.cs-work-location-marker) {
        transition: scale calc(280ms * var(--_speed)) var(--cs-spring-release);
    }

    /* Sobald das Werk einlockt: moderner Accent-Look + SVG-Marker ploppt auf */
    .boot-location-card[data-locked] :global(.boot-location-svg) {
        --cs-work-location-stroke: var(--cs-color-accent-500);
        --cs-work-location-fill: var(--cs-color-accent-soft);
        --cs-work-location-marker-scale: 1;
    }

    @keyframes cad-draw {
        to {
            stroke-dashoffset: 0;
        }
    }

    /* Cleanes Standort-Label unterhalb jeder Karte */
    .boot-location-name {
        color: var(--cs-color-text-strong);
        font-size: var(--cs-text-xs);
        font-weight: 600;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0;
        translate: 0 6px;
        transition:
            opacity calc(240ms * var(--_speed)) var(--cs-ease-quad-out),
            translate calc(280ms * var(--_speed)) var(--cs-ease-expo-out);

        .boot-location-card[data-locked] & {
            opacity: 1;
            translate: 0 0;
        }
    }

    /* =========================================================
     * SONAR-IMPULS RING (PHASE 2)
     * ========================================================= */
    .boot-pin-anchor {
        position: absolute;
        width: 0;
        height: 0;
        pointer-events: none;
    }

    .boot-sonar-ring {
        position: absolute;
        top: 0;
        left: 0;
        width: 12px;
        height: 12px;
        border: 1.5px solid var(--cs-color-accent-500);
        border-radius: var(--cs-radius-full);
        opacity: 0;
        translate: -50% -50%;
        scale: 1;

        .boot-pin-anchor[data-active] & {
            animation: sonar-pulse calc(560ms * var(--_speed)) var(--cs-ease-expo-out) forwards;
        }
    }

    @keyframes sonar-pulse {
        0% {
            opacity: 0.85;
            scale: 1;
        }

        100% {
            opacity: 0;
            scale: 3.6;
        }
    }

    /* =========================================================
     * EBENE 3: BRAND-FOKUS (NUR PFLEIDERER-LOGO, PHASE 3)
     * ========================================================= */
    .boot-brand-content {
        opacity: 0;
        filter: blur(6px);
        scale: 0.97;
        transition:
            opacity calc(380ms * var(--_speed)) var(--cs-ease-quad-out),
            scale calc(420ms * var(--_speed)) var(--cs-ease-expo-out),
            filter calc(420ms * var(--_speed)) var(--cs-ease-expo-out);

        .boot-stage[data-phase="brand"] &,
        .boot-stage[data-phase="curtain"] & {
            opacity: 1;
            filter: blur(0);
            scale: 1;
        }
    }

    /* =========================================================
     * EBENE 4: LADE-HUD
     * ========================================================= */
    .boot-progress-track {
        background-color: light-dark(var(--cs-color-base-200), var(--cs-color-base-800));
    }

    .boot-progress-bar {
        background-color: var(--cs-color-accent-500);
        transition: width 220ms var(--cs-ease-quad-out);
    }
</style>
