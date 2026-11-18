<script lang="ts">
    import { Folder } from "@lucide/svelte";

    import { Button, ButtonLabel } from "../../modules/button/index.ts";
    import { Popover } from "../../modules/popover/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { WORKSPACE_ACCESS_DOT_STATUS_MAP, type WorkWorkspaceMenuProps } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        status,
        directoryName,
        busy = false,
        errorMessage,
        placement = "bottom-start",
        width = "content",
        offset = "16px",
        onselect,
        ongrant,
        ondisconnect,
        class: className,
        ...rest
    }: WorkWorkspaceMenuProps = $props();

    const dotStatus = $derived(WORKSPACE_ACCESS_DOT_STATUS_MAP[status]);
    const trimmedFolderName = $derived(directoryName?.trim() ?? "");
    const trimmedError = $derived(errorMessage?.trim() ?? "");

    const statusLabel = $derived.by(() => {
        switch (status) {
            case "ready": {
                return t({ de: "Ausgewählt", en: "Selected" });
            }
            case "needs-permission": {
                return t({ de: "Freigabe erforderlich", en: "Permission required" });
            }
            case "stale": {
                return t({ de: "Ordner nicht erreichbar", en: "Folder unavailable" });
            }
            case "unlinked": {
                return t({ de: "Kein Ordner gewählt", en: "No folder selected" });
            }
            case "restoring": {
                return t({ de: "Wird wiederhergestellt...", en: "Restoring..." });
            }
            case "unsupported": {
                return t({ de: "Nicht unterstützt", en: "Not supported" });
            }
        }
    });

    const hintCopy = $derived.by(() => {
        switch (status) {
            case "unlinked": {
                return t({
                    de: "Bitte wähle einen Arbeitsordner.",
                    en: "Please select a workspace folder.",
                });
            }
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

    const showFolderBox = $derived(["ready", "needs-permission", "stale"].includes(status));

    const folderDisplayName = $derived.by(() => {
        if (trimmedFolderName.length > 0) {
            return trimmedFolderName;
        }
        if (status === "ready") {
            return t({ de: "Ausgewählter Ordner", en: "Selected folder" });
        }
        return t({ de: "Kein Ordner gewählt", en: "No folder selected" });
    });

    const hasActions = $derived(
        ["ready", "needs-permission", "stale", "unlinked"].includes(status),
    );

    function handleAction(callback?: () => void | Promise<void>): void {
        // Close before invoking callbacks so native pickers or prompts open without an overlapping menu.
        ref?.hidePopover?.();
        void callback?.();
    }
</script>

<Popover
    bind:ref
    role="region"
    aria-label={t({ de: "Arbeitsordner", en: "Workspace folder" })}
    {...rest}
    {id}
    {placement}
    {width}
    {offset}
    popover="auto"
    class={["cs-work-workspace-menu", className]}
    data-status={status}
    data-dot-status={dotStatus}
    data-busy={busy ? "" : undefined}
>
    <div class="cs-work-workspace-menu-status">
        <span class="cs-work-workspace-menu-dot" aria-hidden="true"></span>
        <span class="cs-work-workspace-menu-status-label">{statusLabel}</span>
    </div>

    {#if showFolderBox}
        <div class="cs-work-workspace-menu-folder">
            <Folder size={14} strokeWidth={2} class="cs-work-workspace-menu-folder-icon" />
            <span class="cs-work-workspace-menu-folder-name text-trim-truncate">
                {folderDisplayName}
            </span>
        </div>
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

    {#if hasActions}
        <div class="cs-work-workspace-menu-actions">
            {#if status === "ready"}
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    class="cs-work-workspace-menu-action-grow"
                    onclick={() => handleAction(onselect)}
                >
                    <ButtonLabel>{t({ de: "Wechseln", en: "Change" })}</ButtonLabel>
                </Button>
                {#if ondisconnect}
                    <Button
                        variant="ghost"
                        negative
                        size="sm"
                        disabled={busy}
                        onclick={() => handleAction(ondisconnect)}
                    >
                        <ButtonLabel>{t({ de: "Trennen", en: "Disconnect" })}</ButtonLabel>
                    </Button>
                {/if}
            {:else if status === "needs-permission"}
                <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    class="cs-work-workspace-menu-action-grow"
                    onclick={() => handleAction(ongrant)}
                >
                    <ButtonLabel>{t({ de: "Freigeben", en: "Grant access" })}</ButtonLabel>
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onclick={() => handleAction(onselect)}
                >
                    <ButtonLabel>{t({ de: "Wechseln", en: "Change" })}</ButtonLabel>
                </Button>
                {#if ondisconnect}
                    <Button
                        variant="ghost"
                        negative
                        size="sm"
                        disabled={busy}
                        onclick={() => handleAction(ondisconnect)}
                    >
                        <ButtonLabel>{t({ de: "Trennen", en: "Disconnect" })}</ButtonLabel>
                    </Button>
                {/if}
            {:else if status === "stale"}
                <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    class="cs-work-workspace-menu-action-grow"
                    onclick={() => handleAction(onselect)}
                >
                    <ButtonLabel>{t({ de: "Neu wählen", en: "Select again" })}</ButtonLabel>
                </Button>
                {#if ondisconnect}
                    <Button
                        variant="ghost"
                        negative
                        size="sm"
                        disabled={busy}
                        onclick={() => handleAction(ondisconnect)}
                    >
                        <ButtonLabel>{t({ de: "Trennen", en: "Disconnect" })}</ButtonLabel>
                    </Button>
                {/if}
            {:else if status === "unlinked"}
                <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    class="cs-work-workspace-menu-action-grow"
                    onclick={() => handleAction(onselect)}
                >
                    <ButtonLabel>{t({ de: "Ordner wählen", en: "Select folder" })}</ButtonLabel>
                </Button>
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
            --cs-work-workspace-menu-padding: 12px;
            --cs-work-workspace-menu-width: 264px;
            --cs-work-workspace-menu-dot-bg: var(--cs-color-negative-solid);
            --cs-work-workspace-menu-label-fg: var(--cs-color-text-weak);

            display: flex;
            flex-direction: column;
            min-inline-size: 240px;
            max-inline-size: 300px;
            padding: var(--cs-work-workspace-menu-padding);
            color: var(--cs-work-workspace-menu-fg);
            font-family: var(--cs-font-sans);
            background-color: var(--cs-work-workspace-menu-bg);
            border-radius: var(--cs-work-workspace-menu-radius);
            corner-shape: var(--cs-work-workspace-menu-squircle);
            box-shadow: var(--cs-work-workspace-menu-shadow);

            &[data-dot-status="positive"] {
                --cs-work-workspace-menu-dot-bg: var(--cs-color-positive-solid);
                --cs-work-workspace-menu-label-fg: var(--cs-color-positive-soft-fg);
            }

            &[data-dot-status="caution"] {
                --cs-work-workspace-menu-dot-bg: var(--cs-color-caution-solid);
                --cs-work-workspace-menu-label-fg: var(--cs-color-caution-soft-fg);
            }

            &[data-dot-status="negative"] {
                --cs-work-workspace-menu-dot-bg: var(--cs-color-negative-solid);
                --cs-work-workspace-menu-label-fg: var(--cs-color-negative-soft-fg);
            }

            &[data-dot-status="base"] {
                --cs-work-workspace-menu-dot-bg: var(--cs-color-base-400);
                --cs-work-workspace-menu-label-fg: var(--cs-color-text-weak);
            }
        }

        :global(.cs-work-workspace-menu:where([data-width="content"])) {
            inline-size: var(--cs-work-workspace-menu-width);
        }

        .cs-work-workspace-menu-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-inline: 4px;
        }

        .cs-work-workspace-menu-dot {
            flex-shrink: 0;
            inline-size: 8px;
            block-size: 8px;
            background-color: var(--cs-work-workspace-menu-dot-bg);
            border-radius: var(--cs-radius-full);
        }

        .cs-work-workspace-menu-status-label {
            color: var(--cs-work-workspace-menu-label-fg);
            font-size: var(--cs-text-xs);
            font-weight: 600;
            line-height: var(--cs-leading-snug);
        }

        .cs-work-workspace-menu-folder {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
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

        :global(.cs-work-workspace-menu[data-status="stale"]) .cs-work-workspace-menu-folder {
            & > :global(.cs-work-workspace-menu-folder-icon) {
                color: var(--cs-color-negative-soft-fg);
            }

            & .cs-work-workspace-menu-folder-name {
                color: var(--cs-color-text-weak);
            }
        }

        .cs-work-workspace-menu-hint {
            margin: 6px 0 0;
            padding-inline: 4px;
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

        .cs-work-workspace-menu-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            margin-block-start: 12px;
        }

        .cs-work-workspace-menu-actions > :global(.cs-work-workspace-menu-action-grow) {
            flex: 1;
        }
    }
</style>
