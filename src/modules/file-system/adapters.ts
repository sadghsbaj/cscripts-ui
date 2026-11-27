import { FsError, isFsError } from "./errors.ts";
import {
	diffJson,
	mergeJson3Way,
	type JsonDiffOptions,
	type JsonDiffResult,
	type JsonMergeResult,
} from "./json-diff.ts";

export const DEFAULT_MAX_JSON_BYTES = 25 * 1024 * 1024;
const DEFAULT_JSON_INDENT = 2;
const DEFAULT_VERSION_FIELD = "schemaVersion";

export interface AdapterDecodeContext {
	path: string;
	file: File;
	readBytes(): Promise<Uint8Array>;
	readText(): Promise<string>;
}

export interface AdapterDecodeResult<TData, TDecodedMeta = unknown> {
	data: TData;
	meta?: TDecodedMeta;
	migrated?: boolean;
	fromVersion?: number;
	warnings?: string[];
}

export interface AdapterEncodeContext {
	path: string;
}

export interface FileAdapter<TData, TDecodedMeta = unknown> {
	readonly id: string;
	readonly extensions: readonly string[];
	decode(ctx: AdapterDecodeContext): Promise<AdapterDecodeResult<TData, TDecodedMeta>>;
	encode(data: TData, ctx: AdapterEncodeContext): Promise<Uint8Array | string>;
	validate?(data: TData, ctx?: AdapterEncodeContext): void | Promise<void>;
	diff?(base: TData, target: TData): JsonDiffResult;
	merge?(base: TData | undefined, local: TData, remote: TData): JsonMergeResult<TData>;
}

export interface StandardSchemaIssue {
	readonly message: string;
	readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}

export type StandardSchemaResult<Output> =
	| { readonly value: Output; readonly issues?: undefined }
	| { readonly issues: ReadonlyArray<StandardSchemaIssue> };

export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown,
		) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
		readonly types?: {
			readonly input: Input;
			readonly output: Output;
		};
	};
}

export type TypeGuardValidator<T> = (raw: unknown) => raw is T;

export type MigrationFn = (doc: unknown) => unknown | Promise<unknown>;

export interface MigrationStepConfig {
	migrate: MigrationFn;
	schema?: StandardSchemaV1<unknown, unknown>;
	validate?: (raw: unknown) => boolean;
}

export type MigrationStep = MigrationFn | MigrationStepConfig;

export type MigrationWriteBackMode = "lazy" | "eager";

export interface JsonAdapterOptions<TData> {
	id?: string;
	extensions?: readonly string[];
	schema?: StandardSchemaV1<unknown, TData>;
	validate?: TypeGuardValidator<TData>;
	maxJsonBytes?: number;
	indent?: number;
	version?: number;
	versionField?: string;
	minVersion?: number;
	missingVersionAs?: number;
	detectVersion?: (raw: unknown) => number | undefined;
	migrations?: Record<number, MigrationStep>;
	migrationWriteBack?: MigrationWriteBackMode;
	backupBeforeMigration?: boolean;
	diffOptions?: JsonDiffOptions;
}

export interface JsonFileAdapter<TData> extends FileAdapter<TData> {
	readonly version?: number;
	readonly versionField: string;
	readonly migrationWriteBack?: MigrationWriteBackMode;
	readonly backupBeforeMigration?: boolean;
}

export interface MigrateDocumentOptions<TData> {
	path?: string;
	raw: unknown;
	version: number;
	versionField?: string;
	minVersion?: number;
	missingVersionAs?: number;
	detectVersion?: (raw: unknown) => number | undefined;
	migrations?: Record<number, MigrationStep>;
	schema?: StandardSchemaV1<unknown, TData>;
	validate?: TypeGuardValidator<TData>;
}

export interface MigrateDocumentResult<TData> {
	data: TData;
	migrated: boolean;
	fromVersion: number;
	toVersion: number;
}

export type JsonlCorruptLinePolicy = "skip-trailing" | "skip-any" | "fail";

export interface JsonlAdapterOptions<TLine> {
	id?: string;
	extensions?: readonly string[];
	schema?: StandardSchemaV1<unknown, TLine>;
	validate?: TypeGuardValidator<TLine>;
	maxJsonBytes?: number;
	onCorruptLine?: JsonlCorruptLinePolicy;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const proto = Object.getPrototypeOf(value) as object | null;
	return proto === Object.prototype || proto === null;
}

function assertValidMaxBytes(maxBytes: number | undefined, label: string): number {
	const resolved = maxBytes ?? DEFAULT_MAX_JSON_BYTES;
	if (
		typeof resolved !== "number" ||
		Number.isNaN(resolved) ||
		resolved < 0 ||
		(Number.isFinite(resolved) && !Number.isSafeInteger(resolved))
	) {
		throw new FsError("INVALID_CONFIG", `${label} must be a non-negative integer or Infinity.`, {
			details: { [label]: maxBytes },
		});
	}
	return resolved;
}

function checkMaxFileBytes(size: number, maxBytes: number, path: string): void {
	if (Number.isFinite(maxBytes) && size > maxBytes) {
		throw new FsError(
			"FILE_TOO_LARGE",
			`File "${path}" (${size} bytes) exceeds maxJsonBytes (${maxBytes}).`,
			{ details: { path, size, maxJsonBytes: maxBytes } },
		);
	}
}

function assertValidSchemaConfig<T>(schema: StandardSchemaV1<unknown, T> | undefined): void {
	if (schema === undefined) {
		return;
	}
	const standard = schema?.["~standard"];
	if (
		typeof standard !== "object" ||
		standard === null ||
		standard.version !== 1 ||
		typeof standard.validate !== "function"
	) {
		throw new FsError(
			"INVALID_CONFIG",
			"Invalid Standard Schema v1 object: expected '~standard.version === 1' and a validate() function.",
		);
	}
}

async function validatePayload<T>(
	raw: unknown,
	options: {
		schema?: StandardSchemaV1<unknown, T>;
		validate?: (raw: unknown) => boolean;
		path?: string;
		fromVersion?: number;
		toVersion?: number;
	},
): Promise<T> {
	let value: unknown = raw;

	if (options.schema !== undefined) {
		assertValidSchemaConfig(options.schema);
		let result: StandardSchemaResult<T>;
		try {
			result = await options.schema["~standard"].validate(value);
		} catch (error) {
			throw new FsError("VALIDATION_FAILED", `Schema validation threw for "${options.path ?? ""}".`, {
				details: {
					path: options.path,
					fromVersion: options.fromVersion,
					toVersion: options.toVersion,
					cause: error,
				},
				cause: error,
			});
		}

		if (result.issues !== undefined) {
			const firstIssue = result.issues[0]?.message ?? "Validation failed.";
			throw new FsError(
				"VALIDATION_FAILED",
				`Schema validation failed${options.path ? ` for "${options.path}"` : ""}: ${firstIssue}`,
				{
					details: {
						path: options.path,
						issues: result.issues,
						fromVersion: options.fromVersion,
						toVersion: options.toVersion,
					},
				},
			);
		}
		value = result.value;
	}

	if (options.validate !== undefined) {
		let valid: boolean;
		try {
			valid = options.validate(value);
		} catch (error) {
			throw new FsError(
				"VALIDATION_FAILED",
				`Type guard validation threw${options.path ? ` for "${options.path}"` : ""}.`,
				{
					details: {
						path: options.path,
						fromVersion: options.fromVersion,
						toVersion: options.toVersion,
						cause: error,
					},
					cause: error,
				},
			);
		}
		if (!valid) {
			throw new FsError(
				"VALIDATION_FAILED",
				`Validation failed${options.path ? ` for "${options.path}"` : ""}.`,
				{
					details: {
						path: options.path,
						fromVersion: options.fromVersion,
						toVersion: options.toVersion,
					},
				},
			);
		}
	}

	return value as T;
}

function resolveMigrationStep(step: MigrationStep | undefined): MigrationStepConfig | undefined {
	if (step === undefined) {
		return undefined;
	}
	if (typeof step === "function") {
		return { migrate: step };
	}
	if (typeof step === "object" && step !== null && typeof step.migrate === "function") {
		return step;
	}
	return undefined;
}

function resolveAndValidateMigrationChain(options: {
	version: number;
	minVersion?: number;
	migrations?: Record<number, MigrationStep>;
}): number {
	const { version, minVersion, migrations } = options;
	if (!Number.isSafeInteger(version) || version < 0) {
		throw new FsError("INVALID_CONFIG", `Adapter version must be a non-negative integer, got ${version}.`, {
			details: { version },
		});
	}

	const migrationKeys: number[] = [];
	if (migrations !== undefined) {
		for (const key of Object.keys(migrations)) {
			const parsed = Number(key);
			if (!Number.isSafeInteger(parsed) || parsed < 0 || String(parsed) !== key) {
				throw new FsError("INVALID_CONFIG", `Invalid migration version key "${key}".`, {
					details: { key },
				});
			}
			migrationKeys.push(parsed);
		}
	}

	let effectiveMinVersion: number;
	if (minVersion !== undefined) {
		if (!Number.isSafeInteger(minVersion) || minVersion < 0 || minVersion > version) {
			throw new FsError(
				"INVALID_CONFIG",
				`minVersion (${minVersion}) must be an integer between 0 and version (${version}).`,
				{ details: { minVersion, version } },
			);
		}
		effectiveMinVersion = minVersion;
	} else if (migrationKeys.length > 0) {
		effectiveMinVersion = Math.min(...migrationKeys);
		if (effectiveMinVersion > version) {
			throw new FsError(
				"INVALID_CONFIG",
				`Migration start version (${effectiveMinVersion}) exceeds target version (${version}).`,
				{ details: { minVersion: effectiveMinVersion, version } },
			);
		}
	} else {
		effectiveMinVersion = version;
	}

	for (let v = effectiveMinVersion; v < version; v += 1) {
		const step = resolveMigrationStep(migrations?.[v]);
		if (step === undefined) {
			throw new FsError(
				"INVALID_CONFIG",
				`Missing migration step for version ${v} -> ${v + 1} (minVersion=${effectiveMinVersion}, version=${version}).`,
				{
					details: {
						missingFromVersion: v,
						toVersion: v + 1,
						minVersion: effectiveMinVersion,
						version,
					},
				},
			);
		}
		assertValidSchemaConfig(step.schema);
	}

	return effectiveMinVersion;
}

export function defineAdapter<TData, TDecodedMeta = unknown>(
	config: FileAdapter<TData, TDecodedMeta>,
): FileAdapter<TData, TDecodedMeta> {
	if (typeof config !== "object" || config === null) {
		throw new FsError("INVALID_CONFIG", "Adapter config must be an object.");
	}
	if (typeof config.id !== "string" || config.id.trim().length === 0) {
		throw new FsError("INVALID_CONFIG", "Adapter 'id' must be a non-empty string.", {
			details: { id: config.id },
		});
	}
	if (!Array.isArray(config.extensions) || config.extensions.length === 0) {
		throw new FsError("INVALID_CONFIG", `Adapter "${config.id}" must declare at least one extension.`, {
			details: { id: config.id, extensions: config.extensions },
		});
	}
	for (const ext of config.extensions) {
		if (typeof ext !== "string" || !ext.startsWith(".") || ext.length < 2) {
			throw new FsError(
				"INVALID_CONFIG",
				`Adapter "${config.id}" has invalid extension "${String(ext)}". Extensions must start with ".".`,
				{ details: { id: config.id, extension: ext } },
			);
		}
	}
	if (typeof config.decode !== "function") {
		throw new FsError("INVALID_CONFIG", `Adapter "${config.id}" must provide a decode() function.`, {
			details: { id: config.id },
		});
	}
	if (typeof config.encode !== "function") {
		throw new FsError("INVALID_CONFIG", `Adapter "${config.id}" must provide an encode() function.`, {
			details: { id: config.id },
		});
	}

	return config;
}

export async function migrateDocument<TData>(
	options: MigrateDocumentOptions<TData>,
): Promise<MigrateDocumentResult<TData>> {
	const path = options.path ?? "<memory>";
	const versionField = options.versionField ?? DEFAULT_VERSION_FIELD;
	const effectiveMinVersion = resolveAndValidateMigrationChain({
		version: options.version,
		minVersion: options.minVersion,
		migrations: options.migrations,
	});
	assertValidSchemaConfig(options.schema);

	let detectedVersion: number | undefined;
	if (isPlainObject(options.raw) && options.raw[versionField] !== undefined) {
		const fieldVal = options.raw[versionField];
		if (typeof fieldVal !== "number" || !Number.isSafeInteger(fieldVal)) {
			throw new FsError(
				"VALIDATION_FAILED",
				`Invalid "${versionField}" in "${path}": expected integer, got ${typeof fieldVal}.`,
				{ details: { path, versionField, value: fieldVal } },
			);
		}
		detectedVersion = fieldVal;
	} else {
		if (options.detectVersion !== undefined) {
			try {
				detectedVersion = options.detectVersion(options.raw);
			} catch (error) {
				throw new FsError(
					"VALIDATION_FAILED",
					`detectVersion() threw while inspecting "${path}".`,
					{ details: { path, cause: error }, cause: error },
				);
			}
		}
		if (detectedVersion === undefined && options.missingVersionAs !== undefined) {
			detectedVersion = options.missingVersionAs;
		}
	}

	if (detectedVersion === undefined || !Number.isSafeInteger(detectedVersion) || detectedVersion < 0) {
		throw new FsError(
			"VALIDATION_FAILED",
			`Missing or invalid schema version ("${versionField}") in "${path}".`,
			{ details: { path, versionField, detectedVersion } },
		);
	}

	if (detectedVersion > options.version) {
		throw new FsError(
			"UNSUPPORTED_SCHEMA_VERSION",
			`Document "${path}" has schema version ${detectedVersion}, which is newer than supported version ${options.version}.`,
			{
				details: {
					path,
					fileVersion: detectedVersion,
					supportedVersion: options.version,
				},
			},
		);
	}

	if (detectedVersion < effectiveMinVersion) {
		throw new FsError(
			"MIGRATION_FAILED",
			`Document "${path}" has schema version ${detectedVersion}, below minimum supported version ${effectiveMinVersion}.`,
			{
				details: {
					path,
					fromVersion: detectedVersion,
					toVersion: options.version,
					minVersion: effectiveMinVersion,
				},
			},
		);
	}

	let current: unknown = structuredClone(options.raw);

	for (let v = detectedVersion; v < options.version; v += 1) {
		const step = resolveMigrationStep(options.migrations?.[v]);
		if (step === undefined) {
			throw new FsError(
				"MIGRATION_FAILED",
				`Missing migration step from v${v} to v${v + 1} for "${path}".`,
				{
					details: {
						path,
						fromVersion: v,
						toVersion: v + 1,
					},
				},
			);
		}

		try {
			current = await step.migrate(current);
			if (isPlainObject(current)) {
				current[versionField] = v + 1;
			}
			if (step.schema !== undefined || step.validate !== undefined) {
				current = await validatePayload(current, {
					schema: step.schema,
					validate: step.validate,
					path,
					fromVersion: v,
					toVersion: v + 1,
				});
			}
		} catch (error) {
			if (isFsError(error) && error.code === "VALIDATION_FAILED") {
				throw error;
			}
			throw new FsError(
				"MIGRATION_FAILED",
				`Migration step v${v} -> v${v + 1} failed for "${path}".`,
				{
					details: {
						path,
						fromVersion: v,
						toVersion: v + 1,
						cause: error,
					},
					cause: error,
				},
			);
		}
	}

	const validated = await validatePayload<TData>(current, {
		schema: options.schema,
		validate: options.validate,
		path,
		fromVersion: detectedVersion,
		toVersion: options.version,
	});

	return {
		data: validated,
		migrated: detectedVersion < options.version,
		fromVersion: detectedVersion,
		toVersion: options.version,
	};
}

export function jsonAdapter<TData = unknown>(
	options: JsonAdapterOptions<TData> = {},
): JsonFileAdapter<TData> {
	const id = options.id ?? "json";
	const extensions = options.extensions ?? [".json"];
	const maxJsonBytes = assertValidMaxBytes(options.maxJsonBytes, "maxJsonBytes");
	const indent = options.indent ?? DEFAULT_JSON_INDENT;
	const versionField = options.versionField ?? DEFAULT_VERSION_FIELD;

	assertValidSchemaConfig(options.schema);

	if (options.version !== undefined) {
		resolveAndValidateMigrationChain({
			version: options.version,
			minVersion: options.minVersion,
			migrations: options.migrations,
		});
	}

	const adapter = defineAdapter<TData>({
		id,
		extensions,
		async decode(ctx) {
			checkMaxFileBytes(ctx.file.size, maxJsonBytes, ctx.path);
			const text = await ctx.readText();

			let parsed: unknown;
			try {
				parsed = JSON.parse(text);
			} catch (error) {
				throw new FsError("CORRUPT_DATA", `Invalid JSON in "${ctx.path}".`, {
					details: { path: ctx.path },
					cause: error,
				});
			}

			if (options.version === undefined) {
				const data = await validatePayload<TData>(parsed, {
					schema: options.schema,
					validate: options.validate,
					path: ctx.path,
				});
				return { data };
			}

			const migratedResult = await migrateDocument<TData>({
				path: ctx.path,
				raw: parsed,
				version: options.version,
				versionField,
				minVersion: options.minVersion,
				missingVersionAs: options.missingVersionAs,
				detectVersion: options.detectVersion,
				migrations: options.migrations,
				schema: options.schema,
				validate: options.validate,
			});

			return {
				data: migratedResult.data,
				migrated: migratedResult.migrated,
				fromVersion: migratedResult.migrated ? migratedResult.fromVersion : undefined,
			};
		},
		async encode(data, ctx) {
			const payload: unknown =
				options.version !== undefined && isPlainObject(data)
					? { ...data, [versionField]: options.version }
					: data;
			const encoded = JSON.stringify(payload, null, indent);
			if (typeof encoded !== "string") {
				throw new FsError(
					"VALIDATION_FAILED",
					`Value cannot be serialized to JSON for "${ctx.path}"`,
					{ details: { path: ctx.path } },
				);
			}
			return encoded;
		},
		async validate(data, ctx) {
			const payload: unknown =
				options.version !== undefined && isPlainObject(data)
					? { ...data, [versionField]: options.version }
					: data;
			await validatePayload<TData>(payload, {
				schema: options.schema,
				validate: options.validate,
				path: ctx?.path,
			});
		},
		diff(base, target) {
			return diffJson(base, target, options.diffOptions);
		},
		merge(base, local, remote) {
			return mergeJson3Way(base, local, remote, options.diffOptions);
		},
	});

	return {
		...adapter,
		version: options.version,
		versionField,
		migrationWriteBack: options.migrationWriteBack,
		backupBeforeMigration: options.backupBeforeMigration,
	};
}

export function encodeJsonlLine<T>(item: T): string {
	const encoded = JSON.stringify(item);
	if (typeof encoded !== "string") {
		throw new FsError("VALIDATION_FAILED", "JSONL item cannot be serialized to JSON");
	}
	return `${encoded}\n`;
}

export function encodeJsonlLines<T>(items: readonly T[]): string {
	if (items.length === 0) {
		return "";
	}
	return items.map((item) => encodeJsonlLine(item)).join("");
}

export function jsonlAdapter<TLine = unknown>(
	options: JsonlAdapterOptions<TLine> = {},
): FileAdapter<TLine[]> {
	const id = options.id ?? "jsonl";
	const extensions = options.extensions ?? [".jsonl"];
	const maxJsonBytes = assertValidMaxBytes(options.maxJsonBytes, "maxJsonBytes");
	const onCorruptLine: JsonlCorruptLinePolicy = options.onCorruptLine ?? "skip-trailing";

	assertValidSchemaConfig(options.schema);

	return defineAdapter<TLine[]>({
		id,
		extensions,
		async decode(ctx) {
			checkMaxFileBytes(ctx.file.size, maxJsonBytes, ctx.path);
			const text = await ctx.readText();
			const rawLines = text.split(/\r?\n/);

			let lastNonEmptyIndex = -1;
			for (let i = rawLines.length - 1; i >= 0; i -= 1) {
				if ((rawLines[i] ?? "").trim().length > 0) {
					lastNonEmptyIndex = i;
					break;
				}
			}

			const items: TLine[] = [];
			const warnings: string[] = [];

			for (const [i, rawLine] of rawLines.entries()) {
				if (rawLine.trim().length === 0) {
					continue;
				}

				const lineNumber = i + 1;
				let parsed: unknown;
				try {
					parsed = JSON.parse(rawLine);
				} catch (error) {
					const isTrailing = i === lastNonEmptyIndex;
					if (
						onCorruptLine === "skip-any" ||
						(onCorruptLine === "skip-trailing" && isTrailing)
					) {
						warnings.push(
							`Skipped corrupt JSONL line ${lineNumber} in "${ctx.path}".`,
						);
						continue;
					}
					throw new FsError(
						"CORRUPT_DATA",
						`Corrupt JSONL line ${lineNumber} in "${ctx.path}".`,
						{
							details: { path: ctx.path, lineNumber },
							cause: error,
						},
					);
				}

				try {
					const validated = await validatePayload<TLine>(parsed, {
						schema: options.schema,
						validate: options.validate,
						path: `${ctx.path}:${lineNumber}`,
					});
					items.push(validated);
				} catch (error) {
					const isTrailing = i === lastNonEmptyIndex;
					if (
						onCorruptLine === "skip-any" ||
						(onCorruptLine === "skip-trailing" && isTrailing)
					) {
						warnings.push(
							`Skipped invalid JSONL line ${lineNumber} in "${ctx.path}".`,
						);
						continue;
					}
					throw error;
				}
			}

			return {
				data: items,
				warnings: warnings.length > 0 ? warnings : undefined,
			};
		},
		async encode(data) {
			return encodeJsonlLines(data);
		},
		async validate(data, ctx) {
			if (!Array.isArray(data)) {
				throw new FsError(
					"VALIDATION_FAILED",
					`JSONL data must be an array${ctx?.path ? ` for "${ctx.path}"` : ""}.`,
					{ details: { path: ctx?.path } },
				);
			}
			for (const [i, item] of data.entries()) {
				await validatePayload<TLine>(item, {
					schema: options.schema,
					validate: options.validate,
					path: ctx?.path ? `${ctx.path}:${i + 1}` : undefined,
				});
			}
		},
	});
}
