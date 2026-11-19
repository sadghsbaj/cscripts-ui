<script module lang="ts">
    export const id = "data-table";
    export const label = "Data Table";
</script>

<script lang="ts">
    import { Check } from "@lucide/svelte";
    import { onMount } from "svelte";
    import { Badge, BadgeLabel, type BadgeColor, type BadgeSize } from "cs/svelte/badge";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "cs/svelte/card";
    import {
        createDataTable,
        DATA_TABLE_COLOR_MODES,
        DATA_TABLE_SIZES,
        DATA_TABLE_VARIANTS,
        DataTable,
        DataTableBody,
        DataTableCell,
        DataTableEmpty,
        DataTableHead,
        DataTableHeaderCell,
        DataTableRow,
        DataTableStatusBar,
        type DataTableCellRenderContext,
        type DataTableColorMode,
        type DataTableColumn,
        type DataTableSize,
        type DataTableTone,
        type DataTableVariant,
    } from "cs/svelte/data-table";
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import { Switch } from "cs/svelte/switch";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    const usdWhole = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });

    const signedPercent = new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        signDisplay: "always",
    });

    function formatCurrency(value: unknown): string {
        return typeof value === "number" ? usdWhole.format(value) : "";
    }

    function formatPercent(value: unknown): string {
        return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "";
    }

    function formatSignedPercent(value: unknown): string {
        return typeof value === "number" ? signedPercent.format(value) : "";
    }

    // -------------------------------------------------------------------------
    // 1. Primary Interactive Showcase (Invoices)
    // -------------------------------------------------------------------------
    type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Draft";
    type InvoicePlan = "Enterprise" | "Business" | "Team" | "Starter";
    type InvoiceRegion = "North America" | "Europe" | "Asia Pacific";

    interface InvoiceRow {
        id: string;
        customer: string;
        status: InvoiceStatus;
        plan: InvoicePlan;
        region: InvoiceRegion;
        seats: number;
        amount: number;
        issuedAt: string;
    }

    const STATUS_BADGE_COLORS: Record<InvoiceStatus, BadgeColor> = {
        Paid: "positive",
        Pending: "caution",
        Overdue: "negative",
        Draft: "base",
    };

    const INITIAL_INVOICES: readonly InvoiceRow[] = [
        {
            id: "INV-2041",
            customer: "Northstar Labs",
            status: "Paid",
            plan: "Enterprise",
            region: "North America",
            seats: 140,
            amount: 18_400,
            issuedAt: "2026-11-16",
        },
        {
            id: "INV-2042",
            customer: "Kestrel Systems",
            status: "Pending",
            plan: "Business",
            region: "Europe",
            seats: 48,
            amount: 6240,
            issuedAt: "2026-11-15",
        },
        {
            id: "INV-2043",
            customer: "Solstice Studio",
            status: "Paid",
            plan: "Team",
            region: "Europe",
            seats: 22,
            amount: 2640,
            issuedAt: "2026-11-14",
        },
        {
            id: "INV-2044",
            customer: "Harbor Cloud",
            status: "Overdue",
            plan: "Enterprise",
            region: "North America",
            seats: 210,
            amount: 26_800,
            issuedAt: "2026-10-19",
        },
        {
            id: "INV-2045",
            customer: "Linden Architecture",
            status: "Paid",
            plan: "Business",
            region: "Europe",
            seats: 36,
            amount: 4680,
            issuedAt: "2026-11-12",
        },
        {
            id: "INV-2046",
            customer: "Vesper Robotics",
            status: "Pending",
            plan: "Enterprise",
            region: "Asia Pacific",
            seats: 95,
            amount: 12_900,
            issuedAt: "2026-11-11",
        },
        {
            id: "INV-2047",
            customer: "Cinder Analytics",
            status: "Paid",
            plan: "Team",
            region: "North America",
            seats: 18,
            amount: 2160,
            issuedAt: "2026-11-10",
        },
        {
            id: "INV-2048",
            customer: "Alder Health",
            status: "Paid",
            plan: "Enterprise",
            region: "North America",
            seats: 180,
            amount: 23_400,
            issuedAt: "2026-11-09",
        },
        {
            id: "INV-2049",
            customer: "Marrow Design",
            status: "Draft",
            plan: "Starter",
            region: "Europe",
            seats: 8,
            amount: 960,
            issuedAt: "2026-11-08",
        },
        {
            id: "INV-2050",
            customer: "Helios Energy",
            status: "Overdue",
            plan: "Business",
            region: "Asia Pacific",
            seats: 64,
            amount: 8320,
            issuedAt: "2026-10-14",
        },
        {
            id: "INV-2051",
            customer: "Bramble Media",
            status: "Paid",
            plan: "Team",
            region: "North America",
            seats: 26,
            amount: 3120,
            issuedAt: "2026-11-07",
        },
        {
            id: "INV-2052",
            customer: "Trellis Logistics",
            status: "Pending",
            plan: "Enterprise",
            region: "Europe",
            seats: 125,
            amount: 16_250,
            issuedAt: "2026-11-06",
        },
        {
            id: "INV-2053",
            customer: "Quarry Ventures",
            status: "Paid",
            plan: "Business",
            region: "North America",
            seats: 42,
            amount: 5460,
            issuedAt: "2026-11-05",
        },
        {
            id: "INV-2054",
            customer: "Cobalt Marine",
            status: "Paid",
            plan: "Team",
            region: "Asia Pacific",
            seats: 30,
            amount: 3600,
            issuedAt: "2026-11-04",
        },
        {
            id: "INV-2055",
            customer: "Saffron Kitchens",
            status: "Draft",
            plan: "Starter",
            region: "Europe",
            seats: 12,
            amount: 1440,
            issuedAt: "2026-11-03",
        },
        {
            id: "INV-2056",
            customer: "Juniper Bio",
            status: "Paid",
            plan: "Enterprise",
            region: "North America",
            seats: 160,
            amount: 20_800,
            issuedAt: "2026-11-02",
        },
        {
            id: "INV-2057",
            customer: "Pebble Finance",
            status: "Pending",
            plan: "Business",
            region: "Europe",
            seats: 54,
            amount: 7020,
            issuedAt: "2026-11-01",
        },
        {
            id: "INV-2058",
            customer: "Driftwood Audio",
            status: "Paid",
            plan: "Team",
            region: "North America",
            seats: 20,
            amount: 2400,
            issuedAt: "2026-10-30",
        },
        {
            id: "INV-2059",
            customer: "Oakhaven Civic",
            status: "Overdue",
            plan: "Business",
            region: "North America",
            seats: 58,
            amount: 7540,
            issuedAt: "2026-10-11",
        },
        {
            id: "INV-2060",
            customer: "Wren Mobility",
            status: "Paid",
            plan: "Enterprise",
            region: "Asia Pacific",
            seats: 112,
            amount: 14_560,
            issuedAt: "2026-10-28",
        },
        {
            id: "INV-2061",
            customer: "Kiln Foundry",
            status: "Paid",
            plan: "Team",
            region: "Europe",
            seats: 24,
            amount: 2880,
            issuedAt: "2026-10-26",
        },
        {
            id: "INV-2062",
            customer: "Strata Geo",
            status: "Pending",
            plan: "Business",
            region: "Asia Pacific",
            seats: 46,
            amount: 5980,
            issuedAt: "2026-10-24",
        },
        {
            id: "INV-2063",
            customer: "Cairn Security",
            status: "Paid",
            plan: "Enterprise",
            region: "Europe",
            seats: 195,
            amount: 25_350,
            issuedAt: "2026-10-22",
        },
        {
            id: "INV-2064",
            customer: "Flint Optics",
            status: "Draft",
            plan: "Starter",
            region: "North America",
            seats: 10,
            amount: 1200,
            issuedAt: "2026-10-20",
        },
    ];

    let invoices = $state<readonly InvoiceRow[]>(INITIAL_INVOICES);
    let variant = $state<DataTableVariant>("elevated");
    let size = $state<DataTableSize>("md");
    let striped = $state(false);
    let gridlines = $state(false);

    const badgeSize = $derived<BadgeSize>(size === "xs" ? "xs" : "sm");

    const invoiceColumns: readonly DataTableColumn<InvoiceRow>[] = [
        {
            id: "id",
            label: "Invoice",
            width: 108,
            sortable: true,
            filterable: true,
            filterMode: "condition",
        },
        {
            id: "customer",
            label: "Customer",
            minWidth: 168,
            emphasis: "strong",
            sortable: true,
            filterable: true,
            filterMode: "both",
        },
        {
            id: "status",
            label: "Status",
            width: 118,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "plan",
            label: "Plan",
            width: 112,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "region",
            label: "Region",
            width: 136,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "seats",
            label: "Seats",
            type: "number",
            width: 82,
            sortable: true,
            filterable: true,
            filterMode: "condition",
        },
        {
            id: "amount",
            label: "Amount",
            type: "currency",
            width: 116,
            sortable: true,
            filterable: true,
            filterMode: "condition",
            format: formatCurrency,
        },
        {
            id: "issuedAt",
            label: "Issued",
            type: "date",
            width: 116,
            sortable: true,
            filterable: true,
            filterMode: "condition",
        },
    ];

    const invoiceTable = createDataTable({
        data: () => invoices,
        columns: invoiceColumns,
        getRowId: (row) => row.id,
        selectable: true,
        multiSort: true,
    });

    function markSelectedPaid(): void {
        const selected = invoiceTable.selectedRowIds;
        if (selected.size === 0) return;
        invoices = invoices.map((row) => (selected.has(row.id) ? { ...row, status: "Paid" } : row));
        invoiceTable.clearSelection();
    }

    // -------------------------------------------------------------------------
    // 2. Semantic Tones & Custom Colors (Quarterly Budget)
    // -------------------------------------------------------------------------
    type BudgetHealth = "On track" | "Watch" | "Over budget" | "Priority" | "Summary";

    interface BudgetRow {
        id: string;
        department: string;
        category: string;
        categoryColor: string;
        allocated: number;
        actual: number;
        variance: number;
        health: BudgetHealth;
        isSummary?: boolean;
    }

    const BUDGET_ROWS: readonly BudgetRow[] = [
        {
            id: "eng",
            department: "Core Platform",
            category: "Infrastructure",
            categoryColor: "#0ea5e9",
            allocated: 420_000,
            actual: 398_200,
            variance: -0.052,
            health: "On track",
        },
        {
            id: "design",
            department: "Product Design",
            category: "Brand",
            categoryColor: "#8b5cf6",
            allocated: 185_000,
            actual: 179_800,
            variance: -0.028,
            health: "On track",
        },
        {
            id: "data",
            department: "Applied Research",
            category: "Compute",
            categoryColor: "#6366f1",
            allocated: 310_000,
            actual: 324_900,
            variance: 0.048,
            health: "Priority",
        },
        {
            id: "growth",
            department: "Demand Growth",
            category: "Acquisition",
            categoryColor: "#f59e0b",
            allocated: 240_000,
            actual: 254_400,
            variance: 0.06,
            health: "Watch",
        },
        {
            id: "field",
            department: "Enterprise Sales",
            category: "Events",
            categoryColor: "#ec4899",
            allocated: 160_000,
            actual: 181_600,
            variance: 0.135,
            health: "Over budget",
        },
        {
            id: "ops",
            department: "Workplace Ops",
            category: "Facilities",
            categoryColor: "#10b981",
            allocated: 135_000,
            actual: 130_950,
            variance: -0.03,
            health: "On track",
        },
        {
            id: "total",
            department: "Total Q4 Budget",
            category: "All Units",
            categoryColor: "",
            allocated: 1_450_000,
            actual: 1_469_850,
            variance: 0.014,
            health: "Summary",
            isSummary: true,
        },
    ];

    const HEALTH_TONES: Record<BudgetHealth, DataTableTone> = {
        "On track": "positive",
        Watch: "caution",
        "Over budget": "negative",
        Priority: "accent",
        Summary: "base",
    };

    let colorMode = $state<DataTableColorMode>("tint");

    function resolveVarianceTone(value: unknown, row: BudgetRow): DataTableTone | undefined {
        if (row.isSummary || typeof value !== "number") return;
        if (value <= -0.02) return "positive";
        if (value >= 0.08) return "negative";
        if (value > 0.02) return "caution";
        return;
    }

    const budgetColumns: readonly DataTableColumn<BudgetRow>[] = [
        {
            id: "department",
            label: "Department",
            minWidth: 160,
            emphasis: "strong",
            sortable: true,
            cellStyle: (_value, row) => (row.isSummary ? { bold: true } : undefined),
        },
        {
            id: "category",
            label: "Category",
            width: 128,
            sortable: true,
            cellStyle: (_value, row) => (row.categoryColor ? { bg: row.categoryColor } : undefined),
        },
        {
            id: "allocated",
            label: "Allocated",
            type: "currency",
            width: 116,
            sortable: true,
            format: formatCurrency,
            cellStyle: (_value, row) => (row.isSummary ? { bold: true } : undefined),
        },
        {
            id: "actual",
            label: "Actual",
            type: "currency",
            width: 116,
            sortable: true,
            format: formatCurrency,
            cellStyle: (_value, row) => (row.isSummary ? { bold: true } : undefined),
        },
        {
            id: "variance",
            label: "Variance",
            type: "percent",
            width: 108,
            sortable: true,
            format: formatSignedPercent,
            tone: resolveVarianceTone,
        },
        {
            id: "health",
            label: "Health",
            width: 116,
            sortable: true,
            tone: (_value, row) => HEALTH_TONES[row.health],
        },
    ];

    const budgetTable = createDataTable({
        data: BUDGET_ROWS,
        columns: budgetColumns,
        getRowId: (row) => row.id,
        rowTone: (row) => (row.isSummary ? "base" : undefined),
    });

    // -------------------------------------------------------------------------
    // 3. High-Scale Virtualized Dataset (100,000 rows x 11 columns)
    // -------------------------------------------------------------------------
    type LedgerStatus = "Active" | "Renewal" | "Trial" | "At Risk";

    interface LedgerRow {
        orderId: string;
        account: string;
        region: string;
        segment: string;
        status: LedgerStatus;
        channel: string;
        owner: string;
        arr: number;
        seats: number;
        margin: number;
        renewedOn: string;
    }

    const LEDGER_ROW_COUNT = 100_000;
    const LEDGER_ACCOUNTS = [
        "Northstar",
        "Kestrel",
        "Solstice",
        "Harbor",
        "Linden",
        "Vesper",
        "Cinder",
        "Alder",
        "Helios",
        "Trellis",
        "Quarry",
        "Cobalt",
        "Juniper",
        "Pebble",
        "Strata",
        "Cairn",
        "Flint",
        "Meridian",
        "Wren",
        "Oakhaven",
    ] as const;
    const LEDGER_REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"] as const;
    const LEDGER_SEGMENTS = ["Enterprise", "Mid-Market", "Growth", "Starter"] as const;
    const LEDGER_STATUSES: readonly LedgerStatus[] = ["Active", "Active", "Renewal", "Trial", "At Risk"];
    const LEDGER_CHANNELS = ["Direct", "Partner", "Self-Serve", "Marketplace"] as const;
    const LEDGER_FIRST_NAMES = ["Maya", "Jonas", "Priya", "Lucas", "Elena", "Noah", "Hana", "David"] as const;
    const LEDGER_LAST_NAMES = ["Lin", "Weber", "Nair", "Meyer", "Rostova", "Patel"] as const;

    function generateLedgerRows(count: number): readonly LedgerRow[] {
        const rows: LedgerRow[] = Array.from({ length: count });
        for (let i = 0; i < count; i += 1) {
            const accountPrefix = LEDGER_ACCOUNTS[i % LEDGER_ACCOUNTS.length] ?? "Northstar";
            const accountNumber = (i % 600) + 1;
            const first = LEDGER_FIRST_NAMES[i % LEDGER_FIRST_NAMES.length] ?? "Maya";
            const last = LEDGER_LAST_NAMES[Math.trunc(i / 8) % LEDGER_LAST_NAMES.length] ?? "Lin";
            const month = (i % 12) + 1;
            const day = ((i * 7) % 28) + 1;
            const seats = 5 + ((i * 13) % 340);
            const arr = seats * (85 + ((i * 19) % 140));
            const margin = 0.54 + ((i * 31) % 380) / 1000;

            rows[i] = {
                orderId: `ORD-${String(100_001 + i)}`,
                account: `${accountPrefix} Group ${accountNumber}`,
                region: LEDGER_REGIONS[i % LEDGER_REGIONS.length] ?? "Europe",
                segment: LEDGER_SEGMENTS[(i * 3) % LEDGER_SEGMENTS.length] ?? "Enterprise",
                status: LEDGER_STATUSES[(i * 7) % LEDGER_STATUSES.length] ?? "Active",
                channel: LEDGER_CHANNELS[(i * 5) % LEDGER_CHANNELS.length] ?? "Direct",
                owner: `${first} ${last}`,
                arr,
                seats,
                margin,
                renewedOn: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            };
        }
        return rows;
    }

    const LEDGER_STATUS_BADGE_COLORS: Record<LedgerStatus, BadgeColor> = {
        Active: "positive",
        Renewal: "accent",
        Trial: "base",
        "At Risk": "negative",
    };

    let ledgerRows = $state.raw<readonly LedgerRow[]>([]);

    onMount(() => {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const frameId = requestAnimationFrame(() => {
            timeoutId = setTimeout(() => {
                ledgerRows = generateLedgerRows(LEDGER_ROW_COUNT);
            }, 0);
        });

        return () => {
            cancelAnimationFrame(frameId);
            if (timeoutId !== undefined) clearTimeout(timeoutId);
        };
    });

    const ledgerColumns: readonly DataTableColumn<LedgerRow>[] = [
        {
            id: "orderId",
            label: "Order ID",
            width: 114,
            emphasis: "strong",
            sortable: true,
            filterable: true,
            filterMode: "auto",
        },
        {
            id: "account",
            label: "Account",
            width: 176,
            sortable: true,
            filterable: true,
            filterMode: "both",
        },
        {
            id: "region",
            label: "Region",
            width: 132,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "segment",
            label: "Segment",
            width: 112,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "status",
            label: "Status",
            width: 102,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "channel",
            label: "Channel",
            width: 112,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "owner",
            label: "Owner",
            width: 132,
            sortable: true,
            filterable: true,
            filterMode: "values",
        },
        {
            id: "arr",
            label: "Annual value",
            type: "currency",
            width: 120,
            sortable: true,
            filterable: true,
            filterMode: "condition",
            format: formatCurrency,
        },
        {
            id: "seats",
            label: "Seats",
            type: "number",
            width: 82,
            sortable: true,
            filterable: true,
            filterMode: "condition",
        },
        {
            id: "margin",
            label: "Margin",
            type: "percent",
            width: 92,
            sortable: true,
            filterable: true,
            filterMode: "condition",
            format: formatPercent,
        },
        {
            id: "renewedOn",
            label: "Renewal",
            type: "date",
            width: 112,
            sortable: true,
            filterable: true,
            filterMode: "condition",
        },
    ];

    const ledgerTable = createDataTable({
        data: () => ledgerRows,
        columns: ledgerColumns,
        getRowId: (row) => row.orderId,
        selectable: true,
        multiSort: true,
        virtualize: true,
    });

    // -------------------------------------------------------------------------
    // 4. Declarative Card Nesting + Empty States
    // -------------------------------------------------------------------------
    interface PayoutRow {
        id: string;
        destination: string;
        status: "Settled" | "In transit";
        date: string;
        amount: string;
    }

    const RECENT_PAYOUTS: readonly PayoutRow[] = [
        { id: "PO-8842", destination: "Silicon Valley Checking", status: "Settled", date: "Nov 15", amount: "$42,810" },
        { id: "PO-8819", destination: "Berlin Euro Treasury", status: "Settled", date: "Nov 08", amount: "$28,450" },
        {
            id: "PO-8794",
            destination: "Silicon Valley Checking",
            status: "In transit",
            date: "Nov 01",
            amount: "$31,920",
        },
        { id: "PO-8761", destination: "Tokyo Operating Account", status: "Settled", date: "Oct 25", amount: "$19,600" },
    ];

    interface FilteredDemoRow {
        id: string;
        customer: string;
        status: "Paid" | "Pending";
        amount: number;
    }

    const FILTERED_DEMO_ROWS: readonly FilteredDemoRow[] = [
        { id: "INV-301", customer: "Northstar Labs", status: "Paid", amount: 8400 },
        { id: "INV-302", customer: "Kestrel Systems", status: "Pending", amount: 4250 },
        { id: "INV-303", customer: "Solstice Studio", status: "Paid", amount: 3120 },
        { id: "INV-304", customer: "Harbor Cloud", status: "Pending", amount: 11_900 },
    ];

    const filteredEmptyColumns: readonly DataTableColumn<FilteredDemoRow>[] = [
        { id: "customer", label: "Customer", minWidth: 130, emphasis: "strong", sortable: true, filterable: true },
        { id: "status", label: "Status", width: 96, filterable: true, filterMode: "values" },
        { id: "amount", label: "Amount", type: "currency", width: 100, sortable: true, format: formatCurrency },
    ];

    const filteredEmptyTable = createDataTable({
        data: FILTERED_DEMO_ROWS,
        columns: filteredEmptyColumns,
        getRowId: (row) => row.id,
        initialFilters: {
            customer: { kind: "condition", operator: "contains", value: "Acme" },
        },
    });

    // -------------------------------------------------------------------------
    // Code Snippets
    // -------------------------------------------------------------------------
    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const showcaseCode = `<script lang="ts">
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        createDataTable,
        DataTable,
        DataTableBody,
        DataTableEmpty,
        DataTableHead,
        DataTableStatusBar,
    } from "cs/svelte/data-table";

    const table = createDataTable({
        data: () => invoices,
        columns,
        getRowId: (row) => row.id,
        selectable: true,
        multiSort: true,
    });
${closeScript}

<DataTable variant="elevated" size="md" {table} label="Invoices" class="h-420px">
    <DataTableHead />
    <DataTableBody>
        {#snippet cell(ctx)}
            {#if ctx.column.id === "status"}
                <Badge variant="soft" color={statusColor(ctx.row.status)} size="sm">
                    <BadgeLabel>{ctx.row.status}</BadgeLabel>
                </Badge>
            {:else}
                {ctx.formatted}
            {/if}
        {/snippet}
    </DataTableBody>
    <DataTableEmpty />
    <DataTableStatusBar>
        {#snippet selectionActions()}
            <Button variant="primary" size="xs" onclick={markSelectedPaid}>
                <ButtonLabel>Mark paid</ButtonLabel>
            </Button>
        {/snippet}
    </DataTableStatusBar>
</DataTable>`;

    const tonesCode = `const budgetTable = createDataTable({
    data: rows,
    columns: [
        { id: "department", label: "Department", emphasis: "strong" },
        { id: "category", label: "Category", cellStyle: (_v, row) => ({ bg: row.categoryColor }) },
        { id: "variance", label: "Variance", type: "percent", tone: resolveVarianceTone },
        { id: "health", label: "Health", tone: (_v, row) => HEALTH_TONES[row.health] },
    ],
    getRowId: (row) => row.id,
    rowTone: (row) => (row.isSummary ? "base" : undefined),
});

<DataTable variant="elevated" size="sm" colorMode="tint" table={budgetTable}>
    <DataTableHead />
    <DataTableBody />
    <DataTableStatusBar />
</DataTable>`;

    const virtualizedCode = `const rows = $state.raw(generateLedgerRows(100_000));

const ledgerTable = createDataTable({
    data: () => rows,
    columns: ledgerColumns,
    getRowId: (row) => row.orderId,
    selectable: true,
    multiSort: true,
    virtualize: true,
});

<DataTable variant="elevated" size="xs" gridlines table={ledgerTable} class="h-440px">
    <DataTableHead />
    <DataTableBody>
        {#snippet cell(ctx)}
            {#if ctx.column.id === "status"}
                <Badge variant="soft" color={LEDGER_STATUS_BADGE_COLORS[ctx.row.status]} size="xs">
                    <BadgeLabel>{ctx.row.status}</BadgeLabel>
                </Badge>
            {:else}
                {ctx.formatted}
            {/if}
        {/snippet}
    </DataTableBody>
    <DataTableEmpty />
    <DataTableStatusBar />
</DataTable>`;

    const nestedDeclarativeCode = `<Card variant="elevated" size="lg">
    <CardHeader>
        <CardTitle>Recent Payouts</CardTitle>
        <CardDescription>Scheduled transfers for the current billing cycle.</CardDescription>
    </CardHeader>
    <CardBody>
        <DataTable variant="soft" size="sm" label="Recent payouts">
            <DataTableHead>
                <DataTableHeaderCell width={110}>Transfer</DataTableHeaderCell>
                <DataTableHeaderCell minWidth={140}>Destination</DataTableHeaderCell>
                <DataTableHeaderCell width={108}>Status</DataTableHeaderCell>
                <DataTableHeaderCell align="end" width={110}>Amount</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
                {#each payouts as payout (payout.id)}
                    <DataTableRow>
                        <DataTableCell emphasis="strong">{payout.id}</DataTableCell>
                        <DataTableCell>{payout.destination}</DataTableCell>
                        <DataTableCell>
                            <Badge variant="soft" color={payout.status === "Settled" ? "positive" : "caution"} size="sm">
                                <BadgeLabel>{payout.status}</BadgeLabel>
                            </Badge>
                        </DataTableCell>
                        <DataTableCell align="end" numeric>{payout.amount}</DataTableCell>
                    </DataTableRow>
                {/each}
            </DataTableBody>
        </DataTable>
    </CardBody>
</Card>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Data Table"
        description="Read-only interactive data table with in-header sorting and filtering, row selection, semantic cell styling, and 100k-row virtualization."
    />

    <PreviewSection
        title="Interactive Table"
        description="Click column headers to sort or filter, select rows for bulk actions, and compare surface variants and densities."
        align="start"
        code={showcaseCode}
    >
        <div class="w-full flex flex-col gap-5">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-3">
                    <SegmentedControl size="sm" bind:value={variant} aria-label="Table variant">
                        {#each DATA_TABLE_VARIANTS as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="capitalize">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>

                    <SegmentedControl size="sm" bind:value={size} aria-label="Table size">
                        {#each DATA_TABLE_SIZES as item (item)}
                            <SegmentedControlItem value={item}>
                                <SegmentedControlLabel class="uppercase">{item}</SegmentedControlLabel>
                            </SegmentedControlItem>
                        {/each}
                    </SegmentedControl>
                </div>

                <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <label class="flex items-center gap-2 text-sm text-main select-none">
                        <Switch size="sm" bind:checked={striped} />
                        <span>Striped</span>
                    </label>

                    <label class="flex items-center gap-2 text-sm text-main select-none">
                        <Switch size="sm" bind:checked={gridlines} />
                        <span>Gridlines</span>
                    </label>
                </div>
            </div>

            <div
                class={[
                    "w-full rounded-2xl squircle-soft p-5 md:p-6 transition-colors",
                    variant === "soft" ? "bg-elevated border border-base-soft" : "bg-canvas border border-transparent",
                ]}
            >
                <DataTable
                    {variant}
                    {size}
                    {striped}
                    {gridlines}
                    table={invoiceTable}
                    label="Invoices"
                    class="h-420px"
                    style={variant === "soft" ? "--cs-data-table-backdrop-bg: var(--cs-color-elevated)" : undefined}
                >
                    <DataTableHead />
                    <DataTableBody>
                        {#snippet cell(ctx: DataTableCellRenderContext<InvoiceRow>)}
                            {#if ctx.column.id === "status"}
                                <Badge variant="soft" color={STATUS_BADGE_COLORS[ctx.row.status]} size={badgeSize}>
                                    <BadgeLabel>{ctx.row.status}</BadgeLabel>
                                </Badge>
                            {:else}
                                {ctx.formatted}
                            {/if}
                        {/snippet}
                    </DataTableBody>
                    <DataTableEmpty />
                    <DataTableStatusBar>
                        {#snippet selectionActions()}
                            <Button variant="primary" size="xs" onclick={markSelectedPaid}>
                                <ButtonIcon icon={Check} />
                                <ButtonLabel>Mark paid</ButtonLabel>
                            </Button>
                        {/snippet}
                    </DataTableStatusBar>
                </DataTable>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Tones & Colors"
        description="Semantic row and cell tones alongside custom category fills in harmonized tint or exact color mode."
        align="start"
        code={tonesCode}
    >
        <div class="w-full flex flex-col gap-5">
            <div class="flex items-center justify-end">
                <SegmentedControl size="sm" bind:value={colorMode} aria-label="Custom color mode">
                    {#each DATA_TABLE_COLOR_MODES as mode (mode)}
                        <SegmentedControlItem value={mode}>
                            <SegmentedControlLabel class="capitalize">{mode}</SegmentedControlLabel>
                        </SegmentedControlItem>
                    {/each}
                </SegmentedControl>
            </div>

            <div class="w-full rounded-2xl squircle-soft bg-canvas p-5 md:p-6">
                <DataTable variant="elevated" size="sm" {colorMode} table={budgetTable} label="Quarterly budget">
                    <DataTableHead />
                    <DataTableBody />
                    <DataTableStatusBar />
                </DataTable>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="100,000 Rows"
        description="Virtualized 2D scrolling across 100,000 rows and 11 columns with sticky headers, pinned selection, and live sorting and filtering."
        align="start"
        code={virtualizedCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-5 md:p-6">
            <DataTable
                variant="elevated"
                size="xs"
                gridlines
                table={ledgerTable}
                label="Global order ledger"
                class="h-440px"
            >
                <DataTableHead />
                <DataTableBody>
                    {#snippet cell(ctx: DataTableCellRenderContext<LedgerRow>)}
                        {#if ctx.column.id === "status"}
                            <Badge variant="soft" color={LEDGER_STATUS_BADGE_COLORS[ctx.row.status]} size="xs">
                                <BadgeLabel>{ctx.row.status}</BadgeLabel>
                            </Badge>
                        {:else}
                            {ctx.formatted}
                        {/if}
                    {/snippet}
                </DataTableBody>
                <DataTableEmpty />
                <DataTableStatusBar />
            </DataTable>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Declarative & Card Nesting"
        description="A minimal declarative table nested cleanly inside an elevated Card with automatic concentric corner radii."
        align="start"
        code={nestedDeclarativeCode}
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-5 md:p-6">
            <Card variant="elevated" size="lg">
                <CardHeader>
                    <CardTitle>Recent Payouts</CardTitle>
                    <CardDescription>Scheduled transfers for the current billing cycle.</CardDescription>
                </CardHeader>

                <CardBody>
                    <DataTable variant="soft" size="sm" label="Recent payouts">
                        <DataTableHead>
                            <DataTableHeaderCell width={108}>Transfer</DataTableHeaderCell>
                            <DataTableHeaderCell minWidth={140}>Destination</DataTableHeaderCell>
                            <DataTableHeaderCell width={112}>Status</DataTableHeaderCell>
                            <DataTableHeaderCell width={86}>Date</DataTableHeaderCell>
                            <DataTableHeaderCell align="end" width={108}>Amount</DataTableHeaderCell>
                        </DataTableHead>
                        <DataTableBody>
                            {#each RECENT_PAYOUTS as payout (payout.id)}
                                <DataTableRow>
                                    <DataTableCell emphasis="strong">{payout.id}</DataTableCell>
                                    <DataTableCell>{payout.destination}</DataTableCell>
                                    <DataTableCell>
                                        <Badge
                                            variant="soft"
                                            color={payout.status === "Settled" ? "positive" : "caution"}
                                            size="sm"
                                        >
                                            <BadgeLabel>{payout.status}</BadgeLabel>
                                        </Badge>
                                    </DataTableCell>
                                    <DataTableCell emphasis="weak">{payout.date}</DataTableCell>
                                    <DataTableCell align="end" numeric>{payout.amount}</DataTableCell>
                                </DataTableRow>
                            {/each}
                        </DataTableBody>
                    </DataTable>
                </CardBody>
            </Card>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Empty States"
        description="Empty table state alongside an interactive filtered-empty state with one-click filter reset."
        align="start"
    >
        <div class="w-full rounded-2xl squircle-soft bg-canvas p-5 md:p-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <DataTable variant="elevated" size="sm" label="Empty invoices">
                    <DataTableHead>
                        <DataTableHeaderCell minWidth={120}>Customer</DataTableHeaderCell>
                        <DataTableHeaderCell width={96}>Status</DataTableHeaderCell>
                        <DataTableHeaderCell align="end" width={100}>Amount</DataTableHeaderCell>
                    </DataTableHead>
                    <DataTableEmpty title="No invoices yet" description="New invoices will appear here once issued." />
                </DataTable>

                <DataTable variant="elevated" size="sm" table={filteredEmptyTable} label="Filtered orders">
                    <DataTableHead />
                    <DataTableBody />
                    <DataTableEmpty />
                    <DataTableStatusBar />
                </DataTable>
            </div>
        </div>
    </PreviewSection>
</div>
