import { describe, expect, it, vi } from "vitest";
import {
	defineAdapter,
	encodeJsonlLine,
	encodeJsonlLines,
	jsonAdapter,
	jsonlAdapter,
	migrateDocument,
	type AdapterDecodeContext,
	type StandardSchemaV1,
} from "./adapters.ts";
import { isFsError, type FsError, type FsErrorCode } from "./errors.ts";

function makeDecodeCtx(
	path: string,
	content: string | Uint8Array,
	options?: { sizeOverride?: number; onReadText?: () => void; onReadBytes?: () => void },
): AdapterDecodeContext {
	const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
	const file = new File([bytes as BlobPart], path.split("/").pop() ?? "file");
	if (options?.sizeOverride !== undefined) {
		Object.defineProperty(file, "size", { value: options.sizeOverride });
	}
	return {
		path,
		file,
		async readBytes() {
			options?.onReadBytes?.();
			return bytes;
		},
		async readText() {
			options?.onReadText?.();
			return typeof content === "string" ? content : new TextDecoder().decode(bytes);
		},
	};
}

async function expectFsErrorCode(
	fn: () => unknown | Promise<unknown>,
	code: FsErrorCode,
): Promise<FsError> {
	try {
		await fn();
	} catch (error) {
		expect(isFsError(error)).toBe(true);
		if (isFsError(error)) {
			expect(error.code).toBe(code);
			return error;
		}
	}
	throw new Error(`Expected FsError("${code}") to be thrown`);
}

type SchemaOutcome<T> = { value: T; issues?: undefined } | { issues: Array<{ message: string }> };

function makeStandardSchema<T>(
	validate: (value: unknown) => Promise<SchemaOutcome<T>> | SchemaOutcome<T>,
): StandardSchemaV1<unknown, T> {
	return {
		"~standard": {
			version: 1,
			vendor: "test",
			validate,
		},
	};
}

async function noopDecode(): Promise<{ data: null }> {
	return { data: null };
}

async function noopEncode(): Promise<string> {
	return "";
}

function isIdEvent(raw: unknown): raw is { id: number } {
	return (
		typeof raw === "object" &&
		raw !== null &&
		"id" in raw &&
		typeof raw.id === "number"
	);
}

describe("adapters: defineAdapter", () => {
	it("rejects missing/empty id, invalid extensions, and missing decode/encode with INVALID_CONFIG", async () => {
		const badConfigs: unknown[] = [
			null,
			{ id: "", extensions: [".bin"], decode: noopDecode, encode: noopEncode },
			{ id: " ".repeat(3), extensions: [".bin"], decode: noopDecode, encode: noopEncode },
			{ id: "bin", extensions: [], decode: noopDecode, encode: noopEncode },
			{ id: "bin", extensions: ["bin"], decode: noopDecode, encode: noopEncode },
			{ id: "bin", extensions: ["."], decode: noopDecode, encode: noopEncode },
			{ id: "bin", extensions: [".bin"], encode: noopEncode },
			{ id: "bin", extensions: [".bin"], decode: noopDecode },
		];

		for (const config of badConfigs) {
			await expectFsErrorCode(
				() => defineAdapter(config as Parameters<typeof defineAdapter>[0]),
				"INVALID_CONFIG",
			);
		}
	});

	it("passes through valid custom adapters including lazy readBytes() and file usage", async () => {
		const onReadText = vi.fn();
		const onReadBytes = vi.fn();

		const binaryAdapter = defineAdapter<Uint8Array, { byteLength: number }>({
			id: "binary",
			extensions: [".bin"],
			async decode(ctx) {
				expect(ctx.file.name).toBe("blob.bin");
				const data = await ctx.readBytes();
				return {
					data,
					meta: { byteLength: ctx.file.size },
				};
			},
			async encode(data) {
				return data;
			},
		});

		const payload = new Uint8Array([1, 2, 3, 4]);
		const decoded = await binaryAdapter.decode(
			makeDecodeCtx("data/blob.bin", payload, { onReadText, onReadBytes }),
		);
		expect(decoded.data).toEqual(payload);
		expect(decoded.meta).toEqual({ byteLength: 4 });
		expect(onReadBytes).toHaveBeenCalledTimes(1);
		expect(onReadText).not.toHaveBeenCalled();

		const encoded = await binaryAdapter.encode(payload, { path: "data/blob.bin" });
		expect(encoded).toEqual(payload);
	});
});

describe("adapters: jsonAdapter (unversioned)", () => {
	it("encodes and decodes plain JSON without a data envelope or schemaVersion", async () => {
		const adapter = jsonAdapter<{ name: string; count: number }>();
		const input = { name: "alpha", count: 3 };

		const encoded = await adapter.encode(input, { path: "doc.json" });
		expect(typeof encoded).toBe("string");
		expect(JSON.parse(encoded as string)).toEqual(input);
		expect(encoded as string).not.toContain("schemaVersion");

		const decoded = await adapter.decode(makeDecodeCtx("doc.json", encoded as string));
		expect(decoded).toEqual({ data: input });
		expect(decoded.migrated).toBeUndefined();
		expect(decoded.fromVersion).toBeUndefined();
	});

	it("validates via sync and async Standard Schema v1 and plain TypeScript type guards", async () => {
		interface UserDoc {
			name: string;
			role: "admin" | "user";
		}

		const syncSchema = makeStandardSchema<UserDoc>((raw) => {
			if (
				typeof raw === "object" &&
				raw !== null &&
				"name" in raw &&
				typeof raw.name === "string"
			) {
				return {
					value: {
						name: raw.name.trim(),
						role: "user",
					},
				};
			}
			return { issues: [{ message: "Expected object with string name" }] };
		});

		const asyncSchema = makeStandardSchema<UserDoc>(async (raw) => {
			await Promise.resolve();
			if (
				typeof raw === "object" &&
				raw !== null &&
				"name" in raw &&
				typeof raw.name === "string"
			) {
				return { value: { name: raw.name, role: "admin" } };
			}
			return { issues: [{ message: "Async schema failed" }] };
		});

		const isUserDoc = (raw: unknown): raw is UserDoc =>
			typeof raw === "object" &&
			raw !== null &&
			"name" in raw &&
			typeof raw.name === "string" &&
			"role" in raw &&
			(raw.role === "admin" || raw.role === "user");

		const syncAdapter = jsonAdapter({ schema: syncSchema });
		const syncRes = await syncAdapter.decode(
			makeDecodeCtx("user.json", JSON.stringify({ name: "  Ada  " })),
		);
		expect(syncRes.data).toEqual({ name: "Ada", role: "user" });

		await expectFsErrorCode(
			() => syncAdapter.decode(makeDecodeCtx("user.json", JSON.stringify({ name: 123 }))),
			"VALIDATION_FAILED",
		);

		const asyncAdapter = jsonAdapter({ schema: asyncSchema });
		const asyncRes = await asyncAdapter.decode(
			makeDecodeCtx("user.json", JSON.stringify({ name: "Grace" })),
		);
		expect(asyncRes.data).toEqual({ name: "Grace", role: "admin" });

		const guardAdapter = jsonAdapter({ validate: isUserDoc });
		const guardRes = await guardAdapter.decode(
			makeDecodeCtx("user.json", JSON.stringify({ name: "Linus", role: "admin" })),
		);
		expect(guardRes.data).toEqual({ name: "Linus", role: "admin" });

		const invalidGuestCtx = makeDecodeCtx(
			"user.json",
			JSON.stringify({ name: "Linus", role: "guest" }),
		);
		await expectFsErrorCode(() => guardAdapter.decode(invalidGuestCtx), "VALIDATION_FAILED");

		const throwingSchema = makeStandardSchema<UserDoc>(() => {
			throw new Error("sync validator crash");
		});
		const throwingAdapter = jsonAdapter({ schema: throwingSchema });
		const throwingCtx = makeDecodeCtx("user.json", JSON.stringify({ name: "Ada" }));
		await expectFsErrorCode(() => throwingAdapter.decode(throwingCtx), "VALIDATION_FAILED");

		const rejectingSchema = makeStandardSchema<UserDoc>(async () => {
			throw new Error("async validator rejection");
		});
		const rejectingAdapter = jsonAdapter({ schema: rejectingSchema });
		const rejectingCtx = makeDecodeCtx("user.json", JSON.stringify({ name: "Ada" }));
		await expectFsErrorCode(() => rejectingAdapter.decode(rejectingCtx), "VALIDATION_FAILED");
	});

	it("rejects corrupt JSON with CORRUPT_DATA and enforces maxJsonBytes with FILE_TOO_LARGE", async () => {
		const onReadText = vi.fn();
		const adapter = jsonAdapter({ maxJsonBytes: 32 });

		await expectFsErrorCode(
			() => adapter.decode(makeDecodeCtx("bad.json", "{not-valid-json")),
			"CORRUPT_DATA",
		);

		const bigCtx = makeDecodeCtx("big.json", JSON.stringify({ payload: "x".repeat(64) }), {
			onReadText,
		});
		const err = await expectFsErrorCode(() => adapter.decode(bigCtx), "FILE_TOO_LARGE");
		expect(err.details?.maxJsonBytes).toBe(32);
		expect(onReadText).not.toHaveBeenCalled();

		// 12 "€" characters = 36 UTF-8 bytes (+2 quotes = 38 bytes) > maxJsonBytes: 32
		const utf8Ctx = makeDecodeCtx("utf8.json", JSON.stringify("€".repeat(12)));
		await expectFsErrorCode(() => adapter.decode(utf8Ctx), "FILE_TOO_LARGE");

		await expectFsErrorCode(() => jsonAdapter({ maxJsonBytes: -1 }), "INVALID_CONFIG");
		await expectFsErrorCode(() => jsonAdapter({ maxJsonBytes: 1.5 }), "INVALID_CONFIG");
	});
});

describe("adapters: jsonAdapter (versioned) & migrateDocument", () => {
	it("writes default and custom versionField on encode", async () => {
		const defaultAdapter = jsonAdapter<{ title: string }>({ version: 2 });
		const encodedDefault = await defaultAdapter.encode({ title: "Note" }, { path: "note.json" });
		expect(JSON.parse(encodedDefault as string)).toEqual({
			title: "Note",
			schemaVersion: 2,
		});

		const customAdapter = jsonAdapter<{ title: string }>({
			version: 5,
			versionField: "docVersion",
		});
		const encodedCustom = await customAdapter.encode({ title: "Note" }, { path: "note.json" });
		expect(JSON.parse(encodedCustom as string)).toEqual({
			title: "Note",
			docVersion: 5,
		});
	});

	it("rejects missing version unless missingVersionAs or detectVersion is configured", async () => {
		const strictAdapter = jsonAdapter<{ title: string }>({ version: 1 });
		await expectFsErrorCode(
			() => strictAdapter.decode(makeDecodeCtx("note.json", JSON.stringify({ title: "Legacy" }))),
			"VALIDATION_FAILED",
		);
		await expectFsErrorCode(
			() =>
				strictAdapter.decode(
					makeDecodeCtx("note.json", JSON.stringify({ schemaVersion: "1", title: "Bad" })),
				),
			"VALIDATION_FAILED",
		);

		const fallbackAdapter = jsonAdapter<{ schemaVersion: number; title: string; migratedFlag?: boolean }>({
			version: 2,
			missingVersionAs: 1,
			migrations: {
				1: (doc) => ({ ...(doc as Record<string, unknown>), migratedFlag: true }),
			},
		});
		const fromFallback = await fallbackAdapter.decode(
			makeDecodeCtx("legacy.json", JSON.stringify({ title: "Old" })),
		);
		expect(fromFallback.migrated).toBe(true);
		expect(fromFallback.fromVersion).toBe(1);
		expect(fromFallback.data).toEqual({
			title: "Old",
			schemaVersion: 2,
			migratedFlag: true,
		});

		const detectedAdapter = jsonAdapter<{ schemaVersion: number; legacyName?: string; name: string }>({
			version: 2,
			detectVersion: (raw) =>
				typeof raw === "object" && raw !== null && "legacyName" in raw ? 1 : undefined,
			migrations: {
				1: (doc) => {
					const obj = doc as { legacyName: string };
					return { name: obj.legacyName };
				},
			},
		});
		const fromDetected = await detectedAdapter.decode(
			makeDecodeCtx("detected.json", JSON.stringify({ legacyName: "Alpha" })),
		);
		expect(fromDetected.migrated).toBe(true);
		expect(fromDetected.fromVersion).toBe(1);
		expect(fromDetected.data).toEqual({ name: "Alpha", schemaVersion: 2 });

		// detectVersion returning undefined falls back to missingVersionAs
		const combinedAdapter = jsonAdapter<{ schemaVersion: number; name: string }>({
			version: 2,
			detectVersion: (raw) =>
				typeof raw === "object" && raw !== null && "v2Shape" in raw ? 2 : undefined,
			missingVersionAs: 1,
			migrations: {
				1: (doc) => ({ name: (doc as { title: string }).title }),
			},
		});
		const fromCombinedFallback = await combinedAdapter.decode(
			makeDecodeCtx("combined.json", JSON.stringify({ title: "FallbackDoc" })),
		);
		expect(fromCombinedFallback.migrated).toBe(true);
		expect(fromCombinedFallback.fromVersion).toBe(1);
		expect(fromCombinedFallback.data).toEqual({
			name: "FallbackDoc",
			schemaVersion: 2,
		});
	});

	it("rejects fileVersion > version with UNSUPPORTED_SCHEMA_VERSION and details", async () => {
		const adapter = jsonAdapter({ version: 2 });
		const err = await expectFsErrorCode(
			() =>
				adapter.decode(
					makeDecodeCtx("future.json", JSON.stringify({ schemaVersion: 4, value: 1 })),
				),
			"UNSUPPORTED_SCHEMA_VERSION",
		);
		expect(err.details).toEqual({
			path: "future.json",
			fileVersion: 4,
			supportedVersion: 2,
		});
	});

	it("eagerly validates contiguous migration chain at adapter creation", async () => {
		await expectFsErrorCode(
			() =>
				jsonAdapter({
					version: 3,
					minVersion: 1,
					migrations: {
						// Missing step 1 -> 2
						2: (d) => d,
					},
				}),
			"INVALID_CONFIG",
		);

		await expectFsErrorCode(
			() =>
				jsonAdapter({
					version: 3,
					migrations: {
						1: (d) => d,
						// Missing step 2 -> 3
					},
				}),
			"INVALID_CONFIG",
		);

		await expectFsErrorCode(
			() =>
				jsonAdapter({
					version: 2,
					minVersion: 3,
				}),
			"INVALID_CONFIG",
		);
	});

	it("runs stepwise v1 -> v2 -> v3 migrations via jsonAdapter.decode() and migrateDocument()", async () => {
		interface V3Doc {
			schemaVersion: number;
			fullName: string;
			tags: string[];
		}

		const v2Validate = vi.fn((raw: unknown) => {
			return (
				typeof raw === "object" &&
				raw !== null &&
				"fullName" in raw &&
				typeof raw.fullName === "string"
			);
		});

		const v3Schema = makeStandardSchema<V3Doc>((raw) => {
			if (
				typeof raw === "object" &&
				raw !== null &&
				"schemaVersion" in raw &&
				raw.schemaVersion === 3 &&
				"fullName" in raw &&
				typeof raw.fullName === "string" &&
				"tags" in raw &&
				Array.isArray(raw.tags)
			) {
				return { value: raw as V3Doc };
			}
			return { issues: [{ message: "Invalid v3 doc" }] };
		});

		const migrations = {
			1: {
				migrate: async (doc: unknown) => {
					const d = doc as { first: string; last: string };
					return { fullName: `${d.first} ${d.last}` };
				},
				validate: v2Validate,
			},
			2: {
				migrate: (doc: unknown) => {
					const d = doc as { fullName: string };
					return { ...d, tags: ["migrated"] };
				},
			},
		};

		const adapter = jsonAdapter<V3Doc>({
			version: 3,
			minVersion: 1,
			migrations,
			schema: v3Schema,
		});

		const decoded = await adapter.decode(
			makeDecodeCtx("person.json", JSON.stringify({ schemaVersion: 1, first: "Ada", last: "Lovelace" })),
		);
		expect(decoded.migrated).toBe(true);
		expect(decoded.fromVersion).toBe(1);
		expect(decoded.data).toEqual({
			schemaVersion: 3,
			fullName: "Ada Lovelace",
			tags: ["migrated"],
		});
		expect(v2Validate).toHaveBeenCalledTimes(1);

		const alreadyCurrent = await adapter.decode(
			makeDecodeCtx(
				"person-v3.json",
				JSON.stringify({ schemaVersion: 3, fullName: "Grace Hopper", tags: [] }),
			),
		);
		expect(alreadyCurrent.migrated).toBe(false);
		expect(alreadyCurrent.fromVersion).toBeUndefined();

		const standalone = await migrateDocument<V3Doc>({
			path: "person.json",
			raw: { schemaVersion: 1, first: "Alan", last: "Turing" },
			version: 3,
			minVersion: 1,
			migrations,
			schema: v3Schema,
		});
		expect(standalone).toEqual({
			data: {
				schemaVersion: 3,
				fullName: "Alan Turing",
				tags: ["migrated"],
			},
			migrated: true,
			fromVersion: 1,
			toVersion: 3,
		});
	});

	it("aborts fail-safely without mutating the input document when a step throws or validation fails", async () => {
		const rawInput = {
			schemaVersion: 1,
			nested: { count: 1 },
		};
		const snapshot = structuredClone(rawInput);

		// Case 1: migration step throws -> MIGRATION_FAILED
		await expectFsErrorCode(
			() =>
				migrateDocument({
					raw: rawInput,
					version: 3,
					migrations: {
						1: (doc) => {
							const d = doc as { nested: { count: number } };
							d.nested.count = 99;
							return d;
						},
						2: () => {
							throw new Error("boom in v2->v3");
						},
					},
				}),
			"MIGRATION_FAILED",
		);
		expect(rawInput).toEqual(snapshot);

		// Case 2: per-step validator fails -> VALIDATION_FAILED
		await expectFsErrorCode(
			() =>
				migrateDocument({
					raw: rawInput,
					version: 2,
					migrations: {
						1: {
							migrate: (doc) => doc,
							validate: () => false,
						},
					},
				}),
			"VALIDATION_FAILED",
		);
		expect(rawInput).toEqual(snapshot);

		// Case 3: final schema validation fails -> VALIDATION_FAILED
		await expectFsErrorCode(
			() =>
				migrateDocument({
					raw: rawInput,
					version: 2,
					migrations: {
						1: (doc) => {
							const d = doc as { nested: { count: number } };
							d.nested.count = 42;
							return d;
						},
					},
					schema: makeStandardSchema(() => ({ issues: [{ message: "Final check failed" }] })),
				}),
			"VALIDATION_FAILED",
		);
		expect(rawInput).toEqual(snapshot);
	});
});

describe("adapters: jsonlAdapter", () => {
	it("encodes and decodes line-delimited JSON records", async () => {
		expect(encodeJsonlLines([])).toBe("");
		expect(encodeJsonlLine({ a: 1 })).toBe('{"a":1}\n');

		const adapter = jsonlAdapter<{ id: number }>();
		const encoded = await adapter.encode([{ id: 1 }, { id: 2 }], { path: "events.jsonl" });
		expect(encoded).toBe('{"id":1}\n{"id":2}\n');

		const decoded = await adapter.decode(
			makeDecodeCtx("events.jsonl", '{"id":1}\n\n{"id":2}\r\n\n'),
		);
		expect(decoded.data).toEqual([{ id: 1 }, { id: 2 }]);
		expect(decoded.warnings).toBeUndefined();
	});

	it("applies skip-trailing, skip-any, and fail policies on corrupt lines", async () => {
		const trailingCorrupt = '{"id":1}\n{"id":2}\n{"id":3';
		const trailingCorruptWithBlank = '{"id":1}\n{"id":2}\n{"id":3\n\n';
		const middleCorrupt = '{"id":1}\n{broken\n{"id":3}\n';

		// Default is skip-trailing
		const skipTrailing = jsonlAdapter<{ id: number }>();
		const res1 = await skipTrailing.decode(makeDecodeCtx("log.jsonl", trailingCorrupt));
		expect(res1.data).toEqual([{ id: 1 }, { id: 2 }]);
		expect(res1.warnings).toHaveLength(1);

		const res2 = await skipTrailing.decode(makeDecodeCtx("log.jsonl", trailingCorruptWithBlank));
		expect(res2.data).toEqual([{ id: 1 }, { id: 2 }]);
		expect(res2.warnings).toHaveLength(1);

		await expectFsErrorCode(
			() => skipTrailing.decode(makeDecodeCtx("log.jsonl", middleCorrupt)),
			"CORRUPT_DATA",
		);

		// skip-any
		const skipAny = jsonlAdapter<{ id: number }>({ onCorruptLine: "skip-any" });
		const resAny = await skipAny.decode(makeDecodeCtx("log.jsonl", middleCorrupt));
		expect(resAny.data).toEqual([{ id: 1 }, { id: 3 }]);
		expect(resAny.warnings).toHaveLength(1);

		// fail
		const failAdapter = jsonlAdapter<{ id: number }>({ onCorruptLine: "fail" });
		await expectFsErrorCode(
			() => failAdapter.decode(makeDecodeCtx("log.jsonl", trailingCorrupt)),
			"CORRUPT_DATA",
		);
	});

	it("enforces maxJsonBytes and per-line schema/type-guard validation", async () => {
		const sizedAdapter = jsonlAdapter({ maxJsonBytes: 10 });
		await expectFsErrorCode(
			() => sizedAdapter.decode(makeDecodeCtx("big.jsonl", '{"id":1}\n{"id":2}\n')),
			"FILE_TOO_LARGE",
		);

		const strictLineAdapter = jsonlAdapter<{ id: number }>({
			validate: isIdEvent,
			onCorruptLine: "fail",
		});
		await expectFsErrorCode(
			() => strictLineAdapter.decode(makeDecodeCtx("bad-line.jsonl", '{"id":1}\n{"id":"oops"}\n')),
			"VALIDATION_FAILED",
		);

		const skipInvalidTrailing = jsonlAdapter<{ id: number }>({
			schema: makeStandardSchema<{ id: number }>((raw) =>
				isIdEvent(raw) ? { value: raw } : { issues: [{ message: "Bad event" }] },
			),
			onCorruptLine: "skip-trailing",
		});
		const res = await skipInvalidTrailing.decode(
			makeDecodeCtx("tail-invalid.jsonl", '{"id":1}\n{"id":"bad"}\n'),
		);
		expect(res.data).toEqual([{ id: 1 }]);
		expect(res.warnings).toHaveLength(1);
	});
});
