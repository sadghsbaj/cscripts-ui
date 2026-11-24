<script lang="ts">
    import { Ban, CircleHelp, Folder, LoaderCircle, Lock, Plus, RotateCcw } from "@lucide/svelte";

    import { Button, ButtonIcon, ButtonLabel } from "../../modules/button/index.ts";
    import { focusTrap as attachFocusTrap } from "../../modules/focus/index.ts";
    import { HitArea } from "../../modules/hit-area/index.ts";
    import { Popover, popoverTrigger } from "../../modules/popover/index.ts";
    import { tooltip } from "../../modules/tooltip/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { getWorkAppIdentity } from "../app-intro/index.ts";
    import type { WorkWorkspaceGateProps } from "./index.ts";

    function readWorkAppIdentity(): { toolName: string } | undefined {
        try {
            return getWorkAppIdentity();
        } catch {
            return undefined;
        }
    }

    let {
        ref = $bindable(null),
        status,
        directoryName,
        busy = false,
        errorMessage,
        appName,
        onselect,
        ongrant,
        onanimationend,
        class: className,
        ...rest
    }: WorkWorkspaceGateProps = $props();

    const identity = readWorkAppIdentity();
    const resolvedAppName = $derived(appName ?? identity?.toolName);

    const uid = $props.id();
    const titleId = `${uid}-title`;
    const descId = `${uid}-desc`;
    const infoPopoverId = `${uid}-info`;
    const isGateVisible = $derived(status !== "ready");

    let infoPopoverRef = $state<HTMLDivElement | null>(null);
    let isBlocked = $state(false);
    let blockedTimer: ReturnType<typeof setTimeout> | null = null;
    let blockedRafId: number | null = null;

    function clearBlockedTimer(): void {
        if (blockedTimer !== null) {
            clearTimeout(blockedTimer);
            blockedTimer = null;
        }
        if (blockedRafId !== null && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(blockedRafId);
            blockedRafId = null;
        }
    }

    function startBlockedPulse(): void {
        isBlocked = true;
        blockedTimer = setTimeout(() => {
            isBlocked = false;
            blockedTimer = null;
        }, 320);
    }

    export function nudge(): void {
        const wasBlocked = isBlocked;
        clearBlockedTimer();

        if (!wasBlocked) {
            startBlockedPulse();
            return;
        }

        // Wait one frame so Svelte flushes data-blocked removal before restarting the keyframe.
        isBlocked = false;
        if (typeof requestAnimationFrame === "function") {
            blockedRafId = requestAnimationFrame(() => {
                blockedRafId = null;
                startBlockedPulse();
            });
        } else {
            blockedTimer = setTimeout(startBlockedPulse, 0);
        }
    }

    function handleAnimationEnd(
        event: AnimationEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onanimationend?.(event);
        if (event.target === event.currentTarget && isBlocked) {
            clearBlockedTimer();
            isBlocked = false;
        }
    }

    $effect(() => clearBlockedTimer);

    const titleCopy = $derived.by(() => {
        switch (status) {
            case "unlinked": {
                return t({ de: "Arbeitsordner wählen", en: "Select workspace folder" });
            }
            case "needs-permission": {
                return t({ de: "Ordner freigeben", en: "Grant folder access" });
            }
            case "stale": {
                return t({ de: "Ordner nicht gefunden", en: "Folder unavailable" });
            }
            case "unsupported": {
                return t({ de: "Browser nicht unterstützt", en: "Browser not supported" });
            }
            case "restoring": {
                return t({ de: "Arbeitsbereich wird geladen...", en: "Restoring workspace..." });
            }
            default: {
                return "";
            }
        }
    });

    const descriptionCopy = $derived.by(() => {
        switch (status) {
            case "unlinked": {
                return t(
                    resolvedAppName
                        ? {
                              de: `Wähle den Ordner, in dem die Daten für ${resolvedAppName} sicher gespeichert werden.`,
                              en: `Choose the folder where data for ${resolvedAppName} is stored safely.`,
                          }
                        : {
                              de: "Wähle den Ordner, in dem die Daten sicher gespeichert werden.",
                              en: "Choose the folder where data is stored safely.",
                          },
                );
            }
            case "needs-permission": {
                return t({
                    de: "Bestätige den Zugriff für diesen Ordner, um weiterzuarbeiten.",
                    en: "Confirm access to this folder to continue working.",
                });
            }
            case "stale": {
                return t({
                    de: "Der zuletzt verwendete Ordner ist nicht mehr verfügbar.",
                    en: "The previously used folder is no longer available.",
                });
            }
            case "unsupported": {
                return t({
                    de: "Dieser Browser unterstützt keinen direkten Ordnerzugriff. Bitte nutze Chrome oder Edge.",
                    en: "This browser does not support direct folder access. Please use Chrome or Edge.",
                });
            }
            case "restoring": {
                return t({
                    de: "Der gespeicherte Arbeitsordner wird vorbereitet.",
                    en: "Preparing your saved workspace folder.",
                });
            }
            default: {
                return "";
            }
        }
    });

    const trimmedFolderName = $derived(directoryName?.trim() ?? "");
    const showFolderPill = $derived(
        trimmedFolderName.length > 0 && (status === "needs-permission" || status === "stale"),
    );
    const trimmedError = $derived(errorMessage?.trim() ?? "");
</script>

{#if isGateVisible}
    <div
        bind:this={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        {...rest}
        {@attach attachFocusTrap({
            enabled: () => isGateVisible && Boolean(ref?.closest(".cs-overlay")),
            initialFocus: "first-focusable",
            fallbackFocus: "self",
            restoreFocus: true,
            // Let pointerdown reach the enclosing Overlay backdrop so Overlay.onclick triggers nudge().
            allowOutsideClick: (event) =>
                event.target instanceof Element && event.target === ref?.closest(".cs-overlay"),
            onEscape: () => {
                // focusTrap intercepts Escape before native popover light-dismissal, so close it explicitly.
                if (infoPopoverRef?.matches(":popover-open")) {
                    infoPopoverRef.hidePopover();
                    return;
                }
                nudge();
            },
        })}
        onanimationend={handleAnimationEnd}
        class={["cs-work-workspace-gate", className]}
        data-status={status}
        data-busy={busy ? "" : undefined}
        data-blocked={isBlocked ? "" : undefined}
    >
        <div class="cs-work-workspace-gate-stage" aria-hidden="true">
            <div class="cs-work-workspace-gate-stage-halo"></div>

            <svg
                class="cs-work-workspace-gate-folder"
                viewBox="0 0 56 44"
                width="56"
                height="44"
                fill="none"
            >
                <path
                    class="cs-work-workspace-gate-folder-back"
                    d="M6 10.5C6 8.01472 8.01472 6 10.5 6H20.1716C21.2324 6 22.2499 6.42143 23 7.17157L25.4142 9.58579C26.1644 10.3359 27.1818 10.7574 28.2426 10.7574H45.5C47.9853 10.7574 50 12.7721 50 15.2574V33.5C50 35.9853 47.9853 38 45.5 38H10.5C8.01472 38 6 35.9853 6 33.5V10.5Z"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    class="cs-work-workspace-gate-folder-flap"
                    d="M6 17.5C6 15.567 7.567 14 9.5 14H46.5C48.433 14 50 15.567 50 17.5V33.5C50 35.9853 47.9853 38 45.5 38H10.5C8.01472 38 6 35.9853 6 33.5V17.5Z"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>

            <div class="cs-work-workspace-gate-badge">
                {#key status}
                    <span class="cs-work-workspace-gate-badge-glyph">
                        {#if status === "unlinked"}
                            <Plus size={14} strokeWidth={2.5} />
                        {:else if status === "needs-permission"}
                            <Lock size={14} strokeWidth={2.25} />
                        {:else if status === "stale"}
                            <RotateCcw size={14} strokeWidth={2.25} />
                        {:else if status === "unsupported"}
                            <Ban size={14} strokeWidth={2.25} />
                        {:else}
                            <LoaderCircle size={14} strokeWidth={2.25} class="cs-work-workspace-gate-spinner" />
                        {/if}
                    </span>
                {/key}
            </div>
        </div>

        <div class="cs-work-workspace-gate-header">
            <h2 id={titleId} class="cs-work-workspace-gate-title">
                {titleCopy}
            </h2>

            {#if showFolderPill}
                <div class="cs-work-workspace-folder-pill">
                    <Folder size={14} strokeWidth={2} class="cs-work-workspace-folder-pill-icon" />
                    <span class="cs-work-workspace-folder-pill-name text-trim-truncate">
                        {trimmedFolderName}
                    </span>
                </div>
            {/if}

            <p id={descId} class="cs-work-workspace-gate-description">
                {descriptionCopy}
            </p>
        </div>

        {#if trimmedError.length > 0}
            <p class="cs-work-workspace-gate-error" role="alert">
                {trimmedError}
            </p>
        {/if}

        {#if ["unlinked", "needs-permission", "stale"].includes(status)}
            <div class="cs-work-workspace-gate-actions">
                {#if status === "unlinked"}
                    <Button
                        variant="primary"
                        size="lg"
                        disabled={busy}
                        onclick={() => {
                            void onselect?.();
                        }}
                    >
                        <ButtonLabel>{t({ de: "Ordner wählen", en: "Select folder" })}</ButtonLabel>
                    </Button>
                {:else if status === "needs-permission"}
                    <Button
                        variant="primary"
                        size="lg"
                        disabled={busy}
                        onclick={() => {
                            void ongrant?.();
                        }}
                    >
                        <ButtonLabel>{t({ de: "Freigeben", en: "Grant access" })}</ButtonLabel>
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        disabled={busy}
                        onclick={() => {
                            void onselect?.();
                        }}
                    >
                        <ButtonLabel>{t({ de: "Wechseln", en: "Change" })}</ButtonLabel>
                    </Button>
                {:else if status === "stale"}
                    <Button
                        variant="primary"
                        size="lg"
                        disabled={busy}
                        onclick={() => {
                            void onselect?.();
                        }}
                    >
                        <ButtonLabel>{t({ de: "Neu wählen", en: "Select again" })}</ButtonLabel>
                    </Button>
                {/if}
            </div>
        {/if}

        <Button
            variant="ghost"
            size="xs"
            iconOnly
            class="cs-work-workspace-gate-info-trigger"
            aria-label={t({ de: "Warum ist das nötig?", en: "Why is this needed?" })}
            {@attach tooltip({ text: t({ de: "Warum ist das nötig?", en: "Why is this needed?" }) })}
            {@attach popoverTrigger({ target: infoPopoverId, triggerOn: "click" })}
        >
            <ButtonIcon icon={CircleHelp} />
            <HitArea size="md" />
        </Button>

        <Popover
            bind:ref={infoPopoverRef}
            id={infoPopoverId}
            placement="bottom-end"
            offset="8px"
            width="content"
            class="cs-work-workspace-gate-info"
        >
            <p class="cs-work-workspace-gate-info-title">
                {t({ de: "Warum ist das nötig?", en: "Why is this needed?" })}
            </p>
            <p class="cs-work-workspace-gate-info-body">
                {t({
                    de: "Browser dürfen ohne Erlaubnis nicht auf Dateien außerhalb zugreifen. Deshalb fragt der Browser regelmäßig danach, damit er auf die benötigten Daten zugreifen kann.",
                    en: "Browsers cannot access external files without permission. The browser asks regularly so it can access the required data.",
                })}
            </p>
        </Popover>
    </div>
{/if}

<style>
    @layer components.composite {
        .cs-work-workspace-gate {
            --cs-work-workspace-gate-bg: var(--cs-color-elevated);
            --cs-work-workspace-gate-fg: var(--cs-color-text-main);
            --cs-work-workspace-gate-shadow: var(--cs-shadow-floating);
            --cs-work-workspace-gate-radius: 28px;
            --cs-work-workspace-gate-squircle: var(--cs-squircle);
            --cs-work-workspace-gate-padding: 32px;
            --cs-work-workspace-gate-max-width: 460px;

            /* Stage state defaults (unlinked) */
            --cs-work-workspace-gate-halo-bg: var(--cs-color-accent-soft);
            --cs-work-workspace-gate-folder-stroke: var(--cs-color-accent-soft-fg);
            --cs-work-workspace-gate-folder-bg: color-mix(in oklab, var(--cs-color-accent-solid) 12%, transparent);
            --cs-work-workspace-gate-flap-transform: translateY(1.5px) scaleY(0.94);
            --cs-work-workspace-gate-badge-bg: var(--cs-color-accent-solid);
            --cs-work-workspace-gate-badge-fg: var(--cs-color-accent-solid-fg);

            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            inline-size: 100%;
            max-inline-size: var(--cs-work-workspace-gate-max-width);
            max-block-size: 100%;
            padding: var(--cs-work-workspace-gate-padding);
            overflow: clip;
            color: var(--cs-work-workspace-gate-fg);
            font-family: var(--cs-font-sans);
            background-color: var(--cs-work-workspace-gate-bg);
            border-radius: var(--cs-work-workspace-gate-radius);
            corner-shape: var(--cs-work-workspace-gate-squircle);
            box-shadow: var(--cs-work-workspace-gate-shadow);
            transform-origin: center center;

            @media (width < 640px) {
                --cs-work-workspace-gate-max-width: 100%;
                --cs-work-workspace-gate-padding: 24px;
                --cs-work-workspace-gate-radius: 24px;
            }

            /* =========================================================
             * STATE MORPH TOKENS
             * ========================================================= */
            &[data-status="needs-permission"] {
                --cs-work-workspace-gate-halo-bg: var(--cs-color-caution-soft);
                --cs-work-workspace-gate-folder-stroke: var(--cs-color-caution-soft-fg);
                --cs-work-workspace-gate-folder-bg: color-mix(in oklab, var(--cs-color-caution-solid) 12%, transparent);
                --cs-work-workspace-gate-flap-transform: translateY(0) scaleY(1);
                --cs-work-workspace-gate-badge-bg: var(--cs-color-caution-solid);
                --cs-work-workspace-gate-badge-fg: var(--cs-color-caution-solid-fg);
            }

            &[data-status="stale"] {
                --cs-work-workspace-gate-halo-bg: var(--cs-color-negative-soft);
                --cs-work-workspace-gate-folder-stroke: var(--cs-color-negative-soft-fg);
                --cs-work-workspace-gate-folder-bg: color-mix(in oklab, var(--cs-color-negative-solid) 10%, transparent);
                --cs-work-workspace-gate-flap-transform: rotate(-2deg);
                --cs-work-workspace-gate-badge-bg: var(--cs-color-negative-solid);
                --cs-work-workspace-gate-badge-fg: var(--cs-color-negative-solid-fg);
            }

            &[data-status="unsupported"] {
                --cs-work-workspace-gate-halo-bg: var(--cs-color-base-soft);
                --cs-work-workspace-gate-folder-stroke: var(--cs-color-disabled-fg);
                --cs-work-workspace-gate-folder-bg: transparent;
                --cs-work-workspace-gate-flap-transform: scaleY(0.96);
                --cs-work-workspace-gate-badge-bg: var(--cs-color-negative-solid);
                --cs-work-workspace-gate-badge-fg: var(--cs-color-negative-solid-fg);
            }

            &[data-status="restoring"] {
                --cs-work-workspace-gate-halo-bg: var(--cs-color-caution-soft);
                --cs-work-workspace-gate-folder-stroke: var(--cs-color-caution-soft-fg);
                --cs-work-workspace-gate-folder-bg: color-mix(in oklab, var(--cs-color-caution-solid) 10%, transparent);
                --cs-work-workspace-gate-flap-transform: translateY(0) scaleY(1);
                --cs-work-workspace-gate-badge-bg: var(--cs-color-caution-solid);
                --cs-work-workspace-gate-badge-fg: var(--cs-color-caution-solid-fg);
            }

            &[data-blocked] {
                animation: cs-work-workspace-gate-blocked var(--cs-dur-280) var(--cs-ease-quad-out);
            }
        }

        :global(.cs-overlay) .cs-work-workspace-gate {
            opacity: 0;
            scale: 0.96;
            translate: 0 4px;
            transition:
                opacity var(--cs-dur-exit-md) var(--cs-ease-exit),
                scale var(--cs-dur-exit-md) var(--cs-ease-exit),
                translate var(--cs-dur-exit-md) var(--cs-ease-exit);
        }

        :global(.cs-overlay:popover-open) .cs-work-workspace-gate {
            opacity: 1;
            scale: 1;
            translate: 0 0;
            will-change: opacity, scale, translate;
            transition:
                opacity var(--cs-dur-effect) var(--cs-ease-effect),
                scale var(--cs-dur-enter-md) var(--cs-ease-enter),
                translate var(--cs-dur-enter-md) var(--cs-ease-enter);
        }

        @starting-style {
            :global(.cs-overlay:popover-open) .cs-work-workspace-gate {
                opacity: 0;
                scale: 0.94;
                translate: 0 8px;
            }
        }

        /* =========================================================
         * TOP-RIGHT INFO TRIGGER & POPOVER
         * ========================================================= */
        .cs-work-workspace-gate > :global(.cs-work-workspace-gate-info-trigger) {
            position: absolute;
            inset-block-start: 16px;
            inset-inline-end: 16px;
            z-index: 2;
            color: var(--cs-color-text-weaker);

            @media (width < 640px) {
                inset-block-start: 12px;
                inset-inline-end: 12px;
            }

            &:hover,
            &:focus-visible {
                color: var(--cs-color-text-strong);
            }
        }

        :global(.cs-work-workspace-gate-info) {
            inline-size: 272px;
            padding: 14px 16px;
            text-align: start;
            line-height: round(up, calc(var(--cs-text-xs) * var(--cs-leading-normal)), 1px);
            background-color: var(--cs-color-elevated);
            border-radius: var(--cs-radius-2xl);
            corner-shape: var(--cs-squircle);
            box-shadow: var(--cs-shadow-floating);
        }

        .cs-work-workspace-gate-info-title {
            margin: 0;
            margin-block-end: 6px;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-xs);
            font-weight: 600;
            line-height: var(--cs-leading-snug);
        }

        .cs-work-workspace-gate-info-body {
            margin: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
        }

        /* =========================================================
         * MORPHING 120x88 STAGE
         * ========================================================= */
        .cs-work-workspace-gate-stage {
            position: relative;
            display: grid;
            place-items: center;
            inline-size: 120px;
            block-size: 88px;
            margin-block-end: 16px;
            flex-shrink: 0;
        }

        .cs-work-workspace-gate-stage-halo {
            grid-area: 1 / 1;
            inline-size: 88px;
            block-size: 72px;
            background-color: var(--cs-work-workspace-gate-halo-bg);
            border-radius: 22px;
            corner-shape: var(--cs-squircle);
            transition: background-color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-workspace-gate-folder {
            grid-area: 1 / 1;
            position: relative;
            z-index: 1;
            overflow: visible;
        }

        .cs-work-workspace-gate-folder-back {
            stroke: var(--cs-work-workspace-gate-folder-stroke);
            fill: none;
            transition: stroke var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-workspace-gate-folder-flap {
            stroke: var(--cs-work-workspace-gate-folder-stroke);
            fill: var(--cs-work-workspace-gate-folder-bg);
            transform-box: fill-box;
            transform-origin: 50% 100%;
            transform: var(--cs-work-workspace-gate-flap-transform);
            transition:
                transform var(--cs-dur-320) var(--cs-ease-enter),
                stroke var(--cs-dur-effect) var(--cs-ease-effect),
                fill var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-workspace-gate-badge {
            position: absolute;
            inset-block-end: 14px;
            inset-inline-end: 22px;
            z-index: 2;
            display: grid;
            place-items: center;
            inline-size: 26px;
            block-size: 26px;
            color: var(--cs-work-workspace-gate-badge-fg);
            background-color: var(--cs-work-workspace-gate-badge-bg);
            border-radius: var(--cs-radius-full);
            box-shadow: 0 0 0 3px var(--cs-work-workspace-gate-bg);
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-workspace-gate-badge-glyph {
            display: grid;
            place-items: center;
            opacity: 1;
            scale: 1;
            transition:
                opacity var(--cs-dur-effect) var(--cs-ease-effect),
                scale var(--cs-dur-320) var(--cs-ease-enter);

            @starting-style {
                opacity: 0;
                scale: 0.72;
            }
        }

        :global(.cs-work-workspace-gate-spinner) {
            animation: cs-work-workspace-gate-spin 1s linear infinite;
        }

        /* =========================================================
         * HEADER, FOLDER PILL, DESCRIPTION & ERROR
         * ========================================================= */
        .cs-work-workspace-gate-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .cs-work-workspace-gate-title {
            margin: 0;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-xl);
            font-weight: 700;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-tight);
        }

        .cs-work-workspace-folder-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            block-size: 28px;
            max-inline-size: 280px;
            padding-inline: 10px;
            background-color: var(--cs-color-sunken);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-shadow-sunken);
        }

        .cs-work-workspace-folder-pill > :global(.cs-work-workspace-folder-pill-icon) {
            flex-shrink: 0;
            color: var(--cs-color-text-weak);
        }

        .cs-work-workspace-folder-pill-name {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-xs);
            font-weight: 600;
        }

        .cs-work-workspace-gate[data-status="stale"] {
            & .cs-work-workspace-folder-pill > :global(.cs-work-workspace-folder-pill-icon) {
                color: var(--cs-color-negative-soft-fg);
            }

            & .cs-work-workspace-folder-pill-name {
                color: var(--cs-color-text-weak);
            }
        }

        .cs-work-workspace-gate-description {
            margin: 0;
            max-inline-size: 34ch;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-sm);
            line-height: var(--cs-leading-normal);
        }

        .cs-work-workspace-gate-error {
            margin: 12px 0 0;
            max-inline-size: 36ch;
            padding: 8px 12px;
            color: var(--cs-color-negative-soft-fg);
            font-size: var(--cs-text-xs);
            font-weight: 500;
            line-height: var(--cs-leading-snug);
            background-color: var(--cs-color-negative-soft);
            border-radius: var(--cs-radius-lg);
            corner-shape: var(--cs-squircle-soft);
        }

        /* =========================================================
         * ACTIONS
         * ========================================================= */
        .cs-work-workspace-gate-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-block-start: 24px;
        }

        @keyframes cs-work-workspace-gate-blocked {
            0% {
                translate: 0 0;
                scale: 1;
            }
            20% {
                translate: -5px 0;
                scale: 1.008;
            }
            45% {
                translate: 5px 0;
                scale: 1.008;
            }
            70% {
                translate: -3px 0;
                scale: 1.004;
            }
            85% {
                translate: 2px 0;
                scale: 1.002;
            }
            100% {
                translate: 0 0;
                scale: 1;
            }
        }

        @keyframes cs-work-workspace-gate-spin {
            to {
                rotate: 360deg;
            }
        }
    }
</style>
