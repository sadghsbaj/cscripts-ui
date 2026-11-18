<script module>
    export const id = "virtual-scroll";
    export const label = "Virtual-Scroll";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import {
        SegmentedControl,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "cs/svelte/segmented-control";
    import { Switch } from "cs/svelte/switch";
    import { TextInput, TextInputField } from "cs/svelte/text-input";
    import {
        createVirtualScroll,
        VIRTUAL_SCROLL_ALIGNS,
        type VirtualScrollAlign,
    } from "cs/svelte/virtual-scroll";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    // -------------------------------------------------------------------------
    // 1. Basic <VirtualScroll> List (10,000 items)
    // -------------------------------------------------------------------------
    const DEPARTMENTS = ["Engineering", "Design", "Product", "Operations", "Security"] as const;
    const ROLES = ["Staff Engineer", "Product Designer", "Engineering Manager", "Site Reliability", "Analyst"] as const;
    const NOTES = [
        "Updated deployment pipeline for EU-West cluster.",
        "Reviewed Q3 accessibility audit findings and logged follow-up tasks.",
        "Rotated service credentials across staging environments.",
    ] as const;

    interface DirectoryEntry {
        id: number;
        name: string;
        department: string;
        role: string;
        note: string | null;
    }

    const basicItems: DirectoryEntry[] = Array.from({ length: 10_000 }, (_, i) => ({
        id: i + 1,
        name: `Member #${i + 1}`,
        department: DEPARTMENTS[i % DEPARTMENTS.length] ?? "Engineering",
        role: ROLES[i % ROLES.length] ?? "Engineer",
        note: i % 3 === 0 ? (NOTES[i % NOTES.length] ?? null) : null,
    }));

    let targetIndexInput = $state("4200");
    let scrollAlign = $state<VirtualScrollAlign>("start");
    let isFixed = $state(false);

    const basicVirtual = createVirtualScroll({
        count: basicItems.length,
        estimateSize: () => (isFixed ? 44 : 56),
        fixed: () => isFixed,
        gap: 6,
        getItemKey: (index) => basicItems[index]?.id ?? index,
    });

    function jumpToBasicIndex(): void {
        if (targetIndexInput.trim() === "") return;
        const parsed = Math.trunc(Number(targetIndexInput));
        if (!Number.isFinite(parsed)) return;
        basicVirtual.scrollToIndex(parsed, { align: scrollAlign });
    }

    // -------------------------------------------------------------------------
    // 2. Variable-Height List with <ScrollArea> Composition & Scroll Anchoring
    // -------------------------------------------------------------------------
    interface ActivityMessage {
        id: string;
        author: string;
        timestamp: string;
        summary: string;
        details: string;
    }

    const AUTHORS = ["Maya Lin", "Jonas Weber", "Priya Nair", "Lucas Meyer", "Elena Rostova"] as const;
    const SUMMARIES = [
        "Merged pull request #1482 into main",
        "Published v2.4.0 release candidate",
        "Resolved database connection pool saturation",
        "Updated design tokens for dark surface contrast",
    ] as const;
    const DETAILS = [
        "Included automated migration checks, updated integration fixtures, and verified zero-downtime rollout across all regional replicas.",
        "Benchmarked cold-start latency under 120ms p95 and trimmed bundle overhead by 18 KB gzipped.",
        "Added connection backoff telemetry and alerted on-call channel during peak traffic window.",
    ] as const;

    const activityItems: ActivityMessage[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `msg-${i + 1}`,
        author: AUTHORS[i % AUTHORS.length] ?? "Maya Lin",
        timestamp: `${String((i % 12) + 1).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
        summary: `${SUMMARIES[i % SUMMARIES.length] ?? "Update"} (#${i + 1})`,
        details: DETAILS[i % DETAILS.length] ?? "",
    }));

    let expandedIds = $state<Record<string, boolean>>({});

    function toggleExpanded(id: string): void {
        expandedIds = {
            ...expandedIds,
            [id]: !expandedIds[id],
        };
    }

    const scrollAreaVirtual = createVirtualScroll({
        count: activityItems.length,
        estimateSize: 72,
        gap: 8,
        getItemKey: (index) => activityItems[index]?.id ?? index,
    });

    // -------------------------------------------------------------------------
    // 3. <table> Spacer Mode (10,000 rows + sticky <thead>)
    // -------------------------------------------------------------------------
    interface BillingRow {
        id: string;
        customer: string;
        plan: "Starter" | "Pro" | "Enterprise";
        status: "Active" | "Trial" | "Past Due";
        mrr: string;
    }

    const CUSTOMERS = ["Acme Corp", "Northstar Labs", "Kestrel Systems", "Solstice AI", "Harbor Cloud"] as const;
    const PLANS: BillingRow["plan"][] = ["Starter", "Pro", "Enterprise"];
    const STATUSES: BillingRow["status"][] = ["Active", "Active", "Trial", "Past Due"];

    const tableRows: BillingRow[] = Array.from({ length: 10_000 }, (_, i) => ({
        id: `INV-${String(i + 1001).padStart(5, "0")}`,
        customer: `${CUSTOMERS[i % CUSTOMERS.length] ?? "Acme Corp"} ${Math.floor(i / 5) + 1}`,
        plan: PLANS[i % PLANS.length] ?? "Pro",
        status: STATUSES[i % STATUSES.length] ?? "Active",
        mrr: `$${((i % 18) + 1) * 49}`,
    }));

    const tableVirtual = createVirtualScroll({
        count: tableRows.length,
        estimateSize: 41,
        getItemKey: (index) => tableRows[index]?.id ?? index,
    });

    // -------------------------------------------------------------------------
    // 4. CSS Grid (lanes > 1)
    // -------------------------------------------------------------------------
    interface AssetItem {
        id: string;
        title: string;
        format: string;
        size: string;
        tall: boolean;
    }

    const FORMATS = ["PNG", "SVG", "WEBP", "AVIF"] as const;
    const assetItems: AssetItem[] = Array.from({ length: 6000 }, (_, i) => ({
        id: `asset-${i + 1}`,
        title: `Brand Asset ${i + 1}`,
        format: FORMATS[i % FORMATS.length] ?? "PNG",
        size: `${120 + ((i * 37) % 880)} KB`,
        tall: i % 4 === 0,
    }));

    let gridLanes = $state<"2" | "3" | "4">("3");
    const numericLanes = $derived(Number(gridLanes));

    const gridVirtual = createVirtualScroll({
        count: assetItems.length,
        estimateSize: 96,
        lanes: () => numericLanes,
        gap: 12,
        getItemKey: (index) => assetItems[index]?.id ?? index,
    });

    // -------------------------------------------------------------------------
    // 5. Horizontal List
    // -------------------------------------------------------------------------
    interface TimelineCard {
        id: string;
        sprint: string;
        title: string;
        tasks: number;
    }

    const horizontalItems: TimelineCard[] = Array.from({ length: 2000 }, (_, i) => ({
        id: `sprint-${i + 1}`,
        sprint: `Sprint ${i + 1}`,
        title: i % 2 === 0 ? "Core Platform" : "Design System",
        tasks: 4 + (i % 9),
    }));

    const horizontalVirtual = createVirtualScroll({
        count: horizontalItems.length,
        orientation: "horizontal",
        estimateSize: 180,
        gap: 12,
        getItemKey: (index) => horizontalItems[index]?.id ?? index,
    });

    // -------------------------------------------------------------------------
    // Code Snippets
    // -------------------------------------------------------------------------
    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { createVirtualScroll } from "cs/svelte/virtual-scroll";

    const virtual = createVirtualScroll({
        count: items.length,
        estimateSize: 56,
        gap: 6,
        getItemKey: (i) => items[i].id,
    });
${closeScript}

<ScrollArea size="md" direction="vertical" class="w-full h-80">
    <ScrollAreaContent {@attach virtual.attachViewport}>
        <div {@attach virtual.attachList} class="flex flex-col gap-1.5 p-2" role="list">
            {#each virtual.items as item (item.key)}
                <div {@attach virtual.attachItem(item.index)} {...virtual.getItemAriaProps(item.index)}>
                    {items[item.index]?.name}
                </div>
            {/each}
        </div>
    </ScrollAreaContent>
</ScrollArea>`;

    const scrollAreaCode = `<script lang="ts">
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { createVirtualScroll } from "cs/svelte/virtual-scroll";

    const virtual = createVirtualScroll({
        count: items.length,
        estimateSize: 72,
        gap: 8,
        getItemKey: (i) => items[i].id,
    });
${closeScript}

<ScrollArea size="md" direction="vertical" class="w-full h-80">
    <ScrollAreaContent {@attach virtual.attachViewport}>
        <ul {@attach virtual.attachList} class="flex flex-col gap-2 p-3" role="list">
            {#each virtual.items as item (item.key)}
                <li {@attach virtual.attachItem(item.index)} {...virtual.getItemAriaProps(item.index)}>
                    <!-- Variable-height content -->
                </li>
            {/each}
        </ul>
    </ScrollAreaContent>
</ScrollArea>`;

    const tableCode = `<ScrollArea size="md" direction="vertical" class="w-full h-80">
    <ScrollAreaContent {@attach tableVirtual.attachViewport} class="scroll-pt-10">
        <table class="w-full border-collapse" aria-rowcount={rows.length}>
            <thead class="sticky top-0 bg-sunken">
                <tr><th>ID</th><th>Customer</th><th>Plan</th></tr>
            </thead>
            <tbody {@attach tableVirtual.attachList}>
                {#if tableVirtual.offsetBefore > 0}
                    <tr aria-hidden="true" data-virtual-scroll-spacer="before">
                        <td colspan="3" style="height: {tableVirtual.offsetBefore}px; padding: 0; border: 0;"></td>
                    </tr>
                {/if}
                {#each tableVirtual.items as item (item.key)}
                    <tr {@attach tableVirtual.attachItem(item.index)} {...tableVirtual.getItemAriaProps(item.index, { role: "row", headerRowCount: 1 })}>
                        <!-- Row cells -->
                    </tr>
                {/each}
                {#if tableVirtual.offsetAfter > 0}
                    <tr aria-hidden="true" data-virtual-scroll-spacer="after">
                        <td colspan="3" style="height: {tableVirtual.offsetAfter}px; padding: 0; border: 0;"></td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </ScrollAreaContent>
</ScrollArea>`;

    const gridCode = `const gridVirtual = createVirtualScroll({
    count: assets.length,
    estimateSize: 96,
    lanes: () => lanes,
    gap: 12,
});

<ScrollArea size="md" direction="vertical" class="w-full h-80">
    <ScrollAreaContent {@attach gridVirtual.attachViewport}>
        <div
            {@attach gridVirtual.attachList}
            class="grid gap-3 p-3"
            style="grid-template-columns: repeat({lanes}, minmax(0, 1fr));"
        >
            {#each gridVirtual.items as item (item.key)}
                <div {@attach gridVirtual.attachItem(item.index)}>
                    <!-- Card -->
                </div>
            {/each}
        </div>
    </ScrollAreaContent>
</ScrollArea>`;

    const horizontalCode = `const horizontalVirtual = createVirtualScroll({
    count: cards.length,
    orientation: "horizontal",
    estimateSize: 180,
    gap: 12,
});

<ScrollArea size="md" direction="horizontal" class="w-full">
    <ScrollAreaContent {@attach horizontalVirtual.attachViewport}>
        <div {@attach horizontalVirtual.attachList} class="flex items-stretch gap-3 p-3" role="list">
            {#each horizontalVirtual.items as item (item.key)}
                <div {@attach horizontalVirtual.attachItem(item.index)} class="w-180px h-32 shrink-0 rounded-xl bg-sunken p-3">
                    {cards[item.index]?.sprint}
                </div>
            {/each}
        </div>
    </ScrollAreaContent>
</ScrollArea>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="VirtualScroll"
        description="Flow-preserving DOM virtualization for lists, tables, and grids without absolute positioning."
    />

    <PreviewSection
        title="Basic List"
        description="Virtualizes 10,000 items with imperative scrollToIndex alignment and fixed or dynamic sizing."
        align="start"
        code={basicCode}
    >
        <div class="flex flex-col gap-3 w-full">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <TextInput variant="soft" size="sm" class="w-28">
                        <TextInputField
                            type="number"
                            min="0"
                            max={basicItems.length - 1}
                            bind:value={targetIndexInput}
                            aria-label="Target index"
                        />
                    </TextInput>

                    <SegmentedControl size="sm" bind:value={scrollAlign} aria-label="Scroll alignment">
                        {#each VIRTUAL_SCROLL_ALIGNS as alignOption (alignOption)}
                            <SegmentedControlItem value={alignOption}>
                                <SegmentedControlLabel class="capitalize">{alignOption}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>

                    <Button variant="secondary" size="sm" onclick={jumpToBasicIndex}>
                        <ButtonLabel>Scroll to Index</ButtonLabel>
                    </Button>
                </div>

                <label class="flex items-center gap-2 text-xs font-medium text-main select-none cursor-pointer">
                    <Switch size="sm" bind:checked={isFixed} />
                    <span>Fixed height</span>
                </label>
            </div>

            <ScrollArea size="md" direction="vertical" class="w-full h-80 border border-base-soft rounded-2xl bg-canvas">
                <ScrollAreaContent {@attach basicVirtual.attachViewport}>
                    <div {@attach basicVirtual.attachList} class="flex flex-col gap-1.5 p-2" role="list">
                        {#each basicVirtual.items as item (item.key)}
                            {const entry = basicItems[item.index]}
                            {#if entry}
                                <div
                                    {@attach basicVirtual.attachItem(item.index)}
                                    {...basicVirtual.getItemAriaProps(item.index)}
                                    class="flex items-center justify-between gap-4 rounded-xl bg-sunken px-3.5 {isFixed
                                        ? 'h-44px'
                                        : 'py-2.5'}"
                                >
                                    <div class="min-w-0 flex flex-col">
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm font-medium text-strong truncate">{entry.name}</span>
                                            <span class="text-xs text-weak">{entry.role}</span>
                                        </div>
                                        {#if !isFixed && entry.note}
                                            <p class="text-xs text-weak truncate">{entry.note}</p>
                                        {/if}
                                    </div>
                                    <span class="text-xs font-medium text-weaker shrink-0">{entry.department}</span>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </ScrollAreaContent>
            </ScrollArea>
        </div>
    </PreviewSection>

    <PreviewSection
        title="ScrollArea & Dynamic Heights"
        description="Composes createVirtualScroll with ScrollArea and anchors scroll position when items resize."
        align="start"
        code={scrollAreaCode}
    >
        <ScrollArea size="md" direction="vertical" class="w-full h-80 border border-base-soft rounded-2xl bg-canvas">
            <ScrollAreaContent {@attach scrollAreaVirtual.attachViewport}>
                <ul {@attach scrollAreaVirtual.attachList} class="flex flex-col gap-2 p-3" role="list">
                    {#each scrollAreaVirtual.items as item (item.key)}
                        {const msg = activityItems[item.index]}
                        {#if msg}
                            {const isOpen = Boolean(expandedIds[msg.id])}
                            <li
                                {@attach scrollAreaVirtual.attachItem(item.index)}
                                {...scrollAreaVirtual.getItemAriaProps(item.index)}
                                class="rounded-xl bg-sunken px-4 py-3 flex flex-col gap-2"
                            >
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0 flex flex-col gap-0.5">
                                        <div class="flex items-center gap-2">
                                            <span class="text-sm font-medium text-strong">{msg.author}</span>
                                            <span class="text-xs text-weaker">{msg.timestamp}</span>
                                        </div>
                                        <p class="text-sm text-main">{msg.summary}</p>
                                    </div>
                                    <Button variant="ghost" size="xs" onclick={() => toggleExpanded(msg.id)}>
                                        <ButtonLabel>{isOpen ? "Hide" : "Details"}</ButtonLabel>
                                    </Button>
                                </div>
                                {#if isOpen}
                                    <p class="text-xs text-weak border-t border-base-soft pt-2">
                                        {msg.details}
                                    </p>
                                {/if}
                            </li>
                        {/if}
                    {/each}
                </ul>
            </ScrollAreaContent>
        </ScrollArea>
    </PreviewSection>

    <PreviewSection
        title="Table Spacer Mode"
        description="Virtualizes 10,000 table rows using offsetBefore and offsetAfter spacer rows under a sticky header."
        align="start"
        code={tableCode}
    >
        <ScrollArea size="md" direction="vertical" class="w-full h-80 border border-base-soft rounded-2xl bg-canvas">
            <ScrollAreaContent {@attach tableVirtual.attachViewport} class="scroll-pt-10">
                <table class="w-full border-collapse text-sm text-left" aria-rowcount={tableRows.length}>
                    <thead class="sticky top-0 z-10 bg-sunken border-b border-base-soft text-xs font-medium text-weak">
                        <tr>
                            <th class="px-4 py-2.5">Invoice</th>
                            <th class="px-4 py-2.5">Customer</th>
                            <th class="px-4 py-2.5">Plan</th>
                            <th class="px-4 py-2.5">Status</th>
                            <th class="px-4 py-2.5 text-right">MRR</th>
                        </tr>
                    </thead>
                    <tbody {@attach tableVirtual.attachList}>
                        {#if tableVirtual.offsetBefore > 0}
                            <tr aria-hidden="true" data-virtual-scroll-spacer="before">
                                <td colspan="5" style="height: {tableVirtual.offsetBefore}px; padding: 0; border: 0;"></td>
                            </tr>
                        {/if}
                        {#each tableVirtual.items as item (item.key)}
                            {const row = tableRows[item.index]}
                            {#if row}
                                <tr
                                    {@attach tableVirtual.attachItem(item.index)}
                                    {...tableVirtual.getItemAriaProps(item.index, { role: "row", headerRowCount: 1 })}
                                    class="border-b border-base-soft {item.index % 2 === 1 ? 'bg-sunken/50' : ''}"
                                >
                                    <td class="px-4 py-2.5 font-mono text-xs text-weak">{row.id}</td>
                                    <td class="px-4 py-2.5 font-medium text-strong">{row.customer}</td>
                                    <td class="px-4 py-2.5 text-main">{row.plan}</td>
                                    <td class="px-4 py-2.5 text-weak">{row.status}</td>
                                    <td class="px-4 py-2.5 text-right font-medium text-strong">{row.mrr}</td>
                                </tr>
                            {/if}
                        {/each}
                        {#if tableVirtual.offsetAfter > 0}
                            <tr aria-hidden="true" data-virtual-scroll-spacer="after">
                                <td colspan="5" style="height: {tableVirtual.offsetAfter}px; padding: 0; border: 0;"></td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </ScrollAreaContent>
        </ScrollArea>
    </PreviewSection>

    <PreviewSection
        title="Grid Lanes"
        description="Virtualizes multi-column CSS Grid rows with reactive lane counts."
        align="start"
        code={gridCode}
    >
        <div class="flex flex-col gap-3 w-full">
            <div class="flex items-center justify-end">
                <SegmentedControl size="sm" bind:value={gridLanes} aria-label="Grid columns">
                    <SegmentedControlItem value="2">
                        <SegmentedControlLabel>2 Lanes</SegmentedControlLabel>
                    </SegmentedControlItem>
                    <SegmentedControlItem value="3">
                        <SegmentedControlLabel>3 Lanes</SegmentedControlLabel>
                    </SegmentedControlItem>
                    <SegmentedControlItem value="4">
                        <SegmentedControlLabel>4 Lanes</SegmentedControlLabel>
                    </SegmentedControlItem>
                </SegmentedControl>
            </div>

            <ScrollArea size="md" direction="vertical" class="w-full h-80 border border-base-soft rounded-2xl bg-canvas">
                <ScrollAreaContent {@attach gridVirtual.attachViewport}>
                    <div
                        {@attach gridVirtual.attachList}
                        class="grid gap-3 p-3"
                        style="grid-template-columns: repeat({numericLanes}, minmax(0, 1fr));"
                    >
                        {#each gridVirtual.items as item (item.key)}
                            {const asset = assetItems[item.index]}
                            {#if asset}
                                <div
                                    {@attach gridVirtual.attachItem(item.index)}
                                    class="rounded-xl bg-sunken p-3.5 flex flex-col justify-between gap-2 {asset.tall
                                        ? 'min-h-28'
                                        : 'min-h-20'}"
                                >
                                    <div class="flex items-center justify-between gap-2">
                                        <span class="text-sm font-medium text-strong truncate">{asset.title}</span>
                                        <span class="text-xs font-mono text-weaker">{asset.format}</span>
                                    </div>
                                    <span class="text-xs text-weak">{asset.size}</span>
                                </div>
                            {/if}
                        {/each}
                    </div>
                </ScrollAreaContent>
            </ScrollArea>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Horizontal"
        description="Scrolls horizontally using logical inline padding offsets."
        align="start"
        code={horizontalCode}
    >
        <ScrollArea size="md" direction="horizontal" class="w-full border border-base-soft rounded-2xl bg-canvas">
            <ScrollAreaContent {@attach horizontalVirtual.attachViewport}>
                <div {@attach horizontalVirtual.attachList} class="flex items-stretch gap-3 p-3" role="list">
                    {#each horizontalVirtual.items as item (item.key)}
                        {const card = horizontalItems[item.index]}
                        {#if card}
                            <div
                                {@attach horizontalVirtual.attachItem(item.index)}
                                {...horizontalVirtual.getItemAriaProps(item.index)}
                                class="w-180px h-32 shrink-0 rounded-xl bg-sunken p-3.5 flex flex-col justify-between"
                            >
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs font-medium text-weaker">{card.sprint}</span>
                                    <span class="text-sm font-medium text-strong">{card.title}</span>
                                </div>
                                <span class="text-xs text-weak">{card.tasks} tasks</span>
                            </div>
                        {/if}
                    {/each}
                </div>
            </ScrollAreaContent>
        </ScrollArea>
    </PreviewSection>
</div>
