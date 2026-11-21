<script module>
    export const id = "splitter";
    export const label = "Splitter";
</script>

<script lang="ts">
    import {
        FileCode,
        FileText,
        Folder,
        MessageSquare,
        PanelLeft,
        PanelLeftClose,
        PanelRight,
        RotateCcw,
        Send,
        Terminal,
    } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        SPLITTER_SIZES,
        Splitter,
        SplitterHandle,
        SplitterPane,
        type SplitterPaneSnapshot,
    } from "cs/svelte/splitter";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let showSidebar = $state(true);
    let showInspector = $state(true);
    let sidebarCollapsed = $state(false);

    let clampCollapsed = $state(false);
    let clampSnapshots = $state<SplitterPaneSnapshot[]>([]);

    const threads = [
        "Release checklist",
        "Q4 roadmap draft",
        "API rate limits",
        "Design token audit",
    ];

    const sources = [
        { name: "release-notes.md", meta: "Updated 12m ago" },
        { name: "api-gateway.ts", meta: "142 lines" },
        { name: "tokens.css", meta: "Foundation" },
    ];

    const clampNavSnapshot = $derived(clampSnapshots.find((p) => p.id === "clamp-nav"));
    const clampDetailSnapshot = $derived(clampSnapshots.find((p) => p.id === "clamp-detail"));

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const chatboardCode = `<Splitter variant="subtle" size="md" class="h-88">
    {#if showSidebar}
        <SplitterPane
            id="chat-sidebar"
            defaultExtent="220px"
            min="160px"
            max="340px"
            collapsible
            bind:collapsed={sidebarCollapsed}
        >
            ...
        </SplitterPane>
        <SplitterHandle label="Resize sidebar" />
    {/if}

    <SplitterPane id="chat-main" min="240px">
        ...
    </SplitterPane>

    {#if showInspector}
        <SplitterHandle label="Resize inspector" />
        <SplitterPane id="chat-inspector" defaultExtent="260px" min="180px">
            ...
        </SplitterPane>
    {/if}
</Splitter>`;

    const variantsCode = `<Splitter variant="subtle" size="md" class="h-32">...</Splitter>
<Splitter variant="elevated" size="md" class="h-32">...</Splitter>
<Splitter variant="transparent" size="md" class="h-32">...</Splitter>`;

    const sizesCode = `<Splitter variant="elevated" size="sm" class="h-24">...</Splitter>
<Splitter variant="elevated" size="md" class="h-24">...</Splitter>
<Splitter variant="elevated" size="lg" class="h-24">...</Splitter>`;

    const nestedCode = `<Splitter variant="subtle" size="md" class="h-72">
    <SplitterPane defaultExtent="190px" min="140px" max="280px">
        ...
    </SplitterPane>
    <SplitterHandle />
    <SplitterPane min="220px">
        <Splitter orientation="vertical" variant="subtle" size="sm" class="h-full">
            <SplitterPane defaultExtent="65%" min="100px">
                ...
            </SplitterPane>
            <SplitterHandle />
            <SplitterPane min="72px">
                ...
            </SplitterPane>
        </Splitter>
    </SplitterPane>
</Splitter>`;

    const clampsCode = `<Splitter
    variant="subtle"
    size="md"
    class="h-44"
    onResize={(e) => (snapshots = e.panes)}
>
    <SplitterPane
        id="clamp-nav"
        defaultExtent="200px"
        min="140px"
        max="280px"
        collapsible
        collapseThreshold={0.5}
        bind:collapsed
    >
        ...
    </SplitterPane>
    <SplitterHandle doubleClickAction="reset" />
    <SplitterPane id="clamp-detail" min="180px">
        ...
    </SplitterPane>
</Splitter>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Splitter"
        description="Resizable multi-pane layout with quiet resting dividers, hover-intent reveal, collapsible panes, and nested 2D splits."
    />

    <PreviewSection
        title="AI Chatboard"
        description="Three-pane workspace with dynamic show/hide redistribution, id-based extent memory, and collapsible sidebar."
        code={chatboardCode}
    >
        <div class="flex w-full max-w-4xl flex-col gap-3">
            <div class="flex flex-wrap items-center gap-2">
                <Button
                    variant={showSidebar ? "secondary" : "tertiary"}
                    size="sm"
                    onclick={() => (showSidebar = !showSidebar)}
                >
                    <ButtonIcon icon={PanelLeft} />
                    <ButtonLabel>{showSidebar ? "Hide sidebar" : "Show sidebar"}</ButtonLabel>
                </Button>

                {#if showSidebar}
                    <Button
                        variant="tertiary"
                        size="sm"
                        onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
                    >
                        <ButtonIcon icon={PanelLeftClose} />
                        <ButtonLabel>{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</ButtonLabel>
                    </Button>
                {/if}

                <Button
                    variant={showInspector ? "secondary" : "tertiary"}
                    size="sm"
                    onclick={() => (showInspector = !showInspector)}
                >
                    <ButtonIcon icon={PanelRight} />
                    <ButtonLabel>{showInspector ? "Hide inspector" : "Show inspector"}</ButtonLabel>
                </Button>
            </div>

            <div class="h-88 overflow-hidden rounded-xl squircle-soft border border-base-soft bg-elevated">
                <Splitter variant="subtle" size="md" class="h-full">
                    {#if showSidebar}
                        <SplitterPane
                            id="chat-sidebar"
                            defaultExtent="220px"
                            min="160px"
                            max="340px"
                            collapsible
                            bind:collapsed={sidebarCollapsed}
                        >
                            <div class="flex h-full min-w-40 flex-col gap-2 whitespace-nowrap bg-sunken p-3">
                                <div class="px-2 text-xs font-600 text-weak">Threads</div>
                                <div class="flex flex-col gap-1">
                                    {#each threads as thread, index (thread)}
                                        <div
                                            class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm {index === 0
                                                ? 'bg-base-soft font-500 text-strong'
                                                : 'text-weak'}"
                                        >
                                            <MessageSquare size={14} class="shrink-0" />
                                            <span class="truncate">{thread}</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </SplitterPane>
                        <SplitterHandle label="Resize sidebar" />
                    {/if}

                    <SplitterPane id="chat-main" min="240px">
                        <div class="flex h-full flex-col justify-between bg-elevated p-4">
                            <div class="flex flex-col gap-3">
                                <div class="flex items-center justify-between border-b border-base-soft pb-2.5">
                                    <span class="text-sm font-600 text-strong">Release checklist</span>
                                    <span class="text-xs text-weak">3 sources attached</span>
                                </div>

                                <div class="flex flex-col gap-2.5 text-sm">
                                    <div class="self-end rounded-xl squircle-soft bg-base-soft px-3 py-2 text-strong">
                                        Can you verify the rate limit defaults before we tag v2.4?
                                    </div>
                                    <div class="rounded-xl squircle-soft bg-sunken px-3 py-2 text-main">
                                        Authenticated routes allow 120 requests per minute; burst limits are configured
                                        in <code class="text-xs font-600">api-gateway.ts</code>.
                                    </div>
                                </div>
                            </div>

                            <div class="flex items-center justify-between rounded-lg border border-base-soft bg-sunken px-3 py-2 text-sm text-weak">
                                <span>Ask a follow-up…</span>
                                <Send size={14} />
                            </div>
                        </div>
                    </SplitterPane>

                    {#if showInspector}
                        <SplitterHandle label="Resize inspector" />
                        <SplitterPane id="chat-inspector" defaultExtent="260px" min="180px">
                            <div class="flex h-full flex-col gap-2 bg-elevated p-3">
                                <div class="px-1 text-xs font-600 text-weak">Context</div>
                                <div class="flex flex-col gap-1.5">
                                    {#each sources as source (source.name)}
                                        <div class="flex items-center gap-2 rounded-lg bg-sunken px-2.5 py-2">
                                            <FileText size={14} class="shrink-0 text-weak" />
                                            <div class="min-w-0 flex-1">
                                                <div class="truncate text-sm font-500 text-strong">{source.name}</div>
                                                <div class="truncate text-xs text-weak">{source.meta}</div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </SplitterPane>
                    {/if}
                </Splitter>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Subtle hairlines, elevated gutters with resting pills, and transparent island gaps."
        code={variantsCode}
    >
        <div class="flex w-full max-w-2xl flex-col gap-5">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-600 text-weak">Subtle</span>
                <div class="h-28 overflow-hidden rounded-xl squircle-soft border border-base-soft bg-elevated">
                    <Splitter variant="subtle" size="md" class="h-full">
                        <SplitterPane defaultExtent="35%" min="120px">
                            <div class="flex-center h-full bg-sunken text-sm text-weak">
                                Inbox
                            </div>
                        </SplitterPane>
                        <SplitterHandle />
                        <SplitterPane min="160px">
                            <div class="flex-center h-full text-sm text-main">
                                Message
                            </div>
                        </SplitterPane>
                    </Splitter>
                </div>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-600 text-weak">Elevated</span>
                <div class="h-28 overflow-hidden rounded-xl squircle-soft border border-base-soft bg-elevated">
                    <Splitter variant="elevated" size="md" class="h-full">
                        <SplitterPane defaultExtent="35%" min="120px">
                            <div class="flex-center h-full text-sm text-weak">
                                Files
                            </div>
                        </SplitterPane>
                        <SplitterHandle />
                        <SplitterPane min="160px">
                            <div class="flex-center h-full text-sm text-main">
                                Preview
                            </div>
                        </SplitterPane>
                    </Splitter>
                </div>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-600 text-weak">Transparent</span>
                <div class="h-32 rounded-2xl squircle-soft bg-sunken p-3 shadow-sunken">
                    <Splitter variant="transparent" size="md" class="h-full">
                        <SplitterPane defaultExtent="35%" min="120px">
                            <div class="flex-center h-full rounded-xl squircle-soft bg-elevated text-sm text-weak shadow-elevated">
                                Outline
                            </div>
                        </SplitterPane>
                        <SplitterHandle />
                        <SplitterPane min="160px">
                            <div class="flex-center h-full rounded-xl squircle-soft bg-elevated text-sm text-main shadow-elevated">
                                Document
                            </div>
                        </SplitterPane>
                    </Splitter>
                </div>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Small, medium, and large handle tracks and grip pills."
        code={sizesCode}
    >
        <div class="flex w-full max-w-2xl flex-col gap-4">
            {#each SPLITTER_SIZES as size (size)}
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-600 uppercase text-weak">{size}</span>
                    <div class="h-20 overflow-hidden rounded-xl squircle-soft border border-base-soft bg-elevated">
                        <Splitter variant="elevated" {size} class="h-full">
                            <SplitterPane defaultExtent="35%" min="100px">
                                <div class="flex-center h-full text-sm text-weak">
                                    Navigation
                                </div>
                            </SplitterPane>
                            <SplitterHandle />
                            <SplitterPane min="140px">
                                <div class="flex-center h-full text-sm text-main">
                                    Content
                                </div>
                            </SplitterPane>
                        </Splitter>
                    </div>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="2D Nested & Vertical"
        description="Horizontal shell containing a vertical split with clean T-junction intersections."
        code={nestedCode}
    >
        <div class="h-72 w-full max-w-3xl overflow-hidden rounded-xl squircle-soft border border-base-soft bg-elevated">
            <Splitter variant="subtle" size="md" class="h-full">
                <SplitterPane defaultExtent="190px" min="140px" max="280px">
                    <div class="flex h-full flex-col gap-2 bg-sunken p-3">
                        <div class="px-1 text-xs font-600 text-weak">Explorer</div>
                        <div class="flex flex-col gap-1 text-sm text-main">
                            <div class="flex items-center gap-2 rounded-md px-1.5 py-1">
                                <Folder size={14} class="text-weak" />
                                <span>src</span>
                            </div>
                            <div class="flex items-center gap-2 rounded-md bg-base-soft px-1.5 py-1 font-500">
                                <FileCode size={14} class="text-weak" />
                                <span>server.ts</span>
                            </div>
                            <div class="flex items-center gap-2 rounded-md px-1.5 py-1">
                                <FileText size={14} class="text-weak" />
                                <span>README.md</span>
                            </div>
                        </div>
                    </div>
                </SplitterPane>
                <SplitterHandle label="Resize explorer" />
                <SplitterPane min="220px">
                    <Splitter orientation="vertical" variant="subtle" size="sm" class="h-full">
                        <SplitterPane defaultExtent="65%" min="100px">
                            <div class="flex h-full flex-col gap-2 p-4">
                                <div class="text-xs font-600 text-weak">server.ts</div>
                                <pre class="text-xs leading-relaxed text-main">export const port = 3000;
export const status = "ready";</pre>
                            </div>
                        </SplitterPane>
                        <SplitterHandle label="Resize console" />
                        <SplitterPane min="72px">
                            <div class="flex h-full flex-col gap-1.5 bg-sunken p-3">
                                <div class="flex items-center gap-1.5 text-xs font-600 text-weak">
                                    <Terminal size={13} />
                                    <span>Console</span>
                                </div>
                                <div class="text-xs text-main">Listening on http://localhost:3000</div>
                            </div>
                        </SplitterPane>
                    </Splitter>
                </SplitterPane>
            </Splitter>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Clamps & Collapsible"
        description="Min/max bounds, threshold collapse snapping, live extent readout, and double-click reset."
        code={clampsCode}
    >
        <div class="flex w-full max-w-3xl flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-3 text-xs tabular-nums text-weak">
                    <span>
                        Left:
                        <strong class="font-600 text-strong">
                            {clampNavSnapshot
                                ? `${Math.round(clampNavSnapshot.extentPx)}px (${Math.round(clampNavSnapshot.extentPercent)}%)`
                                : "—"}
                        </strong>
                        {#if clampCollapsed}
                            <span class="ml-1 rounded bg-base-soft px-1.5 py-0.5 text-strong">collapsed</span>
                        {/if}
                    </span>
                    <span>
                        Right:
                        <strong class="font-600 text-strong">
                            {clampDetailSnapshot
                                ? `${Math.round(clampDetailSnapshot.extentPx)}px (${Math.round(clampDetailSnapshot.extentPercent)}%)`
                                : "—"}
                        </strong>
                    </span>
                </div>

                <Button
                    variant="tertiary"
                    size="sm"
                    onclick={() => (clampCollapsed = !clampCollapsed)}
                >
                    <ButtonIcon icon={RotateCcw} />
                    <ButtonLabel>{clampCollapsed ? "Expand pane" : "Collapse pane"}</ButtonLabel>
                </Button>
            </div>

            <div class="h-44 overflow-hidden rounded-xl squircle-soft border border-base-soft bg-elevated">
                <Splitter
                    variant="subtle"
                    size="md"
                    class="h-full"
                    onResize={(e) => (clampSnapshots = e.panes)}
                >
                    <SplitterPane
                        id="clamp-nav"
                        defaultExtent="200px"
                        min="140px"
                        max="280px"
                        collapsible
                        collapseThreshold={0.5}
                        bind:collapsed={clampCollapsed}
                    >
                        <div class="flex h-full min-w-45 flex-col justify-center gap-1 whitespace-nowrap bg-sunken p-4">
                            <div class="text-sm font-600 text-strong">Filters</div>
                            <div class="text-xs text-weak">140px – 280px, collapsible</div>
                        </div>
                    </SplitterPane>
                    <SplitterHandle doubleClickAction="reset" label="Resize filters" />
                    <SplitterPane id="clamp-detail" min="180px">
                        <div class="flex h-full flex-col justify-center gap-1 p-4">
                            <div class="text-sm font-600 text-strong">Results</div>
                            <div class="text-xs text-weak">Min 180px, double-click divider to reset</div>
                        </div>
                    </SplitterPane>
                </Splitter>
            </div>
        </div>
    </PreviewSection>
</div>
