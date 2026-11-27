<script lang="ts">
    import { Check, FileText, GitCompareArrows, Trash2 } from "@lucide/svelte";

    import { Button, ButtonLabel } from "../../modules/button/index.ts";
    import { focusTrap as attachFocusTrap } from "../../modules/focus/index.ts";
    import { ScrollArea, ScrollAreaContent } from "../../modules/scroll-area/index.ts";
    import { scrollFade } from "../../modules/scroll-fade/index.ts";
    import {
        SegmentedControl,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "../../modules/segmented-control/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import {
        formatConflictFieldLabel,
        formatConflictKindHint,
        formatConflictValue,
    } from "./conflict-format.internal.ts";
    import type {
        WorkConflictChoice,
        WorkConflictChoices,
        WorkConflictField,
        WorkConflictModalProps,
        WorkConflictSide,
    } from "./index.ts";

    function buildInitialChoices(
        list: readonly WorkConflictField[],
        initial: WorkConflictSide | null | undefined,
    ): WorkConflictChoices {
        if (!initial) return {};
        const next: WorkConflictChoices = {};
        for (const field of list) {
            next[field.id] = initial;
        }
        return next;
    }

    let {
        ref = $bindable(null),
        conflictKey,
        resourceLabel,
        title,
        description,
        localLabel,
        remoteLabel,
        remoteDeleted = false,
        fields,
        defaultChoice = null,
        showBaseValue = false,
        queuePosition = null,
        busy = false,
        errorMessage,
        onKeepLocal,
        onKeepRemote,
        onApplyChoices,
        renderValue,
        renderField,
        onanimationend,
        class: className,
        ...rest
    }: WorkConflictModalProps = $props();

    const uid = $props.id();
    const titleId = `${uid}-title`;
    const descId = `${uid}-desc`;

    const activeFields = $derived(fields ?? []);
    const isFieldMode = $derived(activeFields.length > 0);
    const trimmedResourceLabel = $derived(resourceLabel?.trim() ?? "");
    const trimmedError = $derived(errorMessage?.trim() ?? "");

    const resolvedLocalLabel = $derived(
        localLabel?.trim() || t({ de: "Dein Stand", en: "Your version" }),
    );
    const resolvedRemoteLabel = $derived(
        remoteLabel?.trim() || t({ de: "Aktueller Stand", en: "Current version" }),
    );

    const resolvedTitle = $derived.by(() => {
        const customTitle = title?.trim();
        if (customTitle) return customTitle;

        if (isFieldMode) {
            return t({ de: "Änderungen abgleichen", en: "Review conflicting changes" });
        }

        if (remoteDeleted) {
            return t({ de: "Eintrag gelöscht", en: "Entry deleted" });
        }

        return t({ de: "Änderungskonflikt", en: "Version conflict" });
    });

    const resolvedDescription = $derived.by(() => {
        const customDescription = description?.trim();
        if (customDescription) return customDescription;

        if (isFieldMode) {
            return t({
                de: "Dieser Eintrag wurde zwischenzeitlich geändert. Wähle für jedes Feld, welcher Stand übernommen werden soll.",
                en: "This entry was changed in the meantime. Choose which version to keep for each field.",
            });
        }

        if (remoteDeleted) {
            return t({
                de: "Dieser Eintrag wurde zwischenzeitlich gelöscht. Möchtest du deinen Stand behalten oder die Löschung übernehmen?",
                en: "This entry was deleted in the meantime. Do you want to keep your version or accept the deletion?",
            });
        }

        return t({
            de: "Dieser Eintrag wurde zwischenzeitlich geändert. Wähle, welcher Stand übernommen werden soll.",
            en: "This entry was changed in the meantime. Choose which version to keep.",
        });
    });

    const queueLabel = $derived.by(() => {
        if (!queuePosition || queuePosition.total <= 1) return null;
        return t({
            de: `${queuePosition.current} von ${queuePosition.total}`,
            en: `${queuePosition.current} of ${queuePosition.total}`,
        });
    });

    let choices = $state<WorkConflictChoices>({});
    let listRef = $state<HTMLDivElement | null>(null);

    // Reset per-field selections and list scroll position whenever a new conflict arrives.
    $effect.pre(() => {
        void conflictKey;
        const currentFields = activeFields;
        choices = buildInitialChoices(currentFields, defaultChoice);
        if (listRef) {
            listRef.scrollTop = 0;
        }
    });

    const resolvedCount = $derived.by(() => {
        let count = 0;
        for (const field of activeFields) {
            if (choices[field.id] !== undefined) {
                count += 1;
            }
        }
        return count;
    });

    const allFieldsResolved = $derived(
        activeFields.length > 0 && resolvedCount === activeFields.length,
    );
    const allLocal = $derived(
        allFieldsResolved && activeFields.every((field) => choices[field.id] === "local"),
    );
    const allRemote = $derived(
        allFieldsResolved && activeFields.every((field) => choices[field.id] === "remote"),
    );

    const applyCtaLabel = $derived.by(() => {
        if (allLocal) {
            return t({ de: "Eigenen Stand behalten", en: "Keep your version" });
        }
        if (allRemote) {
            return t({ de: "Aktuellen Stand übernehmen", en: "Use current version" });
        }
        return t({ de: "Auswahl übernehmen", en: "Apply selection" });
    });

    const selectionCounterLabel = $derived.by(() => {
        if (!isFieldMode || allFieldsResolved) return null;
        return t({
            de: `${resolvedCount} von ${activeFields.length} Feldern gewählt`,
            en: `${resolvedCount} of ${activeFields.length} fields selected`,
        });
    });

    function chooseField(fieldId: string, nextChoice: WorkConflictChoice): void {
        if (busy) return;
        choices = { ...choices, [fieldId]: nextChoice };
    }

    function selectAll(side: WorkConflictSide): void {
        if (busy) return;
        choices = buildInitialChoices(activeFields, side);
    }

    function handleOptionKeyDown(
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement },
        fieldId: string,
        side: WorkConflictSide,
    ): void {
        if (busy) return;

        if (side === "local" && (event.key === "ArrowRight" || event.key === "ArrowDown")) {
            event.preventDefault();
            chooseField(fieldId, "remote");
            const nextButton = event.currentTarget.nextElementSibling;
            if (nextButton instanceof HTMLButtonElement) {
                nextButton.focus();
            }
            return;
        }

        if (side === "remote" && (event.key === "ArrowLeft" || event.key === "ArrowUp")) {
            event.preventDefault();
            chooseField(fieldId, "local");
            const prevButton = event.currentTarget.previousElementSibling;
            if (prevButton instanceof HTMLButtonElement) {
                prevButton.focus();
            }
        }
    }

    function handleApplyFields(): void {
        if (busy || !allFieldsResolved) return;

        // Always route through onApplyChoices when provided so auto-merged sibling fields are preserved.
        if (onApplyChoices) {
            const snapshot: WorkConflictChoices = {};
            for (const field of activeFields) {
                const choice = choices[field.id];
                if (choice !== undefined) {
                    snapshot[field.id] = choice;
                }
            }
            void onApplyChoices(snapshot);
            return;
        }

        if (allLocal) {
            void onKeepLocal?.();
            return;
        }

        if (allRemote) {
            void onKeepRemote?.();
        }
    }

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
</script>

<div
    bind:this={ref}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    aria-describedby={descId}
    tabindex={-1}
    {...rest}
    {@attach attachFocusTrap({
        enabled: () => Boolean(ref?.closest(".cs-overlay")),
        initialFocus: "first-focusable",
        fallbackFocus: "self",
        restoreFocus: true,
        // Let pointerdown reach the enclosing Overlay backdrop so Overlay.onclick triggers nudge().
        allowOutsideClick: (event) =>
            event.target instanceof Element && event.target === ref?.closest(".cs-overlay"),
        onEscape: () => {
            nudge();
        },
    })}
    onanimationend={handleAnimationEnd}
    class={["cs-work-conflict-modal", className]}
    data-mode={isFieldMode ? "fields" : "simple"}
    data-remote-deleted={!isFieldMode && remoteDeleted ? "" : undefined}
    data-busy={busy ? "" : undefined}
    data-blocked={isBlocked ? "" : undefined}
>
    {#if !isFieldMode}
        {#if queueLabel}
            <span class="cs-work-conflict-queue cs-work-conflict-queue-corner">
                {queueLabel}
            </span>
        {/if}

        <div class="cs-work-conflict-stage" aria-hidden="true">
            <div class="cs-work-conflict-stage-halo"></div>

            <svg
                class="cs-work-conflict-sheets"
                viewBox="0 0 64 52"
                width="64"
                height="52"
                fill="none"
            >
                <g class="cs-work-conflict-sheet-back">
                    <rect
                        x="12"
                        y="7"
                        width="26"
                        height="34"
                        rx="5"
                        stroke-width="2"
                    />
                    <path
                        d="M18 16H32M18 22H29M18 28H26"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </g>

                <g class="cs-work-conflict-sheet-front">
                    <rect
                        x="25"
                        y="11"
                        width="26"
                        height="34"
                        rx="5"
                        stroke-width="2"
                    />
                    <path
                        d="M31 20H45M31 26H43M31 32H39"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </g>
            </svg>

            <div class="cs-work-conflict-badge">
                {#if remoteDeleted}
                    <Trash2 size={13} strokeWidth={2.25} />
                {:else}
                    <GitCompareArrows size={13} strokeWidth={2.25} />
                {/if}
            </div>
        </div>

        <div class="cs-work-conflict-simple-header">
            <h2 id={titleId} class="cs-work-conflict-simple-title">
                {resolvedTitle}
            </h2>

            {#if trimmedResourceLabel.length > 0}
                <div class="cs-work-conflict-resource-pill">
                    <FileText
                        size={14}
                        strokeWidth={2}
                        class="cs-work-conflict-resource-pill-icon"
                    />
                    <span class="cs-work-conflict-resource-pill-name text-trim-truncate">
                        {trimmedResourceLabel}
                    </span>
                </div>
            {/if}

            <p id={descId} class="cs-work-conflict-simple-description">
                {resolvedDescription}
            </p>
        </div>

        {#if trimmedError.length > 0}
            <p class="cs-work-conflict-error" role="alert">
                {trimmedError}
            </p>
        {/if}

        <div class="cs-work-conflict-actions">
            <Button
                variant="primary"
                size="lg"
                disabled={busy}
                onclick={() => {
                    void onKeepLocal?.();
                }}
            >
                <ButtonLabel>{t({ de: "Eigenen Stand behalten", en: "Keep your version" })}</ButtonLabel>
            </Button>

            {#if remoteDeleted}
                <Button
                    variant="tertiary"
                    negative
                    size="lg"
                    disabled={busy}
                    onclick={() => {
                        void onKeepRemote?.();
                    }}
                >
                    <ButtonLabel>{t({ de: "Löschung übernehmen", en: "Accept deletion" })}</ButtonLabel>
                </Button>
            {:else}
                <Button
                    variant="secondary"
                    size="lg"
                    disabled={busy}
                    onclick={() => {
                        void onKeepRemote?.();
                    }}
                >
                    <ButtonLabel>{t({ de: "Aktuellen Stand übernehmen", en: "Use current version" })}</ButtonLabel>
                </Button>
            {/if}
        </div>
    {:else}
        <div class="cs-work-conflict-fields-header">
            <div class="cs-work-conflict-emblem" aria-hidden="true">
                <GitCompareArrows size={18} strokeWidth={2.25} />
            </div>

            <div class="cs-work-conflict-fields-heading">
                <h2 id={titleId} class="cs-work-conflict-fields-title">
                    {resolvedTitle}
                </h2>
                <p id={descId} class="cs-work-conflict-fields-description">
                    {resolvedDescription}
                </p>
            </div>

            {#if queueLabel}
                <span class="cs-work-conflict-queue">
                    {queueLabel}
                </span>
            {/if}
        </div>

        {#if trimmedResourceLabel.length > 0}
            <div class="cs-work-conflict-meta">
                <div class="cs-work-conflict-resource-pill">
                    <FileText
                        size={14}
                        strokeWidth={2}
                        class="cs-work-conflict-resource-pill-icon"
                    />
                    <span class="cs-work-conflict-resource-pill-name text-trim-truncate">
                        {trimmedResourceLabel}
                    </span>
                </div>
            </div>
        {/if}

        {#if activeFields.length >= 3}
            <SegmentedControl
                size="sm"
                width="equal"
                disabled={busy}
                class="cs-work-conflict-quick-select"
                aria-label={t({ de: "Alle Felder wählen", en: "Select all fields" })}
                bind:value={
                    () => (allLocal ? "local" : allRemote ? "remote" : undefined),
                    (next) => {
                        if (next === "local" || next === "remote") {
                            selectAll(next);
                        }
                    }
                }
            >
                <SegmentedControlItem value="local">
                    <SegmentedControlLabel>{t({ de: `Alle: ${resolvedLocalLabel}`, en: `All: ${resolvedLocalLabel}` })}</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="remote">
                    <SegmentedControlLabel>{t({ de: `Alle: ${resolvedRemoteLabel}`, en: `All: ${resolvedRemoteLabel}` })}</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>
        {/if}

        <ScrollArea
            size="sm"
            direction="vertical"
            scrollbar="hover"
            class="cs-work-conflict-scroll-area"
        >
            <ScrollAreaContent
                bind:ref={listRef}
                class="cs-work-conflict-modal-list"
                {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
            >
            {#each activeFields as field (field.id)}
                {let fieldLabel = $derived(formatConflictFieldLabel(field))}
                {let currentChoice = $derived(choices[field.id])}
                {let kindHint = $derived(formatConflictKindHint(field.conflictKind))}
                {let fieldLabelId = $derived(`${uid}-field-${field.id}`)}

                {#if renderField}
                    {@render renderField({
                        field,
                        label: fieldLabel,
                        choice: currentChoice,
                        choose: (nextChoice) => chooseField(field.id, nextChoice),
                        disabled: busy,
                    })}
                {:else}
                    {let isLocalSelected = $derived(currentChoice === "local")}
                    {let isRemoteSelected = $derived(currentChoice === "remote")}
                    {let hasSideSelection = $derived(isLocalSelected || isRemoteSelected)}
                    {let formattedLocal = $derived(formatConflictValue(field.localValue))}
                    {let formattedRemote = $derived(formatConflictValue(field.remoteValue))}

                    <div
                        class="cs-work-conflict-field"
                        role="radiogroup"
                        aria-labelledby={fieldLabelId}
                    >
                        <div class="cs-work-conflict-field-header">
                            <span id={fieldLabelId} class="cs-work-conflict-field-label">
                                {fieldLabel}
                            </span>

                            {#if kindHint}
                                <span class="cs-work-conflict-field-kind">
                                    {kindHint}
                                </span>
                            {/if}
                        </div>

                        {#if showBaseValue && field.baseValue !== undefined}
                            {let formattedBase = $derived(formatConflictValue(field.baseValue))}
                            <p class="cs-work-conflict-field-base">
                                <span class="cs-work-conflict-field-base-prefix">
                                    {t({ de: "Vorher:", en: "Before:" })}
                                </span>
                                <span class="cs-work-conflict-field-base-value">
                                    {formattedBase.text}
                                </span>
                            </p>
                        {/if}

                        <div class="cs-work-conflict-options">
                            <button
                                type="button"
                                role="radio"
                                aria-checked={isLocalSelected}
                                tabindex={!hasSideSelection || isLocalSelected ? 0 : -1}
                                disabled={busy}
                                class="cs-work-conflict-option"
                                data-selected={isLocalSelected ? "" : undefined}
                                data-dimmed={isRemoteSelected ? "" : undefined}
                                onclick={() => chooseField(field.id, "local")}
                                onkeydown={(event) => handleOptionKeyDown(event, field.id, "local")}
                            >
                                <span class="cs-work-conflict-option-header">
                                    <span class="cs-work-conflict-option-source">
                                        {resolvedLocalLabel}
                                    </span>
                                    <span
                                        class="cs-work-conflict-option-check"
                                        aria-hidden="true"
                                    >
                                        {#if isLocalSelected}
                                            <Check size={11} strokeWidth={2.75} />
                                        {/if}
                                    </span>
                                </span>

                                <span class="cs-work-conflict-option-value" data-state={formattedLocal.state}>
                                    {#if renderValue}
                                        {@render renderValue({
                                            field,
                                            side: "local",
                                            value: field.localValue,
                                            selected: isLocalSelected,
                                        })}
                                    {:else}
                                        {formattedLocal.text}
                                    {/if}
                                </span>
                            </button>

                            <button
                                type="button"
                                role="radio"
                                aria-checked={isRemoteSelected}
                                tabindex={!hasSideSelection || isRemoteSelected ? 0 : -1}
                                disabled={busy}
                                class="cs-work-conflict-option"
                                data-selected={isRemoteSelected ? "" : undefined}
                                data-dimmed={isLocalSelected ? "" : undefined}
                                onclick={() => chooseField(field.id, "remote")}
                                onkeydown={(event) => handleOptionKeyDown(event, field.id, "remote")}
                            >
                                <span class="cs-work-conflict-option-header">
                                    <span class="cs-work-conflict-option-source">
                                        {resolvedRemoteLabel}
                                    </span>
                                    <span
                                        class="cs-work-conflict-option-check"
                                        aria-hidden="true"
                                    >
                                        {#if isRemoteSelected}
                                            <Check size={11} strokeWidth={2.75} />
                                        {/if}
                                    </span>
                                </span>

                                <span class="cs-work-conflict-option-value" data-state={formattedRemote.state}>
                                    {#if renderValue}
                                        {@render renderValue({
                                            field,
                                            side: "remote",
                                            value: field.remoteValue,
                                            selected: isRemoteSelected,
                                        })}
                                    {:else}
                                        {formattedRemote.text}
                                    {/if}
                                </span>
                            </button>
                        </div>
                    </div>
                {/if}
            {/each}
            </ScrollAreaContent>
        </ScrollArea>

        <div class="cs-work-conflict-footer">
            {#if trimmedError.length > 0}
                <p class="cs-work-conflict-error cs-work-conflict-error-inline" role="alert">
                    {trimmedError}
                </p>
            {/if}

            {#if selectionCounterLabel}
                <p class="cs-work-conflict-counter">
                    {selectionCounterLabel}
                </p>
            {/if}

            <Button
                variant="primary"
                size="lg"
                disabled={busy || !allFieldsResolved}
                onclick={handleApplyFields}
            >
                <ButtonLabel>{applyCtaLabel}</ButtonLabel>
            </Button>
        </div>
    {/if}
</div>

<style>
    @layer components.composite {
        .cs-work-conflict-modal {
            --cs-work-conflict-modal-bg: var(--cs-color-elevated);
            --cs-work-conflict-modal-fg: var(--cs-color-text-main);
            --cs-work-conflict-modal-shadow: var(--cs-shadow-floating);
            --cs-work-conflict-modal-radius: 28px;
            --cs-work-conflict-modal-squircle: var(--cs-squircle);
            --cs-work-conflict-modal-padding: 32px;

            /* Hero stage tokens (default caution conflict) */
            --cs-work-conflict-halo-bg: var(--cs-color-caution-soft);
            --cs-work-conflict-sheet-stroke: var(--cs-color-caution-soft-fg);
            --cs-work-conflict-sheet-bg: color-mix(in oklab, var(--cs-color-caution-solid) 12%, var(--cs-color-elevated));
            --cs-work-conflict-badge-bg: var(--cs-color-caution-solid);
            --cs-work-conflict-badge-fg: var(--cs-color-caution-solid-fg);

            position: relative;
            display: flex;
            flex-direction: column;
            inline-size: 100%;
            max-inline-size: var(--cs-work-conflict-modal-max-width, 460px);
            max-block-size: 100%;
            padding: var(--cs-work-conflict-modal-padding);
            overflow: clip;
            color: var(--cs-work-conflict-modal-fg);
            font-family: var(--cs-font-sans);
            background-color: var(--cs-work-conflict-modal-bg);
            border-radius: var(--cs-work-conflict-modal-radius);
            corner-shape: var(--cs-work-conflict-modal-squircle);
            box-shadow: var(--cs-work-conflict-modal-shadow);
            transform-origin: center center;

            &[data-mode="simple"] {
                align-items: center;
                text-align: center;
            }

            &[data-mode="fields"] {
                --cs-work-conflict-modal-padding: 28px;
                max-inline-size: var(--cs-work-conflict-modal-max-width, 560px);
                align-items: stretch;
                text-align: start;
            }

            &[data-remote-deleted] {
                --cs-work-conflict-halo-bg: var(--cs-color-negative-soft);
                --cs-work-conflict-sheet-stroke: var(--cs-color-negative-soft-fg);
                --cs-work-conflict-sheet-bg: color-mix(in oklab, var(--cs-color-negative-solid) 10%, var(--cs-color-elevated));
                --cs-work-conflict-badge-bg: var(--cs-color-negative-solid);
                --cs-work-conflict-badge-fg: var(--cs-color-negative-solid-fg);
            }

            @media (width < 640px) {
                --cs-work-conflict-modal-padding: 20px;
                --cs-work-conflict-modal-radius: 24px;
                max-inline-size: 100%;
            }

            &[data-blocked] {
                animation: cs-work-conflict-modal-blocked var(--cs-dur-280) var(--cs-ease-quad-out);
            }
        }

        :global(.cs-overlay) .cs-work-conflict-modal {
            opacity: 0;
            scale: 0.96;
            translate: 0 4px;
            transition:
                opacity var(--cs-dur-exit-md) var(--cs-ease-exit),
                scale var(--cs-dur-exit-md) var(--cs-ease-exit),
                translate var(--cs-dur-exit-md) var(--cs-ease-exit);
        }

        :global(.cs-overlay:popover-open) .cs-work-conflict-modal {
            opacity: 1;
            scale: 1;
            translate: 0 0;
            transition:
                opacity var(--cs-dur-effect) var(--cs-ease-effect),
                scale var(--cs-dur-enter-md) var(--cs-ease-enter),
                translate var(--cs-dur-enter-md) var(--cs-ease-enter);
        }

        @starting-style {
            :global(.cs-overlay:popover-open) .cs-work-conflict-modal {
                opacity: 0;
                scale: 0.94;
                translate: 0 8px;
            }
        }

        /* =========================================================
         * SHARED PILLS & ERROR
         * ========================================================= */
        .cs-work-conflict-queue {
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            block-size: 24px;
            padding-inline: 9px;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            background-color: var(--cs-color-sunken);
            border-radius: var(--cs-radius-full);
            box-shadow: var(--cs-shadow-sunken);
        }

        .cs-work-conflict-queue-corner {
            position: absolute;
            inset-block-start: 16px;
            inset-inline-end: 16px;
            z-index: 2;

            @media (width < 640px) {
                inset-block-start: 12px;
                inset-inline-end: 12px;
            }
        }

        .cs-work-conflict-resource-pill {
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

        .cs-work-conflict-resource-pill > :global(.cs-work-conflict-resource-pill-icon) {
            flex-shrink: 0;
            color: var(--cs-color-text-weak);
        }

        .cs-work-conflict-resource-pill-name {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-xs);
            font-weight: 600;
        }

        .cs-work-conflict-modal[data-remote-deleted] {
            & .cs-work-conflict-resource-pill > :global(.cs-work-conflict-resource-pill-icon) {
                color: var(--cs-color-negative-soft-fg);
            }
        }

        .cs-work-conflict-error {
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

        .cs-work-conflict-error-inline {
            margin: 0;
            max-inline-size: none;
            text-align: start;
        }

        /* =========================================================
         * COMPACT MODE (SIMPLE)
         * ========================================================= */
        .cs-work-conflict-stage {
            position: relative;
            display: grid;
            place-items: center;
            inline-size: 112px;
            block-size: 80px;
            margin-block-end: 16px;
            flex-shrink: 0;
        }

        .cs-work-conflict-stage-halo {
            grid-area: 1 / 1;
            inline-size: 84px;
            block-size: 68px;
            background-color: var(--cs-work-conflict-halo-bg);
            border-radius: 20px;
            corner-shape: var(--cs-squircle);
            transition: background-color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-conflict-sheets {
            grid-area: 1 / 1;
            position: relative;
            z-index: 1;
            overflow: visible;
        }

        .cs-work-conflict-sheet-back {
            stroke: var(--cs-work-conflict-sheet-stroke);
            fill: var(--cs-work-conflict-modal-bg);
            transform-box: fill-box;
            transform-origin: center center;
            transform: rotate(-7deg) translate(-2px, -1px);
            transition:
                transform var(--cs-dur-320) var(--cs-ease-enter),
                opacity var(--cs-dur-effect) var(--cs-ease-effect),
                stroke var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-conflict-sheet-front {
            stroke: var(--cs-work-conflict-sheet-stroke);
            fill: var(--cs-work-conflict-sheet-bg);
            transform-box: fill-box;
            transform-origin: center center;
            transform: rotate(5deg) translate(2px, 1px);
            transition:
                transform var(--cs-dur-320) var(--cs-ease-enter),
                stroke var(--cs-dur-effect) var(--cs-ease-effect),
                fill var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-conflict-modal[data-remote-deleted] .cs-work-conflict-sheet-back {
            opacity: 0.45;
            stroke-dasharray: 3 2.5;
            transform: rotate(-11deg) translate(-4px, -2px) scale(0.95);
        }

        .cs-work-conflict-badge {
            position: absolute;
            inset-block-end: 10px;
            inset-inline-end: 18px;
            z-index: 2;
            display: grid;
            place-items: center;
            inline-size: 26px;
            block-size: 26px;
            color: var(--cs-work-conflict-badge-fg);
            background-color: var(--cs-work-conflict-badge-bg);
            border-radius: var(--cs-radius-full);
            box-shadow: 0 0 0 3px var(--cs-work-conflict-modal-bg);
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-work-conflict-simple-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .cs-work-conflict-simple-title {
            margin: 0;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-xl);
            font-weight: 700;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-tight);
        }

        .cs-work-conflict-simple-description {
            margin: 0;
            max-inline-size: 36ch;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-sm);
            line-height: var(--cs-leading-normal);
        }

        .cs-work-conflict-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            inline-size: 100%;
            margin-block-start: 24px;
        }

        .cs-work-conflict-actions > :global(.cs-button),
        .cs-work-conflict-footer > :global(.cs-button) {
            inline-size: 100%;
        }

        /* =========================================================
         * PER-FIELD MODE (FIELDS)
         * ========================================================= */
        .cs-work-conflict-fields-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .cs-work-conflict-emblem {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            inline-size: 40px;
            block-size: 40px;
            color: var(--cs-color-caution-soft-fg);
            background-color: var(--cs-color-caution-soft);
            border-radius: 12px;
            corner-shape: var(--cs-squircle-smooth);
        }

        .cs-work-conflict-fields-heading {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
            min-inline-size: 0;
        }

        .cs-work-conflict-fields-title {
            margin: 0;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-lg);
            font-weight: 700;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-tight);
        }

        .cs-work-conflict-fields-description {
            margin: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-sm);
            line-height: var(--cs-leading-normal);
        }

        .cs-work-conflict-meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            margin-block-start: 16px;
        }

        .cs-work-conflict-modal > :global(.cs-work-conflict-quick-select) {
            flex-shrink: 0;
            inline-size: 100%;
            margin-block-start: 4px;
        }

        .cs-work-conflict-modal > :global(.cs-work-conflict-scroll-area) {
            margin-block-start: 16px;
            /* Extend 2px horizontally so inner 2px padding keeps focus rings unclipped and columns aligned. */
            margin-inline: -2px;
            max-block-size: min(380px, 46dvh);
        }

        .cs-work-conflict-modal > :global(.cs-work-conflict-quick-select + .cs-work-conflict-scroll-area) {
            margin-block-start: 10px;
        }

        .cs-work-conflict-modal :global(.cs-work-conflict-modal-list) {
            display: flex;
            flex-direction: column;
            gap: 16px;
            overscroll-behavior: contain;
            /* Keep focus rings visible inside the scroll container. */
            padding: 2px;
        }

        .cs-work-conflict-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .cs-work-conflict-field-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .cs-work-conflict-field-label {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-sm);
            font-weight: 600;
            line-height: var(--cs-leading-snug);
        }

        .cs-work-conflict-field-kind {
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            padding: 2px 7px;
            color: var(--cs-color-caution-soft-fg);
            font-size: var(--cs-text-xs);
            font-weight: 500;
            line-height: var(--cs-leading-tight);
            background-color: var(--cs-color-caution-soft);
            border-radius: var(--cs-radius-full);
        }

        .cs-work-conflict-field-base {
            margin: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            line-height: var(--cs-leading-snug);
            font-variant-numeric: tabular-nums;
            overflow-wrap: anywhere;
        }

        .cs-work-conflict-field-base-prefix {
            color: var(--cs-color-text-weaker);
            font-weight: 500;
        }

        .cs-work-conflict-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;

            @media (width < 520px) {
                grid-template-columns: 1fr;
            }
        }

        .cs-work-conflict-option {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
            min-block-size: 64px;
            padding: 10px 12px 12px;
            text-align: start;
            color: var(--cs-color-text-main);
            font-family: inherit;
            background-color: var(--cs-color-sunken);
            border: 0;
            border-radius: 14px;
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-shadow-sunken);
            cursor: default;
            user-select: none;
            transition:
                background-color var(--cs-dur-hover) var(--cs-ease-quad-out),
                box-shadow var(--cs-dur-hover) var(--cs-ease-quad-out),
                scale var(--cs-dur-press) var(--cs-ease-quad-out);

            &:hover:not(:disabled):not([data-selected]) {
                background-color: var(--cs-color-base-soft);
            }

            &:is(:hover, :active):not(:disabled) {
                will-change: scale;
            }

            &:active:not(:disabled) {
                scale: 0.985;
            }

            &[data-selected] {
                background-color: var(--cs-color-accent-soft);
                box-shadow: inset 0 0 0 1.5px var(--cs-color-accent-solid);
            }

            &:disabled {
                color: var(--cs-color-disabled-fg);
                background-color: var(--cs-color-disabled-bg);
                box-shadow: none;
            }
        }

        .cs-work-conflict-option-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .cs-work-conflict-option-source {
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            font-weight: 600;
            line-height: var(--cs-leading-tight);
        }

        .cs-work-conflict-option[data-selected] .cs-work-conflict-option-source {
            color: var(--cs-color-accent-soft-fg);
        }

        .cs-work-conflict-option-check {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            inline-size: 18px;
            block-size: 18px;
            color: var(--cs-color-accent-solid-fg);
            background-color: transparent;
            border-radius: var(--cs-radius-full);
            scale: 0.72;
            opacity: 0;
            transition:
                opacity var(--cs-dur-hover) var(--cs-ease-quad-out),
                scale var(--cs-dur-hover) var(--cs-ease-enter),
                background-color var(--cs-dur-hover) var(--cs-ease-quad-out);
        }

        .cs-work-conflict-option[data-selected] .cs-work-conflict-option-check {
            background-color: var(--cs-color-accent-solid);
            opacity: 1;
            scale: 1;
        }

        .cs-work-conflict-option-value {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-sm);
            font-weight: 500;
            line-height: var(--cs-leading-snug);
            font-variant-numeric: tabular-nums;
            overflow-wrap: anywhere;
            transition: color var(--cs-dur-hover) var(--cs-ease-quad-out);

            &[data-state="empty"] {
                color: var(--cs-color-text-weaker);
                font-style: italic;
                font-weight: 400;
            }

            &[data-state="deleted"] {
                color: var(--cs-color-negative-soft-fg);
                font-style: italic;
                font-weight: 500;
            }
        }

        .cs-work-conflict-option[data-dimmed] .cs-work-conflict-option-value {
            color: var(--cs-color-text-weak);
        }

        .cs-work-conflict-footer {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-block-start: 20px;
        }

        .cs-work-conflict-counter {
            margin: 0;
            text-align: center;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            font-weight: 500;
            font-variant-numeric: tabular-nums;
        }

        @keyframes cs-work-conflict-modal-blocked {
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
    }
</style>
