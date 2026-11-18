<script module>
    export const id = "dropdown";
    export const label = "Dropdown";
</script>

<script lang="ts">
    import {
        Archive,
        Copy,
        ExternalLink,
        Folder,
        MoreHorizontal,
        Pencil,
        Share2,
        Sparkles,
        Trash2,
        User,
        Zap,
    } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        DROPDOWN_SIZES,
        Dropdown,
        DropdownCheckboxItem,
        DropdownContent,
        DropdownFooter,
        DropdownGroup,
        DropdownGroupLabel,
        DropdownHeader,
        DropdownItem,
        DropdownItemDescription,
        DropdownItemIcon,
        DropdownItemShortcut,
        DropdownItemText,
        DropdownRadioGroup,
        DropdownRadioItem,
        DropdownSeparator,
        dropdownTrigger,
        type DropdownSize,
    } from "cs/svelte/dropdown";
    import { HitArea } from "cs/svelte/hit-area";
    import { Kbd, KbdGroup, KbdSeparator, type KbdSize } from "cs/svelte/kbd";
    import { Switch } from "cs/svelte/switch";
    import { tooltip } from "cs/svelte/tooltip";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";
    import { TextMorph } from "../text-morph/index.ts";

    let lastAction = $state("None");
    let confirmDelete = $state(false);
    let deletedCount = $state(0);

    let showToolbar = $state(true);
    let showSidebar = $state(true);
    let showMinimap = $state(false);
    let sortBy = $state("updated");
    let compactMode = $state(false);

    const allPanelsSelected = $derived(showToolbar && showSidebar && showMinimap);
    const somePanelsSelected = $derived((showToolbar || showSidebar || showMinimap) && !allPanelsSelected);

    function toggleAllPanels(checked: boolean): void {
        showToolbar = checked;
        showSidebar = checked;
        showMinimap = checked;
    }

    const KBD_SIZE_BY_DROPDOWN: Record<DropdownSize, KbdSize> = {
        xs: "xs",
        sm: "xs",
        md: "sm",
        lg: "sm",
        xl: "md",
    };

    function kbdSizeFor(size: DropdownSize): KbdSize {
        return KBD_SIZE_BY_DROPDOWN[size];
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
    import { Button } from "cs/svelte/button";
    import {
        Dropdown,
        DropdownContent,
        DropdownItem,
        DropdownItemIcon,
        DropdownItemShortcut,
        DropdownItemText,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
${closeScript}

<Dropdown size="md">
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>Actions</Button>

    <DropdownContent>
        <DropdownItem onSelect={() => {}}>
            <DropdownItemIcon icon={Pencil} />
            <DropdownItemText>Rename</DropdownItemText>
            <DropdownItemShortcut>
                <Kbd variant="ghost" size="sm">F2</Kbd>
            </DropdownItemShortcut>
        </DropdownItem>
        <DropdownItem onSelect={() => {}}>
            <DropdownItemIcon icon={Copy} />
            <DropdownItemText>Duplicate</DropdownItemText>
            <DropdownItemShortcut>
                <KbdGroup variant="ghost" size="sm">
                    <Kbd symbol="ctrl" />
                    <KbdSeparator />
                    <Kbd>D</Kbd>
                </KbdGroup>
            </DropdownItemShortcut>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem negative onSelect={() => {}}>
            <DropdownItemIcon icon={Trash2} />
            <DropdownItemText>Delete</DropdownItemText>
        </DropdownItem>
    </DropdownContent>
</Dropdown>`;

    const sizesCode = `{#each DROPDOWN_SIZES as size (size)}
    <Dropdown {size}>
        <Button variant="secondary" {size} {@attach dropdownTrigger()}>Menu</Button>
        <DropdownContent>
            <DropdownItem>
                <DropdownItemText>Rename</DropdownItemText>
                <DropdownItemShortcut>
                    <Kbd variant="ghost" size={kbdSizeFor(size)}>F2</Kbd>
                </DropdownItemShortcut>
            </DropdownItem>
            <DropdownItem>Duplicate</DropdownItem>
            <DropdownSeparator />
            <DropdownItem negative>Delete</DropdownItem>
        </DropdownContent>
    </Dropdown>
{/each}`;

    const selectionCode = `<Dropdown size="md">
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>View</Button>

    <DropdownContent>
        <DropdownGroup>
            <DropdownGroupLabel>Panels</DropdownGroupLabel>
            <DropdownCheckboxItem bind:checked={showToolbar}>Toolbar</DropdownCheckboxItem>
            <DropdownCheckboxItem bind:checked={showSidebar}>Sidebar</DropdownCheckboxItem>
        </DropdownGroup>
        <DropdownSeparator />
        <DropdownRadioGroup bind:value={sortBy}>
            <DropdownGroupLabel>Sort by</DropdownGroupLabel>
            <DropdownRadioItem value="name">Name</DropdownRadioItem>
            <DropdownRadioItem value="updated">Last updated</DropdownRadioItem>
            <DropdownRadioItem value="size">Size</DropdownRadioItem>
        </DropdownRadioGroup>
    </DropdownContent>
</Dropdown>`;

    const compoundCode = `<Dropdown size="md">
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>Workspace</Button>

    <DropdownContent>
        {#snippet header()}
            <DropdownHeader>
                <div class="text-sm font-medium text-strong">Acme Studio</div>
                <div class="text-xs text-weak">team@acme.dev</div>
            </DropdownHeader>
        {/snippet}

        {#each workspaces as name (name)}
            <DropdownItem>{name}</DropdownItem>
        {/each}

        {#snippet footer()}
            <DropdownFooter>
                <span class="text-xs text-weak">12 workspaces</span>
            </DropdownFooter>
        {/snippet}
    </DropdownContent>
</Dropdown>`;

    const confirmDeleteCode = `<Dropdown
    size="md"
    onOpenChange={(open) => {
        if (!open) confirmDelete = false;
    }}
>
    <Button variant="secondary" size="md" {@attach dropdownTrigger()}>Project</Button>

    <DropdownContent>
        <DropdownItem>
            <DropdownItemIcon icon={Pencil} />
            <DropdownItemText>Rename</DropdownItemText>
        </DropdownItem>
        <DropdownItem>
            <DropdownItemIcon icon={Copy} />
            <DropdownItemText>Duplicate</DropdownItemText>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
            negative
            closeOnSelect={confirmDelete}
            class={confirmDelete ? "cs-preview-delete-confirm" : undefined}
            onSelect={(event) => {
                if (!confirmDelete) {
                    event.preventDefault();
                    confirmDelete = true;
                    return;
                }
                deletedCount += 1;
            }}
        >
            <DropdownItemIcon icon={Trash2} />
            <DropdownItemText>
                <TextMorph text={confirmDelete ? "Confirm delete?" : "Delete"} />
            </DropdownItemText>
        </DropdownItem>
    </DropdownContent>
</Dropdown>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Dropdown"
        description="Composable action and command menu attached to any trigger with shortcuts, toggles, and pinned regions."
    />

    <PreviewSection
        title="Basic"
        description="Action menu with icons, Kbd shortcuts, separators, and destructive items."
        code={basicCode}
    >
        <div class="flex flex-wrap items-center gap-4">
            <Dropdown size="md">
                <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
                    <ButtonLabel>Actions</ButtonLabel>
                </Button>

                <DropdownContent>
                    <DropdownItem onSelect={() => (lastAction = "Rename")}>
                        <DropdownItemIcon icon={Pencil} />
                        <DropdownItemText>Rename</DropdownItemText>
                        <DropdownItemShortcut>
                            <Kbd variant="ghost" size="sm">F2</Kbd>
                        </DropdownItemShortcut>
                    </DropdownItem>
                    <DropdownItem onSelect={() => (lastAction = "Duplicate")}>
                        <DropdownItemIcon icon={Copy} />
                        <DropdownItemText>Duplicate</DropdownItemText>
                        <DropdownItemShortcut>
                            <KbdGroup variant="ghost" size="sm">
                                <Kbd symbol="ctrl" />
                                <KbdSeparator />
                                <Kbd>D</Kbd>
                            </KbdGroup>
                        </DropdownItemShortcut>
                    </DropdownItem>
                    <DropdownItem onSelect={() => (lastAction = "Share")}>
                        <DropdownItemIcon icon={Share2} />
                        <DropdownItemText>Share</DropdownItemText>
                        <DropdownItemShortcut>
                            <KbdGroup variant="ghost" size="sm">
                                <Kbd symbol="ctrl" />
                                <KbdSeparator />
                                <Kbd symbol="shift" />
                                <KbdSeparator />
                                <Kbd>S</Kbd>
                            </KbdGroup>
                        </DropdownItemShortcut>
                    </DropdownItem>
                    <DropdownItem onSelect={() => (lastAction = "Archive")}>
                        <DropdownItemIcon icon={Archive} />
                        <DropdownItemText>Archive</DropdownItemText>
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem negative onSelect={() => (lastAction = "Delete")}>
                        <DropdownItemIcon icon={Trash2} />
                        <DropdownItemText>Delete</DropdownItemText>
                    </DropdownItem>
                </DropdownContent>
            </Dropdown>

            <span class="text-xs text-weak">
                Last action: <span class="font-medium text-strong">{lastAction}</span>
            </span>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five T-shirt sizes from xs through xl paired with matching Button and iconOnly triggers."
        code={sizesCode}
    >
        <div class="flex flex-col items-start gap-3">
            {#each DROPDOWN_SIZES as size (size)}
                <div class="flex items-center gap-3">
                    <span class="w-6 text-xs font-medium text-weak uppercase">{size}</span>

                    <Dropdown {size}>
                        <Button variant="secondary" {size} {@attach dropdownTrigger()}>
                            <ButtonLabel>Menu</ButtonLabel>
                        </Button>

                        <DropdownContent>
                            <DropdownItem>
                                <DropdownItemIcon icon={Pencil} />
                                <DropdownItemText>Rename</DropdownItemText>
                                <DropdownItemShortcut>
                                    <Kbd variant="ghost" size={kbdSizeFor(size)}>F2</Kbd>
                                </DropdownItemShortcut>
                            </DropdownItem>
                            <DropdownItem>
                                <DropdownItemIcon icon={Copy} />
                                <DropdownItemText>Duplicate</DropdownItemText>
                            </DropdownItem>
                            <DropdownSeparator />
                            <DropdownItem negative>
                                <DropdownItemIcon icon={Trash2} />
                                <DropdownItemText>Delete</DropdownItemText>
                            </DropdownItem>
                        </DropdownContent>
                    </Dropdown>

                    <Dropdown {size}>
                        <Button
                            variant="ghost"
                            {size}
                            iconOnly
                            aria-label="More options"
                            {@attach tooltip({ text: "More options" })}
                            {@attach dropdownTrigger()}
                        >
                            <ButtonIcon icon={MoreHorizontal} />
                            <HitArea size="md" />
                        </Button>

                        <DropdownContent>
                            <DropdownItem>
                                <DropdownItemIcon icon={Share2} />
                                <DropdownItemText>Share</DropdownItemText>
                            </DropdownItem>
                            <DropdownItem>
                                <DropdownItemIcon icon={Archive} />
                                <DropdownItemText>Archive</DropdownItemText>
                            </DropdownItem>
                            <DropdownSeparator />
                            <DropdownItem negative>
                                <DropdownItemIcon icon={Trash2} />
                                <DropdownItemText>Delete</DropdownItemText>
                            </DropdownItem>
                        </DropdownContent>
                    </Dropdown>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Selection"
        description="Checkbox and radio items stay open by default for multi-step view configuration."
        code={selectionCode}
    >
        <Dropdown size="md">
            <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
                <ButtonLabel>View</ButtonLabel>
            </Button>

            <DropdownContent>
                <DropdownGroup>
                    <DropdownGroupLabel>Panels</DropdownGroupLabel>
                    <DropdownCheckboxItem
                        bind:checked={() => allPanelsSelected, toggleAllPanels}
                        indeterminate={somePanelsSelected}
                    >
                        All panels
                    </DropdownCheckboxItem>
                    <DropdownCheckboxItem bind:checked={showToolbar}>Toolbar</DropdownCheckboxItem>
                    <DropdownCheckboxItem bind:checked={showSidebar}>Sidebar</DropdownCheckboxItem>
                    <DropdownCheckboxItem bind:checked={showMinimap}>Minimap</DropdownCheckboxItem>
                </DropdownGroup>

                <DropdownSeparator />

                <DropdownRadioGroup bind:value={sortBy}>
                    <DropdownGroupLabel>Sort by</DropdownGroupLabel>
                    <DropdownRadioItem value="name">Name</DropdownRadioItem>
                    <DropdownRadioItem value="updated">Last updated</DropdownRadioItem>
                    <DropdownRadioItem value="size">Size</DropdownRadioItem>
                </DropdownRadioGroup>
            </DropdownContent>
        </Dropdown>
    </PreviewSection>

    <PreviewSection
        title="Compound"
        description="Pinned header and footer around a scrollable list, plus descriptions, links, inline widgets, and disabled items."
        code={compoundCode}
    >
        <div class="flex flex-wrap items-center gap-4">
            <Dropdown size="md">
                <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
                    <ButtonLabel>Workspace</ButtonLabel>
                </Button>

                <DropdownContent maxHeight="240px">
                    {#snippet header()}
                        <DropdownHeader>
                            <div class="text-sm font-medium text-strong">Acme Studio</div>
                            <div class="text-xs text-weak">team@acme.dev</div>
                        </DropdownHeader>
                    {/snippet}

                    {#each workspaces as name (name)}
                        <DropdownItem>
                            <DropdownItemIcon icon={Folder} />
                            <DropdownItemText>{name}</DropdownItemText>
                        </DropdownItem>
                    {/each}

                    {#snippet footer()}
                        <DropdownFooter>
                            <span class="text-xs text-weak">{workspaces.length} workspaces</span>
                        </DropdownFooter>
                    {/snippet}
                </DropdownContent>
            </Dropdown>

            <Dropdown size="md">
                <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
                    <ButtonLabel>Preferences</ButtonLabel>
                </Button>

                <DropdownContent>
                    <DropdownItem>
                        <DropdownItemIcon icon={Zap} />
                        <DropdownItemText>Quick Actions</DropdownItemText>
                        <DropdownItemDescription>Run commands without leaving the page</DropdownItemDescription>
                    </DropdownItem>
                    <DropdownItem>
                        <DropdownItemIcon icon={Sparkles} />
                        <DropdownItemText>Smart Suggestions</DropdownItemText>
                        <DropdownItemDescription>Predict next steps from context</DropdownItemDescription>
                    </DropdownItem>
                    <DropdownSeparator />
                    <div class="cs-dropdown-row">
                        <label class="flex w-full items-center justify-between gap-3">
                            <span>Compact mode</span>
                            <Switch size="sm" bind:checked={compactMode} />
                        </label>
                    </div>
                    <DropdownSeparator />
                    <DropdownItem href="https://example.com" target="_blank" rel="noopener">
                        <DropdownItemIcon icon={ExternalLink} />
                        <DropdownItemText>Documentation</DropdownItemText>
                    </DropdownItem>
                    <DropdownItem disabled>
                        <DropdownItemIcon icon={User} />
                        <DropdownItemText>Billing (Admin only)</DropdownItemText>
                    </DropdownItem>
                </DropdownContent>
            </Dropdown>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Inline Confirm"
        description="Two-step destructive confirmation inside a menu using TextMorph and state-driven item styling."
        code={confirmDeleteCode}
    >
        <div class="flex flex-wrap items-center gap-4">
            <Dropdown
                size="md"
                onOpenChange={(open) => {
                    if (!open) confirmDelete = false;
                }}
            >
                <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
                    <ButtonLabel>Project</ButtonLabel>
                </Button>

                <DropdownContent>
                    <DropdownItem>
                        <DropdownItemIcon icon={Pencil} />
                        <DropdownItemText>Rename</DropdownItemText>
                    </DropdownItem>
                    <DropdownItem>
                        <DropdownItemIcon icon={Copy} />
                        <DropdownItemText>Duplicate</DropdownItemText>
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem
                        negative
                        closeOnSelect={confirmDelete}
                        class={confirmDelete ? "cs-preview-delete-confirm" : undefined}
                        onSelect={(event) => {
                            if (!confirmDelete) {
                                event.preventDefault();
                                confirmDelete = true;
                                return;
                            }
                            deletedCount += 1;
                        }}
                    >
                        <DropdownItemIcon icon={Trash2} />
                        <DropdownItemText>
                            <TextMorph text={confirmDelete ? "Confirm delete?" : "Delete"} />
                        </DropdownItemText>
                    </DropdownItem>
                </DropdownContent>
            </Dropdown>

            <span class="text-xs text-weak">
                Deleted: <span class="font-medium text-strong">{deletedCount}</span>
            </span>
        </div>
    </PreviewSection>
</div>

<style>
    :global(.cs-dropdown-item.cs-preview-delete-confirm) {
        --cs-listbox-item-bg: var(--cs-color-negative-solid);
        --cs-listbox-item-fg: var(--cs-color-negative-solid-fg);
        --cs-listbox-item-icon-fg: var(--cs-color-negative-solid-fg);
        --cs-dropdown-item-negative-fg: var(--cs-color-negative-solid-fg);
        --cs-dropdown-item-negative-bg-hover: var(--cs-color-negative-solid-hover);
        --cs-dropdown-item-negative-bg-active: var(--cs-color-negative-solid-hover);
        transition:
            background-color var(--cs-dur-200) var(--cs-ease-quart-out),
            color var(--cs-dur-200) var(--cs-ease-quart-out),
            scale var(--cs-dur-press) var(--cs-ease-press);
    }
</style>
