<script module lang="ts">
    export const id = "sidebar";
    export const label = "Sidebar";
</script>

<script lang="ts">
    import {
        Archive,
        BellOff,
        Calendar,
        Check,
        CheckSquare,
        ChevronLeft,
        ChevronRight,
        Copy,
        FileText,
        Folder,
        Globe,
        Home,
        Inbox,
        Layers,
        Layout,
        Lock,
        LogOut,
        MoreHorizontal,
        Palette,
        Pencil,
        Plus,
        Settings,
        ShieldCheck,
        Sliders,
        Sun,
        Trash2,
        Type,
        User,
        Users,
    } from "@lucide/svelte";
    import { Avatar } from "cs/svelte/avatar";
    import { Badge, BadgeLabel, type BadgeSize } from "cs/svelte/badge";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuHeader,
        ContextMenuItem,
        ContextMenuItemIcon,
        ContextMenuItemText,
        ContextMenuSeparator,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";
    import {
        Dropdown,
        DropdownContent,
        DropdownItem,
        DropdownItemIcon,
        DropdownItemText,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";
    import { HitArea } from "cs/svelte/hit-area";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import {
        SIDEBAR_COLLAPSE_MODES,
        SIDEBAR_SIDES,
        SIDEBAR_SIZES,
        SIDEBAR_VARIANTS,
        Sidebar,
        SidebarBody,
        SidebarFooter,
        SidebarGroup,
        SidebarGroupContent,
        SidebarGroupTrigger,
        SidebarHeader,
        SidebarItem,
        SidebarItemActions,
        SidebarItemIcon,
        SidebarItemLabel,
        SidebarItemRow,
        SidebarSection,
        SidebarSectionLabel,
        SidebarSubheader,
        SidebarToggle,
        SidebarView,
        SidebarViews,
        type SidebarCollapseMode,
        type SidebarSide,
        type SidebarSize,
        type SidebarVariant,
    } from "cs/svelte/sidebar";
    import { tooltip } from "cs/svelte/tooltip";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    const shellSidebarId = $props.id();

    let shellVariant = $state<SidebarVariant>("elevated");
    let shellSize = $state<SidebarSize>("md");
    let shellCollapseMode = $state<SidebarCollapseMode>("rail");
    let shellSide = $state<SidebarSide>("start");
    let shellOpen = $state(true);
    let shellScope = $state("team");
    let shellNav = $state("inbox");
    let projectsGroupOpen = $state(true);
    let marketingGroupOpen = $state(false);

    let actionsNav = $state("inbox");
    let actionsGroupOpen = $state(true);
    let contextTarget = $state("Inbox");

    let drillView = $state<"workspace" | "settings" | "appearance">("workspace");

    let overlayOpen = $state(false);
    let overlayNav = $state("overview");
    let minimalNav = $state("notes");

    const BADGE_SIZE_BY_SIDEBAR: Record<SidebarSize, BadgeSize> = {
        sm: "xs",
        md: "sm",
        lg: "md",
    };

    const SHELL_TITLES: Record<string, string> = {
        inbox: "Inbox",
        tasks: "Tasks",
        calendar: "Calendar",
        tokens: "Tokens",
        components: "Components",
        motion: "Motion",
        landing: "Landing Page",
        changelog: "Changelog",
    };

    const ACTIONS_TITLES: Record<string, string> = {
        inbox: "Inbox",
        drafts: "Drafts",
        q3: "Q3 Reports",
        q4: "Q4 Roadmap",
    };

    const DRILL_TITLES: Record<typeof drillView, string> = {
        workspace: "Workspace",
        settings: "Project Settings",
        appearance: "Appearance",
    };

    const MINIMAL_TITLES: Record<string, string> = {
        notes: "Quick Notes",
        checklist: "Checklist",
        archived: "Archived",
    };

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const shellCode = `<script lang="ts">
    import { Folder, Inbox, Layers, MoreHorizontal, Plus } from "@lucide/svelte";
    import { Avatar } from "cs/svelte/avatar";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { Dropdown, DropdownContent, DropdownItem, dropdownTrigger } from "cs/svelte/dropdown";
    import {
        Sidebar,
        SidebarBody,
        SidebarFooter,
        SidebarGroup,
        SidebarGroupContent,
        SidebarGroupTrigger,
        SidebarHeader,
        SidebarItem,
        SidebarItemActions,
        SidebarItemLabel,
        SidebarItemRow,
        SidebarSection,
        SidebarSectionLabel,
        SidebarToggle,
    } from "cs/svelte/sidebar";

    const sidebarId = $props.id();
    let open = $state(true);
    let groupOpen = $state(true);
${closeScript}

<div class="flex h-full bg-canvas">
    <Sidebar id={sidebarId} variant="elevated" size="md" collapseMode="rail" bind:open>
        <SidebarHeader>
            <div class="flex items-center justify-between gap-2 min-w-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <div data-sidebar-rail="anchor">
                        <div class="size-7 rounded-lg squircle-soft bg-base-solid text-base-solid-fg flex-center shrink-0">
                            <Layers size={15} strokeWidth={2.25} />
                        </div>
                    </div>
                    <span class="text-sm font-semibold text-strong truncate" data-sidebar-rail="hide">
                        Acme Studio
                    </span>
                </div>
                <Button variant="ghost" size="xs" iconOnly aria-label="New project" data-sidebar-rail="hide">
                    <ButtonIcon icon={Plus} />
                </Button>
            </div>
        </SidebarHeader>
        <SidebarBody fade>
            <SidebarSection>
                <SidebarSectionLabel>Workspace</SidebarSectionLabel>
                <SidebarItem current icon={Inbox}>
                    <SidebarItemLabel>Inbox</SidebarItemLabel>
                    <Badge variant="soft" color="base" size="sm"><BadgeLabel>12</BadgeLabel></Badge>
                </SidebarItem>
            </SidebarSection>
            <SidebarSection collapsible>
                <SidebarSectionLabel>Projects</SidebarSectionLabel>
                <SidebarGroup bind:open={groupOpen}>
                    <SidebarGroupTrigger icon={Folder}>
                        <SidebarItemLabel>Design System</SidebarItemLabel>
                    </SidebarGroupTrigger>
                    <SidebarGroupContent>
                        <SidebarItem><SidebarItemLabel>Tokens</SidebarItemLabel></SidebarItem>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarSection>
        </SidebarBody>
        <SidebarFooter>
            <SidebarItemRow>
                <SidebarItem tooltip="Clara Vance">
                    <span data-sidebar-rail="anchor">
                        <Avatar variant="soft" size="md" name="Clara Vance" status="online" />
                    </span>
                    <span class="flex flex-col min-w-0 flex-1 ms-1.5" data-sidebar-rail="hide">
                        <span class="text-sm font-medium text-strong truncate">Clara Vance</span>
                        <span class="text-xs text-weak truncate">clara@acme.co</span>
                    </span>
                </SidebarItem>
                <SidebarItemActions>
                    <Dropdown size="sm">
                        <Button variant="ghost" size="xs" iconOnly aria-label="Account menu" {@attach dropdownTrigger()}>
                            <ButtonIcon icon={MoreHorizontal} />
                        </Button>
                        <DropdownContent>
                            <DropdownItem>Profile</DropdownItem>
                            <DropdownItem>Settings</DropdownItem>
                            <DropdownItem negative>Sign out</DropdownItem>
                        </DropdownContent>
                    </Dropdown>
                </SidebarItemActions>
            </SidebarItemRow>
        </SidebarFooter>
    </Sidebar>

    <div class="flex-1 min-w-0 flex flex-col">
        <header class="shrink-0 h-14 px-5 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <SidebarToggle bind:open {sidebarId} />
                <h1 class="text-base font-semibold text-strong m-0">Inbox</h1>
            </div>
        </header>
        <main class="flex-1 min-h-0 px-5 pb-5 pt-1">...</main>
    </div>
</div>`;

    const actionsCode = `<SidebarItemRow>
    <SidebarItem current icon={Inbox} {@attach contextMenuTrigger()}>
        <SidebarItemLabel>Inbox</SidebarItemLabel>
        <Badge variant="soft" color="base" size="sm"><BadgeLabel>4</BadgeLabel></Badge>
    </SidebarItem>
    <SidebarItemActions>
        <Dropdown size="sm">
            <Button variant="ghost" size="xs" iconOnly aria-label="More" {@attach dropdownTrigger()}>
                <ButtonIcon icon={MoreHorizontal} />
            </Button>
            <DropdownContent>
                <DropdownItem>Mark read</DropdownItem>
                <DropdownItem negative>Archive</DropdownItem>
            </DropdownContent>
        </Dropdown>
    </SidebarItemActions>
</SidebarItemRow>`;

    const viewsCode = `<Sidebar variant="floating" size="md">
    <SidebarViews bind:value={view}>
        <SidebarView value="workspace" label="Workspace">
            <SidebarHeader>Workspace</SidebarHeader>
            <SidebarBody>
                <SidebarItem icon={Settings} onclick={() => (view = "settings")}>
                    <SidebarItemLabel>Project Settings</SidebarItemLabel>
                    <SidebarItemIcon icon={ChevronRight} />
                </SidebarItem>
            </SidebarBody>
        </SidebarView>
        <SidebarView value="settings" label="Project Settings">
            <SidebarHeader>
                <Button variant="ghost" size="xs" iconOnly aria-label="Back" onclick={() => (view = "workspace")}>
                    <ButtonIcon icon={ChevronLeft} />
                </Button>
                <span>Project Settings</span>
            </SidebarHeader>
            <SidebarBody>...</SidebarBody>
        </SidebarView>
    </SidebarViews>
</Sidebar>`;

    const overlayCode = `<Button variant="secondary" size="md" onclick={() => (open = true)}>
    <ButtonLabel>Open Drawer</ButtonLabel>
</Button>

<Sidebar variant="elevated" size="md" behavior="overlay" bind:open>
    <SidebarHeader>
        <span>Acme Studio</span>
        <SidebarToggle />
    </SidebarHeader>
    <SidebarBody>...</SidebarBody>
</Sidebar>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Sidebar"
        description="Composable navigation shell with rail collapse, nested groups, row actions, and multi-view drill-down."
    />

    <PreviewSection
        title="App Shell"
        description="Switch surface variants, scale, collapse modes, and edge alignment."
        code={shellCode}
    >
        <div class="w-full flex flex-col gap-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Variant</span>
                    <SegmentedControl size="sm" width="equal" bind:value={shellVariant} aria-label="Sidebar variant">
                        {#each SIDEBAR_VARIANTS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Size</span>
                    <SegmentedControl size="sm" width="equal" bind:value={shellSize} aria-label="Sidebar size">
                        {#each SIDEBAR_SIZES as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="uppercase">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Collapse</span>
                    <SegmentedControl
                        size="sm"
                        width="equal"
                        bind:value={shellCollapseMode}
                        aria-label="Sidebar collapse mode"
                    >
                        {#each SIDEBAR_COLLAPSE_MODES as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Side</span>
                    <SegmentedControl size="sm" width="equal" bind:value={shellSide} aria-label="Sidebar side">
                        {#each SIDEBAR_SIDES as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>
            </div>

            <div
                class={[
                    "w-full h-540px rounded-2xl squircle bg-canvas shadow-sunken overflow-hidden flex",
                    shellSide === "end" && "flex-row-reverse",
                ]}
            >
                <Sidebar
                    id={shellSidebarId}
                    variant={shellVariant}
                    size={shellSize}
                    collapseMode={shellCollapseMode}
                    side={shellSide}
                    bind:open={shellOpen}
                >
                    <SidebarHeader>
                        <div class="flex items-center justify-between gap-2 min-w-0">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <div data-sidebar-rail="anchor">
                                    <div
                                        class="size-7 rounded-lg squircle-soft bg-base-solid text-base-solid-fg flex-center shrink-0"
                                    >
                                        <Layers size={15} strokeWidth={2.25} />
                                    </div>
                                </div>
                                <span class="text-sm font-semibold text-strong truncate" data-sidebar-rail="hide">
                                    Acme Studio
                                </span>
                            </div>

                            <Button
                                variant="ghost"
                                size="xs"
                                iconOnly
                                aria-label="New project"
                                data-sidebar-rail="hide"
                                {@attach tooltip({ text: "New project" })}
                            >
                                <ButtonIcon icon={Plus} />
                                <HitArea size="md" />
                            </Button>
                        </div>
                    </SidebarHeader>

                    <SidebarSubheader>
                        <SegmentedControl
                            size="sm"
                            width="equal"
                            bind:value={shellScope}
                            aria-label="Workspace scope"
                        >
                            <SegmentedControlItem value="personal">
                                <SegmentedControlLabel>Personal</SegmentedControlLabel>
                            </SegmentedControlItem>
                            <SegmentedControlItem value="team">
                                <SegmentedControlLabel>Team</SegmentedControlLabel>
                            </SegmentedControlItem>
                        </SegmentedControl>
                    </SidebarSubheader>

                    <SidebarBody fade>
                        <SidebarSection>
                            <SidebarSectionLabel>Workspace</SidebarSectionLabel>

                            <SidebarItem
                                icon={Inbox}
                                current={shellNav === "inbox"}
                                onclick={() => (shellNav = "inbox")}
                            >
                                <SidebarItemLabel>Inbox</SidebarItemLabel>
                                <Badge variant="soft" color="base" size={BADGE_SIZE_BY_SIDEBAR[shellSize]}>
                                    <BadgeLabel>12</BadgeLabel>
                                </Badge>
                            </SidebarItem>

                            <SidebarItem
                                icon={CheckSquare}
                                current={shellNav === "tasks"}
                                onclick={() => (shellNav = "tasks")}
                            >
                                <SidebarItemLabel>Tasks</SidebarItemLabel>
                            </SidebarItem>

                            <SidebarItem
                                icon={Calendar}
                                current={shellNav === "calendar"}
                                onclick={() => (shellNav = "calendar")}
                            >
                                <SidebarItemLabel>Calendar</SidebarItemLabel>
                            </SidebarItem>
                        </SidebarSection>

                        <SidebarSection collapsible>
                            <SidebarSectionLabel>Projects</SidebarSectionLabel>

                            <SidebarGroup bind:open={projectsGroupOpen}>
                                <SidebarGroupTrigger icon={Folder}>
                                    <SidebarItemLabel>Design System</SidebarItemLabel>
                                </SidebarGroupTrigger>
                                <SidebarGroupContent>
                                    <SidebarItem
                                        current={shellNav === "tokens"}
                                        onclick={() => (shellNav = "tokens")}
                                    >
                                        <SidebarItemLabel>Tokens</SidebarItemLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        current={shellNav === "components"}
                                        onclick={() => (shellNav = "components")}
                                    >
                                        <SidebarItemLabel>Components</SidebarItemLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        current={shellNav === "motion"}
                                        onclick={() => (shellNav = "motion")}
                                    >
                                        <SidebarItemLabel>Motion</SidebarItemLabel>
                                    </SidebarItem>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            <SidebarGroup bind:open={marketingGroupOpen}>
                                <SidebarGroupTrigger icon={Globe}>
                                    <SidebarItemLabel>Marketing</SidebarItemLabel>
                                </SidebarGroupTrigger>
                                <SidebarGroupContent>
                                    <SidebarItem
                                        current={shellNav === "landing"}
                                        onclick={() => (shellNav = "landing")}
                                    >
                                        <SidebarItemLabel>Landing Page</SidebarItemLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        current={shellNav === "changelog"}
                                        onclick={() => (shellNav = "changelog")}
                                    >
                                        <SidebarItemLabel>Changelog</SidebarItemLabel>
                                    </SidebarItem>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarSection>
                    </SidebarBody>

                    <SidebarFooter>
                        <SidebarItemRow>
                            <SidebarItem tooltip="Clara Vance">
                                <span data-sidebar-rail="anchor">
                                    <Avatar
                                        variant="soft"
                                        size={shellSize === "sm" ? "sm" : "md"}
                                        name="Clara Vance"
                                        status="online"
                                    />
                                </span>
                                <span class="flex flex-col min-w-0 flex-1 ms-1.5" data-sidebar-rail="hide">
                                    <span class="text-sm font-medium text-strong truncate leading-[18px]">
                                        Clara Vance
                                    </span>
                                    <span class="text-xs text-weak truncate leading-[16px]">clara@acme.co</span>
                                </span>
                            </SidebarItem>

                            <SidebarItemActions>
                                <Dropdown size="sm">
                                    <!-- eslint-disable-next-line button/require-hit-area -- Tight SidebarItemActions row omits vertical HitArea overflow -->
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        iconOnly
                                        aria-label="Account menu"
                                        {@attach tooltip({ text: "Account menu" })}
                                        {@attach dropdownTrigger()}
                                    >
                                        <ButtonIcon icon={MoreHorizontal} />
                                    </Button>
                                    <DropdownContent>
                                        <DropdownItem>
                                            <DropdownItemIcon icon={User} />
                                            <DropdownItemText>Profile</DropdownItemText>
                                        </DropdownItem>
                                        <DropdownItem>
                                            <DropdownItemIcon icon={Settings} />
                                            <DropdownItemText>Settings</DropdownItemText>
                                        </DropdownItem>
                                        <DropdownSeparator />
                                        <DropdownItem negative>
                                            <DropdownItemIcon icon={LogOut} />
                                            <DropdownItemText>Sign out</DropdownItemText>
                                        </DropdownItem>
                                    </DropdownContent>
                                </Dropdown>
                            </SidebarItemActions>
                        </SidebarItemRow>
                    </SidebarFooter>
                </Sidebar>

                <div class="flex-1 min-w-0 flex flex-col">
                    <header class="shrink-0 h-14 px-5 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <SidebarToggle bind:open={shellOpen} sidebarId={shellSidebarId} />
                            <h3 class="text-base font-semibold text-strong truncate m-0">{SHELL_TITLES[shellNav]}</h3>
                        </div>

                        <Badge variant="soft" color="base" size="sm">
                            <BadgeLabel class="capitalize">{shellScope}</BadgeLabel>
                        </Badge>
                    </header>

                    <main class="flex-1 min-h-0 px-5 pb-5 pt-1 flex flex-col gap-3.5">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div class="rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated flex flex-col gap-1.5">
                                <span class="text-sm font-medium text-strong">Q4 Planning</span>
                                <span class="text-xs text-weak">Updated 14m ago</span>
                            </div>
                            <div class="rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated flex flex-col gap-1.5">
                                <span class="text-sm font-medium text-strong">Release Checklist</span>
                                <span class="text-xs text-weak">3 items remaining</span>
                            </div>
                        </div>

                        <div class="rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated flex flex-col gap-1.5">
                            <span class="text-sm font-medium text-strong">Design Review</span>
                            <span class="text-xs text-weak">Thursday at 10:00 AM</span>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Actions & States"
        description="Hover row menus, context menus, and semantic item states."
        code={actionsCode}
    >
        <div class="w-full h-380px rounded-2xl squircle bg-canvas shadow-sunken overflow-hidden flex">
            <ContextMenu size="sm">
                <Sidebar variant="elevated" size="md">
                    <SidebarBody fade>
                        <SidebarSection>
                            <SidebarSectionLabel>Navigation</SidebarSectionLabel>

                            <SidebarItemRow>
                                <SidebarItem
                                    icon={Inbox}
                                    current={actionsNav === "inbox"}
                                    onclick={() => (actionsNav = "inbox")}
                                    {@attach contextMenuTrigger({ onOpen: () => (contextTarget = "Inbox") })}
                                >
                                    <SidebarItemLabel>Inbox</SidebarItemLabel>
                                    <Badge variant="soft" color="base" size="sm">
                                        <BadgeLabel>4</BadgeLabel>
                                    </Badge>
                                </SidebarItem>

                                <SidebarItemActions>
                                    <Dropdown size="sm">
                                        <!-- eslint-disable-next-line button/require-hit-area -- Tight SidebarItemActions row omits vertical HitArea overflow -->
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            iconOnly
                                            aria-label="Inbox actions"
                                            {@attach tooltip({ text: "More actions" })}
                                            {@attach dropdownTrigger()}
                                        >
                                            <ButtonIcon icon={MoreHorizontal} />
                                        </Button>
                                        <DropdownContent>
                                            <DropdownItem>
                                                <DropdownItemIcon icon={Check} />
                                                <DropdownItemText>Mark read</DropdownItemText>
                                            </DropdownItem>
                                            <DropdownItem>
                                                <DropdownItemIcon icon={BellOff} />
                                                <DropdownItemText>Mute</DropdownItemText>
                                            </DropdownItem>
                                            <DropdownSeparator />
                                            <DropdownItem negative>
                                                <DropdownItemIcon icon={Archive} />
                                                <DropdownItemText>Archive</DropdownItemText>
                                            </DropdownItem>
                                        </DropdownContent>
                                    </Dropdown>
                                </SidebarItemActions>
                            </SidebarItemRow>

                            <SidebarItemRow>
                                <SidebarItem
                                    icon={FileText}
                                    current={actionsNav === "drafts"}
                                    onclick={() => (actionsNav = "drafts")}
                                    {@attach contextMenuTrigger({ onOpen: () => (contextTarget = "Drafts") })}
                                >
                                    <SidebarItemLabel>Drafts</SidebarItemLabel>
                                </SidebarItem>

                                <SidebarItemActions>
                                    <Dropdown size="sm">
                                        <!-- eslint-disable-next-line button/require-hit-area -- Tight SidebarItemActions row omits vertical HitArea overflow -->
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            iconOnly
                                            aria-label="Drafts actions"
                                            {@attach tooltip({ text: "More actions" })}
                                            {@attach dropdownTrigger()}
                                        >
                                            <ButtonIcon icon={MoreHorizontal} />
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
                                            <DropdownItem negative>
                                                <DropdownItemIcon icon={Trash2} />
                                                <DropdownItemText>Delete</DropdownItemText>
                                            </DropdownItem>
                                        </DropdownContent>
                                    </Dropdown>
                                </SidebarItemActions>
                            </SidebarItemRow>

                            <SidebarGroup bind:open={actionsGroupOpen}>
                                <SidebarGroupTrigger
                                    icon={Folder}
                                    {@attach contextMenuTrigger({ onOpen: () => (contextTarget = "Archive") })}
                                >
                                    <SidebarItemLabel>Archive</SidebarItemLabel>
                                </SidebarGroupTrigger>
                                <SidebarGroupContent>
                                    <SidebarItem
                                        current={actionsNav === "q3"}
                                        onclick={() => (actionsNav = "q3")}
                                    >
                                        <SidebarItemLabel>Q3 Reports</SidebarItemLabel>
                                    </SidebarItem>
                                    <SidebarItem
                                        current={actionsNav === "q4"}
                                        onclick={() => (actionsNav = "q4")}
                                    >
                                        <SidebarItemLabel>Q4 Roadmap</SidebarItemLabel>
                                    </SidebarItem>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarSection>

                        <SidebarSection>
                            <SidebarSectionLabel>Account</SidebarSectionLabel>
                            <SidebarItem icon={Lock} disabled>
                                <SidebarItemLabel>Billing</SidebarItemLabel>
                            </SidebarItem>
                            <SidebarItem icon={Trash2} negative>
                                <SidebarItemLabel>Delete Workspace</SidebarItemLabel>
                            </SidebarItem>
                        </SidebarSection>
                    </SidebarBody>
                </Sidebar>

                <ContextMenuContent>
                    {#snippet header()}
                        <ContextMenuHeader>
                            <span class="text-xs font-medium text-weak">{contextTarget}</span>
                        </ContextMenuHeader>
                    {/snippet}
                    <ContextMenuItem>
                        <ContextMenuItemIcon icon={Pencil} />
                        <ContextMenuItemText>Rename</ContextMenuItemText>
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

            <div class="flex-1 min-w-0 flex flex-col">
                <header class="shrink-0 h-14 px-5 flex items-center justify-between">
                    <h3 class="text-base font-semibold text-strong m-0">{ACTIONS_TITLES[actionsNav]}</h3>
                </header>

                <div class="flex-1 min-h-0 px-5 pb-5 pt-1 flex flex-col gap-3.5">
                    <div class="rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated flex flex-col gap-1.5">
                        <span class="text-sm font-medium text-strong">Brand Refresh Brief</span>
                        <span class="text-xs text-weak">Assigned to Clara Vance</span>
                    </div>
                    <div class="rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated flex flex-col gap-1.5">
                        <span class="text-sm font-medium text-strong">Quarterly Sync Notes</span>
                        <span class="text-xs text-weak">Last edited yesterday</span>
                    </div>
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Multi-View Drill-Down"
        description="Animated view stack with automatic directional transitions."
        code={viewsCode}
    >
        <div class="w-full h-360px rounded-2xl squircle bg-canvas shadow-sunken overflow-hidden flex">
            <Sidebar variant="floating" size="md">
                <SidebarViews bind:value={drillView}>
                    <SidebarView value="workspace" label="Workspace">
                        <SidebarHeader>
                            <div class="flex items-center justify-between px-2.5">
                                <span class="text-sm font-semibold text-strong">Workspace</span>
                            </div>
                        </SidebarHeader>
                        <SidebarBody>
                            <SidebarSection>
                                <SidebarItem icon={Home} current>
                                    <SidebarItemLabel>Overview</SidebarItemLabel>
                                </SidebarItem>
                                <SidebarItem icon={Users}>
                                    <SidebarItemLabel>Members</SidebarItemLabel>
                                </SidebarItem>
                                <SidebarItem icon={Settings} onclick={() => (drillView = "settings")}>
                                    <SidebarItemLabel>Project Settings</SidebarItemLabel>
                                    <SidebarItemIcon icon={ChevronRight} />
                                </SidebarItem>
                            </SidebarSection>
                        </SidebarBody>
                    </SidebarView>

                    <SidebarView value="settings" label="Project Settings">
                        <SidebarHeader>
                            <div class="flex items-center gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    iconOnly
                                    aria-label="Back to Workspace"
                                    onclick={() => (drillView = "workspace")}
                                    {@attach tooltip({ text: "Back" })}
                                >
                                    <ButtonIcon icon={ChevronLeft} />
                                    <HitArea size="md" />
                                </Button>
                                <span class="text-sm font-semibold text-strong">Project Settings</span>
                            </div>
                        </SidebarHeader>
                        <SidebarBody>
                            <SidebarSection>
                                <SidebarItem icon={Sliders}>
                                    <SidebarItemLabel>General</SidebarItemLabel>
                                </SidebarItem>
                                <SidebarItem icon={Palette} onclick={() => (drillView = "appearance")}>
                                    <SidebarItemLabel>Appearance</SidebarItemLabel>
                                    <SidebarItemIcon icon={ChevronRight} />
                                </SidebarItem>
                                <SidebarItem icon={ShieldCheck}>
                                    <SidebarItemLabel>Security</SidebarItemLabel>
                                </SidebarItem>
                            </SidebarSection>
                        </SidebarBody>
                    </SidebarView>

                    <SidebarView value="appearance" label="Appearance">
                        <SidebarHeader>
                            <div class="flex items-center gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    iconOnly
                                    aria-label="Back to Project Settings"
                                    onclick={() => (drillView = "settings")}
                                    {@attach tooltip({ text: "Back" })}
                                >
                                    <ButtonIcon icon={ChevronLeft} />
                                    <HitArea size="md" />
                                </Button>
                                <span class="text-sm font-semibold text-strong">Appearance</span>
                            </div>
                        </SidebarHeader>
                        <SidebarBody>
                            <SidebarSection>
                                <SidebarItem icon={Sun} current>
                                    <SidebarItemLabel>Theme</SidebarItemLabel>
                                </SidebarItem>
                                <SidebarItem icon={Type}>
                                    <SidebarItemLabel>Typography</SidebarItemLabel>
                                </SidebarItem>
                                <SidebarItem icon={Layout}>
                                    <SidebarItemLabel>Density</SidebarItemLabel>
                                </SidebarItem>
                            </SidebarSection>
                        </SidebarBody>
                    </SidebarView>
                </SidebarViews>
            </Sidebar>

            <div class="flex-1 min-w-0 flex flex-col">
                <header class="shrink-0 h-14 px-5 flex items-center justify-between">
                    <h3 class="text-base font-semibold text-strong m-0">{DRILL_TITLES[drillView]}</h3>
                </header>

                <div class="flex-1 min-h-0 px-5 pb-5 pt-1 flex flex-col gap-3.5">
                    <div class="rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated flex flex-col gap-1.5">
                        <span class="text-sm font-medium text-strong">Acme Studio</span>
                        <span class="text-xs text-weak">12 active members</span>
                    </div>
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Overlay & Minimal"
        description="Off-canvas drawer and minimal transparent navigation on canvas."
        code={overlayCode}
    >
        <div class="w-full flex flex-col gap-5">
            <div class="flex items-center gap-3">
                <Button variant="secondary" size="md" onclick={() => (overlayOpen = true)}>
                    <ButtonLabel>Open Drawer</ButtonLabel>
                </Button>

                <Sidebar variant="elevated" size="md" behavior="overlay" bind:open={overlayOpen}>
                    <SidebarHeader>
                        <div class="flex items-center justify-between gap-2 min-w-0">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <div data-sidebar-rail="anchor">
                                    <div
                                        class="size-7 rounded-lg squircle-soft bg-base-solid text-base-solid-fg flex-center shrink-0"
                                    >
                                        <Layers size={15} strokeWidth={2.25} />
                                    </div>
                                </div>
                                <span class="text-sm font-semibold text-strong truncate">Acme Studio</span>
                            </div>
                            <SidebarToggle />
                        </div>
                    </SidebarHeader>
                    <SidebarBody>
                        <SidebarSection>
                            <SidebarSectionLabel>Workspace</SidebarSectionLabel>
                            <SidebarItem
                                icon={Home}
                                current={overlayNav === "overview"}
                                onclick={() => {
                                    overlayNav = "overview";
                                    overlayOpen = false;
                                }}
                            >
                                <SidebarItemLabel>Overview</SidebarItemLabel>
                            </SidebarItem>
                            <SidebarItem
                                icon={Inbox}
                                current={overlayNav === "inbox"}
                                onclick={() => {
                                    overlayNav = "inbox";
                                    overlayOpen = false;
                                }}
                            >
                                <SidebarItemLabel>Inbox</SidebarItemLabel>
                            </SidebarItem>
                            <SidebarItem
                                icon={Settings}
                                current={overlayNav === "settings"}
                                onclick={() => {
                                    overlayNav = "settings";
                                    overlayOpen = false;
                                }}
                            >
                                <SidebarItemLabel>Settings</SidebarItemLabel>
                            </SidebarItem>
                        </SidebarSection>
                    </SidebarBody>
                    <SidebarFooter>
                        <SidebarItem>
                            <span data-sidebar-rail="anchor">
                                <Avatar variant="soft" size="md" name="Clara Vance" status="online" />
                            </span>
                            <span class="flex flex-col min-w-0 flex-1 ms-1.5">
                                <span class="text-sm font-medium text-strong truncate leading-[18px]">
                                    Clara Vance
                                </span>
                                <span class="text-xs text-weak truncate leading-[16px]">clara@acme.co</span>
                            </span>
                        </SidebarItem>
                    </SidebarFooter>
                </Sidebar>
            </div>

            <div class="w-full h-240px rounded-2xl squircle bg-canvas shadow-sunken overflow-hidden flex">
                <Sidebar variant="transparent" size="sm">
                    <SidebarBody>
                        <SidebarSection>
                            <SidebarItem
                                icon={FileText}
                                current={minimalNav === "notes"}
                                onclick={() => (minimalNav = "notes")}
                            >
                                <SidebarItemLabel>Quick Notes</SidebarItemLabel>
                            </SidebarItem>
                            <SidebarItem
                                icon={CheckSquare}
                                current={minimalNav === "checklist"}
                                onclick={() => (minimalNav = "checklist")}
                            >
                                <SidebarItemLabel>Checklist</SidebarItemLabel>
                            </SidebarItem>
                            <SidebarItem
                                icon={Archive}
                                current={minimalNav === "archived"}
                                onclick={() => (minimalNav = "archived")}
                            >
                                <SidebarItemLabel>Archived</SidebarItemLabel>
                            </SidebarItem>
                        </SidebarSection>
                    </SidebarBody>
                </Sidebar>

                <div class="flex-1 min-w-0 flex flex-col">
                    <header class="shrink-0 h-14 px-5 flex items-center">
                        <h3 class="text-base font-semibold text-strong m-0">{MINIMAL_TITLES[minimalNav]}</h3>
                    </header>

                    <div class="flex-1 min-h-0 px-5 pb-5 pt-1">
                        <div class="rounded-xl squircle-smooth bg-elevated p-4 shadow-elevated flex flex-col gap-1.5">
                            <span class="text-sm font-medium text-strong">Sprint Notes</span>
                            <span class="text-xs text-weak">Edited 2h ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </PreviewSection>
</div>
