<script lang="ts">
    import { AlertCircle, Check, Upload, X } from "@lucide/svelte";
    import { t } from "../../shared/lang.internal.ts";
    import { createSurfaceRadius } from "../../shared/surface-radius/index.ts";
    import { Button, ButtonIcon, ButtonLabel } from "../button/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { Progress } from "../progress/index.ts";
    import { TextMorph } from "../text-morph/index.ts";
    import { tooltip } from "../tooltip/index.ts";
    import type { UploadAreaItem, UploadAreaProps } from "./index.ts";
    import { formatFileSize, resolveRejectionMessage, validateFiles } from "./upload-area.internal.ts";

    let {
        ref = $bindable(null),
        inputRef = $bindable(null),
        variant,
        size,
        files = $bindable([]),
        onFilesChange,
        items,
        onReject,
        onRemove,
        onCancel,
        onRetry,
        accept,
        multiple = false,
        maxSize,
        maxFiles,
        label,
        description,
        error,
        children,
        item: itemSnippet,
        name,
        id,
        disabled = false,
        invalid = false,
        class: className,
        ondragenter,
        ondragover,
        ondragleave,
        ondrop,
        ondragend,
        ...rest
    }: UploadAreaProps = $props();

    const fallbackId = $props.id();
    const baseId = $derived(id ?? fallbackId);
    const descriptionId = $derived(`${baseId}-description`);
    const errorId = $derived(`${baseId}-error`);

    const surfaceRadius = createSurfaceRadius(() => size);

    let dragDepth = $state(0);
    let internalError = $state<string | undefined>();

    const dragging = $derived(dragDepth > 0 && !disabled);

    const displayItems = $derived.by<UploadAreaItem[]>(() => {
        if (items !== undefined) return items;
        return files.map((file, index) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
            file,
            name: file.name,
            size: file.size,
            sizeLabel: formatFileSize(file.size),
            status: "idle" as const,
        }));
    });

    const activeError = $derived(error ?? internalError);
    const singleItem = $derived(!multiple ? displayItems[0] : undefined);
    const isSinglePopulated = $derived(!multiple && singleItem !== undefined);
    const rootStatus = $derived(isSinglePopulated ? (singleItem?.status ?? "idle") : "idle");
    const isInvalid = $derived(invalid || Boolean(activeError) || rootStatus === "error");

    const describedById = $derived.by(() => {
        const ids: string[] = [];
        if (description) ids.push(descriptionId);
        if (activeError) ids.push(errorId);
        return ids.length > 0 ? ids.join(" ") : undefined;
    });

    const progressSize = $derived(size === "sm" ? "xs" : "sm");
    const actionButtonSize = $derived(size === "lg" ? "sm" : "xs");
    const iconStrokeWidth = $derived(size === "sm" ? 2 : 1.75);
    const canRemove = $derived(items === undefined || onRemove !== undefined);

    function syncInputFiles(nextFiles: File[]): void {
        if (!inputRef || !name || typeof DataTransfer === "undefined") return;
        try {
            const dt = new DataTransfer();
            for (const file of nextFiles) {
                dt.items.add(file);
            }
            inputRef.files = dt.files;
        } catch {
            // Best-effort sync for native <form> submission; ignore in restricted runtimes.
        }
    }

    function processIncomingFiles(incoming: File[]): void {
        if (disabled || incoming.length === 0) return;

        const { accepted, rejections } = validateFiles(incoming, {
            accept,
            maxSize,
            maxFiles,
            multiple,
            currentCount: displayItems.length,
        });

        const firstRejection = rejections[0];
        if (firstRejection) {
            internalError = resolveRejectionMessage(firstRejection, { maxSize, maxFiles });
            onReject?.(rejections);
        } else {
            internalError = undefined;
        }

        const firstAccepted = accepted[0];
        if (!firstAccepted) return;

        const nextFiles = multiple ? [...files, ...accepted] : [firstAccepted];
        files = nextFiles;
        syncInputFiles(files);
        onFilesChange?.(nextFiles);
    }

    function openPicker(): void {
        if (disabled) return;
        inputRef?.click();
    }

    function handleInputChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        const picked = [...(event.currentTarget.files ?? [])];
        // Clear input value so re-selecting the same file after removal still fires change.
        event.currentTarget.value = "";
        processIncomingFiles(picked);
    }

    function hasDraggedFiles(event: DragEvent): boolean {
        const types = event.dataTransfer?.types;
        if (!types || types.length === 0) return true;
        return [...types].includes("Files");
    }

    function handleDragEnter(event: DragEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ondragenter?.(event);
        if (disabled || !hasDraggedFiles(event)) return;
        event.preventDefault();
        dragDepth += 1;
    }

    function handleDragOver(event: DragEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ondragover?.(event);
        if (disabled || !hasDraggedFiles(event)) return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
        }
    }

    function handleDragLeave(event: DragEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ondragleave?.(event);
        if (disabled) return;
        dragDepth = Math.max(0, dragDepth - 1);
    }

    function handleDrop(event: DragEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ondrop?.(event);
        if (disabled) return;
        event.preventDefault();
        dragDepth = 0;
        const dropped = [...(event.dataTransfer?.files ?? [])];
        processIncomingFiles(dropped);
    }

    function handleDragEnd(event: DragEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        ondragend?.(event);
        dragDepth = 0;
    }

    function handleRemove(entry: UploadAreaItem, index: number): void {
        if (disabled) return;
        internalError = undefined;
        if (items === undefined) {
            const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
            files = nextFiles;
            syncInputFiles(files);
            onFilesChange?.(nextFiles);
        }
        onRemove?.(entry, index);
    }

    function formatItemMeta(entry: UploadAreaItem): string {
        const sizeText = entry.sizeLabel ?? (entry.size !== undefined ? formatFileSize(entry.size) : "");
        const status = entry.status ?? "idle";

        if (status === "error") {
            return entry.error ?? t({ de: "Upload fehlgeschlagen", en: "Upload failed" });
        }
        if (status === "done") {
            const completeText = t({ de: "Fertig", en: "Complete" });
            return sizeText ? `${sizeText}, ${completeText}` : completeText;
        }
        if (status === "uploading") {
            const pct = `${Math.round(entry.progress ?? 0)}%`;
            return sizeText ? `${sizeText}, ${pct}` : pct;
        }
        return sizeText;
    }
</script>

<div
    bind:this={ref}
    {...rest}
    id={baseId}
    class={["cs-upload-area", className]}
    data-variant={variant}
    data-size={size}
    data-status={rootStatus}
    data-dragging={dragging ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    data-invalid={isInvalid ? "" : undefined}
    data-has-files={displayItems.length > 0 ? "" : undefined}
    data-nested={surfaceRadius.isNested ? "" : undefined}
    style:--cs-upload-area-nested-radius={surfaceRadius.nestedRadius}
    ondragenter={handleDragEnter}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    ondragend={handleDragEnd}
>
    <input
        bind:this={inputRef}
        class="cs-upload-area-input"
        type="file"
        tabindex={-1}
        aria-hidden="true"
        {name}
        {accept}
        {multiple}
        {disabled}
        onchange={handleInputChange}
    />

    <div class="cs-upload-area-surface">
        {#if isSinglePopulated && singleItem}
            {let singleStatus = singleItem.status ?? "idle"}
            {let singleMeta = formatItemMeta(singleItem)}
            {let showSingleProgress = singleStatus === "uploading" || singleStatus === "error"}
            <div class="cs-upload-area-single" data-item-status={singleStatus}>
                {#if itemSnippet}
                    {@render itemSnippet(singleItem, 0)}
                {:else}
                    <div class="cs-upload-area-single-row">
                        <span class="cs-upload-area-status-icon" aria-hidden="true">
                            {#if singleStatus === "error"}
                                <AlertCircle size={18} strokeWidth={iconStrokeWidth} />
                            {:else if singleStatus === "uploading"}
                                <Upload size={18} strokeWidth={iconStrokeWidth} />
                            {:else}
                                <Check size={18} strokeWidth={iconStrokeWidth} />
                            {/if}
                        </span>

                        <div class="cs-upload-area-item-copy">
                            <span class="cs-upload-area-item-name">{singleItem.name}</span>
                            {#if singleMeta}
                                <span class="cs-upload-area-item-meta">
                                    <TextMorph text={singleMeta} tabular />
                                </span>
                            {/if}
                        </div>

                        <div class="cs-upload-area-item-actions">
                            {#if singleStatus === "uploading" && onCancel}
                                <Button
                                    variant="ghost"
                                    size={actionButtonSize}
                                    {disabled}
                                    onclick={() => onCancel(singleItem, 0)}
                                >
                                    <ButtonLabel>{t({ de: "Abbrechen", en: "Cancel" })}</ButtonLabel>
                                    <HitArea size="md" />
                                </Button>
                            {:else if singleStatus === "error"}
                                {#if onRetry}
                                    <Button
                                        variant="tertiary"
                                        size={actionButtonSize}
                                        {disabled}
                                        onclick={() => onRetry(singleItem, 0)}
                                    >
                                        <ButtonLabel>{t({ de: "Erneut", en: "Retry" })}</ButtonLabel>
                                        <HitArea size="md" />
                                    </Button>
                                {/if}
                                {#if canRemove}
                                    <Button
                                        variant="ghost"
                                        size={actionButtonSize}
                                        iconOnly
                                        {disabled}
                                        aria-label={t({
                                            de: `${singleItem.name} entfernen`,
                                            en: `Remove ${singleItem.name}`,
                                        })}
                                        onclick={() => handleRemove(singleItem, 0)}
                                        {@attach tooltip({ text: t({ de: "Entfernen", en: "Remove" }) })}
                                    >
                                        <ButtonIcon icon={X} />
                                        <HitArea size="md" />
                                    </Button>
                                {/if}
                            {:else if canRemove}
                                <Button
                                    variant="ghost"
                                    size={actionButtonSize}
                                    iconOnly
                                    {disabled}
                                    aria-label={t({
                                        de: `${singleItem.name} entfernen`,
                                        en: `Remove ${singleItem.name}`,
                                    })}
                                    onclick={() => handleRemove(singleItem, 0)}
                                    {@attach tooltip({ text: t({ de: "Entfernen", en: "Remove" }) })}
                                >
                                    <ButtonIcon icon={X} />
                                    <HitArea size="md" />
                                </Button>
                            {/if}
                        </div>
                    </div>

                    <div
                        class={["cs-upload-area-progress", showSingleProgress && "is-open"]}
                        inert={!showSingleProgress}
                    >
                        <div class="cs-upload-area-progress-inner">
                            <div class="cs-upload-area-progress-track">
                                <Progress
                                    appearance="bar"
                                    variant="soft"
                                    size={progressSize}
                                    color={singleStatus === "error" ? "negative" : "accent"}
                                    value={singleItem.progress ?? 0}
                                    aria-label={t({
                                        de: `${singleItem.name} Upload-Fortschritt`,
                                        en: `${singleItem.name} upload progress`,
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                {/if}
            </div>
        {:else}
            <button
                type="button"
                class="cs-upload-area-dropzone"
                {disabled}
                aria-describedby={describedById}
                onclick={openPicker}
            >
                {#if children}
                    {@render children({ dragging, disabled })}
                {:else}
                    <span class="cs-upload-area-icon" aria-hidden="true">
                        <Upload strokeWidth={iconStrokeWidth} />
                    </span>
                    <span class="cs-upload-area-copy">
                        <span class="cs-upload-area-title">
                            {#if dragging}
                                {t({ de: "Zum Hochladen ablegen", en: "Drop to upload" })}
                            {:else if label}
                                {label}
                            {:else if multiple}
                                {t({ de: "Dateien ablegen oder auswählen", en: "Drop files or browse" })}
                            {:else}
                                {t({ de: "Datei ablegen oder auswählen", en: "Drop file or browse" })}
                            {/if}
                        </span>
                        {#if description}
                            <span id={descriptionId} class="cs-upload-area-hint">{description}</span>
                        {/if}
                    </span>
                {/if}
            </button>
        {/if}
    </div>

    {#if activeError}
        <p id={errorId} class="cs-upload-area-error" role="status" aria-live="polite">
            {activeError}
        </p>
    {/if}

    {#if multiple && displayItems.length > 0}
        <ul class="cs-upload-area-list">
            {#each displayItems as entry, index (entry.id)}
                {let entryStatus = entry.status ?? "idle"}
                {let entryMeta = formatItemMeta(entry)}
                {let showProgress = entryStatus === "uploading" || entryStatus === "error"}

                <li class="cs-upload-area-item" data-item-status={entryStatus}>
                    {#if itemSnippet}
                        {@render itemSnippet(entry, index)}
                    {:else}
                        <div class="cs-upload-area-item-row">
                            <div class="cs-upload-area-item-copy">
                                <span class="cs-upload-area-item-name">{entry.name}</span>
                                {#if entryMeta}
                                    <span class="cs-upload-area-item-meta">
                                        <TextMorph text={entryMeta} tabular />
                                    </span>
                                {/if}
                            </div>

                            <div class="cs-upload-area-item-actions">
                                {#if entryStatus === "uploading" && onCancel}
                                    <Button
                                        variant="ghost"
                                        size={actionButtonSize}
                                        {disabled}
                                        onclick={() => onCancel(entry, index)}
                                    >
                                        <ButtonLabel>{t({ de: "Abbrechen", en: "Cancel" })}</ButtonLabel>
                                        <HitArea size="md" />
                                    </Button>
                                {:else if entryStatus === "error"}
                                    {#if onRetry}
                                        <Button
                                            variant="tertiary"
                                            size={actionButtonSize}
                                            {disabled}
                                            onclick={() => onRetry(entry, index)}
                                        >
                                            <ButtonLabel>{t({ de: "Erneut", en: "Retry" })}</ButtonLabel>
                                            <HitArea size="md" />
                                        </Button>
                                    {/if}
                                    {#if canRemove}
                                        <Button
                                            variant="ghost"
                                            size={actionButtonSize}
                                            iconOnly
                                            {disabled}
                                            aria-label={t({
                                                de: `${entry.name} entfernen`,
                                                en: `Remove ${entry.name}`,
                                            })}
                                            onclick={() => handleRemove(entry, index)}
                                            {@attach tooltip({ text: t({ de: "Entfernen", en: "Remove" }) })}
                                        >
                                            <ButtonIcon icon={X} />
                                            <HitArea size="md" />
                                        </Button>
                                    {/if}
                                {:else if canRemove}
                                    <Button
                                        variant="ghost"
                                        size={actionButtonSize}
                                        iconOnly
                                        {disabled}
                                        aria-label={t({
                                            de: `${entry.name} entfernen`,
                                            en: `Remove ${entry.name}`,
                                        })}
                                        onclick={() => handleRemove(entry, index)}
                                        {@attach tooltip({ text: t({ de: "Entfernen", en: "Remove" }) })}
                                    >
                                        <ButtonIcon icon={X} />
                                        <HitArea size="md" />
                                    </Button>
                                {/if}
                            </div>
                        </div>

                        <div
                            class={["cs-upload-area-progress", showProgress && "is-open"]}
                            inert={!showProgress}
                        >
                            <div class="cs-upload-area-progress-inner">
                                <div class="cs-upload-area-progress-track">
                                    <Progress
                                        appearance="bar"
                                        variant="soft"
                                        size={progressSize}
                                        color={entryStatus === "error" ? "negative" : "accent"}
                                        value={entry.progress ?? 0}
                                        aria-label={t({
                                            de: `${entry.name} Upload-Fortschritt`,
                                            en: `${entry.name} upload progress`,
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    @layer components.composite {
        .cs-upload-area {
            --cs-upload-area-fg: var(--cs-color-text-strong);
            --cs-upload-area-description-fg: var(--cs-color-text-weak);
            --cs-upload-area-icon-fg: var(--cs-color-text-weak);
            --cs-upload-area-shadow: 0 0 #0000;
            --cs-upload-area-shadow-hover: var(--cs-upload-area-shadow);
            --cs-upload-area-ring-shadow: inset 0 0 0 0px transparent;
            --cs-upload-area-bg-dragging: var(--cs-color-accent-soft);
            --cs-upload-area-list-gap: 10px;
            --cs-upload-area-item-py: 10px;
            --cs-upload-area-item-gap: 4px;

            position: relative;
            display: flex;
            flex-direction: column;
            gap: var(--cs-upload-area-list-gap);
            width: 100%;
            font-family: var(--cs-font-sans);

            /* =========================================================
             * SIZES (sm - lg)
             * ========================================================= */
            &[data-size="sm"] {
                --cs-upload-area-min-height: 104px;
                --cs-upload-area-py: 18px;
                --cs-upload-area-px: 18px;
                --cs-upload-area-gap: 8px;
                --cs-upload-area-copy-gap: 2px;
                --cs-upload-area-radius: var(--cs-radius-2xl);
                --cs-upload-area-squircle: var(--cs-squircle);
                --cs-upload-area-icon-size: 18px;
                --cs-upload-area-font-size: var(--cs-text-sm);
                --cs-upload-area-title-lh: 20px;
                --cs-upload-area-title-tracking: -0.006em;
                --cs-upload-area-description-size: var(--cs-text-xs);
                --cs-upload-area-description-lh: 16px;
            }

            &[data-size="md"] {
                --cs-upload-area-min-height: 140px;
                --cs-upload-area-py: 24px;
                --cs-upload-area-px: 24px;
                --cs-upload-area-gap: 12px;
                --cs-upload-area-copy-gap: 4px;
                --cs-upload-area-radius: var(--cs-radius-3xl);
                --cs-upload-area-squircle: var(--cs-squircle);
                --cs-upload-area-icon-size: 22px;
                --cs-upload-area-font-size: var(--cs-text-sm);
                --cs-upload-area-title-lh: 20px;
                --cs-upload-area-title-tracking: -0.006em;
                --cs-upload-area-description-size: var(--cs-text-xs);
                --cs-upload-area-description-lh: 16px;
            }

            &[data-size="lg"] {
                --cs-upload-area-min-height: 184px;
                --cs-upload-area-py: 32px;
                --cs-upload-area-px: 32px;
                --cs-upload-area-gap: 14px;
                --cs-upload-area-copy-gap: 4px;
                --cs-upload-area-radius: 28px;
                --cs-upload-area-squircle: var(--cs-squircle);
                --cs-upload-area-icon-size: 26px;
                --cs-upload-area-font-size: var(--cs-text-base);
                --cs-upload-area-title-lh: 22px;
                --cs-upload-area-title-tracking: -0.011em;
                --cs-upload-area-description-size: var(--cs-text-xs);
                --cs-upload-area-description-lh: 16px;
            }

            &[data-nested] {
                --cs-upload-area-radius: var(--cs-upload-area-nested-radius);
                --cs-upload-area-squircle: var(--cs-squircle-smooth);
            }

            /* =========================================================
             * VARIANTS (Borderless at rest; surface contrast only)
             * ========================================================= */
            &[data-variant="soft"] {
                --cs-upload-area-bg: var(--cs-color-base-soft);
                --cs-upload-area-bg-hover: var(--cs-color-base-soft-hover);
                --cs-upload-area-shadow: 0 0 #0000;
                --cs-upload-area-shadow-hover: 0 0 #0000;
            }

            &[data-variant="elevated"] {
                --cs-upload-area-bg: var(--cs-color-elevated);
                --cs-upload-area-bg-hover: var(--cs-color-elevated-hover);
                --cs-upload-area-shadow: var(--cs-shadow-elevated);
                --cs-upload-area-shadow-hover: var(--cs-shadow-elevated-hover);
            }

            &[data-variant="sunken"] {
                --cs-upload-area-bg: var(--cs-color-sunken);
                --cs-upload-area-bg-hover: color-mix(
                    in oklab,
                    var(--cs-color-sunken),
                    var(--cs-color-text-strong) 1.5%
                );
                --cs-upload-area-shadow: var(--cs-shadow-sunken);
                --cs-upload-area-shadow-hover: var(--cs-shadow-sunken);
            }

            /* =========================================================
             * STATES
             * ========================================================= */
            &[data-invalid]:not([data-disabled]) {
                --cs-upload-area-ring-shadow: inset 0 0 0 2px var(--cs-color-negative-solid);
            }

            &:has(> .cs-upload-area-surface > .cs-upload-area-dropzone:focus-visible):not([data-disabled]) {
                --cs-upload-area-ring-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);
            }

            &[data-dragging]:not([data-disabled]) {
                --cs-upload-area-bg: var(--cs-upload-area-bg-dragging);
                --cs-upload-area-bg-hover: var(--cs-upload-area-bg-dragging);
                --cs-upload-area-icon-fg: var(--cs-color-accent-soft-fg);
                --cs-upload-area-fg: var(--cs-color-accent-soft-fg);
                --cs-upload-area-ring-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-upload-area-fg: var(--cs-color-disabled-fg);
                --cs-upload-area-description-fg: var(--cs-color-disabled-fg);
                --cs-upload-area-icon-fg: var(--cs-color-disabled-fg);
                --cs-upload-area-ring-shadow: inset 0 0 0 0px transparent;
                pointer-events: none;

                &[data-variant="soft"],
                &[data-variant="sunken"],
                &[data-variant="elevated"] {
                    --cs-upload-area-bg: var(--cs-color-disabled-bg);
                    --cs-upload-area-bg-hover: var(--cs-color-disabled-bg);
                    --cs-upload-area-shadow: 0 0 #0000;
                    --cs-upload-area-shadow-hover: 0 0 #0000;
                }
            }
        }

        /* Visually hidden input preserves programmatic .click() and native form submission. */
        .cs-upload-area-input {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: 0;
            padding: 0;
            overflow: hidden;
            clip-path: inset(50%);
            border: 0;
            white-space: nowrap;
        }

        .cs-upload-area-surface {
            position: relative;
            display: flex;
            flex-direction: column;
            min-height: var(--cs-upload-area-min-height);
            background-color: var(--cs-upload-area-bg);
            border-radius: var(--cs-upload-area-radius);
            corner-shape: var(--cs-upload-area-squircle);
            box-shadow: var(--cs-upload-area-shadow);
            transition:
                background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                box-shadow var(--cs-dur-effect-fast) var(--cs-ease-effect),
                transform var(--cs-dur-press) var(--cs-ease-press);

            /* Squircle-safe inset ring overlay avoids box-model shifts and dashed corner artifacts. */
            &::after {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: inherit;
                corner-shape: inherit;
                pointer-events: none;
                box-shadow: var(--cs-upload-area-ring-shadow);
                transition: box-shadow var(--cs-dur-exit-sm) var(--cs-ease-exit);
            }

            .cs-upload-area[data-dragging] &::after {
                transition: box-shadow var(--cs-dur-enter-sm) var(--cs-ease-enter);
            }

            @media (hover: hover) {
                .cs-upload-area:not([data-disabled]) &:has(> .cs-upload-area-dropzone):hover {
                    background-color: var(--cs-upload-area-bg-hover);
                    box-shadow: var(--cs-upload-area-shadow-hover);
                    --cs-upload-area-icon-fg: var(--cs-color-text-strong);
                }
            }

            .cs-upload-area:not([data-disabled], [data-dragging]) &:has(> .cs-upload-area-dropzone:active) {
                transform: scale(0.99);
            }
        }

        .cs-upload-area-dropzone {
            display: flex;
            flex: 1 1 auto;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--cs-upload-area-gap);
            width: 100%;
            min-height: inherit;
            padding: var(--cs-upload-area-py) var(--cs-upload-area-px);
            border: none;
            outline: none;
            background: transparent;
            border-radius: inherit;
            corner-shape: inherit;
            font: inherit;
            color: var(--cs-upload-area-fg);
            text-align: center;
            cursor: default;
            user-select: none;
        }

        .cs-upload-area-icon {
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            color: var(--cs-upload-area-icon-fg);
            transition:
                color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                transform var(--cs-dur-exit-sm) var(--cs-ease-exit);

            & :global(svg) {
                width: var(--cs-upload-area-icon-size);
                height: var(--cs-upload-area-icon-size);
            }

            .cs-upload-area[data-dragging] & {
                transform: translateY(-2px) scale(1.06);
                transition:
                    color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                    transform var(--cs-dur-enter-sm) var(--cs-ease-enter);
            }
        }

        .cs-upload-area-copy {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--cs-upload-area-copy-gap);
            max-width: min(36ch, 100%);
        }

        .cs-upload-area-title {
            font-size: var(--cs-upload-area-font-size);
            font-weight: 500;
            line-height: var(--cs-upload-area-title-lh);
            letter-spacing: var(--cs-upload-area-title-tracking);
            color: var(--cs-upload-area-fg);
            transition: color var(--cs-dur-effect-fast) var(--cs-ease-effect);
        }

        .cs-upload-area-hint {
            font-size: var(--cs-upload-area-description-size);
            font-weight: 400;
            line-height: var(--cs-upload-area-description-lh);
            color: var(--cs-upload-area-description-fg);
            font-variant-numeric: tabular-nums;
            transition: opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);

            .cs-upload-area[data-dragging] & {
                opacity: 0.75;
            }
        }

        /* =========================================================
         * SINGLE-FILE POPULATED VIEW
         * ========================================================= */
        .cs-upload-area-single {
            display: flex;
            flex: 1 1 auto;
            flex-direction: column;
            justify-content: center;
            width: 100%;
            min-height: inherit;
            padding: var(--cs-upload-area-py) var(--cs-upload-area-px);
        }

        .cs-upload-area-single-row {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        .cs-upload-area-status-icon {
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            justify-content: center;
            color: var(--cs-color-positive-soft-fg);

            .cs-upload-area-single[data-item-status="uploading"] & {
                color: var(--cs-color-accent-soft-fg);
            }

            .cs-upload-area-single[data-item-status="error"] & {
                color: var(--cs-color-negative-soft-fg);
            }

            .cs-upload-area[data-disabled] & {
                color: var(--cs-color-disabled-fg);
            }
        }

        /* =========================================================
         * SHARED ITEM ROW & PROGRESS BAR
         * ========================================================= */
        .cs-upload-area-list {
            display: flex;
            flex-direction: column;
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .cs-upload-area-item {
            display: flex;
            flex-direction: column;
            padding-block: var(--cs-upload-area-item-py);

            & + & {
                border-block-start: 1px solid var(--cs-color-base-soft);
            }
        }

        .cs-upload-area-item-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-width: 0;
        }

        .cs-upload-area-item-copy {
            display: flex;
            flex: 1 1 auto;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .cs-upload-area-item-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: var(--cs-text-sm);
            font-weight: 500;
            line-height: 20px;
            color: var(--cs-color-text-strong);

            .cs-upload-area[data-disabled] & {
                color: var(--cs-color-disabled-fg);
            }
        }

        .cs-upload-area-item-meta {
            font-size: var(--cs-text-xs);
            line-height: 16px;
            color: var(--cs-color-text-weak);
            font-variant-numeric: tabular-nums;

            [data-item-status="error"] & {
                color: var(--cs-color-negative-soft-fg);
            }

            .cs-upload-area[data-disabled] & {
                color: var(--cs-color-disabled-fg);
            }
        }

        .cs-upload-area-item-actions {
            display: inline-flex;
            flex-shrink: 0;
            align-items: center;
            gap: 4px;
        }

        .cs-upload-area-progress {
            display: grid;
            grid-template-rows: 0fr;
            opacity: 0;
            transition:
                grid-template-rows var(--cs-dur-exit-sm) var(--cs-ease-exit),
                opacity var(--cs-dur-exit-sm) var(--cs-ease-exit);

            &.is-open {
                grid-template-rows: 1fr;
                opacity: 1;
                transition:
                    grid-template-rows var(--cs-dur-enter-sm) var(--cs-ease-enter),
                    opacity var(--cs-dur-enter-sm) var(--cs-ease-enter);
            }
        }

        /* Keep horizontal overflow visible so progress caps and focus rings are never clipped. */
        .cs-upload-area-progress-inner {
            overflow-x: visible;
            overflow-y: clip;
            min-height: 0;
        }

        .cs-upload-area-progress-track {
            padding-top: 10px;
        }

        .cs-upload-area-error {
            margin: 0;
            padding-inline: 2px;
            font-size: var(--cs-text-xs);
            line-height: 16px;
            color: var(--cs-color-negative-soft-fg);
        }
    }
</style>
