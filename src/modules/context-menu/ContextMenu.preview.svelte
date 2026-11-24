<script module>
    export const id = "context-menu";
    export const label = "ContextMenu";
</script>

<script lang="ts">
    import {
        Archive,
        Copy,
        ExternalLink,
        FileCode,
        FileText,
        Folder,
        Image,
        Layers,
        Pencil,
        Share2,
        Sparkles,
        Trash2,
        User,
        Zap,
    } from "@lucide/svelte";
    import {
        CONTEXT_MENU_SIZES,
        ContextMenu,
        ContextMenuCheckboxItem,
        ContextMenuContent,
        ContextMenuFooter,
        ContextMenuGroup,
        ContextMenuGroupLabel,
        ContextMenuHeader,
        ContextMenuItem,
        ContextMenuItemDescription,
        ContextMenuItemIcon,
        ContextMenuItemShortcut,
        ContextMenuItemText,
        ContextMenuRadioGroup,
        ContextMenuRadioItem,
        ContextMenuSeparator,
        contextMenuTrigger,
        type ContextMenuSize,
    } from "cs/svelte/context-menu";
    import { Kbd, KbdGroup, KbdSeparator, type KbdSize } from "cs/svelte/kbd";
    import { Switch } from "cs/svelte/switch";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    interface FileRow {
        id: string;
        name: string;
        meta: string;
        icon: typeof FileText;
    }

    const projectFiles: FileRow[] = [
        { id: "tokens", name: "Design Tokens.json", meta: "18 KB", icon: FileCode },
        { id: "hero", name: "Marketing Hero.png", meta: "1.8 MB", icon: Image },
        { id: "notes", name: "Release Notes.md", meta: "12 KB", icon: FileText },
        { id: "billing", name: "Billing Flow.fig", meta: "4.2 MB", icon: Layers },
    ];

    let activeFile = $state<FileRow | undefined>(projectFiles[0]);

    let showGrid = $state(true);
    let showRulers = $state(true);
    let showGuides = $state(false);
    let snapMode = $state("pixel");
    let compactMode = $state(false);

    const allPanelsSelected = $derived(showGrid && showRulers && showGuides);
    const somePanelsSelected = $derived((showGrid || showRulers || showGuides) && !allPanelsSelected);

    function toggleAllPanels(checked: boolean): void {
        showGrid = checked;
        showRulers = checked;
        showGuides = checked;
    }

    const KBD_SIZE_BY_MENU: Record<ContextMenuSize, KbdSize> = {
        xs: "xs",
        sm: "xs",
        md: "sm",
        lg: "sm",
        xl: "md",
    };

    function kbdSizeFor(size: ContextMenuSize): KbdSize {
        return KBD_SIZE_BY_MENU[size];
    }

    const workspaces = [
        "Design System",
        "Marketing Site",
        "Mobile App",
        "Analytics Core",
        "Customer Portal",
        "Billing Engine",
        "Docs Platform",
        "Internal Tools",
        "API Gateway",
        "Edge Workers",
        "Auth Service",
        "Search Index",
    ] as const;

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Copy, Pencil, Trash2 } from "@lucide/svelte";
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuItem,
        ContextMenuItemIcon,
        ContextMenuItemShortcut,
        ContextMenuItemText,
        ContextMenuSeparator,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
${closeScript}

<ContextMenu size="md">
    <div tabindex="0" class="file-card" {@attach contextMenuTrigger()}>
        Q4 Product Roadmap.fig
    </div>

    <ContextMenuContent>
        <ContextMenuItem onSelect={() => {}}>
            <ContextMenuItemIcon icon={Pencil} />
            <ContextMenuItemText>Rename</ContextMenuItemText>
            <ContextMenuItemShortcut>
                <Kbd variant="ghost" size="sm">F2</Kbd>
            </ContextMenuItemShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => {}}>
            <ContextMenuItemIcon icon={Copy} />
            <ContextMenuItemText>Duplicate</ContextMenuItemText>
            <ContextMenuItemShortcut>
                <KbdGroup variant="ghost" size="sm">
                    <Kbd symbol="ctrl" />
                    <KbdSeparator />
                    <Kbd>D</Kbd>
                </KbdGroup>
            </ContextMenuItemShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem negative onSelect={() => {}}>
            <ContextMenuItemIcon icon={Trash2} />
            <ContextMenuItemText>Delete</ContextMenuItemText>
        </ContextMenuItem>
    </ContextMenuContent>
</ContextMenu>`;

    const sharedCode = `<ContextMenu size="md">
    {#each projectFiles as file (file.id)}
        <div
            tabindex="0"
            class="file-row"
            {@attach contextMenuTrigger({ onOpen: () => (activeFile = file) })}
        >
            {file.name}
        </div>
    {/each}

    <ContextMenuContent>
        {#snippet header()}
            <ContextMenuHeader>
                <div class="text-sm font-medium text-strong">{activeFile.name}</div>
                <div class="text-xs text-weak">{activeFile.meta}</div>
            </ContextMenuHeader>
        {/snippet}
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem negative>Delete</ContextMenuItem>
    </ContextMenuContent>
</ContextMenu>`;

    const sizesCode = `{#each CONTEXT_MENU_SIZES as size (size)}
    <ContextMenu {size}>
        <div tabindex="0" class="trigger-tile" {@attach contextMenuTrigger()}>
            Project
        </div>
        <ContextMenuContent>
            <ContextMenuItem>
                <ContextMenuItemText>Rename</ContextMenuItemText>
                <ContextMenuItemShortcut>
                    <Kbd variant="ghost" size={kbdSizeFor(size)}>F2</Kbd>
                </ContextMenuItemShortcut>
            </ContextMenuItem>
            <ContextMenuItem>Duplicate</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem negative>Delete</ContextMenuItem>
        </ContextMenuContent>
    </ContextMenu>
{/each}`;

    const selectionCode = `<ContextMenu size="md">
    <div tabindex="0" class="canvas-surface" {@attach contextMenuTrigger()}>
        Canvas Viewport
    </div>

    <ContextMenuContent>
        <ContextMenuGroup>
            <ContextMenuGroupLabel>Overlays</ContextMenuGroupLabel>
            <ContextMenuCheckboxItem bind:checked={showGrid}>Grid</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem bind:checked={showRulers}>Rulers</ContextMenuCheckboxItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup bind:value={snapMode}>
            <ContextMenuGroupLabel>Snap to</ContextMenuGroupLabel>
            <ContextMenuRadioItem value="pixel">Pixel grid</ContextMenuRadioItem>
            <ContextMenuRadioItem value="objects">Objects</ContextMenuRadioItem>
            <ContextMenuRadioItem value="none">Off</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
    </ContextMenuContent>
</ContextMenu>`;

    const compoundCode = `<ContextMenu size="md">
    <div tabindex="0" class="workspace-card" {@attach contextMenuTrigger()}>
        Acme Studio
    </div>

    <ContextMenuContent maxHeight="240px">
        {#snippet header()}
            <ContextMenuHeader>
                <div class="text-sm font-medium text-strong">Acme Studio</div>
                <div class="text-xs text-weak">team@acme.dev</div>
            </ContextMenuHeader>
        {/snippet}

        {#each workspaces as name (name)}
            <ContextMenuItem>{name}</ContextMenuItem>
        {/each}

        {#snippet footer()}
            <ContextMenuFooter>
                <span class="text-xs text-weak">{workspaces.length} workspaces</span>
            </ContextMenuFooter>
        {/snippet}
    </ContextMenuContent>
</ContextMenu>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="ContextMenu"
        description="Cursor-anchored action menu triggered by right-click or Shift+F10 on any surface."
    />

    <PreviewSection
        title="Basic"
        description="Right-click or focus and press Shift+F10 to open actions with shortcuts and destructive items."
        code={basicCode}
    >
        <ContextMenu size="md">
            <button
                type="button"
                class="cs-preview-context-surface flex w-full max-w-xs items-center gap-3 rounded-2xl border border-base-soft bg-base px-4 py-3.5 text-left select-none"
                {@attach contextMenuTrigger()}
            >
                <div class="flex-center size-9 shrink-0 rounded-xl bg-subtle text-weak">
                    <Layers class="size-4.5" />
                </div>
                <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium text-strong">Q4 Product Roadmap.fig</div>
                    <div class="flex items-center gap-1.5 text-xs text-weak">
                        <span>Figma</span>
                        <!-- eslint-disable-next-line dots/prefer-sparingly -->
                        <span class="dot-sm"></span>
                        <span>4.2 MB</span>
                    </div>
                </div>
            </button>

            <ContextMenuContent>
                <ContextMenuItem>
                    <ContextMenuItemIcon icon={ExternalLink} />
                    <ContextMenuItemText>Open</ContextMenuItemText>
                </ContextMenuItem>
                <ContextMenuItem>
                    <ContextMenuItemIcon icon={Pencil} />
                    <ContextMenuItemText>Rename</ContextMenuItemText>
                    <ContextMenuItemShortcut>
                        <Kbd variant="ghost" size="sm">F2</Kbd>
                    </ContextMenuItemShortcut>
                </ContextMenuItem>
                <ContextMenuItem>
                    <ContextMenuItemIcon icon={Copy} />
                    <ContextMenuItemText>Duplicate</ContextMenuItemText>
                    <ContextMenuItemShortcut>
                        <KbdGroup variant="ghost" size="sm">
                            <Kbd symbol="ctrl" />
                            <KbdSeparator />
                            <Kbd>D</Kbd>
                        </KbdGroup>
                    </ContextMenuItemShortcut>
                </ContextMenuItem>
                <ContextMenuItem>
                    <ContextMenuItemIcon icon={Share2} />
                    <ContextMenuItemText>Share</ContextMenuItemText>
                    <ContextMenuItemShortcut>
                        <KbdGroup variant="ghost" size="sm">
                            <Kbd symbol="ctrl" />
                            <KbdSeparator />
                            <Kbd symbol="shift" />
                            <KbdSeparator />
                            <Kbd>S</Kbd>
                        </KbdGroup>
                    </ContextMenuItemShortcut>
                </ContextMenuItem>
                <ContextMenuItem>
                    <ContextMenuItemIcon icon={Archive} />
                    <ContextMenuItemText>Archive</ContextMenuItemText>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem negative>
                    <ContextMenuItemIcon icon={Trash2} />
                    <ContextMenuItemText>Delete</ContextMenuItemText>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    </PreviewSection>

    <PreviewSection
        title="Shared Trigger"
        description="Multiple rows sharing one ContextMenu instance, with data-open highlighting the active target."
        code={sharedCode}
    >
        <ContextMenu size="md">
            <div class="flex w-full max-w-sm flex-col divide-y divide-base-soft rounded-2xl border border-base-soft bg-base">
                {#each projectFiles as file (file.id)}
                    <button
                        type="button"
                        class="cs-preview-context-row flex w-full items-center justify-between gap-3 bg-base px-4 py-2.5 text-left select-none first:rounded-t-[15px] last:rounded-b-[15px] focus-visible:z-1"
                        {@attach contextMenuTrigger({ onOpen: () => (activeFile = file) })}
                    >
                        <div class="flex min-w-0 items-center gap-3">
                            <file.icon class="size-4 shrink-0 text-weak" />
                            <span class="truncate text-sm font-medium text-strong">{file.name}</span>
                        </div>
                        <span class="shrink-0 text-xs text-weak">{file.meta}</span>
                    </button>
                {/each}
            </div>

            <ContextMenuContent>
                {#snippet header()}
                    <ContextMenuHeader>
                        <div class="truncate text-sm font-medium text-strong">{activeFile?.name}</div>
                        <div class="text-xs text-weak">{activeFile?.meta}</div>
                    </ContextMenuHeader>
                {/snippet}

                <ContextMenuItem>
                    <ContextMenuItemIcon icon={ExternalLink} />
                    <ContextMenuItemText>Open</ContextMenuItemText>
                </ContextMenuItem>
                <ContextMenuItem>
                    <ContextMenuItemIcon icon={Pencil} />
                    <ContextMenuItemText>Rename</ContextMenuItemText>
                    <ContextMenuItemShortcut>
                        <Kbd variant="ghost" size="sm">F2</Kbd>
                    </ContextMenuItemShortcut>
                </ContextMenuItem>
                <ContextMenuItem>
                    <ContextMenuItemIcon icon={Copy} />
                    <ContextMenuItemText>Duplicate</ContextMenuItemText>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem negative>
                    <ContextMenuItemIcon icon={Trash2} />
                    <ContextMenuItemText>Delete</ContextMenuItemText>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five T-shirt sizes from xs through xl matching Dropdown and Select."
        code={sizesCode}
    >
        <div class="flex flex-wrap items-center gap-3">
            {#each CONTEXT_MENU_SIZES as size (size)}
                <div class="flex items-center gap-2">
                    <span class="w-5 text-xs font-medium text-weak uppercase">{size}</span>

                    <ContextMenu {size}>
                        <button
                            type="button"
                            class="cs-preview-context-surface rounded-xl border border-base-soft bg-base px-3.5 py-2 text-sm font-medium text-strong select-none"
                            {@attach contextMenuTrigger()}
                        >
                            Project
                        </button>

                        <ContextMenuContent>
                            <ContextMenuItem>
                                <ContextMenuItemIcon icon={Pencil} />
                                <ContextMenuItemText>Rename</ContextMenuItemText>
                                <ContextMenuItemShortcut>
                                    <Kbd variant="ghost" size={kbdSizeFor(size)}>F2</Kbd>
                                </ContextMenuItemShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem>
                                <ContextMenuItemIcon icon={Copy} />
                                <ContextMenuItemText>Duplicate</ContextMenuItemText>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem negative>
                                <ContextMenuItemIcon icon={Trash2} />
                                <ContextMenuItemText>Delete</ContextMenuItemText>
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Selection"
        description="Grouped checkbox and radio items stay open by default for multi-step configuration."
        code={selectionCode}
    >
        <ContextMenu size="md">
            <button
                type="button"
                class="cs-preview-context-surface flex-center h-28 w-full max-w-xs rounded-2xl border border-dashed border-base-soft bg-subtle/40 px-4 text-sm font-medium text-weak select-none"
                {@attach contextMenuTrigger()}
            >
                Canvas Viewport
            </button>

            <ContextMenuContent>
                <ContextMenuGroup>
                    <ContextMenuGroupLabel>Overlays</ContextMenuGroupLabel>
                    <ContextMenuCheckboxItem
                        bind:checked={() => allPanelsSelected, toggleAllPanels}
                        indeterminate={somePanelsSelected}
                    >
                        All overlays
                    </ContextMenuCheckboxItem>
                    <ContextMenuCheckboxItem bind:checked={showGrid}>Grid</ContextMenuCheckboxItem>
                    <ContextMenuCheckboxItem bind:checked={showRulers}>Rulers</ContextMenuCheckboxItem>
                    <ContextMenuCheckboxItem bind:checked={showGuides}>Guides</ContextMenuCheckboxItem>
                </ContextMenuGroup>

                <ContextMenuSeparator />

                <ContextMenuRadioGroup bind:value={snapMode}>
                    <ContextMenuGroupLabel>Snap to</ContextMenuGroupLabel>
                    <ContextMenuRadioItem value="pixel">Pixel grid</ContextMenuRadioItem>
                    <ContextMenuRadioItem value="objects">Objects</ContextMenuRadioItem>
                    <ContextMenuRadioItem value="none">Off</ContextMenuRadioItem>
                </ContextMenuRadioGroup>
            </ContextMenuContent>
        </ContextMenu>
    </PreviewSection>

    <PreviewSection
        title="Compound"
        description="Pinned header and footer around a scrollable list, plus descriptions, an inline switch row, and disabled items."
        code={compoundCode}
    >
        <div class="flex flex-wrap items-center gap-4">
            <ContextMenu size="md">
                <button
                    type="button"
                    class="cs-preview-context-surface flex items-center gap-3 rounded-2xl border border-base-soft bg-base px-4 py-3 text-left select-none"
                    {@attach contextMenuTrigger()}
                >
                    <Folder class="size-4.5 text-weak" />
                    <div>
                        <div class="text-sm font-medium text-strong">Acme Studio</div>
                        <div class="text-xs text-weak">team@acme.dev</div>
                    </div>
                </button>

                <ContextMenuContent maxHeight="240px">
                    {#snippet header()}
                        <ContextMenuHeader>
                            <div class="text-sm font-medium text-strong">Acme Studio</div>
                            <div class="text-xs text-weak">team@acme.dev</div>
                        </ContextMenuHeader>
                    {/snippet}

                    {#each workspaces as name (name)}
                        <ContextMenuItem>
                            <ContextMenuItemIcon icon={Folder} />
                            <ContextMenuItemText>{name}</ContextMenuItemText>
                        </ContextMenuItem>
                    {/each}

                    {#snippet footer()}
                        <ContextMenuFooter>
                            <span class="text-xs text-weak">{workspaces.length} workspaces</span>
                        </ContextMenuFooter>
                    {/snippet}
                </ContextMenuContent>
            </ContextMenu>

            <ContextMenu size="md">
                <button
                    type="button"
                    class="cs-preview-context-surface flex items-center gap-3 rounded-2xl border border-base-soft bg-base px-4 py-3 text-left select-none"
                    {@attach contextMenuTrigger()}
                >
                    <Sparkles class="size-4.5 text-weak" />
                    <div>
                        <div class="text-sm font-medium text-strong">Editor Preferences</div>
                        <div class="text-xs text-weak">Workspace settings</div>
                    </div>
                </button>

                <ContextMenuContent>
                    <ContextMenuItem>
                        <ContextMenuItemIcon icon={Zap} />
                        <ContextMenuItemText>Quick Actions</ContextMenuItemText>
                        <ContextMenuItemDescription>Run commands without leaving the canvas</ContextMenuItemDescription>
                    </ContextMenuItem>
                    <ContextMenuItem>
                        <ContextMenuItemIcon icon={Sparkles} />
                        <ContextMenuItemText>Smart Snapping</ContextMenuItemText>
                        <ContextMenuItemDescription>Align layers automatically while dragging</ContextMenuItemDescription>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <div class="cs-context-menu-row">
                        <label class="flex w-full items-center justify-between gap-3">
                            <span>Compact mode</span>
                            <Switch size="sm" bind:checked={compactMode} />
                        </label>
                    </div>
                    <ContextMenuSeparator />
                    <ContextMenuItem href="https://example.com" target="_blank" rel="noopener">
                        <ContextMenuItemIcon icon={ExternalLink} />
                        <ContextMenuItemText>Documentation</ContextMenuItemText>
                    </ContextMenuItem>
                    <ContextMenuItem disabled>
                        <ContextMenuItemIcon icon={User} />
                        <ContextMenuItemText>Billing (Admin only)</ContextMenuItemText>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    </PreviewSection>
</div>

<style>
    .cs-preview-context-surface,
    .cs-preview-context-row {
        transition: background-color var(--cs-dur-hover) var(--cs-ease-quad-out);

        &:focus:not(:focus-visible) {
            outline: none;
        }

        &:focus-visible {
            outline: 2px solid var(--cs-color-focus-ring);
            outline-offset: -2px;
        }
    }

    :global(.cs-preview-context-row[data-open]) {
        background-color: var(--cs-color-base-soft);
    }
</style>
