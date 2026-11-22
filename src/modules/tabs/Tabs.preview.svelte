<script module>
    export const id = "tabs";
    export const label = "Tabs";
</script>

<script lang="ts">
    import {
        BarChart3,
        Bell,
        CreditCard,
        FolderKanban,
        Rocket,
        Settings,
        ShieldCheck,
        User,
        Users,
    } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import {
        SegmentedControl,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "cs/svelte/segmented-control";
    import { Switch } from "cs/svelte/switch";
    import {
        TABS_BASELINES,
        TABS_ORIENTATIONS,
        TABS_SIZES,
        TABS_WIDTHS,
        Tabs,
        TabsIcon,
        TabsLabel,
        TabsList,
        TabsPanel,
        TabsTrigger,
        type TabsBaseline,
        type TabsOrientation,
        type TabsSize,
        type TabsWidth,
    } from "cs/svelte/tabs";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let heroSize = $state<TabsSize>("md");
    let heroOrientation = $state<TabsOrientation>("horizontal");
    let heroWidth = $state<TabsWidth>("content");
    let heroBaseline = $state<TabsBaseline>("full");
    let heroAccentIndicator = $state(false);
    let heroValue = $state("overview");

    let overflowValue = $state("overview");
    let verticalValue = $state("profile");
    let tablistOnlyValue = $state("all");
    let linkValue = $state("overview");

    const overflowTabs = [
        { value: "overview", label: "Overview" },
        { value: "activity", label: "Activity" },
        { value: "deployments", label: "Deployments" },
        { value: "analytics", label: "Analytics" },
        { value: "customers", label: "Customers" },
        { value: "billing", label: "Billing" },
        { value: "integrations", label: "Integrations" },
        { value: "webhooks", label: "Webhooks" },
        { value: "audit-log", label: "Audit Log" },
        { value: "security", label: "Security" },
    ];

    const linkTabs = [
        { value: "overview", label: "Overview", href: "#tabs-overview" },
        { value: "releases", label: "Releases", href: "#tabs-releases" },
        { value: "contributors", label: "Contributors", href: "#tabs-contributors" },
        { value: "changelog", label: "Changelog", href: "#tabs-changelog" },
    ];

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const heroCode = `<script lang="ts">
    import { Activity, FolderKanban, Rocket, Settings } from "@lucide/svelte";
    import { Tabs, TabsIcon, TabsLabel, TabsList, TabsPanel, TabsTrigger } from "cs/svelte/tabs";

    let value = $state("overview");
${closeScript}

<Tabs size="md" bind:value>
    <TabsList aria-label="Project sections">
        <TabsTrigger value="overview">
            <TabsIcon icon={FolderKanban} />
            <TabsLabel>Overview</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="deployments">
            <TabsIcon icon={Rocket} />
            <TabsLabel>Deployments</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="analytics">
            <TabsIcon icon={Activity} />
            <TabsLabel>Analytics</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="settings">
            <TabsIcon icon={Settings} />
            <TabsLabel>Settings</TabsLabel>
        </TabsTrigger>
    </TabsList>

    <TabsPanel value="overview">...</TabsPanel>
    <TabsPanel value="deployments">...</TabsPanel>
    <TabsPanel value="analytics">...</TabsPanel>
    <TabsPanel value="settings">...</TabsPanel>
</Tabs>`;

    const overflowCode = `<div class="w-full max-w-lg">
    <Tabs size="md" bind:value={overflowValue}>
        <TabsList aria-label="Workspace sections">
            {#each overflowTabs as tab (tab.value)}
                <TabsTrigger value={tab.value}>
                    <TabsLabel>{tab.label}</TabsLabel>
                </TabsTrigger>
            {/each}
        </TabsList>
    </Tabs>
</div>`;

    const verticalCode = `<Tabs size="md" orientation="vertical" bind:value={verticalValue}>
    <TabsList aria-label="Account settings" class="w-52 shrink-0">
        <TabsTrigger value="profile">
            <TabsIcon icon={User} />
            <TabsLabel>Profile</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="team">
            <TabsIcon icon={Users} />
            <TabsLabel>Team</TabsLabel>
            <Badge variant="soft" color="base" size="xs" class="ms-auto tabular-nums">
                <BadgeLabel>12</BadgeLabel>
            </Badge>
        </TabsTrigger>
        ...
    </TabsList>
    <TabsPanel value="profile" class="flex-1 pl-6">...</TabsPanel>
    ...
</Tabs>`;

    const navCode = `<Tabs size="sm" bind:value={tablistOnlyValue}>
    <TabsList aria-label="Issue filter">
        <TabsTrigger value="all">
            <TabsLabel>All Issues</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="open">
            <TabsLabel>Open</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="closed">
            <TabsLabel>Closed</TabsLabel>
        </TabsTrigger>
    </TabsList>
</Tabs>

<Tabs size="md" bind:value={linkValue}>
    <TabsList aria-label="Repository navigation">
        <TabsTrigger value="overview" href="#tabs-overview">
            <TabsLabel>Overview</TabsLabel>
        </TabsTrigger>
        <TabsTrigger value="releases" href="#tabs-releases">
            <TabsLabel>Releases</TabsLabel>
        </TabsTrigger>
    </TabsList>
</Tabs>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Tabs"
        description="Macro view-switching and navigation strip with Push-Pull active indicator, vertical layout, and overflow scrolling."
    />

    <PreviewSection
        title="Interactive Playground"
        description="Adjust size, orientation, width, baseline, and indicator color."
        code={heroCode}
    >
        <div class="flex w-full flex-col gap-6">
            <div class="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl squircle-soft bg-base-soft p-3">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-weak">Size</span>
                    <SegmentedControl size="xs" bind:value={heroSize} aria-label="Tabs size">
                        {#each TABS_SIZES as s (s)}
                            <SegmentedControlItem value={s}>
                                <SegmentedControlLabel>{s}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-weak">Orientation</span>
                    <SegmentedControl size="xs" bind:value={heroOrientation} aria-label="Tabs orientation">
                        {#each TABS_ORIENTATIONS as o (o)}
                            <SegmentedControlItem value={o}>
                                <SegmentedControlLabel>{o}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-weak">Width</span>
                    <SegmentedControl size="xs" bind:value={heroWidth} aria-label="Tabs width">
                        {#each TABS_WIDTHS as w (w)}
                            <SegmentedControlItem value={w}>
                                <SegmentedControlLabel>{w}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-weak">Baseline</span>
                    <SegmentedControl size="xs" bind:value={heroBaseline} aria-label="Tabs baseline">
                        {#each TABS_BASELINES as b (b)}
                            <SegmentedControlItem value={b}>
                                <SegmentedControlLabel>{b}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <label class="flex cursor-default items-center gap-2">
                    <Switch size="sm" bind:checked={heroAccentIndicator} aria-label="Accent indicator" />
                    <span class="text-xs font-medium text-weak">Accent indicator</span>
                </label>
            </div>

            <Tabs
                size={heroSize}
                orientation={heroOrientation}
                width={heroWidth}
                baseline={heroBaseline}
                bind:value={heroValue}
                style={heroAccentIndicator ? "--cs-tabs-indicator-color: var(--cs-color-accent-solid);" : undefined}
            >
                <TabsList
                    aria-label="Project workspace"
                    class={heroOrientation === "vertical" ? "w-48 shrink-0" : undefined}
                >
                    <TabsTrigger value="overview">
                        <TabsIcon icon={FolderKanban} />
                        <TabsLabel>Overview</TabsLabel>
                    </TabsTrigger>
                    <TabsTrigger value="deployments">
                        <TabsIcon icon={Rocket} />
                        <TabsLabel>Deployments</TabsLabel>
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                        <TabsIcon icon={BarChart3} />
                        <TabsLabel>Analytics</TabsLabel>
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <TabsIcon icon={Settings} />
                        <TabsLabel>Settings</TabsLabel>
                    </TabsTrigger>
                </TabsList>

                <TabsPanel value="overview" class={heroOrientation === "vertical" ? "flex-1 pl-6" : "pt-4"}>
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Acme Web Platform</h4>
                        <p class="text-sm text-weak">
                            Production cluster is healthy across 3 regions. Last build completed 14 minutes ago.
                        </p>
                    </div>
                </TabsPanel>
                <TabsPanel value="deployments" class={heroOrientation === "vertical" ? "flex-1 pl-6" : "pt-4"}>
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Recent Deployments</h4>
                        <p class="text-sm text-weak">
                            Release v2.18.4 rolled out to 100% of edge nodes with zero elevated error rates.
                        </p>
                    </div>
                </TabsPanel>
                <TabsPanel value="analytics" class={heroOrientation === "vertical" ? "flex-1 pl-6" : "pt-4"}>
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Traffic & Latency</h4>
                        <p class="text-sm text-weak">
                            Median response time sits at 42 ms across 1.4M requests over the past 24 hours.
                        </p>
                    </div>
                </TabsPanel>
                <TabsPanel value="settings" class={heroOrientation === "vertical" ? "flex-1 pl-6" : "pt-4"}>
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Project Settings</h4>
                        <p class="text-sm text-weak">
                            Automatic preview deployments are enabled for all pull requests targeting main.
                        </p>
                    </div>
                </TabsPanel>
            </Tabs>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Overflow & Long Jumps"
        description="Ten tabs inside a constrained viewport with step chevrons and distance-calibrated Push-Pull motion."
        code={overflowCode}
    >
        <div class="flex w-full flex-col gap-6">
            <div class="w-full max-w-lg">
                <Tabs size="md" bind:value={overflowValue}>
                    <TabsList aria-label="Workspace sections">
                        {#each overflowTabs as tab (tab.value)}
                            <TabsTrigger value={tab.value}>
                                <TabsLabel>{tab.label}</TabsLabel>
                            </TabsTrigger>
                        {/each}
                    </TabsList>
                </Tabs>
            </div>

            <Tabs size="md" bind:value={overflowValue}>
                <TabsList aria-label="Full-width workspace sections">
                    {#each overflowTabs as tab (tab.value)}
                        <TabsTrigger value={tab.value}>
                            <TabsLabel>{tab.label}</TabsLabel>
                        </TabsTrigger>
                    {/each}
                </TabsList>
            </Tabs>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Vertical Settings"
        description="Vertical orientation with icons, tabular-num badges, and adjacent panels."
        code={verticalCode}
    >
        <div class="w-full max-w-2xl">
            <Tabs size="md" orientation="vertical" bind:value={verticalValue}>
                <TabsList aria-label="Account settings" class="w-52 shrink-0">
                    <TabsTrigger value="profile">
                        <TabsIcon icon={User} />
                        <TabsLabel>Profile</TabsLabel>
                    </TabsTrigger>
                    <TabsTrigger value="team">
                        <TabsIcon icon={Users} />
                        <TabsLabel>Team</TabsLabel>
                        <Badge variant="soft" color="base" size="xs" class="ms-auto tabular-nums">
                            <BadgeLabel>12</BadgeLabel>
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="billing">
                        <TabsIcon icon={CreditCard} />
                        <TabsLabel>Billing</TabsLabel>
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <TabsIcon icon={ShieldCheck} />
                        <TabsLabel>Security</TabsLabel>
                        <Badge variant="soft" color="caution" size="xs" class="ms-auto tabular-nums">
                            <BadgeLabel>2</BadgeLabel>
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <TabsIcon icon={Bell} />
                        <TabsLabel>Notifications</TabsLabel>
                    </TabsTrigger>
                </TabsList>

                <TabsPanel value="profile" class="flex-1 pl-6">
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Profile Details</h4>
                        <p class="text-sm text-weak">
                            Manage your display name, primary email address, and regional timezone preferences.
                        </p>
                    </div>
                </TabsPanel>
                <TabsPanel value="team" class="flex-1 pl-6">
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Team Members</h4>
                        <p class="text-sm text-weak">
                            12 active members across Engineering and Design. Invite collaborators or adjust roles.
                        </p>
                    </div>
                </TabsPanel>
                <TabsPanel value="billing" class="flex-1 pl-6">
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Billing & Plan</h4>
                        <p class="text-sm text-weak">
                            Pro Workspace billed annually. Next invoice is scheduled for December 1.
                        </p>
                    </div>
                </TabsPanel>
                <TabsPanel value="security" class="flex-1 pl-6">
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Security & Keys</h4>
                        <p class="text-sm text-weak">
                            Two-factor authentication is active. Two legacy API tokens are due for rotation.
                        </p>
                    </div>
                </TabsPanel>
                <TabsPanel value="notifications" class="flex-1 pl-6">
                    <div class="flex flex-col gap-1">
                        <h4 class="text-sm font-semibold text-strong">Notification Digests</h4>
                        <p class="text-sm text-weak">
                            Receive instant alerts for failed deployments and a daily summary of review requests.
                        </p>
                    </div>
                </TabsPanel>
            </Tabs>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Tablist-Only & Links"
        description="Use Tabs without panels for filter strips or with href triggers for route navigation."
        code={navCode}
    >
        <div class="flex w-full flex-col gap-6">
            <Tabs size="sm" bind:value={tablistOnlyValue}>
                <TabsList aria-label="Issue filter">
                    <TabsTrigger value="all">
                        <TabsLabel>All Issues</TabsLabel>
                    </TabsTrigger>
                    <TabsTrigger value="open">
                        <TabsLabel>Open</TabsLabel>
                        <Badge variant="soft" color="base" size="xs" class="tabular-nums">
                            <BadgeLabel>24</BadgeLabel>
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="closed">
                        <TabsLabel>Closed</TabsLabel>
                    </TabsTrigger>
                    <TabsTrigger value="archived" disabled>
                        <TabsLabel>Archived</TabsLabel>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <Tabs size="md" bind:value={linkValue}>
                <TabsList aria-label="Repository navigation">
                    {#each linkTabs as item (item.value)}
                        <TabsTrigger value={item.value} href={item.href}>
                            <TabsLabel>{item.label}</TabsLabel>
                        </TabsTrigger>
                    {/each}
                </TabsList>
            </Tabs>
        </div>
    </PreviewSection>
</div>
