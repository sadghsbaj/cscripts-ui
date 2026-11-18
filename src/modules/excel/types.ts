export const EXCEL_FORMATS = ["xlsx", "xlsm", "xltx", "xltm", "csv", "tsv"] as const;
export type ExcelFormat = (typeof EXCEL_FORMATS)[number];

export const SHEET_VISIBILITY_STATES = ["visible", "hidden", "veryHidden"] as const;
export type SheetVisibilityState = (typeof SHEET_VISIBILITY_STATES)[number];

export const CELL_VALUE_TYPES = [
	"number",
	"string",
	"boolean",
	"date",
	"error",
	"empty",
] as const;
export type CellValueType = (typeof CELL_VALUE_TYPES)[number];

export const CELL_STATUSES = ["base", "positive", "caution", "negative"] as const;
export type CellStatus = (typeof CELL_STATUSES)[number];

export const DIAGNOSTIC_SEVERITIES = ["caution", "negative"] as const;
export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[number];

export const HIDDEN_ROW_POLICIES = ["include", "skip", "skip-if-empty"] as const;
export type HiddenRowPolicy = (typeof HIDDEN_ROW_POLICIES)[number];

export const FORMULA_CACHE_POLICIES = ["preserve", "clear", "recalculate"] as const;
export type FormulaCachePolicy = (typeof FORMULA_CACHE_POLICIES)[number];

export const DATE_SYSTEMS = [1900, 1904] as const;
export type ExcelDateSystem = (typeof DATE_SYSTEMS)[number];

export const SORT_DIRECTIONS = ["asc", "desc", "none"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const AGGREGATION_KINDS = [
	"sum",
	"avg",
	"weightedAvg",
	"min",
	"max",
	"count",
	"countIf",
	"median",
	"percentile",
	"rate",
	"first",
	"last",
] as const;
export type AggregationKind = (typeof AGGREGATION_KINDS)[number];

export const TIME_BUCKETS = ["day", "month", "quarter", "year"] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

export const JOIN_MODES = ["left", "inner", "outer"] as const;
export type JoinMode = (typeof JOIN_MODES)[number];

export const INFERRED_COLUMN_TYPES = [
	"number",
	"date",
	"datetime",
	"boolean",
	"threshold",
	"currency",
	"string",
	"empty",
] as const;
export type InferredColumnType = (typeof INFERRED_COLUMN_TYPES)[number];

export interface CellCoord {
	col: number;
	row: number;
}

export interface ParsedCellRef extends CellCoord {
	colAbsolute: boolean;
	rowAbsolute: boolean;
}

export interface RangeRef {
	start: CellCoord;
	end: CellCoord;
}

export interface CellRichTextRun {
	text: string;
	bold?: boolean;
	italic?: boolean;
	fg?: string;
	fontSize?: number;
	fontFamily?: string;
}

export interface CellComment {
	author?: string;
	text: string;
	threaded?: boolean;
}

export interface CellHyperlink {
	target?: string;
	location?: string;
	display?: string;
	tooltip?: string;
}

export type CellScalar = number | string | boolean | Date | null;

export interface CellFormula {
	expression: string;
	kind?: "normal" | "shared" | "array" | "dataTable";
	sharedGroup?: number;
	ref?: string;
	dynamicArray?: boolean;
	cachedResult?: CellScalar;
	error?: string;
}

export interface BorderEdgeSpec {
	style: "thin" | "medium" | "thick" | "dashed" | "dotted" | "double";
	fg?: string;
}

export interface ExcelStyleSpec {
	fg?: string;
	bg?: string;
	font?: {
		family?: string;
		size?: number;
		bold?: boolean;
		italic?: boolean;
		underline?: boolean;
		strike?: boolean;
	};
	border?: {
		top?: BorderEdgeSpec;
		right?: BorderEdgeSpec;
		bottom?: BorderEdgeSpec;
		left?: BorderEdgeSpec;
	};
	align?: {
		horizontal?: "left" | "center" | "right" | "justify";
		vertical?: "top" | "center" | "bottom";
		wrapText?: boolean;
		indent?: number;
	};
	numFmt?: string;
}

export interface CellModel {
	value: CellScalar;
	type?: CellValueType;
	formula?: CellFormula;
	richText?: readonly CellRichTextRun[];
	style?: ExcelStyleSpec;
	hyperlink?: CellHyperlink;
	comment?: CellComment;
}

export interface DataValidationRule {
	sqref: string;
	kind: "list" | "whole" | "decimal" | "date" | "textLength" | "custom";
	operator?:
		| "between"
		| "notBetween"
		| "equal"
		| "notEqual"
		| "greaterThan"
		| "lessThan"
		| "greaterThanOrEqual"
		| "lessThanOrEqual";
	formula1: string;
	formula2?: string;
	allowBlank?: boolean;
	showDropDown?: boolean;
	promptTitle?: string;
	prompt?: string;
	errorTitle?: string;
	error?: string;
	errorStyle?: "stop" | "warning" | "information";
}

export interface ColumnSpec {
	min: number;
	max: number;
	width?: number;
	hidden?: boolean;
	outlineLevel?: number;
}

export interface RowMeta {
	rowIndex: number;
	height?: number;
	hidden?: boolean;
	outlineLevel?: number;
	collapsed?: boolean;
}

export interface SheetFreezePane {
	rows?: number;
	cols?: number;
}

export interface SheetPageMargins {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
	header?: number;
	footer?: number;
}

export interface SheetPageSetup {
	orientation?: "portrait" | "landscape";
	paperSize?: "A4" | "letter" | "legal" | number;
	fitToWidth?: number;
	fitToHeight?: number;
	margins?: SheetPageMargins;
	printTitleRows?: string;
	printTitleCols?: string;
	printArea?: string;
}

export interface ExcelTableColumn {
	id: number;
	name: string;
	totalsRowFunction?: string;
	totalsRowLabel?: string;
}

export interface ExcelTableSpec {
	name: string;
	displayName?: string;
	sheetName: string;
	ref: string;
	headerRowCount?: number;
	totalsRowCount?: number;
	autoFilterRef?: string;
	styleName?: string;
	columns: ExcelTableColumn[];
}

export interface DefinedNameSpec {
	name: string;
	formula: string;
	localSheetId?: number;
	comment?: string;
	hidden?: boolean;
}

export interface WorksheetModel {
	name: string;
	state?: SheetVisibilityState;
	cells: Map<string, CellModel>;
	rowsMeta?: Map<number, RowMeta>;
	columns?: ColumnSpec[];
	merges?: string[];
	freezePane?: SheetFreezePane;
	autoFilterRef?: string;
	dataValidations?: DataValidationRule[];
	showGridLines?: boolean;
	tabColor?: string;
	pageSetup?: SheetPageSetup;
	defaultRowHeight?: number;
	defaultColWidth?: number;
}

export interface WorkbookModel {
	dateSystem: ExcelDateSystem;
	sheets: WorksheetModel[];
	tables?: ExcelTableSpec[];
	definedNames?: DefinedNameSpec[];
	sourceFormat?: "xlsx" | "xlsm" | "xltx" | "xltm";
}

export interface GridRow {
	rowIndex: number;
	hidden: boolean;
	outlineLevel?: number;
	cells: unknown[];
}

export interface TableColumnSpec<TRow = Record<string, unknown>> {
	id: string;
	header: string;
	subHeader?: string;
	align?: "left" | "center" | "right";
	width?: number;
	numFmt?: string;
	accessor?: keyof TRow | ((row: TRow) => unknown);
	format?: (value: unknown, row: TRow) => string;
	status?: (value: unknown, row: TRow) => CellStatus;
}

export interface FormulaRecalcTarget {
	sheetName: string;
	ref: string;
	expression: string;
	currentCachedResult: CellScalar;
}

export interface FormulaEvaluator {
	recalculate(
		workbook: WorkbookModel,
		changedCells: ReadonlyArray<{ sheetName: string; ref: string }>,
	): ReadonlyArray<{ sheetName: string; ref: string; value: CellScalar; error?: string }>;
}

export interface PatchCellOptions {
	preserveStyle?: boolean;
	stringMode?: "inline" | "shared";
	style?: ExcelStyleSpec;
}

export interface PatchSessionOptions {
	onFormulaCache?: FormulaCachePolicy;
	clearScope?: "sheet" | "workbook";
	evaluator?: FormulaEvaluator;
}
