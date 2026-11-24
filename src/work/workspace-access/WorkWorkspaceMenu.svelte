<script lang="ts">
    import { Folder, FolderOpen, FolderPlus, FolderSearch, ShieldCheck, Unlink } from "@lucide/svelte";
    import { untrack } from "svelte";

    import { Badge, BadgeLabel } from "../../modules/badge/index.ts";
    import { Popover } from "../../modules/popover/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { createPointerDragRelease } from "../../shared/listbox/pointer-drag-release.ts";
    import type { WorkWorkspaceMenuProps } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        status,
        directoryName,
        busy = false,
        errorMessage,
        placement = "bottom-start",
        width = "content",
        offset = "24px",
        onselect,
        ongrant,
        ondisconnect,
        onbeforetoggle,
        ontransitionend,
        class: className,
        ...rest
    }: WorkWorkspaceMenuProps = $props();

    let closing = $state(false);
    let renderedStatus = $state(untrack(() => status));
    let renderedDirectoryName = $state(untrack(() => directoryName));
    let renderedErrorMessage = $state(untrack(() => errorMessage));
    let renderedBusy = $state(untrack(() => busy));

    // Freeze displayed state while the popover exits so callback updates don't flash mid-transition.
    $effect.pre(() => {
        if (closing) return;
        renderedStatus = status;
        renderedDirectoryName = directoryName;
        renderedErrorMessage = errorMessage;
        renderedBusy = busy;
    });

    const trimmedFolderName = $derived(renderedDirectoryName?.trim() ?? "");
    const trimmedError = $derived(renderedErrorMessage?.trim() ?? "");

    const captionCopy = $derived.by(() => {
        switch (renderedStatus) {
            case "needs-permission": {
                return t({ de: "Freigabe erforderlich", en: "Permission required" });
            }
            case "stale": {
                return t({ de: "Ordner nicht mehr gefunden", en: "Folder no longer found" });
            }
            default: {
                return "";
            }
        }
    });

    const hintCopy = $derived.by(() => {
        switch (renderedStatus) {
            case "restoring": {
                return t({
                    de: "Der gespeicherte Arbeitsordner wird geladen.",
                    en: "Loading your saved workspace folder.",
                });
            }
            case "unsupported": {
                return t({
                    de: "Bitte Chrome oder Edge nutzen.",
                    en: "Please use Chrome or Edge.",
                });
            }
            default: {
                return "";
            }
        }
    });

    const showFolderBox = $derived(
        ["ready", "needs-permission", "stale", "unlinked"].includes(renderedStatus),
    );

    const folderDisplayName = $derived.by(() => {
        if (renderedStatus === "unlinked") {
            return t({ de: "Kein Ordner gewählt", en: "No folder selected" });
        }
        if (trimmedFolderName.length > 0) {
            return trimmedFolderName;
        }
        if (renderedStatus === "ready") {
            return t({ de: "Ausgewählter Ordner", en: "Selected folder" });
        }
        return t({ de: "Kein Ordner gewählt", en: "No folder selected" });
    });

    const hasActions = $derived(
        ["ready", "needs-permission", "stale", "unlinked"].includes(renderedStatus),
    );

    let closeRafId: number | null = null;
    let pendingMouseOpen: { clientX: number; clientY: number; at: number } | null = null;

    const { beginPointerOpen, shouldCommitPointerRelease, clearPointerOpen } =
        createPointerDragRelease(() => null);

    function cancelCloseRaf(): void {
        if (closeRafId === null || typeof cancelAnimationFrame !== "function") return;
        cancelAnimationFrame(closeRafId);
        closeRafId = null;
    }

    $effect(() => cancelCloseRaf);
    $effect(() => clearPointerOpen);

    function handleWindowPointerDown(event: PointerEvent): void {
        if (
            event.pointerType !== "mouse" ||
            event.button !== 0 ||
            !ref ||
            ref.matches(":popover-open")
        ) {
            return;
        }
        pendingMouseOpen = { clientX: event.clientX, clientY: event.clientY, at: Date.now() };
    }

    $effect(() => {
        if (typeof window === "undefined") return;
        window.addEventListener("pointerdown", handleWindowPointerDown, { capture: true });
        return (): void => {
            window.removeEventListener("pointerdown", handleWindowPointerDown, { capture: true });
        };
    });

    function handleAction(callback?: () => void | Promise<void>): void {
        closing = true;
        // Close before invoking callbacks so native pickers or prompts open without an overlapping menu.
        ref?.hidePopover?.();
        void callback?.();
    }

    function handleItemPointerUp(
        event: PointerEvent,
        callback?: () => void | Promise<void>,
    ): void {
        if (renderedBusy || !shouldCommitPointerRelease(event)) return;
        clearPointerOpen();
        handleAction(callback);
    }

    function handleBeforeToggle(
        event: ToggleEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onbeforetoggle?.(event);

        if (event.newState === "open") {
            cancelCloseRaf();
            closing = false;
            if (pendingMouseOpen && Date.now() - pendingMouseOpen.at < 250) {
                beginPointerOpen(pendingMouseOpen.clientX, pendingMouseOpen.clientY);
            }
            pendingMouseOpen = null;
            return;
        }

        if (event.newState === "closed") {
            pendingMouseOpen = null;
            clearPointerOpen();
            cancelCloseRaf();
            closing = true;
            if (typeof requestAnimationFrame === "function") {
                closeRafId = requestAnimationFrame(() => {
                    closeRafId = requestAnimationFrame(() => {
                        closeRafId = null;
                        if (
                            !ref ||
                            (!ref.matches(":popover-open") &&
                                ref.getAnimations().length === 0 &&
                                getComputedStyle(ref).display === "none")
                        ) {
                            closing = false;
                        }
                    });
                });
            } else {
                closing = false;
            }
        }
    }

    function handleTransitionEnd(
        event: TransitionEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        ontransitionend?.(event);
        if (
            ref &&
            event.target === ref &&
            !ref.matches(":popover-open") &&
            ref.getAnimations().length === 0
        ) {
            cancelCloseRaf();
            closing = false;
        }
    }
</script>

<Popover
    bind:ref
    role="region"
    aria-label={t({ de: "Arbeitsordner", en: "Workspace" })}
    {...rest}
    {id}
    {placement}
    {width}
    {offset}
    popover="auto"
    onbeforetoggle={handleBeforeToggle}
    ontransitionend={handleTransitionEnd}
    class={["cs-work-workspace-menu", className]}
    data-status={renderedStatus}
    data-busy={renderedBusy ? "" : undefined}
>
    <div class="cs-work-workspace-menu-identity">
        <div class="cs-work-workspace-menu-header">
            <span class="cs-work-workspace-menu-title">
                {t({ de: "Arbeitsordner", en: "Workspace" })}
            </span>
            {#if renderedStatus === "ready"}
                <Badge variant="soft" color="positive" size="xs">
                    <BadgeLabel>{t({ de: "Verbunden", en: "Connected" })}</BadgeLabel>
                </Badge>
            {/if}
        </div>

        {#if showFolderBox}
            <div
                class="cs-work-workspace-menu-folder"
                data-empty={renderedStatus === "unlinked" ? "" : undefined}
            >
                <Folder size={15} strokeWidth={2} class="cs-work-workspace-menu-folder-icon" />
                <span class="cs-work-workspace-menu-folder-name text-trim-truncate">
                    {folderDisplayName}
                </span>
            </div>
            {#if captionCopy.length > 0}
                <p class="cs-work-workspace-menu-caption">
                    {captionCopy}
                </p>
            {/if}
        {:else if hintCopy.length > 0}
            <p class="cs-work-workspace-menu-hint">
                {hintCopy}
            </p>
        {/if}

        {#if trimmedError.length > 0}
            <p class="cs-work-workspace-menu-error" role="alert">
                {trimmedError}
            </p>
        {/if}
    </div>

    {#if hasActions}
        <div class="cs-work-workspace-menu-separator" aria-hidden="true"></div>

        <div class="cs-work-workspace-menu-actions">
            {#if renderedStatus === "ready"}
                <button
                    type="button"
                    class="cs-work-workspace-menu-item"
                    disabled={renderedBusy}
                    onclick={() => handleAction(onselect)}
                    onpointerup={(event) => handleItemPointerUp(event, onselect)}
                >
                    <FolderOpen size={16} strokeWidth={2.25} class="cs-work-workspace-menu-item-icon" />
                    <span>{t({ de: "Wechseln", en: "Change" })}</span>
                </button>
                {#if ondisconnect}
                    <button
                        type="button"
                        class="cs-work-workspace-menu-item"
                        data-negative=""
                        disabled={renderedBusy}
                        onclick={() => handleAction(ondisconnect)}
                        onpointerup={(event) => handleItemPointerUp(event, ondisconnect)}
                    >
                        <Unlink size={16} strokeWidth={2.25} class="cs-work-workspace-menu-item-icon" />
                        <span>{t({ de: "Trennen", en: "Disconnect" })}</span>
                    </button>
                {/if}
            {:else if renderedStatus === "needs-permission"}
                <button
                    type="button"
                    class="cs-work-workspace-menu-item"
                    data-emphasis="accent"
                    disabled={renderedBusy}
                    onclick={() => handleAction(ongrant)}
                    onpointerup={(event) => handleItemPointerUp(event, ongrant)}
                >
                    <ShieldCheck size={16} strokeWidth={2.25} class="cs-work-workspace-menu-item-icon" />
                    <span>{t({ de: "Freigeben", en: "Grant access" })}</span>
                </button>
                <button
                    type="button"
                    class="cs-work-workspace-menu-item"
                    disabled={renderedBusy}
                    onclick={() => handleAction(onselect)}
                    onpointerup={(event) => handleItemPointerUp(event, onselect)}
                >
                    <FolderOpen size={16} strokeWidth={2.25} class="cs-work-workspace-menu-item-icon" />
                    <span>{t({ de: "Wechseln", en: "Change" })}</span>
                </button>
            {:else if renderedStatus === "stale"}
                <button
                    type="button"
                    class="cs-work-workspace-menu-item"
                    data-emphasis="accent"
                    disabled={renderedBusy}
                    onclick={() => handleAction(onselect)}
                    onpointerup={(event) => handleItemPointerUp(event, onselect)}
                >
                    <FolderSearch size={16} strokeWidth={2.25} class="cs-work-workspace-menu-item-icon" />
                    <span>{t({ de: "Neu wählen", en: "Select again" })}</span>
                </button>
                {#if ondisconnect}
                    <button
                        type="button"
                        class="cs-work-workspace-menu-item"
                        data-negative=""
                        disabled={renderedBusy}
                        onclick={() => handleAction(ondisconnect)}
                        onpointerup={(event) => handleItemPointerUp(event, ondisconnect)}
                    >
                        <Unlink size={16} strokeWidth={2.25} class="cs-work-workspace-menu-item-icon" />
                        <span>{t({ de: "Trennen", en: "Disconnect" })}</span>
                    </button>
                {/if}
            {:else if renderedStatus === "unlinked"}
                <button
                    type="button"
                    class="cs-work-workspace-menu-item"
                    data-emphasis="accent"
                    disabled={renderedBusy}
                    onclick={() => handleAction(onselect)}
                    onpointerup={(event) => handleItemPointerUp(event, onselect)}
                >
                    <FolderPlus size={16} strokeWidth={2.25} class="cs-work-workspace-menu-item-icon" />
                    <span>{t({ de: "Ordner wählen", en: "Select folder" })}</span>
                </button>
            {/if}
        </div>
    {/if}
</Popover>

<style>
    @layer components.composite {
        :global(.cs-work-workspace-menu) {
            --cs-work-workspace-menu-bg: var(--cs-color-elevated);
            --cs-work-workspace-menu-fg: var(--cs-color-text-main);
            --cs-work-workspace-menu-shadow: var(--cs-shadow-floating);
            --cs-work-workspace-menu-radius: 20px;
            --cs-work-workspace-menu-squircle: var(--cs-squircle);
            --cs-work-workspace-menu-padding: 6px;
            --cs-work-workspace-menu-width: 260px;

            min-inline-size: 240px;
            max-inline-size: 296px;
            padding: var(--cs-work-workspace-menu-padding);
            color: var(--cs-work-workspace-menu-fg);
            font-family: var(--cs-font-sans);
            background-color: var(--cs-work-workspace-menu-bg);
            border-radius: var(--cs-work-workspace-menu-radius);
            corner-shape: var(--cs-work-workspace-menu-squircle);
            box-shadow: var(--cs-work-workspace-menu-shadow);
        }

        :global(.cs-work-workspace-menu:where([data-width="content"])) {
            inline-size: var(--cs-work-workspace-menu-width);
        }

        .cs-work-workspace-menu-identity {
            padding: 6px 6px 4px;
        }

        .cs-work-workspace-menu-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding-inline: 2px;
        }

        .cs-work-workspace-menu-title {
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            font-weight: 600;
            line-height: var(--cs-leading-snug);
        }

        .cs-work-workspace-menu-folder {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 9px 10px;
            margin-block-start: 8px;
            background-color: var(--cs-color-sunken);
            border-radius: var(--cs-radius-lg);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-shadow-sunken);
        }

        .cs-work-workspace-menu-folder > :global(.cs-work-workspace-menu-folder-icon) {
            flex-shrink: 0;
            color: var(--cs-color-text-weak);
        }

        .cs-work-workspace-menu-folder-name {
            color: var(--cs-color-text-strong);
            font-size: var(--cs-text-sm);
            font-weight: 600;
        }

        .cs-work-workspace-menu-folder[data-empty] {
            & > :global(.cs-work-workspace-menu-folder-icon) {
                color: var(--cs-color-text-weaker);
            }

            & .cs-work-workspace-menu-folder-name {
                color: var(--cs-color-text-weak);
                font-weight: 500;
            }
        }

        :global(.cs-work-workspace-menu[data-status="stale"]) .cs-work-workspace-menu-folder {
            & > :global(.cs-work-workspace-menu-folder-icon) {
                color: var(--cs-color-negative-soft-fg);
            }

            & .cs-work-workspace-menu-folder-name {
                color: var(--cs-color-text-weak);
            }
        }

        .cs-work-workspace-menu-caption {
            margin: 6px 0 0;
            padding-inline: 2px;
            font-size: var(--cs-text-xs);
            font-weight: 500;
            line-height: var(--cs-leading-snug);
        }

        :global(.cs-work-workspace-menu[data-status="needs-permission"])
            .cs-work-workspace-menu-caption {
            color: var(--cs-color-caution-soft-fg);
        }

        :global(.cs-work-workspace-menu[data-status="stale"]) .cs-work-workspace-menu-caption {
            color: var(--cs-color-negative-soft-fg);
        }

        .cs-work-workspace-menu-hint {
            margin: 6px 0 0;
            padding-inline: 2px;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-xs);
            line-height: var(--cs-leading-normal);
        }

        .cs-work-workspace-menu-error {
            margin: 8px 0 0;
            padding: 8px 10px;
            color: var(--cs-color-negative-soft-fg);
            font-size: var(--cs-text-xs);
            font-weight: 500;
            line-height: var(--cs-leading-snug);
            background-color: var(--cs-color-negative-soft);
            border-radius: var(--cs-radius-lg);
            corner-shape: var(--cs-squircle-soft);
        }

        .cs-work-workspace-menu-separator {
            height: 1px;
            margin: 6px 6px 4px;
            background-color: color-mix(in oklab, var(--cs-color-text-main) 8%, transparent);
        }

        .cs-work-workspace-menu-actions {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .cs-work-workspace-menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            min-height: 34px;
            padding: 6px 10px 6px 8px;
            color: var(--cs-color-text-strong);
            font-family: inherit;
            font-size: var(--cs-text-sm);
            font-weight: 500;
            line-height: 20px;
            text-align: start;
            background: transparent;
            border: none;
            border-radius: 14px;
            corner-shape: var(--cs-squircle-soft);
            cursor: default;
            transition:
                background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                scale var(--cs-dur-press) var(--cs-ease-press);

            &:hover:not(:disabled),
            &:focus-visible {
                background-color: var(--cs-color-base-soft);
            }

            &:active:not(:disabled) {
                scale: 0.98;
            }

            &[data-emphasis="accent"] {
                color: var(--cs-color-accent-soft-fg);
                font-weight: 600;

                &:hover:not(:disabled),
                &:focus-visible {
                    background-color: var(--cs-color-accent-soft);
                }

                & > :global(.cs-work-workspace-menu-item-icon) {
                    color: var(--cs-color-accent-soft-fg);
                }
            }

            &[data-negative]:hover:not(:disabled),
            &[data-negative]:focus-visible,
            &[data-negative]:active:not(:disabled) {
                color: var(--cs-color-negative-soft-fg);
            }

            & > :global(.cs-work-workspace-menu-item-icon) {
                flex-shrink: 0;
                color: var(--cs-color-text-weak);
                transition: color var(--cs-dur-effect-fast) var(--cs-ease-effect);
            }

            &[data-negative]:hover:not(:disabled) > :global(.cs-work-workspace-menu-item-icon),
            &[data-negative]:focus-visible > :global(.cs-work-workspace-menu-item-icon),
            &[data-negative]:active:not(:disabled) > :global(.cs-work-workspace-menu-item-icon) {
                color: var(--cs-color-negative-soft-fg);
            }
        }
    }
</style>
