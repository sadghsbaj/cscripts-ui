import { formatCellRef, getCell, parseCellRef, setCell } from "./coords.ts";
import { ExcelError } from "./errors.ts";
import { type WriteXlsxOptions, writeXlsxBytes } from "./ooxml.ts";
import type {
	CellHyperlink,
	CellModel,
	CellScalar,
	CellStatus,
	ColumnSpec,
	DataValidationRule,
	ExcelDateSystem,
	ExcelStyleSpec,
	RowMeta,
	SheetFreezePane,
	SheetPageSetup,
	SheetVisibilityState,
	TableColumnSpec,
	WorkbookModel,
	WorksheetModel,
} from "./types.ts";
import { CELL_STATUSES } from "./types.ts";
import { formatCellDisplay, isExcelErrorValue } from "./values.ts";

export type ExcelRoleStyle = ExcelStyleSpec & { rowHeight?: number };

export interface ExcelTheme {
	fontFamily: string;
	title: ExcelStyleSpec & { rowHeight?: number };
	subtitle: ExcelStyleSpec & { rowHeight?: number };
	header: ExcelStyleSpec & { rowHeight?: number };
	subHeader: ExcelStyleSpec & { rowHeight?: number };
	data: ExcelStyleSpec & { rowHeight?: number };
	footer: ExcelStyleSpec & { rowHeight?: number };
	statuses: Record<CellStatus, ExcelStyleSpec>;
}

export const ZINC_CAUTION_THEME: ExcelTheme = {
	fontFamily: "Segoe UI",
	title: {
		fg: "#18181B",
		font: { family: "Segoe UI", size: 13, bold: true },
		align: { vertical: "center" },
		rowHeight: 26,
	},
	subtitle: {
		fg: "#71717A",
		font: { family: "Segoe UI", size: 9.5 },
		align: { vertical: "center" },
	},
	header: {
		fg: "#27272A",
		bg: "#F4F4F5",
		font: { family: "Segoe UI", size: 10, bold: true },
		border: {
			top: { style: "thin", fg: "#D4D4D8" },
			bottom: { style: "thin", fg: "#D4D4D8" },
		},
		align: { vertical: "center" },
		rowHeight: 24,
	},
	subHeader: {
		fg: "#71717A",
		bg: "#FAFAFA",
		font: { family: "Segoe UI", size: 9.5 },
		border: {
			top: { style: "thin", fg: "#D4D4D8" },
			bottom: { style: "thin", fg: "#D4D4D8" },
		},
		align: { vertical: "center" },
	},
	data: {
		fg: "#18181B",
		font: { family: "Segoe UI", size: 10 },
		border: {
			bottom: { style: "thin", fg: "#E4E4E7" },
		},
		align: { vertical: "center" },
		rowHeight: 20,
	},
	footer: {
		fg: "#18181B",
		bg: "#F4F4F5",
		font: { family: "Segoe UI", size: 10, bold: true },
		border: {
			top: { style: "medium", fg: "#A1A1AA" },
			bottom: { style: "thin", fg: "#D4D4D8" },
		},
		align: { vertical: "center" },
	},
	statuses: {
		base: {},
		positive: {
			fg: "#14532D",
			bg: "#DCFCE7",
			font: { family: "Segoe UI", size: 10, bold: true },
		},
		caution: {
			fg: "#78350F",
			bg: "#FEF3C7",
			font: { family: "Segoe UI", size: 10, bold: true },
		},
		negative: {
			fg: "#7F1D1D",
			bg: "#FEE2E2",
			font: { family: "Segoe UI", size: 10, bold: true },
		},
	},
};

export interface TitleBlockOptions {
	title: string;
	subtitle?: string;
	emptyRowsAfter?: number;
	mergeCols?: number;
}

export interface AutoFitOptions {
	minWidth?: number;
	maxWidth?: number;
	padding?: number;
}

export type TableTotalsValue = CellScalar | CellModel;

export interface TableBlockOptions<TRow = Record<string, unknown>> {
	columns: readonly TableColumnSpec<TRow>[];
	subHeaderRow?: boolean | Readonly<Record<string, string>> | readonly (string | undefined)[];
	rows: readonly TRow[];
	totalsRow?:
		| Readonly<Record<string, TableTotalsValue>>
		| readonly (TableTotalsValue | undefined)[];
	freezeHeader?: boolean;
	autoFilter?: boolean;
	autoFit?: boolean | AutoFitOptions;
	emptyRowsAfter?: number;
}

export interface SheetViewOptions {
	showGridLines?: boolean;
	tabColor?: string;
	state?: SheetVisibilityState;
}

export interface WorkbookBuilderOptions {
	theme?: ExcelTheme;
	dateSystem?: ExcelDateSystem;
	sanitizeFormulaInjection?: boolean;
}

export interface SheetBuilder {
	addTitleBlock(options: TitleBlockOptions): this;
	addTable<TRow = Record<string, unknown>>(options: TableBlockOptions<TRow>): this;
	addValidation(rule: DataValidationRule): this;
	addHyperlink(ref: string, link: CellHyperlink): this;
	setFreezePane(pane: SheetFreezePane): this;
	setView(options: SheetViewOptions): this;
	setPageSetup(setup: SheetPageSetup): this;
	toModel(): WorksheetModel;
}

export interface WorkbookBuilder {
	sheet(name: string, configure: (sheet: SheetBuilder) => void): this;
	toModel(): WorkbookModel;
	toBytes(options?: WriteXlsxOptions): Uint8Array;
}

const DEFAULT_AUTOFIT_MIN_WIDTH = 8;
const DEFAULT_AUTOFIT_MAX_WIDTH = 60;
const DEFAULT_AUTOFIT_PADDING = 3;
const AUTOFILTER_HEADER_EXTRA_PADDING = 2;

function mergeStyleSpecs(
	base: ExcelStyleSpec,
	override?: ExcelStyleSpec,
): ExcelStyleSpec {
	if (!override) {
		return cloneStyleSpec(base);
	}
	const result: ExcelStyleSpec = {};

	const fg = override.fg ?? base.fg;
	if (fg !== undefined) {
		result.fg = fg;
	}
	const bg = override.bg ?? base.bg;
	if (bg !== undefined) {
		result.bg = bg;
	}
	if (base.font || override.font) {
		result.font = {
			...base.font,
			...override.font,
		};
	}
	if (base.border || override.border) {
		result.border = {
			top: override.border?.top
				? { ...override.border.top }
				: base.border?.top
					? { ...base.border.top }
					: undefined,
			right: override.border?.right
				? { ...override.border.right }
				: base.border?.right
					? { ...base.border.right }
					: undefined,
			bottom: override.border?.bottom
				? { ...override.border.bottom }
				: base.border?.bottom
					? { ...base.border.bottom }
					: undefined,
			left: override.border?.left
				? { ...override.border.left }
				: base.border?.left
					? { ...base.border.left }
					: undefined,
		};
	}
	if (base.align || override.align) {
		result.align = {
			...base.align,
			...override.align,
		};
	}
	const numFmt = override.numFmt ?? base.numFmt;
	if (numFmt !== undefined) {
		result.numFmt = numFmt;
	}
	return result;
}

function cloneStyleSpec(spec: ExcelStyleSpec): ExcelStyleSpec {
	const out: ExcelStyleSpec = {};
	if (spec.fg !== undefined) {
		out.fg = spec.fg;
	}
	if (spec.bg !== undefined) {
		out.bg = spec.bg;
	}
	if (spec.font) {
		out.font = { ...spec.font };
	}
	if (spec.border) {
		out.border = {
			top: spec.border.top ? { ...spec.border.top } : undefined,
			right: spec.border.right ? { ...spec.border.right } : undefined,
			bottom: spec.border.bottom ? { ...spec.border.bottom } : undefined,
			left: spec.border.left ? { ...spec.border.left } : undefined,
		};
	}
	if (spec.align) {
		out.align = { ...spec.align };
	}
	if (spec.numFmt !== undefined) {
		out.numFmt = spec.numFmt;
	}
	return out;
}

function mergeRoleStyle(
	base: ExcelRoleStyle,
	override: ExcelRoleStyle | undefined,
	fontFamily: string,
	hasCustomFontFamily: boolean,
): ExcelRoleStyle {
	const merged = mergeStyleSpecs(base, override) as ExcelRoleStyle;
	const rowHeight = override?.rowHeight ?? base.rowHeight;
	if (rowHeight !== undefined) {
		merged.rowHeight = rowHeight;
	}
	const explicitOverrideFamily = override?.font?.family;
	if (explicitOverrideFamily !== undefined) {
		merged.font = { ...merged.font, family: explicitOverrideFamily };
	} else if (hasCustomFontFamily || merged.font) {
		merged.font = { ...merged.font, family: fontFamily };
	}
	return merged;
}

export function defineExcelTheme(
	theme: Partial<ExcelTheme> & { fontFamily?: string },
): ExcelTheme {
	const fontFamily = theme.fontFamily ?? ZINC_CAUTION_THEME.fontFamily;
	const hasCustomFontFamily = theme.fontFamily !== undefined;

	const statuses = {} as Record<CellStatus, ExcelStyleSpec>;
	for (const status of CELL_STATUSES) {
		const baseStatus = ZINC_CAUTION_THEME.statuses[status];
		const overrideStatus = theme.statuses?.[status];
		const mergedStatus = mergeStyleSpecs(baseStatus, overrideStatus);
		const explicitFamily = overrideStatus?.font?.family;
		if (explicitFamily !== undefined) {
			mergedStatus.font = { ...mergedStatus.font, family: explicitFamily };
		} else if (hasCustomFontFamily && mergedStatus.font) {
			mergedStatus.font = { ...mergedStatus.font, family: fontFamily };
		}
		statuses[status] = mergedStatus;
	}

	return {
		fontFamily,
		title: mergeRoleStyle(
			ZINC_CAUTION_THEME.title,
			theme.title,
			fontFamily,
			hasCustomFontFamily,
		),
		subtitle: mergeRoleStyle(
			ZINC_CAUTION_THEME.subtitle,
			theme.subtitle,
			fontFamily,
			hasCustomFontFamily,
		),
		header: mergeRoleStyle(
			ZINC_CAUTION_THEME.header,
			theme.header,
			fontFamily,
			hasCustomFontFamily,
		),
		subHeader: mergeRoleStyle(
			ZINC_CAUTION_THEME.subHeader,
			theme.subHeader,
			fontFamily,
			hasCustomFontFamily,
		),
		data: mergeRoleStyle(
			ZINC_CAUTION_THEME.data,
			theme.data,
			fontFamily,
			hasCustomFontFamily,
		),
		footer: mergeRoleStyle(
			ZINC_CAUTION_THEME.footer,
			theme.footer,
			fontFamily,
			hasCustomFontFamily,
		),
		statuses,
	};
}

function stripRowHeight(roleStyle: ExcelRoleStyle): ExcelStyleSpec {
	const { rowHeight: _rowHeight, ...style } = roleStyle;
	return cloneStyleSpec(style);
}

function isCellModelObject(value: unknown): value is CellModel {
	if (typeof value !== "object" || value === null || value instanceof Date) {
		return false;
	}
	return "value" in value;
}

function buildCellFromScalar(scalar: CellScalar, style?: ExcelStyleSpec): CellModel {
	if (scalar === null) {
		return { value: null, type: "empty", style };
	}
	if (typeof scalar === "number") {
		if (!Number.isFinite(scalar)) {
			return { value: null, type: "empty", style };
		}
		return { value: scalar, type: "number", style };
	}
	if (typeof scalar === "boolean") {
		return { value: scalar, type: "boolean", style };
	}
	if (scalar instanceof Date) {
		if (Number.isNaN(scalar.getTime())) {
			return { value: null, type: "empty", style };
		}
		return { value: scalar, type: "date", style };
	}
	const type = isExcelErrorValue(scalar) ? "error" : "string";
	return { value: scalar, type, style };
}

function measureLongestLineLength(text: string): number {
	if (text.length === 0) {
		return 0;
	}
	const lines = text.split(/\r\n|\r|\n/);
	let maxLen = 0;
	for (const line of lines) {
		if (line.length > maxLen) {
			maxLen = line.length;
		}
	}
	return maxLen;
}

function setRowHeightMeta(sheet: WorksheetModel, rowIndex1Based: number, height?: number): void {
	if (height === undefined) {
		return;
	}
	sheet.rowsMeta ??= new Map<number, RowMeta>();
	const existing = sheet.rowsMeta.get(rowIndex1Based);
	if (existing) {
		existing.height = height;
	} else {
		sheet.rowsMeta.set(rowIndex1Based, { rowIndex: rowIndex1Based, height });
	}
}

function upsertColumnWidth(sheet: WorksheetModel, col1Based: number, width: number): void {
	sheet.columns ??= [];
	const existing = sheet.columns.find((c) => c.min === col1Based && c.max === col1Based);
	if (existing) {
		existing.width = existing.width === undefined ? width : Math.max(existing.width, width);
		return;
	}
	const spec: ColumnSpec = { min: col1Based, max: col1Based, width };
	sheet.columns.push(spec);
	sheet.columns.sort((a, b) => a.min - b.min || a.max - b.max);
}

function resolveSubHeaderValues<TRow>(
	columns: readonly TableColumnSpec<TRow>[],
	subHeaderOption: TableBlockOptions<TRow>["subHeaderRow"],
): string[] | null {
	if (subHeaderOption === false) {
		return null;
	}
	if (subHeaderOption === true) {
		return columns.map((col) => col.subHeader ?? "");
	}
	if (Array.isArray(subHeaderOption)) {
		return columns.map((col, idx) => {
			const val = (subHeaderOption as readonly (string | undefined)[])[idx];
			return val ?? col.subHeader ?? "";
		});
	}
	if (typeof subHeaderOption === "object" && subHeaderOption !== null) {
		const record = subHeaderOption as Readonly<Record<string, string>>;
		return columns.map((col) => record[col.id] ?? col.subHeader ?? "");
	}
	if (columns.some((col) => col.subHeader !== undefined)) {
		return columns.map((col) => col.subHeader ?? "");
	}
	return null;
}

function resolveTotalsValues<TRow>(
	columns: readonly TableColumnSpec<TRow>[],
	totalsOption: TableBlockOptions<TRow>["totalsRow"],
): Array<TableTotalsValue | undefined> | null {
	if (!totalsOption) {
		return null;
	}
	if (Array.isArray(totalsOption)) {
		const arr = totalsOption as readonly (TableTotalsValue | undefined)[];
		return columns.map((_, idx) => arr[idx]);
	}
	const record = totalsOption as Readonly<Record<string, TableTotalsValue>>;
	return columns.map((col) => record[col.id]);
}

function resolveRawCellValue<TRow>(col: TableColumnSpec<TRow>, row: TRow): unknown {
	if (typeof col.accessor === "function") {
		return col.accessor(row);
	}
	if (col.accessor !== undefined) {
		return (row as Record<string, unknown>)[String(col.accessor)];
	}
	return (row as Record<string, unknown>)[col.id];
}

function createSheetBuilder(
	name: string,
	theme: ExcelTheme,
	dateSystem: ExcelDateSystem,
): SheetBuilder {
	const model: WorksheetModel = {
		name,
		cells: new Map<string, CellModel>(),
	};
	let cursorRow = 0;

	const builder: SheetBuilder = {
		addTitleBlock(options: TitleBlockOptions): SheetBuilder {
			const titleStyle = stripRowHeight(theme.title);
			const titleRow = cursorRow;
			setCell(model, formatCellRef(0, titleRow), {
				value: options.title,
				type: "string",
				style: titleStyle,
			});
			setRowHeightMeta(model, titleRow + 1, theme.title.rowHeight ?? 26);

			if (options.mergeCols !== undefined && options.mergeCols > 1) {
				model.merges ??= [];
				model.merges.push(
					`${formatCellRef(0, titleRow)}:${formatCellRef(options.mergeCols - 1, titleRow)}`,
				);
			}
			cursorRow += 1;

			if (options.subtitle !== undefined) {
				const subtitleStyle = stripRowHeight(theme.subtitle);
				const subtitleRow = cursorRow;
				setCell(model, formatCellRef(0, subtitleRow), {
					value: options.subtitle,
					type: "string",
					style: subtitleStyle,
				});
				setRowHeightMeta(model, subtitleRow + 1, theme.subtitle.rowHeight);

				if (options.mergeCols !== undefined && options.mergeCols > 1) {
					model.merges ??= [];
					model.merges.push(
						`${formatCellRef(0, subtitleRow)}:${formatCellRef(options.mergeCols - 1, subtitleRow)}`,
					);
				}
				cursorRow += 1;
			}

			const emptyAfter = options.emptyRowsAfter ?? 1;
			if (emptyAfter > 0) {
				cursorRow += emptyAfter;
			}
			return builder;
		},

		addTable<TRow = Record<string, unknown>>(options: TableBlockOptions<TRow>): SheetBuilder {
			const { columns, rows } = options;
			if (columns.length === 0) {
				const emptyAfter = options.emptyRowsAfter ?? 1;
				if (emptyAfter > 0) {
					cursorRow += emptyAfter;
				}
				return builder;
			}

			const maxColChars: number[] = columns.map((col) =>
				measureLongestLineLength(col.header),
			);

			// 1. Header row
			const headerRow = cursorRow;
			const baseHeaderStyle = stripRowHeight(theme.header);
			for (const [colIdx, col] of columns.entries()) {
				const colHeaderStyle = col.align
					? mergeStyleSpecs(baseHeaderStyle, { align: { horizontal: col.align } })
					: cloneStyleSpec(baseHeaderStyle);
				setCell(model, formatCellRef(colIdx, headerRow), {
					value: col.header,
					type: "string",
					style: colHeaderStyle,
				});
			}
			setRowHeightMeta(model, headerRow + 1, theme.header.rowHeight);
			let lastHeaderRow = headerRow;
			cursorRow += 1;

			// 2. Optional Sub-Header row
			const subHeaders = resolveSubHeaderValues(columns, options.subHeaderRow);
			if (subHeaders !== null) {
				const subHeaderRow = cursorRow;
				const baseSubHeaderStyle = stripRowHeight(theme.subHeader);
				for (const [colIdx, col] of columns.entries()) {
					const text = subHeaders[colIdx] ?? "";
					const colSubHeaderStyle = col.align
						? mergeStyleSpecs(baseSubHeaderStyle, { align: { horizontal: col.align } })
						: cloneStyleSpec(baseSubHeaderStyle);
					setCell(model, formatCellRef(colIdx, subHeaderRow), {
						value: text,
						type: "string",
						style: colSubHeaderStyle,
					});
					const len = measureLongestLineLength(text);
					if (len > (maxColChars[colIdx] ?? 0)) {
						maxColChars[colIdx] = len;
					}
				}
				setRowHeightMeta(model, subHeaderRow + 1, theme.subHeader.rowHeight);
				lastHeaderRow = subHeaderRow;
				cursorRow += 1;
			}

			// 3. Data rows
			const baseDataStyle = stripRowHeight(theme.data);
			let lastDataRow = lastHeaderRow;
			for (const row of rows) {
				const dataRow = cursorRow;
				for (const [colIdx, col] of columns.entries()) {
					const rawVal = resolveRawCellValue(col, row);
					const status: CellStatus = col.status ? col.status(rawVal, row) : "base";
					const statusStyle = theme.statuses[status];

					let cellStyle = mergeStyleSpecs(baseDataStyle, statusStyle);
					if (col.align || col.numFmt) {
						cellStyle = mergeStyleSpecs(cellStyle, {
							align: col.align ? { horizontal: col.align } : undefined,
							numFmt: col.numFmt,
						});
					}

					let cellModel: CellModel;
					let formattedStr: string | undefined;
					if (isCellModelObject(rawVal)) {
						cellModel = {
							...rawVal,
							style: rawVal.style
								? mergeStyleSpecs(cellStyle, rawVal.style)
								: cellStyle,
						};
					} else if (rawVal === null || rawVal === undefined) {
						cellModel = { value: null, type: "empty", style: cellStyle };
					} else if (
						typeof rawVal === "number" ||
						typeof rawVal === "boolean" ||
						rawVal instanceof Date
					) {
						// Preserve native numeric/boolean/Date scalars in Excel when numFmt is set or format is omitted;
						// if a custom format callback is provided without numFmt, use the formatted string.
						if (col.format && !col.numFmt) {
							formattedStr = col.format(rawVal, row);
							cellModel = buildCellFromScalar(formattedStr, cellStyle);
						} else {
							cellModel = buildCellFromScalar(rawVal, cellStyle);
						}
					} else if (typeof rawVal === "string") {
						formattedStr = col.format ? col.format(rawVal, row) : rawVal;
						cellModel = buildCellFromScalar(formattedStr, cellStyle);
					} else {
						formattedStr = col.format ? col.format(rawVal, row) : String(rawVal);
						cellModel = buildCellFromScalar(formattedStr, cellStyle);
					}

					setCell(model, formatCellRef(colIdx, dataRow), cellModel);

					const displayForWidth =
						formattedStr !== undefined
							? formattedStr
							: col.format &&
								  rawVal !== null &&
								  rawVal !== undefined &&
								  !isCellModelObject(rawVal)
								? col.format(rawVal, row)
								: formatCellDisplay(cellModel, { dateSystem });
					const len = measureLongestLineLength(displayForWidth);
					if (len > (maxColChars[colIdx] ?? 0)) {
						maxColChars[colIdx] = len;
					}
				}
				setRowHeightMeta(model, dataRow + 1, theme.data.rowHeight);
				lastDataRow = dataRow;
				cursorRow += 1;
			}

			// 4. Optional Totals / Footer row
			const totalsValues = resolveTotalsValues(columns, options.totalsRow);
			if (totalsValues !== null) {
				const footerRow = cursorRow;
				const baseFooterStyle = stripRowHeight(theme.footer);
				for (const [colIdx, col] of columns.entries()) {
					const totalEntry = totalsValues[colIdx];
					let footerStyle = cloneStyleSpec(baseFooterStyle);
					if (col.align || col.numFmt) {
						footerStyle = mergeStyleSpecs(footerStyle, {
							align: col.align ? { horizontal: col.align } : undefined,
							numFmt: col.numFmt,
						});
					}

					let footerCell: CellModel;
					if (totalEntry === undefined || totalEntry === null) {
						footerCell = { value: null, type: "empty", style: footerStyle };
					} else if (isCellModelObject(totalEntry)) {
						footerCell = {
							...totalEntry,
							style: totalEntry.style
								? mergeStyleSpecs(footerStyle, totalEntry.style)
								: footerStyle,
						};
					} else {
						footerCell = buildCellFromScalar(totalEntry, footerStyle);
					}

					setCell(model, formatCellRef(colIdx, footerRow), footerCell);

					if (!footerCell.formula || footerCell.value !== null) {
						const display = formatCellDisplay(footerCell, { dateSystem });
						const len = measureLongestLineLength(display);
						if (len > (maxColChars[colIdx] ?? 0)) {
							maxColChars[colIdx] = len;
						}
					}
				}
				setRowHeightMeta(model, footerRow + 1, theme.footer.rowHeight);
				cursorRow += 1;
			}

			// 5. Freeze Header
			if (options.freezeHeader) {
				model.freezePane = {
					...model.freezePane,
					rows: lastHeaderRow + 1,
				};
			}

			// 6. AutoFilter
			if (options.autoFilter) {
				const startRef = formatCellRef(0, headerRow);
				const endRef = formatCellRef(columns.length - 1, lastDataRow);
				model.autoFilterRef = `${startRef}:${endRef}`;
			}

			// 7. Column Widths & AutoFit
			const autoFitEnabled = options.autoFit === true || typeof options.autoFit === "object";
			const autoFitOpts: AutoFitOptions =
				typeof options.autoFit === "object" ? options.autoFit : {};
			const minWidth = autoFitOpts.minWidth ?? DEFAULT_AUTOFIT_MIN_WIDTH;
			const maxWidth = autoFitOpts.maxWidth ?? DEFAULT_AUTOFIT_MAX_WIDTH;
			const basePadding = autoFitOpts.padding ?? DEFAULT_AUTOFIT_PADDING;
			const extraFilterPadding = options.autoFilter ? AUTOFILTER_HEADER_EXTRA_PADDING : 0;

			for (const [colIdx, col] of columns.entries()) {
				if (col.width !== undefined) {
					upsertColumnWidth(model, colIdx + 1, col.width);
				} else if (autoFitEnabled) {
					const contentLen = maxColChars[colIdx] ?? 0;
					const headerLenWithFilter =
						measureLongestLineLength(col.header) + extraFilterPadding;
					const effectiveLen = Math.max(contentLen, headerLenWithFilter);
					const computed = Math.min(
						maxWidth,
						Math.max(minWidth, effectiveLen + basePadding),
					);
					upsertColumnWidth(model, colIdx + 1, computed);
				}
			}

			const emptyAfter = options.emptyRowsAfter ?? 1;
			if (emptyAfter > 0) {
				cursorRow += emptyAfter;
			}
			return builder;
		},

		addValidation(rule: DataValidationRule): SheetBuilder {
			model.dataValidations ??= [];
			model.dataValidations.push({ ...rule });
			return builder;
		},

		addHyperlink(ref: string, link: CellHyperlink): SheetBuilder {
			const parsed = parseCellRef(ref);
			const normalizedRef = formatCellRef(parsed.col, parsed.row);
			const existing = getCell(model, normalizedRef);
			if (existing) {
				existing.hyperlink = { ...link };
			} else {
				setCell(model, normalizedRef, {
					value: link.display ?? link.target ?? link.location ?? null,
					type: link.display || link.target || link.location ? "string" : "empty",
					hyperlink: { ...link },
				});
			}
			return builder;
		},

		setFreezePane(pane: SheetFreezePane): SheetBuilder {
			model.freezePane = { ...pane };
			return builder;
		},

		setView(options: SheetViewOptions): SheetBuilder {
			if (options.showGridLines !== undefined) {
				model.showGridLines = options.showGridLines;
			}
			if (options.tabColor !== undefined) {
				model.tabColor = options.tabColor;
			}
			if (options.state !== undefined) {
				model.state = options.state;
			}
			return builder;
		},

		setPageSetup(setup: SheetPageSetup): SheetBuilder {
			model.pageSetup = {
				...setup,
				margins: setup.margins ? { ...setup.margins } : undefined,
			};
			return builder;
		},

		toModel(): WorksheetModel {
			return model;
		},
	};

	return builder;
}

export function createWorkbookBuilder(options?: WorkbookBuilderOptions): WorkbookBuilder {
	const theme = options?.theme ?? ZINC_CAUTION_THEME;
	const dateSystem: ExcelDateSystem = options?.dateSystem ?? 1900;
	const sanitizeFormulaInjection = options?.sanitizeFormulaInjection;
	const sheets: WorksheetModel[] = [];

	const workbookBuilder: WorkbookBuilder = {
		sheet(name: string, configure: (sheet: SheetBuilder) => void): WorkbookBuilder {
			if (typeof name !== "string" || name.trim().length === 0) {
				throw new ExcelError("INVALID_CONFIG", "Worksheet name must be a non-empty string.");
			}
			const sheetBuilder = createSheetBuilder(name, theme, dateSystem);
			configure(sheetBuilder);
			sheets.push(sheetBuilder.toModel());
			return workbookBuilder;
		},

		toModel(): WorkbookModel {
			return {
				dateSystem,
				sheets: [...sheets],
			};
		},

		toBytes(writeOptions?: WriteXlsxOptions): Uint8Array {
			return writeXlsxBytes(workbookBuilder.toModel(), {
				sanitizeFormulaInjection,
				...writeOptions,
			});
		},
	};

	return workbookBuilder;
}
