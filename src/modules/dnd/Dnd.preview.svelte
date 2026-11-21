<script module>
    export const id = "dnd";
    export const label = "Drag & Drop";
</script>

<script lang="ts">
    import {
        Activity,
        BarChart3,
        Bug,
        ChevronDown,
        ChevronRight,
        Clock,
        FileCode,
        FileImage,
        FileSpreadsheet,
        FileText,
        Folder,
        FolderOpen,
        GitBranch,
        GripVertical,
        Image as ImageIcon,
        Kanban,
        LayoutDashboard,
        ListTodo,
        Rocket,
        RotateCcw,
        Settings,
        Trash2,
        TrendingUp,
        Users,
    } from "@lucide/svelte";
    import { Badge, type BadgeColor, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Checkbox } from "cs/svelte/checkbox";
    import { arrayMove, arrayTransfer, createDnd, type DndId, dragHandle } from "cs/svelte/dnd";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import { Switch } from "cs/svelte/switch";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    // -------------------------------------------------------------------------
    // 1. 1D Sortable List (Handles, Variable Heights, ScrollArea Auto-Scroll)
    // -------------------------------------------------------------------------
    interface SprintTask {
        id: string;
        title: string;
        details?: string;
        tag: string;
        tagColor: BadgeColor;
        done: boolean;
    }

    const INITIAL_SPRINT_TASKS: SprintTask[] = [
        { id: "t-1", title: "Audit keyboard focus rings across dialogs", tag: "A11y", tagColor: "accent", done: false },
        { id: "t-2", title: "Finalize Q4 onboarding illustrations", tag: "Design", tagColor: "base", done: true },
        {
            id: "t-3",
            title: "Migrate billing webhooks to idempotent queue",
            details:
                "Ensure duplicate Stripe retry deliveries are deduplicated by event ID and logged with structured trace metadata before triggering invoice emails.",
            tag: "Backend",
            tagColor: "caution",
            done: false,
        },
        { id: "t-4", title: "Trim unused icon imports in dashboard bundle", tag: "Perf", tagColor: "positive", done: false },
        { id: "t-5", title: "Add CSV export for monthly usage reports", tag: "Feature", tagColor: "accent", done: false },
        { id: "t-6", title: "Update dark mode contrast for muted badges", tag: "Design", tagColor: "base", done: true },
        {
            id: "t-7",
            title: "Consolidate team permission checks in API middleware",
            details:
                "Replace per-route role guards with a single policy resolver covering workspace owners, editors, and read-only billing contacts.",
            tag: "Security",
            tagColor: "negative",
            done: false,
        },
        { id: "t-8", title: "Benchmark cold start latency on edge workers", tag: "Perf", tagColor: "positive", done: false },
        { id: "t-9", title: "Draft release notes for v2.4", tag: "Docs", tagColor: "base", done: false },
        { id: "t-10", title: "Fix date picker locale formatting for German", tag: "Bug", tagColor: "negative", done: false },
        { id: "t-11", title: "Add empty state for archived projects view", tag: "Design", tagColor: "base", done: false },
        { id: "t-12", title: "Cache workspace avatar thumbnails in CDN", tag: "Perf", tagColor: "positive", done: true },
        { id: "t-13", title: "Verify SSO SAML metadata rotation flow", tag: "Security", tagColor: "caution", done: false },
        { id: "t-14", title: "Clean up deprecated feature flags from Q2", tag: "Chore", tagColor: "base", done: false },
        { id: "t-15", title: "Schedule customer beta feedback interviews", tag: "Product", tagColor: "accent", done: false },
    ];

    let sprintTasks = $state<SprintTask[]>(INITIAL_SPRINT_TASKS.map((task) => ({ ...task })));
    let handleOnly = $state(true);
    let pressAndHold = $state(false);

    const listDnd = createDnd<SprintTask>({
        onReorder: ({ fromIndex, toIndex }) => {
            sprintTasks = arrayMove(sprintTasks, fromIndex, toIndex);
        },
        onDragCancel: ({ currentIndex, originIndex }) => {
            if (currentIndex !== null && originIndex !== null && currentIndex !== originIndex) {
                sprintTasks = arrayMove(sprintTasks, currentIndex, originIndex);
            }
        },
    });

    function resetSprintTasks(): void {
        sprintTasks = INITIAL_SPRINT_TASKS.map((task) => ({ ...task }));
    }

    // -------------------------------------------------------------------------
    // 2. Horizontal 1D Strip (Tabs / Views)
    // -------------------------------------------------------------------------
    interface ViewTab {
        id: string;
        label: string;
        icon: typeof LayoutDashboard;
    }

    let viewTabs = $state<ViewTab[]>([
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "backlog", label: "Backlog", icon: ListTodo },
        { id: "board", label: "Board", icon: Kanban },
        { id: "releases", label: "Releases", icon: Rocket },
        { id: "metrics", label: "Metrics", icon: BarChart3 },
        { id: "settings", label: "Settings", icon: Settings },
    ]);
    let activeTabId = $state("overview");

    const tabsDnd = createDnd<ViewTab>({
        onReorder: ({ fromIndex, toIndex }) => {
            viewTabs = arrayMove(viewTabs, fromIndex, toIndex);
        },
        onDragCancel: ({ currentIndex, originIndex }) => {
            if (currentIndex !== null && originIndex !== null && currentIndex !== originIndex) {
                viewTabs = arrayMove(viewTabs, currentIndex, originIndex);
            }
        },
    });

    // -------------------------------------------------------------------------
    // 3. Multi-Container Kanban Board
    // -------------------------------------------------------------------------
    type KanbanColumnId = "todo" | "in-progress" | "done";

    interface KanbanCard {
        id: string;
        title: string;
        owner: string;
        tag: string;
        color: BadgeColor;
    }

    const KANBAN_COLUMNS: { id: KanbanColumnId; title: string }[] = [
        { id: "todo", title: "To Do" },
        { id: "in-progress", title: "In Progress" },
        { id: "done", title: "Done" },
    ];

    let kanban = $state<Record<KanbanColumnId, KanbanCard[]>>({
        todo: [
            { id: "k-1", title: "Design billing invoice PDF", owner: "Maya", tag: "Design", color: "base" },
            { id: "k-2", title: "Add rate-limit headers", owner: "Lukas", tag: "API", color: "caution" },
            { id: "k-3", title: "Write migration script", owner: "Noah", tag: "Data", color: "accent" },
        ],
        "in-progress": [
            { id: "k-4", title: "Workspace invite flow", owner: "Elena", tag: "Product", color: "accent" },
            { id: "k-5", title: "Fix Safari sticky header", owner: "Maya", tag: "Bug", color: "negative" },
        ],
        done: [{ id: "k-6", title: "Ship keyboard shortcuts", owner: "Lukas", tag: "UX", color: "positive" }],
    });

    function moveKanbanCard(
        fromContainerId: DndId,
        toContainerId: DndId,
        fromIndex: number,
        toIndex: number,
    ): void {
        const fromCol = fromContainerId as KanbanColumnId;
        const toCol = toContainerId as KanbanColumnId;
        if (fromCol === toCol) {
            kanban[fromCol] = arrayMove(kanban[fromCol], fromIndex, toIndex);
        } else {
            const { source, target } = arrayTransfer(kanban[fromCol], kanban[toCol], fromIndex, toIndex);
            kanban[fromCol] = source;
            kanban[toCol] = target;
        }
    }

    const kanbanDnd = createDnd<KanbanCard>({
        onReorder: ({ fromContainerId, toContainerId, fromIndex, toIndex }) => {
            moveKanbanCard(fromContainerId, toContainerId, fromIndex, toIndex);
        },
        onDragCancel: ({ currentContainerId, originContainerId, currentIndex, originIndex }) => {
            if (
                currentContainerId !== null &&
                originContainerId !== null &&
                currentIndex !== null &&
                originIndex !== null &&
                (currentContainerId !== originContainerId || currentIndex !== originIndex)
            ) {
                moveKanbanCard(currentContainerId, originContainerId, currentIndex, originIndex);
            }
        },
    });

    // -------------------------------------------------------------------------
    // 4. 2D Grid (Dashboard Widgets)
    // -------------------------------------------------------------------------
    interface DashboardWidget {
        id: string;
        label: string;
        value: string;
        delta: string;
        deltaColor: BadgeColor;
        icon: typeof Users;
    }

    let widgets = $state<DashboardWidget[]>([
        { id: "w-1", label: "Active Users", value: "14,820", delta: "+8.4%", deltaColor: "positive", icon: Users },
        { id: "w-2", label: "Monthly Revenue", value: "$68.4k", delta: "+12.1%", deltaColor: "positive", icon: TrendingUp },
        { id: "w-3", label: "Avg. Latency", value: "42 ms", delta: "-6 ms", deltaColor: "positive", icon: Clock },
        { id: "w-4", label: "Uptime", value: "99.98%", delta: "30d", deltaColor: "base", icon: Activity },
        { id: "w-5", label: "Open Issues", value: "19", delta: "+3", deltaColor: "caution", icon: Bug },
        { id: "w-6", label: "Deployments", value: "34", delta: "This week", deltaColor: "accent", icon: GitBranch },
    ]);

    const gridDnd = createDnd<DashboardWidget>({
        onReorder: ({ fromIndex, toIndex }) => {
            widgets = arrayMove(widgets, fromIndex, toIndex);
        },
        onDragCancel: ({ currentIndex, originIndex }) => {
            if (currentIndex !== null && originIndex !== null && currentIndex !== originIndex) {
                widgets = arrayMove(widgets, currentIndex, originIndex);
            }
        },
    });

    // -------------------------------------------------------------------------
    // 5. Nested Folder Tree (layout: "tree")
    // -------------------------------------------------------------------------
    interface TreeNode {
        id: string;
        name: string;
        kind: "folder" | "file";
        parentId: string | null;
        expanded?: boolean;
    }

    interface VisibleTreeRow {
        node: TreeNode;
        depth: number;
    }

    let treeNodes = $state<TreeNode[]>([
        { id: "f-design", name: "Design System", kind: "folder", parentId: null, expanded: true },
        { id: "n-tokens", name: "tokens.json", kind: "file", parentId: "f-design" },
        { id: "f-components", name: "Components", kind: "folder", parentId: "f-design", expanded: true },
        { id: "n-button", name: "Button.svelte", kind: "file", parentId: "f-components" },
        { id: "n-dialog", name: "Dialog.svelte", kind: "file", parentId: "f-components" },
        { id: "f-archive", name: "Archive", kind: "folder", parentId: null, expanded: false },
        { id: "n-legacy", name: "legacy-theme.css", kind: "file", parentId: "f-archive" },
        { id: "n-old-notes", name: "v1-notes.md", kind: "file", parentId: "f-archive" },
        { id: "n-readme", name: "README.md", kind: "file", parentId: null },
        { id: "n-changelog", name: "CHANGELOG.md", kind: "file", parentId: null },
    ]);

    function buildVisibleTree(nodes: readonly TreeNode[], parentId: string | null = null, depth = 0): VisibleTreeRow[] {
        const rows: VisibleTreeRow[] = [];
        for (const node of nodes) {
            if (node.parentId !== parentId) continue;
            rows.push({ node, depth });
            if (node.kind === "folder" && node.expanded) {
                rows.push(...buildVisibleTree(nodes, node.id, depth + 1));
            }
        }
        return rows;
    }

    const visibleTreeRows = $derived(buildVisibleTree(treeNodes));

    function isDescendant(nodes: readonly TreeNode[], candidateId: string, ancestorId: string): boolean {
        let current = nodes.find((n) => n.id === candidateId);
        while (current?.parentId) {
            if (current.parentId === ancestorId) return true;
            const nextParentId = current.parentId;
            current = nodes.find((n) => n.id === nextParentId);
        }
        return false;
    }

    function toggleFolder(folderId: string): void {
        treeNodes = treeNodes.map((node) => (node.id === folderId ? { ...node, expanded: !node.expanded } : node));
    }

    function expandFolder(folderId: DndId): void {
        const idStr = String(folderId);
        treeNodes = treeNodes.map((node) =>
            node.id === idStr && node.kind === "folder" ? { ...node, expanded: true } : node,
        );
    }

    const treeDnd = createDnd<TreeNode>({
        onDrop: ({ item, targetItemId, position }) => {
            if (!targetItemId || !position) return;
            const draggedId = String(item.id);
            const targetId = String(targetItemId);
            if (draggedId === targetId) return;
            if (isDescendant(treeNodes, targetId, draggedId)) return;

            const draggedNode = treeNodes.find((n) => n.id === draggedId);
            const targetNode = treeNodes.find((n) => n.id === targetId);
            if (!draggedNode || !targetNode) return;

            const isExpandedFolder = targetNode.kind === "folder" && Boolean(targetNode.expanded);
            const nestIntoTarget =
                (position === "inside" && targetNode.kind === "folder") || (position === "after" && isExpandedFolder);
            const nextParentId = nestIntoTarget ? targetNode.id : targetNode.parentId;

            const withoutDragged = treeNodes.filter((n) => n.id !== draggedId);
            const updatedDragged: TreeNode = { ...draggedNode, parentId: nextParentId };

            const targetIndex = withoutDragged.findIndex((n) => n.id === targetId);
            if (targetIndex === -1) return;

            const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
            const nextNodes = [...withoutDragged];
            nextNodes.splice(insertIndex, 0, updatedDragged);

            treeNodes = nextNodes.map((node) =>
                position === "inside" && node.id === targetId && node.kind === "folder"
                    ? { ...node, expanded: true }
                    : node,
            );
        },
    });

    // -------------------------------------------------------------------------
    // 6. Free Drag & Drop + Custom Thumbnail
    // -------------------------------------------------------------------------
    interface AssetChip {
        id: string;
        name: string;
        type: "image" | "doc";
        size: string;
    }

    const INITIAL_ASSETS: AssetChip[] = [
        { id: "a-1", name: "Hero Banner.png", type: "image", size: "1.4 MB" },
        { id: "a-2", name: "App Icon.svg", type: "image", size: "24 KB" },
        { id: "a-3", name: "Q4 Brief.pdf", type: "doc", size: "420 KB" },
        { id: "a-4", name: "Invoice 204.csv", type: "doc", size: "18 KB" },
    ];

    let availableAssets = $state<AssetChip[]>(INITIAL_ASSETS.map((asset) => ({ ...asset })));
    let mediaLibrary = $state<AssetChip[]>([]);
    let trashedCount = $state(0);

    const freeDnd = createDnd<AssetChip>({
        onDrop: ({ item, droppableId }) => {
            const dropped = availableAssets.find((asset) => asset.id === item.id);
            if (!dropped) return;

            if (droppableId === "media-library" && dropped.type === "image") {
                availableAssets = availableAssets.filter((asset) => asset.id !== dropped.id);
                mediaLibrary = [...mediaLibrary, dropped];
            } else if (droppableId === "trash-zone") {
                availableAssets = availableAssets.filter((asset) => asset.id !== dropped.id);
                trashedCount += 1;
            }
        },
    });

    function resetAssets(): void {
        availableAssets = INITIAL_ASSETS.map((asset) => ({ ...asset }));
        mediaLibrary = [];
        trashedCount = 0;
    }

    // -------------------------------------------------------------------------
    // 7. Sortable Table Rows (<tr> Auto-Clone + Indicator)
    // -------------------------------------------------------------------------
    interface ReleaseRow {
        id: string;
        feature: string;
        owner: string;
        status: string;
        statusColor: BadgeColor;
        estimate: string;
    }

    let releaseRows = $state<ReleaseRow[]>([
        { id: "r-1", feature: "Pointer drag engine", owner: "Lukas", status: "Ready", statusColor: "positive", estimate: "3d" },
        { id: "r-2", feature: "OAuth device login", owner: "Elena", status: "Review", statusColor: "accent", estimate: "2d" },
        { id: "r-3", feature: "Audit log retention", owner: "Noah", status: "In Progress", statusColor: "caution", estimate: "5d" },
        { id: "r-4", feature: "Invoice PDF templates", owner: "Maya", status: "Draft", statusColor: "base", estimate: "1d" },
        { id: "r-5", feature: "Webhook retry backoff", owner: "Lukas", status: "Blocked", statusColor: "negative", estimate: "2d" },
    ]);

    const tableDnd = createDnd<ReleaseRow>({
        onReorder: ({ fromIndex, toIndex }) => {
            releaseRows = arrayMove(releaseRows, fromIndex, toIndex);
        },
        onDragCancel: ({ currentIndex, originIndex }) => {
            if (currentIndex !== null && originIndex !== null && currentIndex !== originIndex) {
                releaseRows = arrayMove(releaseRows, currentIndex, originIndex);
            }
        },
    });
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Drag & Drop"
        description="Pointer-event drag-and-drop engine with WAAPI sibling displacement, Top-Layer thumbnails, auto-scroll, and keyboard support."
    />

    <!-- 1. 1D Sortable List -->
    <PreviewSection
        title="Sortable List"
        description="Scrollable vertical list with variable row heights, interactive checkboxes, and optional drag handles or press-and-hold."
    >
        <div class="flex w-full max-w-lg flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-3 px-1">
                <div class="flex flex-wrap items-center gap-4">
                    <label class="flex items-center gap-2 text-xs font-medium text-main select-none">
                        <Switch size="xs" bind:checked={handleOnly} />
                        <span>Handle only</span>
                    </label>
                    <label class="flex items-center gap-2 text-xs font-medium text-main select-none">
                        <Switch size="xs" bind:checked={pressAndHold} />
                        <span>Press &amp; hold</span>
                    </label>
                </div>

                <Button variant="tertiary" size="xs" onclick={resetSprintTasks}>
                    <ButtonIcon icon={RotateCcw} />
                    <ButtonLabel>Reset</ButtonLabel>
                </Button>
            </div>

            <ScrollArea size="md" direction="vertical" class="h-84 w-full rounded-2xl bg-sunken shadow-sunken">
                <ScrollAreaContent
                    class="flex flex-col gap-2 p-3"
                    {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
                >
                    <ul
                        class="flex flex-col gap-2"
                        {@attach listDnd.droppable({ id: "sprint-list", layout: "list", orientation: "vertical" })}
                    >
                        {#each sprintTasks as task, index (task.id)}
                            <li
                                class="flex items-start gap-2.5 rounded-xl bg-elevated px-3 py-2.5 shadow-elevated select-none"
                                {@attach listDnd.sortable({
                                    id: task.id,
                                    containerId: "sprint-list",
                                    index,
                                    data: task,
                                    label: task.title,
                                    requiresHandle: handleOnly,
                                    activation: pressAndHold ? { delay: 200, tolerance: 6 } : { delay: 0 },
                                })}
                            >
                                {#if handleOnly}
                                    <button
                                        type="button"
                                        aria-label="Reorder {task.title}"
                                        class="mt-0.5 flex-center size-5 shrink-0 rounded-md text-weak hover:text-main"
                                        {@attach dragHandle()}
                                    >
                                        <GripVertical class="size-3.5" />
                                    </button>
                                {/if}

                                <div class="mt-0.5 shrink-0">
                                    <Checkbox
                                        variant="soft"
                                        size="sm"
                                        bind:checked={task.done}
                                        aria-label="Complete {task.title}"
                                    />
                                </div>

                                <div class="min-w-0 flex-1">
                                    <div
                                        class="text-sm font-medium {task.done
                                            ? 'text-weak line-through'
                                            : 'text-strong'}"
                                    >
                                        {task.title}
                                    </div>
                                    {#if task.details}
                                        <p class="mt-1 text-xs leading-relaxed text-weak">{task.details}</p>
                                    {/if}
                                </div>

                                <Badge variant="soft" color={task.tagColor} size="xs" class="mt-0.5 shrink-0">
                                    <BadgeLabel>{task.tag}</BadgeLabel>
                                </Badge>
                            </li>
                        {/each}
                    </ul>
                </ScrollAreaContent>
            </ScrollArea>
        </div>
    </PreviewSection>

    <!-- 2. Horizontal 1D Strip -->
    <PreviewSection
        title="Horizontal Strip"
        description="Reorderable horizontal tabs with click-to-select and WAAPI sibling displacement."
    >
        <div
            role="tablist"
            class="flex flex-wrap items-center gap-1.5 rounded-2xl bg-sunken p-1.5 shadow-sunken"
            {@attach tabsDnd.droppable({ id: "view-tabs", layout: "list", orientation: "horizontal" })}
        >
            {#each viewTabs as tab, index (tab.id)}
                <div
                    role="tab"
                    tabindex="0"
                    aria-selected={activeTabId === tab.id}
                    onclick={() => (activeTabId = tab.id)}
                    onkeydown={(event) => {
                        if (event.key === "Enter") activeTabId = tab.id;
                    }}
                    class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium select-none transition-colors {activeTabId ===
                    tab.id
                        ? 'bg-elevated text-strong shadow-elevated'
                        : 'text-weak hover:text-main'}"
                    {@attach tabsDnd.sortable({
                        id: tab.id,
                        containerId: "view-tabs",
                        index,
                        data: tab,
                        label: tab.label,
                        axis: "x",
                        activation: { ignoreInteractive: false },
                    })}
                >
                    <tab.icon class="size-4 shrink-0" />
                    <span>{tab.label}</span>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <!-- 3. Multi-Container Kanban Board -->
    <PreviewSection
        title="Kanban Board"
        description="Move cards within or across columns, including empty columns. Press Escape mid-drag to revert."
    >
        <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
            {#each KANBAN_COLUMNS as column (column.id)}
                <div class="flex flex-col gap-2.5 rounded-2xl bg-sunken p-3 shadow-sunken">
                    <div class="flex items-center justify-between px-1">
                        <span class="text-xs font-semibold tracking-wide text-weak uppercase">{column.title}</span>
                        <Badge variant="soft" color="base" size="xs">
                            <BadgeLabel>{kanban[column.id].length}</BadgeLabel>
                        </Badge>
                    </div>

                    <div
                        class="flex min-h-36 flex-1 flex-col gap-2"
                        {@attach kanbanDnd.droppable({ id: column.id, layout: "list", orientation: "vertical" })}
                    >
                        {#each kanban[column.id] as card, index (card.id)}
                            <article
                                class="cs-dnd-preview-card flex flex-col gap-2.5 rounded-xl bg-elevated p-3 shadow-elevated select-none"
                                {@attach kanbanDnd.sortable({
                                    id: card.id,
                                    containerId: column.id,
                                    index,
                                    data: card,
                                    label: card.title,
                                })}
                            >
                                <div class="text-sm font-medium text-strong">{card.title}</div>
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-xs text-weak">{card.owner}</span>
                                    <Badge variant="soft" color={card.color} size="xs">
                                        <BadgeLabel>{card.tag}</BadgeLabel>
                                    </Badge>
                                </div>
                            </article>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <!-- 4. 2D Grid -->
    <PreviewSection
        title="2D Grid"
        description="Dashboard widgets arranged in a CSS Grid with smooth 2D sibling displacement."
    >
        <div
            class="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3"
            {@attach gridDnd.droppable({ id: "widget-grid", layout: "grid" })}
        >
            {#each widgets as widget, index (widget.id)}
                <article
                    class="cs-dnd-preview-card flex flex-col gap-3 rounded-2xl bg-base p-4 shadow-elevated select-none"
                    {@attach gridDnd.sortable({
                        id: widget.id,
                        containerId: "widget-grid",
                        index,
                        data: widget,
                        label: widget.label,
                    })}
                >
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-medium text-weak">{widget.label}</span>
                        <widget.icon class="size-4 text-weak" />
                    </div>
                    <div class="flex items-baseline justify-between gap-2">
                        <span class="title-lg font-semibold text-strong">{widget.value}</span>
                        <Badge variant="soft" color={widget.deltaColor} size="xs">
                            <BadgeLabel>{widget.delta}</BadgeLabel>
                        </Badge>
                    </div>
                </article>
            {/each}
        </div>
    </PreviewSection>

    <!-- 5. Nested Folder Tree -->
    <PreviewSection
        title="Nested Tree"
        description="Reorder files or nest them inside folders. Hover a collapsed folder to expand automatically."
    >
        <div
            class="flex w-full max-w-md flex-col gap-0.5 rounded-2xl bg-sunken p-2 shadow-sunken"
            style="--cs-dnd-tree-base-inset: 10px; --cs-dnd-tree-indent: 20px;"
            {@attach treeDnd.droppable({
                id: "file-tree",
                layout: "tree",
                expandDelay: 500,
                onExpandNode: expandFolder,
            })}
        >
            {#each visibleTreeRows as row, index (row.node.id)}
                <div
                    class="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-main select-none hover:bg-base-soft"
                    style="padding-inline-start: {row.depth * 20 + 10}px;"
                    {@attach treeDnd.sortable({
                        id: row.node.id,
                        containerId: "file-tree",
                        index,
                        parentId: row.node.parentId,
                        depth: row.depth,
                        canNest: row.node.kind === "folder",
                        expanded: Boolean(row.node.expanded),
                        data: row.node,
                        label: row.node.name,
                    })}
                >
                    {#if row.node.kind === "folder"}
                        <button
                            type="button"
                            aria-label="Toggle {row.node.name}"
                            class="flex-center size-5 shrink-0 rounded-md text-weak hover:bg-base-soft hover:text-main"
                            onclick={() => toggleFolder(row.node.id)}
                        >
                            {#if row.node.expanded}
                                <ChevronDown class="size-3.5" />
                            {:else}
                                <ChevronRight class="size-3.5" />
                            {/if}
                        </button>
                        {#if row.node.expanded}
                            <FolderOpen class="size-4 shrink-0 text-accent" />
                        {:else}
                            <Folder class="size-4 shrink-0 text-accent" />
                        {/if}
                        <span class="truncate font-medium text-strong">{row.node.name}</span>
                    {:else}
                        <span class="size-5 shrink-0"></span>
                        {#if row.node.name.endsWith(".svelte") || row.node.name.endsWith(".json") || row.node.name.endsWith(".css")}
                            <FileCode class="size-4 shrink-0 text-weak" />
                        {:else}
                            <FileText class="size-4 shrink-0 text-weak" />
                        {/if}
                        <span class="truncate text-main">{row.node.name}</span>
                    {/if}
                </div>
            {/each}
        </div>
    </PreviewSection>

    <!-- 6. Free Dropzones + Custom Thumbnail -->
    <PreviewSection
        title="Free Dropzones"
        description="Type-validated drop targets with a custom cursor-aligned pill thumbnail."
    >
        <div class="flex w-full max-w-2xl flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    {#each availableAssets as asset (asset.id)}
                        <div
                            class="flex items-center gap-2 rounded-xl bg-base px-3 py-2 text-sm shadow-elevated select-none"
                            {@attach freeDnd.draggable({
                                id: asset.id,
                                type: asset.type,
                                data: asset,
                                label: asset.name,
                            })}
                        >
                            {#if asset.type === "image"}
                                <FileImage class="size-4 text-accent" />
                            {:else}
                                <FileSpreadsheet class="size-4 text-weak" />
                            {/if}
                            <span class="font-medium text-strong">{asset.name}</span>
                            <Badge variant="soft" color={asset.type === "image" ? "accent" : "base"} size="xs">
                                <BadgeLabel>{asset.type}</BadgeLabel>
                            </Badge>
                        </div>
                    {/each}
                </div>

                {#if availableAssets.length < INITIAL_ASSETS.length}
                    <Button variant="tertiary" size="xs" onclick={resetAssets}>
                        <ButtonIcon icon={RotateCcw} />
                        <ButtonLabel>Restore</ButtonLabel>
                    </Button>
                {/if}
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div
                    class="flex-center min-h-32 flex-col gap-2 rounded-2xl bg-sunken p-4 text-center shadow-sunken"
                    {@attach freeDnd.droppable({
                        id: "media-library",
                        layout: "free",
                        accepts: ["image"],
                    })}
                >
                    <ImageIcon class="size-5 text-weak" />
                    <div class="text-sm font-medium text-strong">Media Library</div>
                    <div class="text-xs text-weak">Images only</div>

                    {#if mediaLibrary.length > 0}
                        <div class="mt-2 flex flex-wrap justify-center gap-1.5">
                            {#each mediaLibrary as asset (asset.id)}
                                <Badge variant="soft" color="accent" size="xs">
                                    <BadgeLabel>{asset.name}</BadgeLabel>
                                </Badge>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div
                    class="flex-center min-h-32 flex-col gap-2 rounded-2xl bg-sunken p-4 text-center shadow-sunken"
                    {@attach freeDnd.droppable({
                        id: "trash-zone",
                        layout: "free",
                        accepts: ["image", "doc"],
                    })}
                >
                    <Trash2 class="size-5 text-weak" />
                    <div class="text-sm font-medium text-strong">Trash</div>
                    <div class="text-xs text-weak">
                        {trashedCount > 0 ? `${trashedCount} removed` : "Drop any item"}
                    </div>
                </div>
            </div>
        </div>

        {#if freeDnd.active}
            <div
                class="flex items-center gap-2 rounded-full bg-elevated px-3.5 py-1.5 text-xs font-medium text-strong"
                {@attach freeDnd.dragThumbnail({ align: "cursor", offset: { x: 14, y: 14 } })}
            >
                {#if freeDnd.active.data.type === "image"}
                    <FileImage class="size-3.5 text-accent" />
                {:else}
                    <FileSpreadsheet class="size-3.5 text-weak" />
                {/if}
                <span>{freeDnd.active.data.name}</span>
                <span class="text-weak">{freeDnd.active.data.size}</span>
            </div>
        {/if}
    </PreviewSection>

    <!-- 7. Sortable Table Rows (<tr> Auto-Clone) -->
    <PreviewSection
        title="Sortable Table"
        description="Native table rows with preserved column widths in the Top-Layer ghost and inset drop indicators."
    >
        <div class="w-full max-w-2xl overflow-hidden rounded-2xl border border-base-soft bg-base">
            <table class="w-full border-collapse text-left text-sm">
                <thead>
                    <tr class="border-b border-base-soft bg-sunken text-xs font-medium text-weak">
                        <th class="w-10 px-3 py-2.5"></th>
                        <th class="px-3 py-2.5">Feature</th>
                        <th class="w-28 px-3 py-2.5">Owner</th>
                        <th class="w-32 px-3 py-2.5">Status</th>
                        <th class="w-20 px-3 py-2.5 text-right">Est.</th>
                    </tr>
                </thead>
                <tbody
                    class="divide-y divide-base-soft"
                    {@attach tableDnd.droppable({
                        id: "release-table",
                        layout: "list",
                        orientation: "vertical",
                        indicator: true,
                    })}
                >
                    {#each releaseRows as row, index (row.id)}
                        <tr
                            class="bg-base select-none"
                            {@attach tableDnd.sortable({
                                id: row.id,
                                containerId: "release-table",
                                index,
                                data: row,
                                label: row.feature,
                            })}
                        >
                            <td class="px-3 py-2.5">
                                <button
                                    type="button"
                                    aria-label="Reorder {row.feature}"
                                    class="flex-center size-6 rounded-md text-weak hover:text-main"
                                    {@attach dragHandle()}
                                >
                                    <GripVertical class="size-3.5" />
                                </button>
                            </td>
                            <td class="px-3 py-2.5 font-medium text-strong">{row.feature}</td>
                            <td class="px-3 py-2.5 text-weak">{row.owner}</td>
                            <td class="px-3 py-2.5">
                                <Badge variant="soft" color={row.statusColor} size="xs">
                                    <BadgeLabel>{row.status}</BadgeLabel>
                                </Badge>
                            </td>
                            <td class="px-3 py-2.5 text-right text-xs text-weak">{row.estimate}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </PreviewSection>
</div>

<style>
    :global(.cs-dnd-preview-card[data-dragging]) {
        opacity: 1;
        background-color: var(--cs-color-sunken);
        box-shadow: var(--cs-shadow-sunken);
    }

    :global(.cs-dnd-preview-card[data-dragging] > *) {
        opacity: 0;
    }
</style>
