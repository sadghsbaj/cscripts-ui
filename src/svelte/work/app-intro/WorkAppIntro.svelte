<!--
@component
Full-screen 4-act boot choreography wrapper (`<WorkAppIntro />`) for internal work applications.

Architectural Notes:
- CSS-Driven Staggering: JavaScript only advances high-level `data-phase` states (`cad` -> `lock` -> `brand` -> `curtain` -> `idle`).
  Per-location delays (`--_cad-delay`, `--_lock-delay`) and progress bar steps are computed purely in CSS via `--_index`.
- Spatial Depth Handshake: While the intro is active, `.cs-work-app-intro-workspace` holds the wrapped application at `scale: 0.98`.
  During `curtain`, the overlay zooms out to `1.04` while the workspace scales up to `1.0`. Once `idle` is reached, no transform
  remains on the workspace so `position: fixed` descendants inside the app behave normally.
-->
<script lang="ts">
    import { onDestroy, onMount } from "svelte";

    import { WORK_LOCATIONS } from "../locations/index.ts";
    import WorkLocation from "../locations/WorkLocation.svelte";
    import WorkLogo from "../logo/WorkLogo.svelte";
    import { setWorkAppIdentity, type WorkAppIntroProps } from "./index.ts";
    import { BOOT_SEQUENCE, workAppIntroState } from "./workAppIntroState.svelte";

    let { toolCategory, toolName, persist = true, children, ...rest }: WorkAppIntroProps = $props();

    setWorkAppIdentity({
        get toolCategory() {
            return toolCategory;
        },
        get toolName() {
            return toolName;
        },
    });

    onMount(() => {
        if (persist) {
            workAppIntroState.triggerSmartBoot();
        } else {
            workAppIntroState.startBoot("cold");
        }
    });

    onDestroy(() => {
        workAppIntroState.destroy();
    });
</script>

<svelte:window onkeydown={workAppIntroState.handleKeyDown} />

<div class="cs-work-app-intro-workspace" data-phase={workAppIntroState.phase}>
    {@render children?.()}
</div>

{#if workAppIntroState.phase !== "idle"}
    <div {...rest} onclick={workAppIntroState.skipBoot} class="cs-work-app-intro" data-phase={workAppIntroState.phase}>
        <div class="cs-work-app-intro-tool-identity">
            <span class="cs-work-app-intro-tool-category">{toolCategory}</span>
            <h2 class="cs-work-app-intro-tool-name">{toolName}</h2>
        </div>

        <div class="cs-work-app-intro-map-layer">
            {#each BOOT_SEQUENCE as locationId (locationId)}
                {const location = WORK_LOCATIONS[locationId]}

                <div class="cs-work-app-intro-location-card" data-location={location.id}>
                    <div class="cs-work-app-intro-location-figure">
                        <WorkLocation location={location.id} marker />

                        <div
                            class="cs-work-app-intro-pin-anchor"
                            style="left: {location.marker.xPercent}%; top: {location.marker.yPercent}%;"
                        >
                            <span class="cs-work-app-intro-sonar-ring"></span>
                        </div>
                    </div>

                    <span class="cs-work-app-intro-location-name">
                        {location.label}
                    </span>
                </div>
            {/each}
        </div>

        <!-- Act 3: Centered brand logo layer (elevated slightly above vertical center) -->
        <div class="cs-work-app-intro-brand-layer">
            <div class="cs-work-app-intro-brand-content">
                <WorkLogo class="cs-work-app-intro-brand-logo" />
            </div>
        </div>

        <!-- Bottom loading HUD -->
        <div class="cs-work-app-intro-hud">
            <div class="cs-work-app-intro-progress-track">
                <div class="cs-work-app-intro-progress-bar"></div>
            </div>

            <span class="cs-work-app-intro-progress-text"> Initialisiere Anwendung... </span>
        </div>

        <!-- Subtle footer signature -->
        <div class="cs-work-app-intro-signature">
            <span class="cs-work-app-intro-signature-text">Entwickelt von Colin Schäfer</span>
        </div>
    </div>
{/if}

<style>
    @layer components.composite {
        /* =========================================================
        * STAGE & WORKSPACE HANDSHAKE (ACT 4 CURTAIN)
        * ---------------------------------------------------------
        * Coordinates the camera-through-curtain depth transition:
        * the intro overlay zooms towards the viewer (1 -> 1.04) while
        * the recessed app workspace (0.98 -> 1.0) steps into focus.
        * ========================================================= */
        .cs-work-app-intro {
            position: fixed;
            inset: 0;
            z-index: 50;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background-color: var(--cs-color-elevation-0);
            user-select: none;
            transition:
                opacity 300ms var(--cs-ease-quad-out),
                scale 300ms var(--cs-ease-expo-out);

            &[data-phase="curtain"] {
                opacity: 0;
                scale: 1.04;
                pointer-events: none;
            }
        }

        .cs-work-app-intro-workspace {
            width: 100%;
            height: 100%;

            transition:
                scale 320ms var(--cs-ease-expo-out),
                opacity 320ms var(--cs-ease-quad-out);

            &:is([data-phase="cad"], [data-phase="lock"], [data-phase="brand"]) {
                opacity: 0.45;
                scale: 0.98;
                pointer-events: none;
            }
        }

        /* =========================================================
        * TOOL IDENTITY
        * ========================================================= */
        .cs-work-app-intro-tool-identity {
            position: absolute;
            top: 48px;
            inset-inline: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: center;
            padding-inline: 24px;
            pointer-events: none;
        }

        .cs-work-app-intro-tool-category {
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-sm);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: var(--cs-tracking-widest);
        }

        .cs-work-app-intro-tool-name {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-2xl);
            font-weight: 700;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-tight);
        }

        /* =========================================================
        * LOCATIONS (ACT 1 CAD DRAW & ACT 2 LOCK-IN)
        * ========================================================= */
        .cs-work-app-intro-map-layer {
            position: relative;
            margin-inline: auto;
            width: 100%;
            max-width: var(--cs-container-5xl);
            height: 480px;
            padding-inline: 24px;
            translate: 0 -16px;

            transition:
                scale 460ms var(--cs-ease-expo-out),
                opacity 460ms var(--cs-ease-quad-out),
                filter 460ms var(--cs-ease-quad-out);

            /* Act 3: Recede map into a soft watermark behind the brand logo */
            .cs-work-app-intro:is([data-phase="brand"], [data-phase="curtain"]) & {
                opacity: 0.14;
                filter: blur(4px);
                scale: 0.96;
            }
        }

        .cs-work-app-intro-location-card {
            /* Stagger timings derived per card from its `--_index` (0..4) */
            --_cad-delay: calc(var(--_index) * 55ms);
            --_lock-delay: calc(var(--_index) * 85ms);

            position: absolute;
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: center;
            translate: -50% -50%;

            /**
            * Realistic Germany compass & latitude/longitude topology with harmonized spacing:
            * - Baruth/Mark (52.05°N, 13.50°E)
            * - Gütersloh (51.90°N, 8.38°E)  
            * - Arnsberg (51.39°N, 8.06°E)  
            * - Neumarkt (49.28°N, 11.46°E)  
            * - Leutkirch (47.82°N, 10.02°E)  
            */
            &[data-location="neumarkt"] {
                --_index: 0;
                top: 59%;
                left: 65%;
                width: 155px;
            }
            &[data-location="baruth"] {
                --_index: 1;
                top: 15%;
                left: 77%;
                width: 160px;
            }
            &[data-location="guetersloh"] {
                --_index: 2;
                top: 17%;
                left: 29%;
                width: 138px;
            }
            &[data-location="arnsberg"] {
                --_index: 3;
                top: 50%;
                left: 20%;
                width: 155px;
            }
            &[data-location="leutkirch"] {
                --_index: 4;
                top: 82%;
                left: 44%;
                width: 132px;
            }

            :global(.cs-work-location) {
                --cs-work-location-stroke: var(--cs-color-accent-500);
                --cs-work-location-fill: transparent;
                --cs-work-location-stroke-width: 9px;
                --cs-work-location-marker-fill: var(--cs-color-accent-500);
                --cs-work-location-marker-stroke: none;
                --cs-work-location-marker-stroke-width: 0px;
                --cs-work-location-marker-radius: 36px;
                --cs-work-location-marker-scale: 0;
                width: 100%;
                height: auto;

                .cs-work-app-intro:is([data-phase="lock"], [data-phase="brand"], [data-phase="curtain"]) & {
                    --cs-work-location-fill: var(--cs-color-accent-soft);
                    --cs-work-location-marker-scale: 1;
                }
            }

            /* `WorkLocation` normalizes path length via `pathLength="1"`, allowing a 0..1 dasharray draw */
            :global(.cs-work-location-map) {
                stroke-dasharray: 1;
                stroke-dashoffset: 1;
                transition: fill 280ms var(--cs-ease-quad-out) var(--_lock-delay);
                animation: cs-work-app-intro-cad-draw 850ms var(--cs-ease-cubic-out) var(--_cad-delay) forwards;
            }

            :global(.cs-work-location-marker) {
                transition: scale 280ms var(--cs-spring-release) var(--_lock-delay);
            }
        }

        /* Must remain at top level of `@layer components.composite` (nested `@keyframes` inside rules are ignored) */
        @keyframes cs-work-app-intro-cad-draw {
            to {
                stroke-dashoffset: 0;
            }
        }

        .cs-work-app-intro-location-figure {
            position: relative;
            width: 100%;
        }

        .cs-work-app-intro-location-name {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-xs);
            font-weight: 600;
            line-height: var(--cs-leading-none);
            text-transform: uppercase;
            letter-spacing: var(--cs-tracking-widest);
            opacity: 0;
            translate: 0 6px;
            transition:
                opacity 240ms var(--cs-ease-quad-out) var(--_lock-delay),
                translate 280ms var(--cs-ease-expo-out) var(--_lock-delay);

            .cs-work-app-intro:is([data-phase="lock"], [data-phase="brand"], [data-phase="curtain"]) & {
                opacity: 1;
                translate: 0 0;
            }
        }

        .cs-work-app-intro-pin-anchor {
            position: absolute;
            width: 0;
            height: 0;
            pointer-events: none;
        }

        .cs-work-app-intro-sonar-ring {
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

            .cs-work-app-intro:is([data-phase="lock"], [data-phase="brand"], [data-phase="curtain"]) & {
                animation: sonar-pulse 560ms var(--cs-ease-expo-out) var(--_lock-delay) forwards;
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
        * BRAND (ACT 3 FOCUS)
        * ========================================================= */
        .cs-work-app-intro-brand-layer {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }

        .cs-work-app-intro-brand-content {
            opacity: 0;
            filter: blur(6px);
            translate: 0 -48px;
            scale: 0.97;
            transition:
                opacity 380ms var(--cs-ease-quad-out),
                scale 420ms var(--cs-ease-expo-out),
                filter 420ms var(--cs-ease-expo-out);

            .cs-work-app-intro:is([data-phase="brand"], [data-phase="curtain"]) & {
                opacity: 1;
                filter: blur(0);
                scale: 1;
            }
        }

        :global(.cs-work-app-intro-brand-logo) {
            width: auto;
            height: 80px;
            object-fit: contain;
        }

        /* =========================================================
        * HUD & PHASE-DRIVEN PROGRESS BAR
        * ========================================================= */
        .cs-work-app-intro-hud {
            position: absolute;
            bottom: 64px;
            inset-inline: 0;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;
            padding-inline: 24px;
            pointer-events: none;
        }

        .cs-work-app-intro-progress-track {
            width: 320px;
            height: 6px;
            overflow: hidden;
            background-color: light-dark(var(--cs-color-base-200), var(--cs-color-base-800));
            border-radius: var(--cs-radius-full);
        }

        .cs-work-app-intro-progress-bar {
            width: 0%;
            height: 100%;
            background-color: var(--cs-color-accent-500);
            border-radius: var(--cs-radius-full);

            /* `@starting-style` ensures initial mount in `cad` phase interpolates smoothly from 0% -> 25% */
            .cs-work-app-intro[data-phase="cad"] & {
                width: 25%;
                transition: width 550ms var(--cs-ease-quad-out);

                @starting-style {
                    width: 0%;
                }
            }

            .cs-work-app-intro[data-phase="lock"] & {
                width: 75%;
                transition: width 900ms var(--cs-ease-quad-out);
            }

            .cs-work-app-intro:is([data-phase="brand"], [data-phase="curtain"]) & {
                width: 100%;
                transition: width 320ms var(--cs-ease-expo-out);
            }
        }

        .cs-work-app-intro-progress-text {
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: var(--cs-tracking-widest);
        }

        /* =========================================================
        * SIGNATURE
        * ========================================================= */
        .cs-work-app-intro-signature {
            position: absolute;
            bottom: 20px;
            inset-inline: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
        }

        .cs-work-app-intro-signature-text {
            color: var(--cs-color-text-weaker);
            font-size: var(--cs-text-xs);
        }
    }
</style>
