import { describe, expect, it } from "vitest";
import { setCell } from "./coords.ts";
import {
	cleanAnchorText,
	createAliasResolver,
	detectAxisHeader,
	discoverRegions,
	fillDownGrid,
	flattenMergedHeaders,
	fuzzyMatchAnchor,
	inferColumnType,
	profileSheet,
	resolveSheet,
	scanFormTable,
	scanGroupedRecords,
	scanHierarchy,
	scanKeyValueBlock,
	scanMatrix,
	scanStackedSections,
	scanStridedColumns,
	sheetToGrid,
	unpivotGrid,
} from "./scanner.ts";
import {
	INFERRED_COLUMN_TYPES,
	type GridRow,
	type WorkbookModel,
	type WorksheetModel,
} from "./types.ts";

function makeGrid(
	rows: ReadonlyArray<
		| readonly unknown[]
		| {
				rowIndex: number;
				cells: readonly unknown[];
				hidden?: boolean;
				outlineLevel?: number;
		  }
	>,
): GridRow[] {
	return rows.map((entry, idx) => {
		if (Array.isArray(entry)) {
			return {
				rowIndex: idx + 1,
				hidden: false,
				cells: [...entry],
			};
		}
		const spec = entry as {
			rowIndex: number;
			cells: readonly unknown[];
			hidden?: boolean;
			outlineLevel?: number;
		};
		return {
			rowIndex: spec.rowIndex,
			hidden: spec.hidden ?? false,
			...(spec.outlineLevel !== undefined && { outlineLevel: spec.outlineLevel }),
			cells: [...spec.cells],
		};
	});
}

function makeSheet(
	name: string,
	cellEntries?: Record<string, unknown>,
	extra?: Partial<Omit<WorksheetModel, "name" | "cells">>,
): WorksheetModel {
	const sheet: WorksheetModel = {
		name,
		cells: new Map(),
		...extra,
	};
	if (cellEntries) {
		for (const [ref, raw] of Object.entries(cellEntries)) {
			if (
				raw !== null &&
				typeof raw === "object" &&
				!(raw instanceof Date) &&
				("value" in raw || "richText" in raw || "formula" in raw || "style" in raw)
			) {
				setCell(sheet, ref, raw as WorksheetModel["cells"] extends Map<string, infer C> ? C : never);
			} else {
				setCell(sheet, ref, { value: raw as string | number | boolean | Date | null });
			}
		}
	}
	return sheet;
}

describe("resolveSheet", () => {
	const wb: WorkbookModel = {
		dateSystem: 1900,
		sheets: [
			makeSheet("Übersicht 2026"),
			makeSheet("  Stammdaten : "),
			makeSheet("Finanz-Planung"),
		],
	};

	it("matches exact sheet names, normalized case-insensitive names, fuzzy names, and returns null when not found", () => {
		// Exact match
		expect(resolveSheet(wb, ["Finanz-Planung"])?.name).toBe("Finanz-Planung");

		// Normalized case-insensitive & surrounding punctuation match
		expect(resolveSheet(wb, ["stammdaten"])?.name).toBe("  Stammdaten : ");
		expect(resolveSheet(wb, ["stammdaten"], { normalize: false })).toBeNull();

		// Fuzzy match
		expect(resolveSheet(wb, ["Finanz-Plannung"], { fuzzy: false })).toBeNull();
		expect(resolveSheet(wb, ["Finanz-Plannung"], { fuzzy: true })?.name).toBe("Finanz-Planung");
		expect(
			resolveSheet(wb, ["Übersciht"], {
				fuzzy: { mode: "startsWith", maxDistance: 2 },
			})?.name,
		).toBe("Übersicht 2026");

		// Candidate precedence & not found
		expect(resolveSheet(wb, ["NonExistent", "Finanz-Planung"])?.name).toBe("Finanz-Planung");
		expect(resolveSheet(wb, ["CompletelyUnknown"], { fuzzy: true })).toBeNull();
	});
});

describe("sheetToGrid", () => {
	it("handles preserveEmptyRows: false (default) vs true with physical 1-based rowIndex", () => {
		const sheet = makeSheet(
			"Sparse",
			{
				A1: "Header",
				B1: "Value",
				A3: "Row3",
				C3: 42,
			},
			{
				rowsMeta: new Map([
					[2, { rowIndex: 2, hidden: false }],
					[5, { rowIndex: 5, hidden: false, outlineLevel: 2 }],
				]),
			},
		);

		const compact = sheetToGrid(sheet);
		expect(compact).toEqual([
			{ rowIndex: 1, hidden: false, cells: ["Header", "Value", null] },
			{ rowIndex: 3, hidden: false, cells: ["Row3", null, 42] },
		]);

		const preserved = sheetToGrid(sheet, { preserveEmptyRows: true });
		expect(preserved).toEqual([
			{ rowIndex: 1, hidden: false, cells: ["Header", "Value", null] },
			{ rowIndex: 2, hidden: false, cells: [null, null, null] },
			{ rowIndex: 3, hidden: false, cells: ["Row3", null, 42] },
			{ rowIndex: 4, hidden: false, cells: [null, null, null] },
			{ rowIndex: 5, hidden: false, outlineLevel: 2, cells: [null, null, null] },
		]);
	});

	it("enforces hiddenPolicy: 'include' vs 'skip' vs 'skip-if-empty'", () => {
		const sheet = makeSheet(
			"HiddenRows",
			{
				A1: "Visible",
				A2: "HiddenWithData",
				A4: "VisibleBottom",
			},
			{
				rowsMeta: new Map([
					[2, { rowIndex: 2, hidden: true }],
					[3, { rowIndex: 3, hidden: true }],
				]),
			},
		);

		const included = sheetToGrid(sheet, {
			hiddenPolicy: "include",
			preserveEmptyRows: true,
		});
		expect(included.map((r) => ({ rowIndex: r.rowIndex, hidden: r.hidden }))).toEqual([
			{ rowIndex: 1, hidden: false },
			{ rowIndex: 2, hidden: true },
			{ rowIndex: 3, hidden: true },
			{ rowIndex: 4, hidden: false },
		]);

		const skipped = sheetToGrid(sheet, {
			hiddenPolicy: "skip",
			preserveEmptyRows: true,
		});
		expect(skipped.map((r) => r.rowIndex)).toEqual([1, 4]);

		const skipIfEmpty = sheetToGrid(sheet, {
			hiddenPolicy: "skip-if-empty",
			preserveEmptyRows: true,
		});
		expect(skipIfEmpty.map((r) => r.rowIndex)).toEqual([1, 2, 4]);
		expect(skipIfEmpty[1]?.cells).toEqual(["HiddenWithData"]);
	});

	it("handles expandMergedCells: 'none' vs 'top-left'", () => {
		const sheet = makeSheet(
			"Merges",
			{
				A1: "Group A",
				A2: "Sub 1",
				B2: "Sub 2",
				C1: "Vertical",
			},
			{
				merges: ["A1:B1", "C1:C2"],
			},
		);

		const unexpanded = sheetToGrid(sheet, { expandMergedCells: "none" });
		expect(unexpanded).toEqual([
			{ rowIndex: 1, hidden: false, cells: ["Group A", null, "Vertical"] },
			{ rowIndex: 2, hidden: false, cells: ["Sub 1", "Sub 2", null] },
		]);

		const expanded = sheetToGrid(sheet, { expandMergedCells: "top-left" });
		expect(expanded).toEqual([
			{ rowIndex: 1, hidden: false, cells: ["Group A", "Group A", "Vertical"] },
			{ rowIndex: 2, hidden: false, cells: ["Sub 1", "Sub 2", "Vertical"] },
		]);
	});

	it("uses default resolveCell (scalar, richText, formula.cachedResult) and supports custom resolveCell", () => {
		const sheet = makeSheet("Resolve", {
			A1: { value: "Plain" },
			B1: {
				value: null,
				richText: [{ text: "Rich " }, { text: "Text", bold: true }],
			},
			C1: {
				value: null,
				formula: { expression: "SUM(A2:A5)", cachedResult: 125 },
			},
			D1: {
				value: null,
				formula: { expression: "NA()" },
			},
		});

		const defaultGrid = sheetToGrid(sheet);
		expect(defaultGrid[0]?.cells).toEqual(["Plain", "Rich Text", 125, null]);

		const customGrid = sheetToGrid(sheet, {
			resolveCell: (cell) =>
				cell.formula ? `=${cell.formula.expression}` : (cell.value ?? "EMPTY"),
		});
		expect(customGrid[0]?.cells).toEqual(["Plain", "EMPTY", "=SUM(A2:A5)", "=NA()"]);
	});

	it("returns [] for an empty worksheet", () => {
		const emptySheet = makeSheet("Empty");
		expect(sheetToGrid(emptySheet)).toEqual([]);
		expect(
			sheetToGrid(emptySheet, {
				preserveEmptyRows: true,
				expandMergedCells: "top-left",
			}),
		).toEqual([]);
	});

	it("clips giant merges to the populated data bounding box without OOMing when expandMergedCells is 'top-left'", () => {
		const sheet = makeSheet(
			"GiantMerge",
			{
				A1: "TopLeft",
				B2: "BottomRight",
			},
			{
				merges: ["A1:XFD1048576"],
			},
		);

		const grid = sheetToGrid(sheet, { expandMergedCells: "top-left" });
		expect(grid).toHaveLength(2);
		expect(grid[0]?.cells).toHaveLength(2);
		expect(grid[1]?.cells).toHaveLength(2);
		expect(grid).toEqual([
			{ rowIndex: 1, hidden: false, cells: ["TopLeft", "TopLeft"] },
			{ rowIndex: 2, hidden: false, cells: ["TopLeft", "BottomRight"] },
		]);
	});
});

describe("fillDownGrid", () => {
	it("returns [] for an empty grid", () => {
		expect(fillDownGrid([])).toEqual([]);
	});
	it("forward-fills target columns and respects stopOnBlankRow: true vs false and custom emptyValues", () => {
		const rawGrid = makeGrid([
			{ rowIndex: 1, cells: ["North", "Electronics", 100] },
			{ rowIndex: 2, cells: [null, "-", 200] },
			{ rowIndex: 3, cells: [null, null, null] }, // blank row
			{ rowIndex: 4, cells: [null, "Apparel", 300] },
		]);

		// Default stopOnBlankRow: true, only fill col 0 and 1, treating "-" as empty
		const stopped = fillDownGrid(rawGrid, {
			colIndices: [0, 1],
			stopOnBlankRow: true,
			emptyValues: ["-"],
		});
		expect(stopped.map((r) => r.cells)).toEqual([
			["North", "Electronics", 100],
			["North", "Electronics", 200],
			[null, null, null],
			[null, "Apparel", 300],
		]);

		// stopOnBlankRow: false carries across blank rows
		const carriedAcross = fillDownGrid(rawGrid, {
			colIndices: [0, 1],
			stopOnBlankRow: false,
			emptyValues: ["-"],
		});
		expect(carriedAcross.map((r) => r.cells)).toEqual([
			["North", "Electronics", 100],
			["North", "Electronics", 200],
			[null, null, null],
			["North", "Apparel", 300],
		]);
	});
});

describe("inferColumnType and profileSheet", () => {
	it("infers all 8 INFERRED_COLUMN_TYPES with confidence, min, max, distinctCount, nullCount, and 0/1 disambiguation", () => {
		expect(INFERRED_COLUMN_TYPES).toEqual([
			"number",
			"date",
			"datetime",
			"boolean",
			"threshold",
			"currency",
			"string",
			"empty",
		]);

		// 1. number (including 0/1 without unambiguous boolean tokens)
		const numInf = inferColumnType([10, "25,5", "0", "1", null, ""]);
		expect(numInf.inferredType).toBe("number");
		expect(numInf.confidence).toBe(1);
		expect(numInf.nonEmptyCount).toBe(4);
		expect(numInf.nullCount).toBe(2);
		expect(numInf.distinctCount).toBe(4);
		expect(numInf.min).toBe(0);
		expect(numInf.max).toBe(25.5);

		// 2. boolean (including 0/1 disambiguated by true/ja/nein)
		const boolInf = inferColumnType([true, "nein", "0", "1", "ja", null]);
		expect(boolInf.inferredType).toBe("boolean");
		expect(boolInf.confidence).toBe(1);
		expect(boolInf.nonEmptyCount).toBe(5);
		expect(boolInf.nullCount).toBe(1);
		expect(boolInf.min).toBeUndefined();
		expect(boolInf.max).toBeUndefined();

		// 3. date
		const dateInf = inferColumnType([
			new Date(Date.UTC(2026, 0, 15)),
			"2026-03-01",
			"10.02.2026",
			null,
		]);
		expect(dateInf.inferredType).toBe("date");
		expect(dateInf.confidence).toBe(1);
		expect(dateInf.min).toBe("2026-01-15");
		expect(dateInf.max).toBe("2026-03-01");

		// 4. datetime (promoted when mixed with date)
		const dtInf = inferColumnType([
			new Date(Date.UTC(2026, 0, 15, 14, 30)),
			"2026-01-16",
			"2026-01-14 08:15",
		]);
		expect(dtInf.inferredType).toBe("datetime");
		expect(dtInf.confidence).toBe(1);
		expect(dtInf.min).toBe("2026-01-14 08:15");
		expect(dtInf.max).toBe("2026-01-16");

		// 5. threshold (including mixed "< 0,2" + 1.5 promoted to threshold)
		const threshInf = inferColumnType(["< 0,2", 1.5, "<= 0.05", 3.2]);
		expect(threshInf.inferredType).toBe("threshold");
		expect(threshInf.confidence).toBe(1);
		expect(threshInf.min).toBe(0.05);
		expect(threshInf.max).toBe(3.2);

		// 6. currency (including "1.200,50 €")
		const currInf = inferColumnType(["1.200,50 €", "850,00 €", "(100,00 €)"]);
		expect(currInf.inferredType).toBe("currency");
		expect(currInf.confidence).toBe(1);
		expect(currInf.min).toBe(-100);
		expect(currInf.max).toBe(1200.5);

		// 7. string
		const strInf = inferColumnType(["Alpha", "Charlie", "Bravo", "Alpha", null]);
		expect(strInf.inferredType).toBe("string");
		expect(strInf.confidence).toBe(1);
		expect(strInf.distinctCount).toBe(3);
		expect(strInf.nullCount).toBe(1);
		expect(strInf.min).toBe("Alpha");
		expect(strInf.max).toBe("Charlie");

		// 8. empty
		const emptyInf = inferColumnType([null, undefined, "", ' '.repeat(3)]);
		expect(emptyInf.inferredType).toBe("empty");
		expect(emptyInf.confidence).toBe(1);
		expect(emptyInf.nonEmptyCount).toBe(0);
		expect(emptyInf.nullCount).toBe(4);
		expect(emptyInf.distinctCount).toBe(0);
	});

	it("profiles a worksheet with auto-detected headerRowIndex, fillRate, formulaCellCount, mergesCount, and ColumnProfiles", () => {
		const sheet = makeSheet(
			"LabResults",
			{
				A1: "Report Title",
				A2: "Station",
				B2: "Limit",
				C2: "Budget",
				D2: "Total",
				A3: "Nord",
				B3: "< 0,2",
				C3: "1.200,50 €",
				D3: { value: 1200.5, formula: { expression: "C3", cachedResult: 1200.5 } },
				A4: "Süd",
				B4: 1.5,
				C4: "800,00 €",
				D4: { value: 800, formula: { expression: "C4", cachedResult: 800 } },
			},
			{
				merges: ["A1:D1"],
			},
		);

		const profile = profileSheet(sheet);
		expect(profile.sheetName).toBe("LabResults");
		expect(profile.rowCount).toBe(4);
		expect(profile.colCount).toBe(4);
		expect(profile.nonEmptyCellCount).toBe(13);
		expect(profile.fillRate).toBe(Number((13 / 16).toFixed(4)));
		expect(profile.formulaCellCount).toBe(2);
		expect(profile.mergesCount).toBe(1);
		expect(profile.headerRowIndex).toBe(2);

		expect(profile.columns.map((c) => ({ colLetter: c.colLetter, header: c.header, type: c.inferredType }))).toEqual([
			{ colLetter: "A", header: "Station", type: "string" },
			{ colLetter: "B", header: "Limit", type: "threshold" },
			{ colLetter: "C", header: "Budget", type: "currency" },
			{ colLetter: "D", header: "Total", type: "number" },
		]);
	});

	it("disambiguates numeric 0/1 next to booleans vs standalone and applies deterministic tie-break order", () => {
		// Numeric 0/1 alongside an unambiguous boolean promotes to boolean with confidence 1
		const boolWithNumeric01 = inferColumnType([true, 1, 0, 1]);
		expect(boolWithNumeric01.inferredType).toBe("boolean");
		expect(boolWithNumeric01.confidence).toBe(1);

		// Standalone 0/1 values without unambiguous booleans infer as number
		const numeric01Only = inferColumnType([0, 1, 0, 1]);
		expect(numeric01Only.inferredType).toBe("number");
		expect(numeric01Only.confidence).toBe(1);
		expect(numeric01Only.min).toBe(0);
		expect(numeric01Only.max).toBe(1);

		// 50/50 tie deterministically prefers number over string
		const tieResult = inferColumnType([1, "a"]);
		expect(tieResult.inferredType).toBe("number");
		expect(tieResult.confidence).toBe(0.5);
	});

	it("profiles an empty worksheet and supports explicit headerRow with hiddenPolicy: 'skip'", () => {
		const emptyProfile = profileSheet(makeSheet("EmptySheet"));
		expect(emptyProfile).toEqual({
			sheetName: "EmptySheet",
			rowCount: 0,
			colCount: 0,
			nonEmptyCellCount: 0,
			fillRate: 0,
			formulaCellCount: 0,
			mergesCount: 0,
			headerRowIndex: null,
			columns: [],
		});

		const sheet = makeSheet(
			"ExplicitHeader",
			{
				A1: "Banner",
				B1: "Extra",
				C1: "Notes",
				A2: "Item",
				B2: "Amount",
				A3: "HiddenRow",
				B3: "NotANumber",
				A4: "Alpha",
				B4: 100,
				A5: "Beta",
				B5: 250,
			},
			{
				rowsMeta: new Map([[3, { rowIndex: 3, hidden: true }]]),
			},
		);

		const profile = profileSheet(sheet, {
			headerRow: 2,
			hiddenPolicy: "skip",
		});
		expect(profile.headerRowIndex).toBe(2);
		expect(profile.rowCount).toBe(4);
		expect(profile.columns[0]).toMatchObject({
			colLetter: "A",
			header: "Item",
			inferredType: "string",
			nonEmptyCount: 2,
		});
		expect(profile.columns[1]).toMatchObject({
			colLetter: "B",
			header: "Amount",
			inferredType: "number",
			nonEmptyCount: 2,
			min: 100,
			max: 250,
		});
	});

	it("computes chronological min/max for non-ISO German datetime strings in inferColumnType", () => {
		const dtInf = inferColumnType(["15.01.2026 08:15", "02.02.2026 09:00"]);
		expect(dtInf.inferredType).toBe("datetime");
		expect(dtInf.confidence).toBe(1);
		expect(dtInf.min).toBe("2026-01-15T08:15:00");
		expect(dtInf.max).toBe("2026-02-02T09:00:00");
	});
});

describe("cleanAnchorText, fuzzyMatchAnchor, and createAliasResolver", () => {
	it("cleans anchor text with whitespace collapsing, surrounding punctuation stripping, prefix/suffix removal, and case sensitivity", () => {
		expect(
			cleanAnchorText("  *# Nr. Projekt-Kosten (in EUR): -- ", {
				stripPrefixes: ["Nr."],
				stripSuffixes: ["(in EUR)"],
			}),
		).toBe("projekt-kosten");

		expect(
			cleanAnchorText("  Summe Total: ", {
				stripPrefixes: ["Summe"],
				caseSensitive: true,
			}),
		).toBe("Total");
	});

	it("matches anchors across 'equals', 'startsWith', and 'includes' with typo tolerance, structural guard, digit-token guard, and sliding word window", () => {
		// Equals mode with length-tiered Levenshtein typo tolerance
		expect(fuzzyMatchAnchor("Projektnummer", "Projektnumer")).toBe(true);
		expect(fuzzyMatchAnchor("Abteilung", "Abteilug")).toBe(true);

		// Structural guard rejects false positives where first or both second & last chars differ
		expect(fuzzyMatchAnchor("Baukosten", "Maukosten")).toBe(false); // first char differs
		expect(fuzzyMatchAnchor("Konto", "Kante")).toBe(false); // second ('o' vs 'a') and last ('o' vs 'e') both differ

		// Digit-token guard strictly rejects mismatched year/quarter/index tokens
		expect(fuzzyMatchAnchor("Jahr 2025", "Jahr 2026")).toBe(false);
		expect(fuzzyMatchAnchor("Q1", "Q2", { maxDistance: 2 })).toBe(false);
		expect(fuzzyMatchAnchor("Quartal 1", "Quartal 2")).toBe(false);
		expect(fuzzyMatchAnchor("Jahr 2026", "Jhr 2026")).toBe(true);

		// startsWith mode
		expect(
			fuzzyMatchAnchor("Gesamtkosten (brutto) in EUR", "Gesamtkostn", {
				mode: "startsWith",
			}),
		).toBe(true);

		// includes mode with sliding word window on multi-word headers
		expect(
			fuzzyMatchAnchor(
				"Abteilung: Monatliche Personal Kosten Übersicht",
				"Personal Kostn",
				{ mode: "includes" },
			),
		).toBe(true);
	});

	it("resolves aliases giving exact normalized match precedence over fuzzy fallback and returning null on no match", () => {
		const resolver = createAliasResolver({
			costCenter: ["Kostenstelle", "KST"],
			costType: ["Kostenart", "KST-Art"],
			revenue: ["Umsatzerlöse", "Erlöse"],
		});

		// Exact match wins even if another alias is within fuzzy distance
		expect(resolver("  Kostenstelle : ")).toBe("costCenter");
		expect(resolver("Kostenart")).toBe("costType");

		// Fuzzy fallback
		expect(resolver("Kostenstele")).toBe("costCenter");
		expect(resolver("Umsatzerloese")).toBe("revenue");

		// Unmatched returns null
		expect(resolver("Bilanzsumme")).toBeNull();
	});

	it("handles fuzzyMatchAnchor edge cases: caseSensitive, structuralGuard: false, explicit maxDistance, short strings, and empty strings", () => {
		// caseSensitive: true
		expect(fuzzyMatchAnchor("Summe", "summe", { caseSensitive: true })).toBe(false);
		expect(fuzzyMatchAnchor("Summe", "Summe", { caseSensitive: true })).toBe(true);
		expect(
			fuzzyMatchAnchor("AbCdEf", "abcdef", {
				caseSensitive: true,
				structuralGuard: false,
				maxDistance: 0,
			}),
		).toBe(false);

		// structuralGuard: false allows first-char or 2nd+last-char differences
		expect(fuzzyMatchAnchor("Baukosten", "Maukosten")).toBe(false);
		expect(fuzzyMatchAnchor("Baukosten", "Maukosten", { structuralGuard: false })).toBe(true);
		expect(
			fuzzyMatchAnchor("Konto", "Kante", { structuralGuard: false, maxDistance: 2 }),
		).toBe(true);

		// Explicit maxDistance overrides length-tiered default
		expect(fuzzyMatchAnchor("Projektnummer", "Projektnumer", { maxDistance: 0 })).toBe(false);
		expect(fuzzyMatchAnchor("Projektnummer", "Projektnumer", { maxDistance: 1 })).toBe(true);

		// Short strings (< 4 chars) are exact-only by default
		expect(fuzzyMatchAnchor("abc", "abd")).toBe(false);
		expect(fuzzyMatchAnchor("abc", "abc")).toBe(true);
		expect(fuzzyMatchAnchor("abc", "abd", { maxDistance: 1 })).toBe(true);

		// Empty / whitespace-only strings always return false
		expect(fuzzyMatchAnchor("", "Test")).toBe(false);
		expect(fuzzyMatchAnchor("Test", "")).toBe(false);
		expect(fuzzyMatchAnchor("", "")).toBe(false);
		expect(fuzzyMatchAnchor(" ".repeat(3), " ".repeat(3))).toBe(false);
	});

	it("preserves exact-over-fuzzy precedence and lowest-distance selection across repeated createAliasResolver lookups", () => {
		const resolver = createAliasResolver({
			costCenter: ["Kostenstelle"],
			costCenters: ["Kostenstellen"],
			costType: ["Kostenarten"],
		});

		// Exact match beats fuzzy distance 1 to another alias
		expect(resolver("Kostenstelle")).toBe("costCenter");
		expect(resolver("Kostenstellen")).toBe("costCenters");

		// Lowest-distance fuzzy selection ("Kostenstelen" is dist 1 from "Kostenstellen", dist 2 from "Kostenstelle")
		expect(resolver("Kostenstelen")).toBe("costCenters");
		// "Kostenstlle" is dist 1 from "Kostenstelle", dist 2 from "Kostenstellen"
		expect(resolver("Kostenstlle")).toBe("costCenter");

		// Repeated lookups remain consistent with precomputed alias state
		expect(resolver("Kostenstellen")).toBe("costCenters");
		expect(resolver("Kostenstelen")).toBe("costCenters");
		expect(resolver("Kostenstelle")).toBe("costCenter");
		expect(resolver("Kostenstlle")).toBe("costCenter");
		expect(resolver("Unbekannt")).toBeNull();
	});
});

describe("Patterns A–J Structural Scanners", () => {
	it("Pattern A (scanKeyValueBlock): extracts vertical, horizontal, multi-pair layouts, and multi-sheet WorkbookModel fallback", () => {
		// Vertical / multi-pair layout
		const multiPairGrid = makeGrid([
			["Projektname:", "Solaris", "Projektleiter:", "Dr. Weber"],
			["Budget:", null, "450.000 €", null],
			["Standort:", "München", "Status:", "Aktiv"],
		]);

		const kvMulti = scanKeyValueBlock(multiPairGrid, {
			layout: "multi-pair",
			fields: {
				project: ["Projektname", "Projekt"],
				lead: "Projektleiter",
				budget: "Budget",
				city: "Standort",
				status: "Status",
			},
		});

		expect(kvMulti.values).toEqual({
			project: "Solaris",
			lead: "Dr. Weber",
			budget: "450.000 €",
			city: "München",
			status: "Aktiv",
		});

		// Horizontal layout (keys in row 1, values below in row 2)
		const horizontalGrid = makeGrid([
			["Berichtsjahr", "Mandant", "Währung"],
			[2026, "ACME GmbH", "EUR"],
		]);
		const kvHoriz = scanKeyValueBlock(horizontalGrid, {
			layout: "horizontal",
			fields: {
				year: "Berichtsjahr",
				client: "Mandant",
				currency: "Währung",
			},
		});
		expect(kvHoriz.values).toEqual({
			year: 2026,
			client: "ACME GmbH",
			currency: "EUR",
		});

		// Multi-sheet WorkbookModel fallback
		const wb: WorkbookModel = {
			dateSystem: 1900,
			sheets: [
				makeSheet("Deckblatt", { A1: "Projekt:", B1: "Orion" }),
				makeSheet("Stammdaten", { A1: "Kostenstelle:", B1: "KST-4711" }),
			],
		};

		const kvWorkbook = scanKeyValueBlock(wb, {
			sheetCandidates: ["Deckblat", "Stammdaten"],
			fields: {
				project: "Projekt",
				costCenter: "Kostenstelle",
			},
		});
		expect(kvWorkbook.values).toEqual({
			project: "Orion",
			costCenter: "KST-4711",
		});
		expect(kvWorkbook.matches.map((m) => m.sheetName)).toEqual(["Deckblatt", "Stammdaten"]);
	});

	it("Pattern A (scanKeyValueBlock): an empty label match does not block a later real match", () => {
		const grid = makeGrid([
			["Projekt:", null, null],
			["Standort:", "Berlin", null],
			["Projekt:", "Orion", null],
		]);

		const res = scanKeyValueBlock(grid, {
			layout: "vertical",
			fields: {
				project: "Projekt",
				city: "Standort",
			},
		});

		expect(res.values).toEqual({
			project: "Orion",
			city: "Berlin",
		});
		expect(res.matches.find((m) => m.key === "project")).toMatchObject({
			value: "Orion",
			rowIndex: 3,
			colIndex: 0,
		});
	});

	it("Pattern B (detectAxisHeader): parses period headers, anchor-relative lookahead/lookbehind, last-wins Map deduplication, and attached metadataRows", () => {
		const grid = makeGrid([
			["Irrelevant Top Row", "Jan 2020", "Feb 2020", "Mar 2020"],
			["Limit", 10, 20, 25, 30],
			["Anchor: Monatswerte", "Jan 2026", "2026-02", "März 2026", "Jan 2026"],
			["Einheit", "mg/L", "mg/L", "µg/L", "mg/L (korr)"],
		]);

		const axis = detectAxisHeader(grid, {
			kind: "period",
			anchorText: "Monatswerte",
			lookbehindRows: 1,
			lookaheadRows: 1,
			fuzzy: { mode: "includes" },
			metadataRows: {
				limit: -1,
				unit: 1,
			},
		});

		expect(axis).not.toBeNull();
		expect(axis?.headerRowIndex).toBe(3);
		// Duplicate "Jan 2026" at col 1 and col 4 must resolve to col 4 via last-wins Map deduplication
		expect(axis?.columns.map((c) => ({ key: c.key, colIndex: c.colIndex }))).toEqual([
			{ key: "2026-02", colIndex: 2 },
			{ key: "2026-03", colIndex: 3 },
			{ key: "2026-01", colIndex: 4 },
		]);
		expect(axis?.columnMap.get("2026-01")).toEqual({
			colIndex: 4,
			rawHeader: "Jan 2026",
			key: "2026-01",
			metadata: {
				limit: 30,
				unit: "mg/L (korr)",
			},
		});
	});

	it("Pattern B (detectAxisHeader): still detects a pure Excel-serial header row as a period axis", () => {
		const grid = makeGrid([
			["Label", 45_658, 45_689, 45_717],
			["Wert", 1, 2, 3],
		]);
		const axis = detectAxisHeader(grid, { kind: "period" });
		expect(axis).not.toBeNull();
		expect(axis?.headerRowIndex).toBe(1);
		expect(axis?.columns.map((c) => c.colIndex)).toEqual([1, 2, 3]);
	});

	it("Pattern B (detectAxisHeader): ranks plausible numeric calendar year headers above Date + numeric data rows", () => {
		const grid = makeGrid([
			["x", 2021, 2022, 2023],
			["a", new Date("2026-01-01T00:00:00Z"), new Date("2026-02-01T00:00:00Z"), 5],
		]);

		const axis = detectAxisHeader(grid, { kind: "period" });
		expect(axis).not.toBeNull();
		expect(axis?.headerRowIndex).toBe(1);
		expect(axis?.columns.map((c) => c.key)).toEqual(["2021", "2022", "2023"]);
	});

	it("Pattern B (detectAxisHeader): supports no-match null, kind 'date', kind 'number', custom predicate, and minMatches", () => {
		// No match returns null
		expect(detectAxisHeader([])).toBeNull();
		expect(detectAxisHeader(makeGrid([["Foo", "Bar", "Baz"]]))).toBeNull();

		// kind: "date"
		const dateGrid = makeGrid([
			["Metric", "2026-01-15", "10.02.2026", new Date(Date.UTC(2026, 2, 1))],
			["Temp", 12, 14, 16],
		]);
		const dateAxis = detectAxisHeader(dateGrid, { kind: "date" });
		expect(dateAxis?.headerRowIndex).toBe(1);
		expect(dateAxis?.columns.map((c) => c.key)).toEqual([
			"2026-01-15",
			"2026-02-10",
			"2026-03-01",
		]);

		// kind: "number"
		const numGrid = makeGrid([
			["Title", "Alpha", "Beta"],
			["Scale", "10", "20,5", 30],
		]);
		const numAxis = detectAxisHeader(numGrid, { kind: "number" });
		expect(numAxis?.headerRowIndex).toBe(2);
		expect(numAxis?.columns.map((c) => c.key)).toEqual(["10", "20.5", "30"]);

		// Custom predicate
		const predGrid = makeGrid([
			["Name", "KPI_Revenue", "KPI_Margin", "Notes"],
			["North", 100, 0.25, "ok"],
		]);
		const predAxis = detectAxisHeader(predGrid, {
			predicate: (val) =>
				typeof val === "string" && val.startsWith("KPI_") ? val.slice(4) : null,
		});
		expect(predAxis?.headerRowIndex).toBe(1);
		expect(predAxis?.columns.map((c) => c.key)).toEqual(["Revenue", "Margin"]);

		// minMatches threshold
		expect(
			detectAxisHeader(predGrid, {
				minMatches: 3,
				predicate: (val) =>
					typeof val === "string" && val.startsWith("KPI_") ? val.slice(4) : null,
			}),
		).toBeNull();
	});

	it("Pattern C (scanStackedSections): extracts stacked sections sharing a column axis, validationRowAnchor, subtotalAnchors vs summaryAnchors, and stopAnchor", () => {
		const grid = makeGrid([
			["Kategorie", "Q1", "Q2"],
			["1. Erlöse", null, null],
			["Prüfzeile", 0, 0],
			["Produkt A", 100, 150],
			["Produkt B", 200, 250],
			["Zwischensumme", 300, 400],
			["2. Kosten", null, null],
			["Prüfzeile", 0, 1],
			["Material", 80, 90],
			["Zwischensumme", 80, 90],
			["Gesamtsumme", 220, 310],
			["Anhang / Kommentare", null, null],
			["Ignorierte Zeile", 999, 999],
		]);

		const result = scanStackedSections(grid, {
			sections: [
				{ id: "revenue", anchor: "Erlöse", anchorCol: 0 },
				{ id: "costs", anchor: "Kosten", anchorCol: 0 },
			],
			labelCol: 0,
			dataCols: [1, 2],
			validationRowAnchor: "Prüfzeile",
			subtotalAnchors: ["Zwischensumme"],
			summaryAnchors: ["Gesamtsumme"],
			stopAnchor: "Anhang",
			fuzzy: { mode: "includes" },
		});

		expect(result.stoppedAtRowIndex).toBe(12);
		expect(result.sections).toHaveLength(2);

		const [rev, cost] = result.sections;
		expect(rev?.id).toBe("revenue");
		expect(rev?.validationRow).toEqual({ 1: 0, 2: 0 });
		expect(rev?.rows.map((r) => ({ label: r.label, values: r.values }))).toEqual([
			{ label: "Produkt A", values: { 1: 100, 2: 150 } },
			{ label: "Produkt B", values: { 1: 200, 2: 250 } },
		]);
		expect(rev?.subtotalRow).toEqual({ 1: 300, 2: 400 });

		expect(cost?.id).toBe("costs");
		expect(cost?.validationRow).toEqual({ 1: 0, 2: 1 });
		expect(cost?.rows.map((r) => ({ label: r.label, values: r.values }))).toEqual([
			{ label: "Material", values: { 1: 80, 2: 90 } },
		]);
		expect(cost?.subtotalRow).toEqual({ 1: 80, 2: 90 });

		expect(result.summaryRows).toHaveLength(1);
		expect(result.summaryRows[0]?.label).toBe("Gesamtsumme");
		expect(result.summaryRows[0]?.values).toEqual({ 1: 220, 2: 310 });
	});

	it("Pattern D (scanGroupedRecords): extracts multi-row entity blocks with maxLookahead, early break on next entity start, detailFields, and subSections", () => {
		const grid = makeGrid([
			["Lieferant: Alpha GmbH", "Kategorie:", "IT-Hardware"],
			["Ort:", "Berlin", "Umsatz:", 50_000],
			["Positionen", null, null, null],
			["Server", 2, 15_000, 30_000],
			["Switch", 4, 5000, 20_000],
			["Lieferant: Beta AG", "Kategorie:", "Beratung"],
			["Ort:", "Hamburg", "Umsatz:", 18_000],
			["Positionen", null, null, null],
			["Workshop", 3, 6000, 18_000],
			["Ende der Liste", null, null, null],
			["Lieferant: Gamma", "Kategorie:", "Ignoriert"],
		]);

		const records = scanGroupedRecords(grid, {
			startAnchor: (row) => String(row.cells[0] ?? "").startsWith("Lieferant:"),
			keyCol: 0,
			maxLookahead: 10,
			detailFields: {
				category: { rowOffset: 0, colIndex: 2 },
				city: { anchor: "Ort", valueColOffset: 1 },
				revenue: { anchor: "Umsatz", valueColOffset: 1 },
			},
			subSectionAnchor: "Positionen",
			stopAnchor: "Ende der Liste",
		});

		expect(records).toHaveLength(2);
		expect(records[0]?.key).toBe("Lieferant: Alpha GmbH");
		expect(records[0]?.startRowIndex).toBe(1);
		expect(records[0]?.endRowIndex).toBe(5);
		expect(records[0]?.fields).toEqual({
			category: "IT-Hardware",
			city: "Berlin",
			revenue: 50_000,
		});
		expect(records[0]?.detailRows).toHaveLength(1);
		expect(records[0]?.subSections).toHaveLength(1);
		expect(records[0]?.subSections[0]?.title).toBe("Positionen");
		expect(records[0]?.subSections[0]?.rows).toHaveLength(2);

		expect(records[1]?.key).toBe("Lieferant: Beta AG");
		expect(records[1]?.startRowIndex).toBe(6);
		expect(records[1]?.endRowIndex).toBe(9);
		expect(records[1]?.fields).toEqual({
			category: "Beratung",
			city: "Hamburg",
			revenue: 18_000,
		});
	});

	it("Pattern E (scanStridedColumns): extracts fixed K-column repeating strides with duplicate group and sub-column name disambiguation", () => {
		const grid = makeGrid([
			["Region", "2025", null, null, "2026", null, null, "2026", null, null],
			["Code", "Plan", "Ist", "Plan", "Plan", "Ist", "Plan", "Plan", "Ist", "Plan"],
			["Nord", 100, 90, 95, 110, 105, 108, 120, 115, 118],
			["Süd", 80, 85, 82, 90, 92, 91, 95, 96, 94],
			["Summe", 180, 175, 177, 200, 197, 199, 215, 211, 212],
		]);

		const res = scanStridedColumns(grid, {
			groupRowIndex: 1,
			subHeaderRowIndex: 2,
			startCol: 1,
			stride: 3,
			keyCol: 0,
			stopAnchor: "Summe",
		});

		expect(res.groups.map((g) => g.groupName)).toEqual(["2025", "2026", "2026_2"]);
		expect(res.groups[0]?.columns.map((c) => c.name)).toEqual(["Plan", "Ist", "Plan_2"]);
		expect(res.records).toHaveLength(2);
		expect(res.records[0]).toEqual({
			rowIndex: 3,
			key: "Nord",
			groups: {
				"2025": { Plan: 100, Ist: 90, Plan_2: 95 },
				"2026": { Plan: 110, Ist: 105, Plan_2: 108 },
				"2026_2": { Plan: 120, Ist: 115, Plan_2: 118 },
			},
		});
	});

	it("Pattern E (scanStridedColumns): disambiguates ['Plan', 'Plan_2', 'Plan'] collision-free for both group and sub-column names", () => {
		const grid = makeGrid([
			["Key", "Plan", null, null, "Plan_2", null, null, "Plan", null, null],
			["ID", "Plan", "Plan_2", "Plan", "Plan", "Plan_2", "Plan", "Plan", "Plan_2", "Plan"],
			["R1", 1, 2, 3, 4, 5, 6, 7, 8, 9],
		]);

		const res = scanStridedColumns(grid, {
			groupRowIndex: 1,
			subHeaderRowIndex: 2,
			startCol: 1,
			stride: 3,
			keyCol: 0,
		});

		expect(res.groups.map((g) => g.groupName)).toEqual(["Plan", "Plan_2", "Plan_3"]);
		expect(res.groups[0]?.columns.map((c) => c.name)).toEqual(["Plan", "Plan_2", "Plan_3"]);
		expect(res.records).toEqual([
			{
				rowIndex: 3,
				key: "R1",
				groups: {
					Plan: { Plan: 1, Plan_2: 2, Plan_3: 3 },
					Plan_2: { Plan: 4, Plan_2: 5, Plan_3: 6 },
					Plan_3: { Plan: 7, Plan_2: 8, Plan_3: 9 },
				},
			},
		]);
	});

	it("Pattern F (scanFormTable): binds fuzzy headers, filters inactive template placeholder rows, counts skippedPlaceholderRowCount, and honors stopAnchor", () => {
		const grid = makeGrid([
			["Formular: Investitionsantrag 2026", null, null, null],
			["Pos.", "Bezeichnung", "Betrag (EUR)", "Status"],
			[1, "CNC-Fräse", 45_000, "Genehmigt"],
			[2, "<bitte wählen>", 0, "-"],
			[3, "—", "n/a", "TBD"],
			[4, "Messgerät", 12_500, "In Prüfung"],
			["Summe Antrag", null, 57_500, null],
			[5, "Nach dem Footer", 99_999, "Offen"],
		]);

		const form = scanFormTable(grid, {
			columns: [
				{ field: "pos", aliases: ["Pos", "Position"] },
				{ field: "title", aliases: ["Bezeichnung", "Beschreibung"], isActivityField: true },
				{ field: "amount", aliases: ["Betrag", "Kosten"], isActivityField: true },
				{ field: "status", aliases: ["Status"], isActivityField: true },
			],
			stopAnchor: "Summe Antrag",
			fuzzy: { mode: "startsWith" },
		});

		expect(form).not.toBeNull();
		expect(form?.headerRowIndex).toBe(2);
		expect(form?.colMap).toEqual({ pos: 0, title: 1, amount: 2, status: 3 });
		expect(form?.skippedPlaceholderRowCount).toBe(2);
		expect(form?.rows).toEqual([
			{
				rowIndex: 3,
				record: { pos: 1, title: "CNC-Fräse", amount: 45_000, status: "Genehmigt" },
			},
			{
				rowIndex: 6,
				record: { pos: 4, title: "Messgerät", amount: 12_500, status: "In Prüfung" },
			},
		]);

		// Returns null when header is not found
		expect(
			scanFormTable(makeGrid([["Unrelated", "Columns"]]), {
				columns: [
					{ field: "pos", aliases: ["Pos"] },
					{ field: "title", aliases: ["Bezeichnung"] },
				],
			}),
		).toBeNull();

		// filterInactiveRows: false keeps placeholder rows
		const unfiltered = scanFormTable(grid, {
			columns: [
				{ field: "pos", aliases: ["Pos", "Position"] },
				{ field: "title", aliases: ["Bezeichnung", "Beschreibung"], isActivityField: true },
				{ field: "amount", aliases: ["Betrag", "Kosten"], isActivityField: true },
				{ field: "status", aliases: ["Status"], isActivityField: true },
			],
			stopAnchor: "Summe Antrag",
			filterInactiveRows: false,
			fuzzy: { mode: "startsWith" },
		});
		expect(unfiltered?.skippedPlaceholderRowCount).toBe(0);
		expect(unfiltered?.rows.map((r) => r.rowIndex)).toEqual([3, 4, 5, 6]);
	});

	it("Pattern G (scanMatrix & unpivotGrid): extracts cross-tab row-header × column-header cells into normalized MatrixCellRecord[]", () => {
		const grid = makeGrid([
			["Standort", "Parameter", "2026-01", "2026-02", "2026-03"],
			["Werk 1", "pH", 7.2, null, 7.4],
			["Werk 2", "Leitfähigkeit", 410, 425, 418],
			["Gesamt", null, 417.2, 425, 425.4],
		]);

		const records = scanMatrix(grid, {
			headerRowIndex: 1,
			rowKeyCols: [0, 1],
			colStartIndex: 2,
			skipEmptyValues: true,
			stopAnchor: "Gesamt",
		});

		expect(records).toEqual([
			{
				rowKey: "Werk 1 / pH",
				rowLabels: ["Werk 1", "pH"],
				colKey: "2026-01",
				value: 7.2,
				rowIndex: 2,
				colIndex: 2,
			},
			{
				rowKey: "Werk 1 / pH",
				rowLabels: ["Werk 1", "pH"],
				colKey: "2026-03",
				value: 7.4,
				rowIndex: 2,
				colIndex: 4,
			},
			{
				rowKey: "Werk 2 / Leitfähigkeit",
				rowLabels: ["Werk 2", "Leitfähigkeit"],
				colKey: "2026-01",
				value: 410,
				rowIndex: 3,
				colIndex: 2,
			},
			{
				rowKey: "Werk 2 / Leitfähigkeit",
				rowLabels: ["Werk 2", "Leitfähigkeit"],
				colKey: "2026-02",
				value: 425,
				rowIndex: 3,
				colIndex: 3,
			},
			{
				rowKey: "Werk 2 / Leitfähigkeit",
				rowLabels: ["Werk 2", "Leitfähigkeit"],
				colKey: "2026-03",
				value: 418,
				rowIndex: 3,
				colIndex: 4,
			},
		]);

		expect(
			unpivotGrid(grid, {
				headerRowIndex: 1,
				rowKeyCols: [0, 1],
				colStartIndex: 2,
				skipEmptyValues: true,
				stopAnchor: "Gesamt",
			}),
		).toEqual(records);
	});

	it("Pattern H (scanHierarchy): reconstructs parent-child tree across outlineLevel, style indent, leading whitespace, and hierarchical numbering", () => {
		// 1. outlineLevel
		const outlineGrid = makeGrid([
			{ rowIndex: 1, outlineLevel: 0, cells: ["Gesamtunternehmen", 1000] },
			{ rowIndex: 2, outlineLevel: 1, cells: ["Produktion", 600] },
			{ rowIndex: 3, outlineLevel: 2, cells: ["Montage", 350] },
			{ rowIndex: 4, outlineLevel: 2, cells: ["Lackierung", 250] },
			{ rowIndex: 5, outlineLevel: 1, cells: ["Vertrieb", 400] },
		]);
		const outlineTree = scanHierarchy(outlineGrid, {
			strategy: "outlineLevel",
			valueCols: { budget: 1 },
		});
		expect(outlineTree.roots).toHaveLength(1);
		expect(outlineTree.nodes.map((n) => ({ label: n.label, level: n.level, parentIndex: n.parentIndex, path: n.path }))).toEqual([
			{ label: "Gesamtunternehmen", level: 0, parentIndex: null, path: ["Gesamtunternehmen"] },
			{ label: "Produktion", level: 1, parentIndex: 0, path: ["Gesamtunternehmen", "Produktion"] },
			{ label: "Montage", level: 2, parentIndex: 1, path: ["Gesamtunternehmen", "Produktion", "Montage"] },
			{ label: "Lackierung", level: 2, parentIndex: 1, path: ["Gesamtunternehmen", "Produktion", "Lackierung"] },
			{ label: "Vertrieb", level: 1, parentIndex: 0, path: ["Gesamtunternehmen", "Vertrieb"] },
		]);

		// 2. cell style indent
		const indentSheet = makeSheet("IndentTree", {
			A1: { value: "Aktiva", style: { align: { indent: 0 } } },
			B1: 500,
			A2: { value: "Anlagevermögen", style: { align: { indent: 1 } } },
			B2: 300,
			A3: { value: "Sachanlagen", style: { align: { indent: 2 } } },
			B3: 300,
		});
		const indentTree = scanHierarchy(sheetToGrid(indentSheet), {
			strategy: "indent",
			sheet: indentSheet,
			valueCols: { amount: 1 },
		});
		expect(indentTree.nodes.map((n) => ({ label: n.label, level: n.level, parentIndex: n.parentIndex }))).toEqual([
			{ label: "Aktiva", level: 0, parentIndex: null },
			{ label: "Anlagevermögen", level: 1, parentIndex: 0 },
			{ label: "Sachanlagen", level: 2, parentIndex: 1 },
		]);

		// 3. leading whitespace
		const wsGrid = makeGrid([
			["Europa", 100],
			["  DACH", 60],
			["    Deutschland", 45],
			["    Österreich", 15],
		]);
		const wsTree = scanHierarchy(wsGrid, { strategy: "whitespace" });
		expect(wsTree.nodes.map((n) => ({ label: n.label, level: n.level, parentIndex: n.parentIndex }))).toEqual([
			{ label: "Europa", level: 0, parentIndex: null },
			{ label: "DACH", level: 1, parentIndex: 0 },
			{ label: "Deutschland", level: 2, parentIndex: 1 },
			{ label: "Österreich", level: 2, parentIndex: 1 },
		]);

		// 4. hierarchical numbering (inline & dedicated codeCol)
		const numGrid = makeGrid([
			["1", "Bauwerk", 500],
			["1.1", "Rohbau", 300],
			["1.1.1", "Erdarbeiten", 120],
			["1.1.2", "Betonarbeiten", 180],
			["2", "Technik", 200],
		]);
		const numTree = scanHierarchy(numGrid, {
			strategy: "numbering",
			codeCol: 0,
			labelCol: 1,
			valueCols: { cost: 2 },
		});
		expect(numTree.roots.map((r) => r.code)).toEqual(["1", "2"]);
		expect(numTree.nodes[3]).toMatchObject({
			label: "Betonarbeiten",
			code: "1.1.2",
			level: 2,
			parentIndex: 1,
			path: ["Bauwerk", "Rohbau", "Betonarbeiten"],
			values: { cost: 180 },
		});
	});

	it("Pattern H (scanHierarchy): default 'auto' strategy preserves bare leading integers while parsing dotted prefixes, and explicit numbering/codeCol still parses bare integers", () => {
		const autoGrid = makeGrid([
			["2024 Budget", 1000],
			["1.1 Subtopic", 400],
			["1.1.1 Detail", 150],
			["3 Months", 600],
		]);

		const autoTree = scanHierarchy(autoGrid);
		expect(
			autoTree.nodes.map((n) => ({
				label: n.label,
				code: n.code,
				level: n.level,
				parentIndex: n.parentIndex,
			})),
		).toEqual([
			{ label: "2024 Budget", code: undefined, level: 0, parentIndex: null },
			{ label: "Subtopic", code: "1.1", level: 1, parentIndex: 0 },
			{ label: "Detail", code: "1.1.1", level: 2, parentIndex: 1 },
			{ label: "3 Months", code: undefined, level: 0, parentIndex: null },
		]);

		// Explicit strategy: "numbering" still parses bare inline integers
		const explicitNumTree = scanHierarchy(
			makeGrid([
				["1 Main", 100],
				["1.1 Child", 60],
				["2 Second", 40],
			]),
			{ strategy: "numbering" },
		);
		expect(
			explicitNumTree.nodes.map((n) => ({ label: n.label, code: n.code, level: n.level })),
		).toEqual([
			{ label: "Main", code: "1", level: 0 },
			{ label: "Child", code: "1.1", level: 1 },
			{ label: "Second", code: "2", level: 0 },
		]);

		// Dedicated codeCol in default "auto" strategy still parses bare integer codes
		const codeColTree = scanHierarchy(
			makeGrid([
				["1", "Main"],
				["1.1", "Child"],
				["2", "Second"],
			]),
			{ codeCol: 0, labelCol: 1 },
		);
		expect(
			codeColTree.nodes.map((n) => ({ label: n.label, code: n.code, level: n.level })),
		).toEqual([
			{ label: "Main", code: "1", level: 0 },
			{ label: "Child", code: "1.1", level: 1 },
			{ label: "Second", code: "2", level: 0 },
		]);
	});

	it(String.raw`Pattern H (scanHierarchy): mixed tab + space indentation ('\t  Child') computes level 2 cleanly`, () => {
		const grid = makeGrid([
			["Root", 100],
			["\tParent", 60],
			["\t  Child", 40],
		]);

		const tree = scanHierarchy(grid, { strategy: "whitespace" });
		expect(
			tree.nodes.map((n) => ({
				label: n.label,
				level: n.level,
				parentIndex: n.parentIndex,
				path: n.path,
			})),
		).toEqual([
			{ label: "Root", level: 0, parentIndex: null, path: ["Root"] },
			{ label: "Parent", level: 1, parentIndex: 0, path: ["Root", "Parent"] },
			{ label: "Child", level: 2, parentIndex: 1, path: ["Root", "Parent", "Child"] },
		]);
	});

	it("Pattern I (discoverRegions): detects multiple contiguous rectangular table islands separated by blank rows and blank columns", () => {
		const grid = makeGrid([
			// Top band: Island 1 (cols 0..1, rows 1..2) and Island 2 (cols 3..4, rows 1..3) separated by blank col 2
			{ rowIndex: 1, cells: ["ID", "Name", null, "Monat", "Umsatz"] },
			{ rowIndex: 2, cells: [1, "Alpha", null, "Jan", 100] },
			{ rowIndex: 3, cells: [null, null, null, "Feb", 120] },
			// Row 4 is blank (gap in rowIndex -> row 5)
			{ rowIndex: 5, cells: ["Konto", "Soll", "Haben"] },
			{ rowIndex: 6, cells: ["1000", 50, 0] },
		]);

		const regions = discoverRegions(grid, { minRows: 2, minCols: 2 });
		expect(regions).toHaveLength(3);

		expect(regions[0]).toMatchObject({
			id: "region_1",
			startRow: 1,
			endRow: 2,
			startCol: 0,
			endCol: 1,
			rowCount: 2,
			colCount: 2,
			nonEmptyCount: 4,
			headerPreview: ["ID", "Name"],
		});

		expect(regions[1]).toMatchObject({
			id: "region_2",
			startRow: 1,
			endRow: 3,
			startCol: 3,
			endCol: 4,
			rowCount: 3,
			colCount: 2,
			nonEmptyCount: 6,
			headerPreview: ["Monat", "Umsatz"],
		});

		expect(regions[2]).toMatchObject({
			id: "region_3",
			startRow: 5,
			endRow: 6,
			startCol: 0,
			endCol: 2,
			rowCount: 2,
			colCount: 3,
			nonEmptyCount: 6,
			headerPreview: ["Konto", "Soll", "Haben"],
		});
	});

	it("Pattern I (discoverRegions): handles empty input, minRows/minCols filtering, and treatRowGapsAsBlank with skipped hidden rows", () => {
		expect(discoverRegions([])).toEqual([]);

		// minRows / minCols filtering
		const sizingGrid = makeGrid([
			{ rowIndex: 1, cells: ["SingleRowA", "SingleRowB"] },
			{ rowIndex: 3, cells: ["SingleCol1"] },
			{ rowIndex: 4, cells: ["SingleCol2"] },
			{ rowIndex: 6, cells: ["H1", "H2"] },
			{ rowIndex: 7, cells: [10, 20] },
		]);
		expect(discoverRegions(sizingGrid, { minRows: 1, minCols: 1 })).toHaveLength(3);
		const filteredRegions = discoverRegions(sizingGrid, { minRows: 2, minCols: 2 });
		expect(filteredRegions).toHaveLength(1);
		expect(filteredRegions[0]).toMatchObject({
			id: "region_1",
			startRow: 6,
			endRow: 7,
			rowCount: 2,
			colCount: 2,
		});

		// Hidden row skipped by sheetToGrid creates a rowIndex gap (row 2 -> row 4)
		const sheet = makeSheet(
			"HiddenGap",
			{
				A1: "ID",
				B1: "Name",
				A2: 1,
				B2: "Alpha",
				A3: 2,
				B3: "HiddenMiddle",
				A4: 3,
				B4: "Beta",
				// Row 5 is physically empty
				A6: "FooterID",
				B6: "FooterName",
				A7: 4,
				B7: "Gamma",
			},
			{
				rowsMeta: new Map([[3, { rowIndex: 3, hidden: true }]]),
			},
		);

		const compactSkippedGrid = sheetToGrid(sheet, { hiddenPolicy: "skip" });
		// Default treatRowGapsAsBlank: true splits at the skipped row 3 gap (1..2 vs 4..4 vs 6..7)
		const splitByGap = discoverRegions(compactSkippedGrid);
		expect(splitByGap.map((r) => ({ startRow: r.startRow, endRow: r.endRow }))).toEqual([
			{ startRow: 1, endRow: 2 },
			{ startRow: 4, endRow: 4 },
			{ startRow: 6, endRow: 7 },
		]);

		// With preserveEmptyRows: true + hiddenPolicy: "skip", row 3 is a rowIndex gap while row 5 is physically empty
		const preservedSkippedGrid = sheetToGrid(sheet, {
			hiddenPolicy: "skip",
			preserveEmptyRows: true,
		});
		// treatRowGapsAsBlank: false keeps rows 1, 2, 4 in 1 region, while physically empty row 5 still splits into 2 regions
		const mergedAcrossGap = discoverRegions(preservedSkippedGrid, {
			treatRowGapsAsBlank: false,
		});
		expect(mergedAcrossGap.map((r) => ({ startRow: r.startRow, endRow: r.endRow, rowCount: r.rowCount }))).toEqual([
			{ startRow: 1, endRow: 4, rowCount: 3 },
			{ startRow: 6, endRow: 7, rowCount: 2 },
		]);
	});

	it("Pattern I (discoverRegions): tightens endCol/colCount on a narrower sub-band below a wider table without empty trailing columns", () => {
		// Side column at col 5 keeps rows 1..5 in one horizontal band so interval 0..3 splits into two sub-bands:
		// rows 1..2 (4 cols: 0..3) and rows 4..5 (only 2 cols: 0..1).
		const grid = makeGrid([
			{ rowIndex: 1, cells: ["A", "B", "C", "D", null, "Side1"] },
			{ rowIndex: 2, cells: [1, 2, 3, 4, null, "Side2"] },
			{ rowIndex: 3, cells: [null, null, null, null, null, "Side3"] },
			{ rowIndex: 4, cells: ["Key", "Val", null, null, null, "Side4"] },
			{ rowIndex: 5, cells: ["X", 10, null, null, null, "Side5"] },
		]);

		const regions = discoverRegions(grid, { minRows: 2, minCols: 2 });
		expect(regions).toHaveLength(2);
		expect(regions[0]).toMatchObject({
			startRow: 1,
			endRow: 2,
			startCol: 0,
			endCol: 3,
			colCount: 4,
			headerPreview: ["A", "B", "C", "D"],
		});
		expect(regions[1]).toMatchObject({
			startRow: 4,
			endRow: 5,
			startCol: 0,
			endCol: 1,
			colCount: 2,
			nonEmptyCount: 4,
			headerPreview: ["Key", "Val"],
		});
		expect(regions[1]?.rows.every((r) => r.cells.length === 2)).toBe(true);
	});

	it("Pattern J (flattenMergedHeaders): resolves horizontal and vertical merged super-headers into hierarchical column paths", () => {
		const sheet = makeSheet(
			"MergedHeaders",
			{
				A1: "2026 Q1",
				A2: "Jan",
				B2: "Feb",
				C2: "Mär",
				D1: "Status",
			},
			{
				merges: ["A1:C1", "D1:D2"],
			},
		);

		const flattened = flattenMergedHeaders(sheet, {
			headerRows: { startRow: 1, endRow: 2 },
			separator: " / ",
			deduplicatePathSegments: true,
		});

		expect(flattened).toEqual([
			{ colIndex: 0, colLetter: "A", path: ["2026 Q1", "Jan"], key: "2026 Q1 / Jan" },
			{ colIndex: 1, colLetter: "B", path: ["2026 Q1", "Feb"], key: "2026 Q1 / Feb" },
			{ colIndex: 2, colLetter: "C", path: ["2026 Q1", "Mär"], key: "2026 Q1 / Mär" },
			{ colIndex: 3, colLetter: "D", path: ["Status"], key: "Status" },
		]);

		// Without deduplication, vertical merge D1:D2 repeats the segment
		const nonDedup = flattenMergedHeaders(sheet, {
			headerRows: [1, 2],
			separator: " > ",
			deduplicatePathSegments: false,
		});
		expect(nonDedup[3]).toEqual({
			colIndex: 3,
			colLetter: "D",
			path: ["Status", "Status"],
			key: "Status > Status",
		});
	});
});
