<script module>
    export const id = "segmented-control";
    export const label = "Segmented-Control";
</script>

<script lang="ts">
    import { Columns3, LayoutGrid, List } from "@lucide/svelte";
    import {
        SEGMENTED_CONTROL_SIZES,
        SegmentedControl,
        SegmentedControlIcon,
        SegmentedControlItem,
        SegmentedControlLabel,
        type SegmentedControlSize,
    } from "cs/svelte/segmented-control";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let viewMode = $state("list");
    let billingPeriod = $state("monthly");

    let sizeValues = $state<Record<SegmentedControlSize, string>>({
        xs: "day",
        sm: "day",
        md: "day",
        lg: "day",
        xl: "day",
    });

    let contentWidthValue = $state("overview");
    let equalWidthValue = $state("overview");
    let overflowValue = $state("analytics");
    let itemDisabledValue = $state("standard");
    let groupDisabledValue = $state("standard");

    const overflowItems = [
        { value: "overview", label: "Overview" },
        { value: "analytics", label: "Analytics" },
        { value: "reports", label: "Reports" },
        { value: "customers", label: "Customers" },
        { value: "billing", label: "Billing" },
        { value: "integrations", label: "Integrations" },
        { value: "audit-log", label: "Audit Log" },
        { value: "settings", label: "Settings" },
    ];

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const defaultCode = `<script lang="ts">
    import { Columns3, LayoutGrid, List } from "@lucide/svelte";
    import {
        SegmentedControl,
        SegmentedControlIcon,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "cs/svelte/segmented-control";

    let viewMode = $state("list");
    let billingPeriod = $state("monthly");
${closeScript}

<SegmentedControl size="md" bind:value={viewMode} aria-label="View mode">
    <SegmentedControlItem value="list">
        <SegmentedControlIcon icon={List} />
        <SegmentedControlLabel>List</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="grid">
        <SegmentedControlIcon icon={LayoutGrid} />
        <SegmentedControlLabel>Grid</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="board">
        <SegmentedControlIcon icon={Columns3} />
        <SegmentedControlLabel>Board</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>

<SegmentedControl size="md" bind:value={billingPeriod} aria-label="Billing period">
    <SegmentedControlItem value="monthly">
        <SegmentedControlLabel>Monthly</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="yearly">
        <SegmentedControlLabel>Yearly</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>`;

    const sizesCode = `<SegmentedControl size="xs" value="day">...</SegmentedControl>
<SegmentedControl size="sm" value="day">...</SegmentedControl>
<SegmentedControl size="md" value="day">...</SegmentedControl>
<SegmentedControl size="lg" value="day">...</SegmentedControl>
<SegmentedControl size="xl" value="day">...</SegmentedControl>`;

    const widthCode = `<SegmentedControl size="md" width="content" bind:value>
    ...
</SegmentedControl>

<SegmentedControl size="md" width="equal" bind:value>
    ...
</SegmentedControl>`;

    const overflowCode = `<div class="w-full max-w-sm">
    <SegmentedControl size="md" bind:value={overflowValue} aria-label="Workspace sections">
        {#each items as item (item.value)}
            <SegmentedControlItem value={item.value}>
                <SegmentedControlLabel>{item.label}</SegmentedControlLabel>
            </SegmentedControlItem>
        {/each}
    </SegmentedControl>
</div>`;

    const disabledCode = `<SegmentedControl size="md" bind:value>
    <SegmentedControlItem value="standard">
        <SegmentedControlLabel>Standard</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="priority" disabled>
        <SegmentedControlLabel>Priority</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="express">
        <SegmentedControlLabel>Express</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>

<SegmentedControl size="md" value="standard" disabled>
    ...
</SegmentedControl>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="SegmentedControl"
        description="A single-selection pill control with a gliding active indicator, keyboard roving focus, and overflow step scrolling."
    />

    <PreviewSection
        title="Default & Icons"
        description="Pair icons and labels or use label-only segments with two-way value binding."
        code={defaultCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <SegmentedControl size="md" bind:value={viewMode} aria-label="View mode">
                <SegmentedControlItem value="list">
                    <SegmentedControlIcon icon={List} />
                    <SegmentedControlLabel>List</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="grid">
                    <SegmentedControlIcon icon={LayoutGrid} />
                    <SegmentedControlLabel>Grid</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="board">
                    <SegmentedControlIcon icon={Columns3} />
                    <SegmentedControlLabel>Board</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>

            <SegmentedControl size="md" bind:value={billingPeriod} aria-label="Billing period">
                <SegmentedControlItem value="monthly">
                    <SegmentedControlLabel>Monthly</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="yearly">
                    <SegmentedControlLabel>Yearly</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Supports all five T-shirt sizes from xs to xl."
        code={sizesCode}
    >
        <div class="flex flex-col items-start gap-4">
            {#each SEGMENTED_CONTROL_SIZES as size (size)}
                <div class="flex items-center gap-4">
                    <span class="w-6 text-xs font-medium text-weak uppercase">{size}</span>
                    <SegmentedControl {size} bind:value={sizeValues[size]} aria-label="Timeframe {size}">
                        <SegmentedControlItem value="day">
                            <SegmentedControlLabel>Day</SegmentedControlLabel>
                        </SegmentedControlItem>
                        <SegmentedControlItem value="week">
                            <SegmentedControlLabel>Week</SegmentedControlLabel>
                        </SegmentedControlItem>
                        <SegmentedControlItem value="month">
                            <SegmentedControlLabel>Month</SegmentedControlLabel>
                        </SegmentedControlItem>
                    </SegmentedControl>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Width (content vs equal)"
        description="Content width sizes each segment to its label; equal width stretches the track and distributes segments evenly."
        code={widthCode}
    >
        <div class="flex w-full max-w-md flex-col gap-4">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">width="content"</span>
                <SegmentedControl size="md" width="content" bind:value={contentWidthValue} aria-label="Content width">
                    <SegmentedControlItem value="overview">
                        <SegmentedControlLabel>Overview</SegmentedControlLabel>
                    </SegmentedControlItem>
                    <SegmentedControlItem value="activity">
                        <SegmentedControlLabel>Activity</SegmentedControlLabel>
                    </SegmentedControlItem>
                    <SegmentedControlItem value="settings">
                        <SegmentedControlLabel>Settings</SegmentedControlLabel>
                    </SegmentedControlItem>
                </SegmentedControl>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">width="equal"</span>
                <SegmentedControl size="md" width="equal" bind:value={equalWidthValue} aria-label="Equal width">
                    <SegmentedControlItem value="overview">
                        <SegmentedControlLabel>Overview</SegmentedControlLabel>
                    </SegmentedControlItem>
                    <SegmentedControlItem value="activity">
                        <SegmentedControlLabel>Activity</SegmentedControlLabel>
                    </SegmentedControlItem>
                    <SegmentedControlItem value="settings">
                        <SegmentedControlLabel>Settings</SegmentedControlLabel>
                    </SegmentedControlItem>
                </SegmentedControl>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Overflow Scrolling & Chevrons"
        description="When segments exceed the container width, edge fade masks and context-sensitive prev/next chevrons step-scroll cleanly."
        code={overflowCode}
    >
        <div class="w-full max-w-sm">
            <SegmentedControl size="md" bind:value={overflowValue} aria-label="Workspace sections">
                {#each overflowItems as item (item.value)}
                    <SegmentedControlItem value={item.value}>
                        <SegmentedControlLabel>{item.label}</SegmentedControlLabel>
                    </SegmentedControlItem>
                {/each}
            </SegmentedControl>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Disabled States"
        description="Disable individual segments or the entire control."
        code={disabledCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <SegmentedControl size="md" bind:value={itemDisabledValue} aria-label="Shipping speed (item disabled)">
                <SegmentedControlItem value="standard">
                    <SegmentedControlLabel>Standard</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="priority" disabled>
                    <SegmentedControlLabel>Priority</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="express">
                    <SegmentedControlLabel>Express</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>

            <SegmentedControl size="md" bind:value={groupDisabledValue} disabled aria-label="Shipping speed (group disabled)">
                <SegmentedControlItem value="standard">
                    <SegmentedControlLabel>Standard</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="priority">
                    <SegmentedControlLabel>Priority</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="express">
                    <SegmentedControlLabel>Express</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>
        </div>
    </PreviewSection>
</div>
