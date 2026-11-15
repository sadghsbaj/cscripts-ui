import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonAdapter, type StandardSchemaV1 } from "./adapters.ts";
import {
	CacheEngine,
	type CacheCollectionConfig,
	type SyncProgress,
} from "./cache-engine.internal.ts";
import { FsError, isFsError, type FsErrorCode } from "./errors.ts";
import { MemoryFsBackend } from "./memory-fs.internal.ts";
import { createPathTemplate } from "./path-template.ts";
import { WriteQueue } from "./write-queue.internal.ts";

interface InvoiceDoc {
	id: string;
	year: string;
	title: string;
	amount: number;
}

const invoiceSchema: StandardSchemaV1<unknown, InvoiceDoc> = {
	"~standard": {
		version: 1,
		vendor: "test",
		validate(value: unknown) {
			if (
				typeof value === "object" &&
				value !== null &&
				typeof (value as InvoiceDoc).id === "string" &&
				typeof (value as InvoiceDoc).year === "string" &&
				typeof (value as InvoiceDoc).title === "string" &&
				typeof (value as InvoiceDoc).amount === "number"
			) {
				return { value: value as InvoiceDoc };
			}
			return { issues: [{ message: "Invalid InvoiceDoc" }] };
		},
	},
};

const invoiceTemplate = createPathTemplate("invoices/{year}/{id}.json");
const invoiceCompanionTemplate = createPathTemplate("invoices/{year}/{id}.pdf");

function makeInvoiceCollection(options?: {
	eagerYears?: string[];
	withCompanion?: boolean;
	withProject?: boolean;
}): CacheCollectionConfig<unknown, unknown> {
	const eagerSet = options?.eagerYears ? new Set(options.eagerYears) : null;
	const index: CacheCollectionConfig<InvoiceDoc, unknown>["index"] = {
		partitionBy: (params, doc) => doc.year || params.year || "default",
		eagerPartitions: eagerSet ? (key) => eagerSet.has(key) : () => true,
	};
	if (options?.withProject) {
		index.project = (doc) => ({ id: doc.id, year: doc.year, title: doc.title });
	}
	const config: CacheCollectionConfig<InvoiceDoc, unknown> = {
		name: "invoices",
		template: invoiceTemplate,
		adapter: jsonAdapter<InvoiceDoc>({ schema: invoiceSchema }),
		index,
	};
	if (options?.withCompanion) {
		config.companion = { template: invoiceCompanionTemplate };
	}
	return config as CacheCollectionConfig<unknown, unknown>;
}

function encodeJsonBytes(value: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(value));
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

describe("cache-engine: two-tier cache, partitions & coalesced flush", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("writes compact meta.json & shard JSON files and loads only eagerPartitions on cache-only boot", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const collection = makeInvoiceCollection({ eagerYears: ["2026"] });

		const doc2025: InvoiceDoc = { id: "inv-1", year: "2025", title: "Old", amount: 100 };
		const doc2026: InvoiceDoc = { id: "inv-2", year: "2026", title: "New", amount: 200 };

		await backend.injectExternalFile("invoices/2025/inv-1.json", encodeJsonBytes(doc2025));
		await backend.injectExternalFile("invoices/2026/inv-2.json", encodeJsonBytes(doc2026));

		const engine1 = new CacheEngine({
			backend,
			writeQueue,
			collections: [collection],
			indexFlushMs: 0,
		});
		const report = await engine1.heal({ mode: "full" });
		expect(report.added).toBe(2);
		engine1.destroy();

		// Verify compact JSON (indent: 0 -> no newlines/pretty indentation)
		const metaRead = await backend.readBytes("_cs-fs/meta.json");
		const metaText = new TextDecoder().decode(metaRead.bytes);
		const shard2025Read = await backend.readBytes("_cs-fs/index/invoices/2025.json");
		const shard2025Text = new TextDecoder().decode(shard2025Read.bytes);
		expect(metaText).not.toContain("\n");
		expect(shard2025Text).not.toContain("\n");
		expect(JSON.parse(metaText).formatVersion).toBe(1);

		// Boot a fresh CacheEngine in cache-only mode with eagerYears: ["2026"]
		const walkSpy = vi.spyOn(backend, "walkFiles");
		const engine2 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
			bootCheck: "cache-only",
		});

		const bootRes = await engine2.boot();
		expect(bootRes).toEqual({ healed: false, report: null });
		expect(walkSpy).not.toHaveBeenCalled();

		expect(engine2.loadedPartitions("invoices")).toEqual(["2026"]);
		expect(engine2.unloadedPartitions("invoices")).toEqual(["2025"]);
		expect(engine2.hasUnloadedPartitions("invoices")).toBe(true);
		expect(engine2.getEntries<InvoiceDoc>("invoices").map((e) => e.data.id)).toEqual(["inv-2"]);
		expect(engine2.getEntry("invoices", "invoices/2025/inv-1.json")).toBeUndefined();

		// Load 2025 on demand
		await engine2.loadPartitions("invoices", ["2025"]);
		expect(engine2.loadedPartitions("invoices")).toEqual(["2025", "2026"]);
		expect(engine2.unloadedPartitions("invoices")).toEqual([]);
		expect(engine2.hasUnloadedPartitions("invoices")).toBe(false);
		expect(engine2.getEntry<InvoiceDoc>("invoices", "invoices/2025/inv-1.json")?.data.title).toBe(
			"Old",
		);

		// loadAllPartitions is a safe no-op when everything is already loaded
		await engine2.loadAllPartitions("invoices");
		engine2.destroy();
	});

	it("maintains cross-partition consistency on partition change, move, and delete with zero ghost duplicates", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 5000,
		});

		const rev1 = await backend.writeBytes(
			"invoices/2025/inv-1.json",
			encodeJsonBytes({ id: "inv-1", year: "2025", title: "Moveable", amount: 50 }),
		);
		await engine.upsertEntry(
			"invoices",
			"invoices/2025/inv-1.json",
			{ year: "2025", id: "inv-1" },
			rev1,
			{ id: "inv-1", year: "2025", title: "Moveable", amount: 50 },
		);
		await engine.flush();
		expect(await backend.exists("_cs-fs/index/invoices/2025.json")).toBe(true);

		// 1. Update partition key in-place (2025 -> 2026)
		const rev2 = await backend.writeBytes(
			"invoices/2025/inv-1.json",
			encodeJsonBytes({ id: "inv-1", year: "2026", title: "Moveable", amount: 50 }),
		);
		await engine.upsertEntry(
			"invoices",
			"invoices/2025/inv-1.json",
			{ year: "2025", id: "inv-1" },
			rev2,
			{ id: "inv-1", year: "2026", title: "Moveable", amount: 50 },
		);
		await engine.flush();

		expect(engine.getEntries("invoices")).toHaveLength(1);
		expect(engine.meta.collections.invoices?.pathToPartition["invoices/2025/inv-1.json"]).toBe(
			"2026",
		);
		expect(engine.meta.collections.invoices?.partitions["2025"]).toBeUndefined();
		expect(await backend.exists("_cs-fs/index/invoices/2025.json")).toBe(false);
		expect(await backend.exists("_cs-fs/index/invoices/2026.json")).toBe(true);

		// 2. Move path (remove old path, upsert new path)
		await backend.moveFile("invoices/2025/inv-1.json", "invoices/2026/inv-1.json");
		await engine.removeEntry("invoices", "invoices/2025/inv-1.json");
		const statMoved = await backend.stat("invoices/2026/inv-1.json");
		expect(statMoved).not.toBeNull();
		if (!statMoved) throw new Error("Expected moved file stat");
		await engine.upsertEntry(
			"invoices",
			"invoices/2026/inv-1.json",
			{ year: "2026", id: "inv-1" },
			{ size: statMoved.size, lastModified: statMoved.lastModified },
			{ id: "inv-1", year: "2026", title: "Moveable", amount: 50 },
		);
		await engine.flush();

		expect(engine.getEntries("invoices")).toHaveLength(1);
		expect(engine.getEntry("invoices", "invoices/2025/inv-1.json")).toBeUndefined();
		expect(engine.getEntry("invoices", "invoices/2026/inv-1.json")).toBeDefined();

		// 3. Delete entry -> shard file removed cleanly
		await backend.deleteFile("invoices/2026/inv-1.json");
		await engine.removeEntry("invoices", "invoices/2026/inv-1.json");
		await engine.flush();

		expect(engine.getEntries("invoices")).toHaveLength(0);
		expect(engine.meta.collections.invoices?.partitions["2026"]).toBeUndefined();
		expect(await backend.exists("_cs-fs/index/invoices/2026.json")).toBe(false);
		engine.destroy();
	});

	it("coalesces disk flushes with indexFlushMs debounce, enforces maxFlushWaitMs ceiling, and supports immediate flush()", async () => {
		vi.useFakeTimers();
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const writeSpy = vi.spyOn(backend, "writeBytes");

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 100,
			maxFlushWaitMs: 250,
		});

		const upsert = async (i: number): Promise<void> => {
			await engine.upsertEntry(
				"invoices",
				`invoices/2026/inv-${i}.json`,
				{ year: "2026", id: `inv-${i}` },
				{ size: 10, lastModified: i },
				{ id: `inv-${i}`, year: "2026", title: `T${i}`, amount: i },
			);
		};

		// Keep resetting the 100ms debounce every 80ms; maxFlushWaitMs (250ms) must force a flush.
		await upsert(1);
		await vi.advanceTimersByTimeAsync(80);
		expect(writeSpy).not.toHaveBeenCalled();

		await upsert(2);
		await vi.advanceTimersByTimeAsync(80);
		expect(writeSpy).not.toHaveBeenCalled();

		await upsert(3);
		await vi.advanceTimersByTimeAsync(95); // total 255ms >= 250ms maxFlushWaitMs
		expect(writeSpy).toHaveBeenCalled();
		const callsAfterMaxWait = writeSpy.mock.calls.length;

		// Explicit flush() writes immediately without waiting for timers
		await upsert(4);
		expect(writeSpy).toHaveBeenCalledTimes(callsAfterMaxWait);
		await engine.flush();
		expect(writeSpy.mock.calls.length).toBeGreaterThan(callsAfterMaxWait);

		engine.destroy();
	});
});

describe("cache-engine: boot quick-check, clock skew, healing & fault isolation", () => {
	it("skips reading file bodies (0 reads) on metadata-scan boot even with positive or negative clockSkewMs", async () => {
		for (const skew of [60_000, -60_000]) {
			const backend = new MemoryFsBackend({ clockSkewMs: skew });
			const writeQueue = new WriteQueue(backend);

			await backend.injectExternalFile(
				"invoices/2026/inv-1.json",
				encodeJsonBytes({ id: "inv-1", year: "2026", title: "Skew", amount: 10 }),
			);
			await backend.injectExternalFile(
				"invoices/2026/inv-2.json",
				encodeJsonBytes({ id: "inv-2", year: "2026", title: "Skew2", amount: 20 }),
			);

			const engine1 = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection()],
				bootCheck: "metadata-scan",
			});
			const firstBoot = await engine1.boot();
			expect(firstBoot.healed).toBe(true);
			expect(firstBoot.report?.added).toBe(2);
			engine1.destroy();

			// Second boot with same backend & clockSkewMs: must read 0 collection files
			const readFileSpy = vi.spyOn(backend, "readFile");
			const engine2 = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection()],
				bootCheck: "metadata-scan",
			});
			const secondBoot = await engine2.boot();
			expect(secondBoot).toEqual({ healed: false, report: null });
			expect(readFileSpy).not.toHaveBeenCalled();
			expect(engine2.getEntries("invoices")).toHaveLength(2);
			engine2.destroy();
		}
	});

	it("detects external add, edit, rename, and delete on metadata-scan boot", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2026/a.json",
			encodeJsonBytes({ id: "a", year: "2026", title: "A", amount: 1 }),
			1000,
		);
		await backend.injectExternalFile(
			"invoices/2026/b.json",
			encodeJsonBytes({ id: "b", year: "2026", title: "B", amount: 2 }),
			1000,
		);
		await backend.injectExternalFile(
			"invoices/2026/c.json",
			encodeJsonBytes({ id: "c", year: "2026", title: "C", amount: 3 }),
			1000,
		);

		const engine1 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});
		await engine1.boot();
		engine1.destroy();

		// External changes: edit b, rename c -> c-renamed, delete a, add d
		await backend.injectExternalFile(
			"invoices/2026/b.json",
			encodeJsonBytes({ id: "b", year: "2026", title: "B-edited", amount: 20 }),
			2000,
		);
		await backend.moveFile("invoices/2026/c.json", "invoices/2026/c-renamed.json");
		await backend.deleteFile("invoices/2026/a.json");
		await backend.injectExternalFile(
			"invoices/2026/d.json",
			encodeJsonBytes({ id: "d", year: "2026", title: "D", amount: 4 }),
			2000,
		);

		const engine2 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			bootCheck: "metadata-scan",
		});
		const bootRes = await engine2.boot();
		expect(bootRes.healed).toBe(true);
		expect(bootRes.report).toMatchObject({
			mode: "incremental",
			added: 2, // c-renamed + d
			updated: 1, // b
			removed: 2, // a + c
			unchanged: 0,
		});
		expect(
			engine2
				.getEntries<InvoiceDoc>("invoices")
				.map((e) => e.data.id)
				.toSorted((a, b) => a.localeCompare(b)),
		).toEqual(["b", "c", "d"]);
		engine2.destroy();
	});

	it("emits SyncProgress, skips unchanged files on incremental heal, and honors AbortSignal", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2026/1.json",
			encodeJsonBytes({ id: "1", year: "2026", title: "One", amount: 1 }),
			1000,
		);
		await backend.injectExternalFile(
			"invoices/2026/2.json",
			encodeJsonBytes({ id: "2", year: "2026", title: "Two", amount: 2 }),
			1000,
		);

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});
		await engine.heal({ mode: "full" });

		// Add 1 new file, leave 1 & 2 unchanged
		await backend.injectExternalFile(
			"invoices/2026/3.json",
			encodeJsonBytes({ id: "3", year: "2026", title: "Three", amount: 3 }),
			2000,
		);

		const readFileSpy = vi.spyOn(backend, "readFile");
		const progressEvents: SyncProgress[] = [];
		const report = await engine.heal({
			mode: "incremental",
			onProgress: (p) => {
				progressEvents.push(p);
			},
		});

		expect(report).toMatchObject({ added: 1, unchanged: 2, updated: 0, removed: 0 });
		expect(readFileSpy).toHaveBeenCalledTimes(1);
		expect(readFileSpy).toHaveBeenCalledWith("invoices/2026/3.json");
		expect(progressEvents.some((p) => p.phase === "scanning")).toBe(true);
		expect(progressEvents.some((p) => p.phase === "indexing" && p.processed === 3)).toBe(true);
		expect(progressEvents.some((p) => p.phase === "flushing")).toBe(true);

		// AbortSignal already aborted
		const controller = new AbortController();
		controller.abort("cancelled");
		await expectFsErrorCode(() => engine.heal({ signal: controller.signal }), "ABORTED");
		engine.destroy();
	});

	it("isolates corrupt/schema-invalid files during heal and clears failures once fixed or deleted", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2026/valid.json",
			encodeJsonBytes({ id: "valid", year: "2026", title: "Valid", amount: 100 }),
			1000,
		);
		await backend.injectExternalFile(
			"invoices/2026/corrupt.json",
			new TextEncoder().encode("{broken json"),
			1000,
		);
		await backend.injectExternalFile(
			"invoices/2026/bad-schema.json",
			encodeJsonBytes({ id: "bad", year: "2026", title: "Missing amount" }),
			1000,
		);

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});

		const report1 = await engine.heal({ mode: "incremental" });
		expect(report1.added).toBe(1);
		expect(report1.failures).toHaveLength(2);
		expect(
			engine
				.getCorruptEntries()
				.map((f) => f.path)
				.toSorted((a, b) => a.localeCompare(b)),
		).toEqual([
			"invoices/2026/bad-schema.json",
			"invoices/2026/corrupt.json",
		]);
		expect(engine.getEntries("invoices")).toHaveLength(1);

		// Fix corrupt.json and delete bad-schema.json
		await backend.injectExternalFile(
			"invoices/2026/corrupt.json",
			encodeJsonBytes({ id: "corrupt", year: "2026", title: "Fixed", amount: 55 }),
			2000,
		);
		await backend.deleteFile("invoices/2026/bad-schema.json");

		const report2 = await engine.heal({ mode: "incremental" });
		expect(report2.added).toBe(1);
		expect(report2.failures).toEqual([]);
		expect(engine.getCorruptEntries()).toEqual([]);
		expect(engine.getEntries("invoices")).toHaveLength(2);
		engine.destroy();
	});

	it("recovers automatically when _cs-fs/meta.json or _cs-fs/index/ shards are corrupt or deleted", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2025/a.json",
			encodeJsonBytes({ id: "a", year: "2025", title: "A", amount: 1 }),
		);
		await backend.injectExternalFile(
			"invoices/2026/b.json",
			encodeJsonBytes({ id: "b", year: "2026", title: "B", amount: 2 }),
		);

		const engine1 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});
		await engine1.boot();
		engine1.destroy();

		// Corrupt meta.json and delete 2026 shard
		await backend.writeBytes("_cs-fs/meta.json", new TextEncoder().encode("{not valid meta"));
		await backend.deleteFile("_cs-fs/index/invoices/2026.json");

		const engine2 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			bootCheck: "metadata-scan",
		});
		const recover1 = await engine2.boot();
		expect(recover1.healed).toBe(true);
		expect(engine2.getEntries("invoices")).toHaveLength(2);
		engine2.destroy();

		// Corrupt only one shard while meta.json remains intact
		await backend.writeBytes(
			"_cs-fs/index/invoices/2025.json",
			new TextEncoder().encode('[{"bad":true}]'),
		);

		const engine3 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			bootCheck: "metadata-scan",
		});
		const recover2 = await engine3.boot();
		expect(recover2.healed).toBe(true);
		expect(engine3.getEntries("invoices")).toHaveLength(2);
		engine3.destroy();
	});

	it("tracks companionStatus ('present', 'missing', 'orphaned') and ignores OS/system/custom files", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		// Primary with companion, primary without companion, orphaned companion, plus ignored files
		await backend.injectExternalFile(
			"invoices/2026/with-pdf.json",
			encodeJsonBytes({ id: "with-pdf", year: "2026", title: "With PDF", amount: 10 }),
			1000,
		);
		await backend.injectExternalFile("invoices/2026/with-pdf.pdf", new Uint8Array([1, 2, 3]), 1000);
		await backend.injectExternalFile(
			"invoices/2026/no-pdf.json",
			encodeJsonBytes({ id: "no-pdf", year: "2026", title: "No PDF", amount: 20 }),
			1000,
		);
		await backend.injectExternalFile("invoices/2026/orphan.pdf", new Uint8Array([4, 5]), 1000);

		// Unconditionally ignored + custom ignored files
		await backend.injectExternalFile("_cs-fs/stray.json", new TextEncoder().encode("{bad"));
		await backend.injectExternalFile("invoices/2026/Thumbs.db", new Uint8Array([0]));
		await backend.injectExternalFile("invoices/2026/desktop.ini", new Uint8Array([0]));
		await backend.injectExternalFile("invoices/2026/.DS_Store", new Uint8Array([0]));
		await backend.injectExternalFile("invoices/2026/~$temp.json", new TextEncoder().encode("{bad"));
		await backend.injectExternalFile("invoices/2026/skip-me.json", new TextEncoder().encode("{bad"));

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection({ withCompanion: true })],
			ignore: ["skip-me.json"],
		});

		const report = await engine.heal({ mode: "incremental" });
		expect(report.added).toBe(2);
		expect(report.failures).toEqual([]);
		expect(report.orphanedCompanions).toEqual([
			{ collection: "invoices", path: "invoices/2026/orphan.pdf" },
		]);
		expect(engine.getEntry("invoices", "invoices/2026/with-pdf.json")?.companionStatus).toBe(
			"present",
		);
		expect(engine.getEntry("invoices", "invoices/2026/no-pdf.json")?.companionStatus).toBe(
			"missing",
		);

		// Add missing companion -> incremental heal updates companionStatus without re-parsing JSON
		await backend.injectExternalFile("invoices/2026/no-pdf.pdf", new Uint8Array([9]), 2000);
		const readFileSpy = vi.spyOn(backend, "readFile");
		const report2 = await engine.heal({ mode: "incremental" });
		expect(report2.unchanged).toBe(2);
		expect(readFileSpy).not.toHaveBeenCalled();
		expect(engine.getEntry("invoices", "invoices/2026/no-pdf.json")?.companionStatus).toBe(
			"present",
		);
		engine.destroy();
	});

	it("prunes stale/empty shard files on heal({ mode: 'full' }) when a partition's files are deleted externally", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2025/inv-1.json",
			encodeJsonBytes({ id: "inv-1", year: "2025", title: "Old", amount: 10 }),
			1000,
		);
		await backend.injectExternalFile(
			"invoices/2026/inv-2.json",
			encodeJsonBytes({ id: "inv-2", year: "2026", title: "New", amount: 20 }),
			1000,
		);

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});
		await engine.heal({ mode: "full" });
		expect(await backend.exists("_cs-fs/index/invoices/2025.json")).toBe(true);
		expect(await backend.exists("_cs-fs/index/invoices/2026.json")).toBe(true);

		// Delete all files in 2025 partition externally, then full heal
		await backend.deleteFile("invoices/2025/inv-1.json");
		const report = await engine.heal({ mode: "full" });
		expect(report.added).toBe(1);
		expect(await backend.exists("_cs-fs/index/invoices/2025.json")).toBe(false);
		expect(await backend.exists("_cs-fs/index/invoices/2026.json")).toBe(true);
		expect(engine.loadedPartitions("invoices")).toEqual(["2026"]);
		expect(engine.getEntries("invoices")).toHaveLength(1);
		engine.destroy();
	});

	it("skips loading meta.json/shards and does not scan disk when bootCheck is 'none'", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2026/inv-1.json",
			encodeJsonBytes({ id: "inv-1", year: "2026", title: "One", amount: 10 }),
		);

		const seedEngine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});
		await seedEngine.heal({ mode: "full" });
		seedEngine.destroy();

		const readBytesSpy = vi.spyOn(backend, "readBytes");
		const walkSpy = vi.spyOn(backend, "walkFiles");

		const noneEngine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			bootCheck: "none",
		});
		const bootRes = await noneEngine.boot();
		expect(bootRes).toEqual({ healed: false, report: null });
		expect(readBytesSpy).not.toHaveBeenCalled();
		expect(walkSpy).not.toHaveBeenCalled();
		expect(noneEngine.getEntries("invoices")).toEqual([]);
		noneEngine.destroy();
	});

	it("removes stale index entry and records failure when a previously valid cached file becomes corrupt", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2026/inv-1.json",
			encodeJsonBytes({ id: "inv-1", year: "2026", title: "Valid", amount: 100 }),
			1000,
		);

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});
		await engine.heal({ mode: "incremental" });
		expect(engine.getEntry("invoices", "invoices/2026/inv-1.json")).toBeDefined();

		// Corrupt the file externally
		await backend.injectExternalFile(
			"invoices/2026/inv-1.json",
			new TextEncoder().encode("{corrupt"),
			2000,
		);

		const report = await engine.heal({ mode: "incremental" });
		expect(report.failures).toHaveLength(1);
		expect(report.failures[0]?.path).toBe("invoices/2026/inv-1.json");
		expect(engine.getCorruptEntries()).toHaveLength(1);
		expect(engine.getEntry("invoices", "invoices/2026/inv-1.json")).toBeUndefined();
		expect(engine.getEntries("invoices")).toEqual([]);
		engine.destroy();
	});

	it("detects externally added or deleted companion files on metadata-scan boot and updates companionStatus", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		await backend.injectExternalFile(
			"invoices/2026/inv-1.json",
			encodeJsonBytes({ id: "inv-1", year: "2026", title: "With Companion", amount: 50 }),
			1000,
		);

		const engine1 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection({ withCompanion: true })],
			bootCheck: "metadata-scan",
		});
		const boot1 = await engine1.boot();
		expect(boot1.healed).toBe(true);
		expect(engine1.getEntry("invoices", "invoices/2026/inv-1.json")?.companionStatus).toBe(
			"missing",
		);
		engine1.destroy();

		// Externally add companion PDF -> metadata-scan boot must detect drift and heal
		await backend.injectExternalFile("invoices/2026/inv-1.pdf", new Uint8Array([1, 2, 3]), 2000);
		const engine2 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection({ withCompanion: true })],
			bootCheck: "metadata-scan",
		});
		const boot2 = await engine2.boot();
		expect(boot2.healed).toBe(true);
		expect(engine2.getEntry("invoices", "invoices/2026/inv-1.json")?.companionStatus).toBe(
			"present",
		);
		engine2.destroy();

		// Externally delete companion PDF -> metadata-scan boot must detect drift and heal back to missing
		await backend.deleteFile("invoices/2026/inv-1.pdf");
		const engine3 = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection({ withCompanion: true })],
			bootCheck: "metadata-scan",
		});
		const boot3 = await engine3.boot();
		expect(boot3.healed).toBe(true);
		expect(engine3.getEntry("invoices", "invoices/2026/inv-1.json")?.companionStatus).toBe(
			"missing",
		);
		engine3.destroy();
	});
});

describe("cache-engine: scale test (1,050 files across nested folders)", () => {
	it("heals 1,050 nested files, boots in metadata-scan with 0 body reads, and boots in cache-only mode", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		const nestedTemplate = createPathTemplate("records/{year}/{category}/{id}.json");
		const scaleCollection: CacheCollectionConfig<unknown, unknown> = {
			name: "records",
			template: nestedTemplate,
			adapter: jsonAdapter<{ id: string; year: string; category: string; seq: number }>(),
			index: {
				partitionBy: (params) => params.year ?? "default",
				eagerPartitions: (key) => key === "2026",
			},
		};

		const years = ["2022", "2023", "2024", "2025", "2026"];
		const categories = ["alpha", "beta", "gamma"];
		let seq = 0;
		for (const year of years) {
			for (const category of categories) {
				for (let i = 0; i < 70; i += 1) {
					seq += 1;
					const id = `rec-${seq}`;
					await backend.injectExternalFile(
						`records/${year}/${category}/${id}.json`,
						encodeJsonBytes({ id, year, category, seq }),
						10_000 + seq,
					);
				}
			}
		}
		expect(seq).toBe(1050);

		const engine1 = new CacheEngine({
			backend,
			writeQueue,
			collections: [scaleCollection],
		});
		const initialHeal = await engine1.heal({ mode: "incremental" });
		expect(initialHeal.added).toBe(1050);
		expect(initialHeal.failures).toEqual([]);
		expect(engine1.getEntries("records")).toHaveLength(1050);
		engine1.destroy();

		// Fresh boot with metadata-scan: 0 file body reads
		const readFileSpy = vi.spyOn(backend, "readFile");
		const engine2 = new CacheEngine({
			backend,
			writeQueue,
			collections: [scaleCollection],
			bootCheck: "metadata-scan",
		});
		const metaBoot = await engine2.boot();
		expect(metaBoot).toEqual({ healed: false, report: null });
		expect(readFileSpy).not.toHaveBeenCalled();
		expect(engine2.loadedPartitions("records")).toEqual(["2026"]);
		expect(engine2.unloadedPartitions("records")).toEqual(["2022", "2023", "2024", "2025"]);
		expect(engine2.getEntries("records")).toHaveLength(210);
		engine2.destroy();

		// Fresh boot with cache-only: 0 walkFiles calls, fast eager partition load
		const walkSpy = vi.spyOn(backend, "walkFiles");
		const engine3 = new CacheEngine({
			backend,
			writeQueue,
			collections: [scaleCollection],
			bootCheck: "cache-only",
		});
		const cacheBoot = await engine3.boot();
		expect(cacheBoot).toEqual({ healed: false, report: null });
		expect(walkSpy).not.toHaveBeenCalled();
		expect(engine3.getEntries("records")).toHaveLength(210);
		await engine3.loadAllPartitions("records");
		expect(engine3.getEntries("records")).toHaveLength(1050);
		engine3.destroy();
	});
});

describe("cache-engine: hardenings (dirty generations, heal/flush serialization, error surfacing & partition guards)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("preserves dirty state on transient write failure during flush() and persists on retry", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 5000,
		});

		const doc: InvoiceDoc = { id: "inv-1", year: "2026", title: "Retryable", amount: 150 };
		await engine.upsertEntry(
			"invoices",
			"invoices/2026/inv-1.json",
			{ year: "2026", id: "inv-1" },
			{ size: 42, lastModified: 1000 },
			doc,
		);

		const origWriteBytes = backend.writeBytes.bind(backend);
		let failOnce = true;
		vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, options) => {
			if (failOnce && path === "_cs-fs/index/invoices/2026.json") {
				failOnce = false;
				throw new FsError("IO_FAILED", "Transient disk error");
			}
			return origWriteBytes(path, bytes, options);
		});

		await expectFsErrorCode(() => engine.flush(), "IO_FAILED");

		// Second flush must still see dirty shard + meta and write both cleanly.
		await engine.flush();

		const shardRead = await backend.readBytes("_cs-fs/index/invoices/2026.json");
		const shardEntries = JSON.parse(new TextDecoder().decode(shardRead.bytes)) as Array<{
			path: string;
			data: InvoiceDoc;
		}>;
		expect(shardEntries).toHaveLength(1);
		expect(shardEntries[0]?.data).toEqual(doc);

		const metaRead = await backend.readBytes("_cs-fs/meta.json");
		const meta = JSON.parse(new TextDecoder().decode(metaRead.bytes)) as {
			collections: Record<string, { partitions: Record<string, { count: number }> }>;
		};
		expect(meta.collections.invoices?.partitions["2026"]?.count).toBe(1);
		engine.destroy();
	});

	it("keeps shard dirty when concurrent upsertEntry() occurs mid-write during flush()", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 5000,
		});

		const doc1: InvoiceDoc = { id: "inv-1", year: "2026", title: "First", amount: 100 };
		const doc2: InvoiceDoc = { id: "inv-2", year: "2026", title: "Second", amount: 200 };

		await engine.upsertEntry(
			"invoices",
			"invoices/2026/inv-1.json",
			{ year: "2026", id: "inv-1" },
			{ size: 40, lastModified: 1000 },
			doc1,
		);

		const { promise: writeStarted, resolve: markWriteStarted } = Promise.withResolvers<void>();
		const { promise: firstWriteGate, resolve: releaseFirstWrite } = Promise.withResolvers<void>();

		const origWriteBytes = backend.writeBytes.bind(backend);
		const shardWritePayloads: number[] = [];
		let gatedFirst = true;

		vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, options) => {
			if (path === "_cs-fs/index/invoices/2026.json") {
				const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown[];
				shardWritePayloads.push(parsed.length);
				if (gatedFirst) {
					gatedFirst = false;
					markWriteStarted();
					await firstWriteGate;
				}
			}
			return origWriteBytes(path, bytes, options);
		});

		const flushPromise = engine.flush();
		await writeStarted;

		// Mutate the same shard while its first write is in-flight.
		await engine.upsertEntry(
			"invoices",
			"invoices/2026/inv-2.json",
			{ year: "2026", id: "inv-2" },
			{ size: 50, lastModified: 2000 },
			doc2,
		);

		releaseFirstWrite();
		await flushPromise;
		// Explicit follow-up flush (no-op if loop already drained, or flushes if still dirty).
		await engine.flush();

		expect(shardWritePayloads).toEqual([1, 2]);
		const shardRead = await backend.readBytes("_cs-fs/index/invoices/2026.json");
		const shardEntries = JSON.parse(new TextDecoder().decode(shardRead.bytes)) as Array<{
			data: InvoiceDoc;
		}>;
		expect(shardEntries.map((e) => e.data.id).toSorted((a, b) => a.localeCompare(b))).toEqual([
			"inv-1",
			"inv-2",
		]);
		engine.destroy();
	});

	it("serializes heal({ mode: 'full' }) behind an in-flight #activeFlush so older flush cannot overwrite healed index", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		const diskDoc: InvoiceDoc = { id: "inv-disk", year: "2026", title: "OnDisk", amount: 500 };
		await backend.injectExternalFile("invoices/2026/inv-disk.json", encodeJsonBytes(diskDoc));

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 5000,
		});

		const staleMemDoc: InvoiceDoc = {
			id: "inv-stale",
			year: "2026",
			title: "StaleMem",
			amount: 10,
		};
		await engine.upsertEntry(
			"invoices",
			"invoices/2026/inv-stale.json",
			{ year: "2026", id: "inv-stale" },
			{ size: 30, lastModified: 500 },
			staleMemDoc,
		);

		const { promise: flushWriteStarted, resolve: markFlushWriteStarted } =
			Promise.withResolvers<void>();
		const { promise: flushWriteGate, resolve: releaseFlushWrite } = Promise.withResolvers<void>();

		const origWriteBytes = backend.writeBytes.bind(backend);
		let gated = true;
		vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, options) => {
			if (gated && path === "_cs-fs/index/invoices/2026.json") {
				gated = false;
				markFlushWriteStarted();
				await flushWriteGate;
			}
			return origWriteBytes(path, bytes, options);
		});

		const walkSpy = vi.spyOn(backend, "walkFiles");

		const flushPromise = engine.flush();
		await flushWriteStarted;

		// Trigger full heal while flush() is mid-flight.
		const healPromise = engine.heal({ mode: "full" });
		await Promise.resolve();
		await Promise.resolve();
		expect(walkSpy).not.toHaveBeenCalled();

		releaseFlushWrite();
		const [, healReport] = await Promise.all([flushPromise, healPromise]);

		expect(walkSpy).toHaveBeenCalledTimes(1);
		expect(healReport.added).toBe(1);
		expect(engine.getEntries<InvoiceDoc>("invoices").map((e) => e.data.id)).toEqual(["inv-disk"]);

		const shardRead = await backend.readBytes("_cs-fs/index/invoices/2026.json");
		const shardEntries = JSON.parse(new TextDecoder().decode(shardRead.bytes)) as Array<{
			data: InvoiceDoc;
		}>;
		expect(shardEntries.map((e) => e.data.id)).toEqual(["inv-disk"]);
		engine.destroy();
	});

	it("surfaces HANDLE_STALE and PERMISSION_DENIED from meta.json and eager shards on cache-only boot", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		const doc: InvoiceDoc = { id: "inv-1", year: "2026", title: "Seed", amount: 100 };
		await backend.injectExternalFile("invoices/2026/inv-1.json", encodeJsonBytes(doc));

		const seedEngine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
		});
		await seedEngine.heal({ mode: "full" });
		seedEngine.destroy();

		const origReadBytes = backend.readBytes.bind(backend);
		const errorCodes: Array<"HANDLE_STALE" | "PERMISSION_DENIED"> = [
			"HANDLE_STALE",
			"PERMISSION_DENIED",
		];

		for (const code of errorCodes) {
			vi.spyOn(backend, "readBytes").mockImplementation(async (path) => {
				if (path === "_cs-fs/meta.json") {
					throw new FsError(code, `Simulated ${code} on meta.json`);
				}
				return origReadBytes(path);
			});

			const metaErrEngine = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
				bootCheck: "cache-only",
			});
			await expectFsErrorCode(() => metaErrEngine.boot(), code);
			metaErrEngine.destroy();
			vi.restoreAllMocks();

			vi.spyOn(backend, "readBytes").mockImplementation(async (path) => {
				if (path === "_cs-fs/index/invoices/2026.json") {
					throw new FsError(code, `Simulated ${code} on eager shard`);
				}
				return origReadBytes(path);
			});

			const shardErrEngine = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
				bootCheck: "cache-only",
			});
			await expectFsErrorCode(() => shardErrEngine.boot(), code);
			shardErrEngine.destroy();
			vi.restoreAllMocks();
		}
	});

	it("validates loadPartitions() keys, skips unknown partitions cleanly, and prunes orphan shards when meta.json is missing", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		const doc: InvoiceDoc = { id: "inv-1", year: "2026", title: "Valid", amount: 100 };
		await backend.injectExternalFile("invoices/2026/inv-1.json", encodeJsonBytes(doc));

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
		});
		await engine.heal({ mode: "full" });

		// 1. Invalid partition key throws INVALID_PATH
		await expectFsErrorCode(() => engine.loadPartitions("invoices", ["../../evil"]), "INVALID_PATH");

		// 2. Unknown partition key not in manifest.partitions skips cleanly without phantom shards or disk reads
		const readSpy = vi.spyOn(backend, "readBytes");
		await engine.loadPartitions("invoices", ["1999"]);
		expect(readSpy).not.toHaveBeenCalled();
		expect(engine.loadedPartitions("invoices")).toEqual(["2026"]);
		expect(engine.unloadedPartitions("invoices")).toEqual([]);
		engine.destroy();

		// 3. Delete meta.json while an orphaned shard exists on disk, then heal({ mode: "full" })
		await backend.writeBytes(
			"_cs-fs/index/invoices/orphan.json",
			encodeJsonBytes([{ path: "invoices/orphan/x.json" }]),
		);
		await backend.deleteFile("_cs-fs/meta.json");

		const healEngine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
		});
		const report = await healEngine.heal({ mode: "full" });
		expect(report.added).toBe(1);

		await expectFsErrorCode(
			() => backend.readBytes("_cs-fs/index/invoices/orphan.json"),
			"NOT_FOUND",
		);
		const metaRead = await backend.readBytes("_cs-fs/meta.json");
		expect(JSON.parse(new TextDecoder().decode(metaRead.bytes)).formatVersion).toBe(1);
		healEngine.destroy();
	});

	it("absorbs failing background scheduled flush (indexFlushMs: 0) with zero unhandled rejections and retries cleanly on flush()", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 0,
		});

		const origWriteBytes = backend.writeBytes.bind(backend);
		const { promise: failedOnce, resolve: markFailedOnce } = Promise.withResolvers<void>();
		let failOnce = true;

		vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, options) => {
			if (failOnce && path === "_cs-fs/index/invoices/2026.json") {
				failOnce = false;
				markFailedOnce();
				throw new FsError("IO_FAILED", "Background flush failure");
			}
			return origWriteBytes(path, bytes, options);
		});

		const doc: InvoiceDoc = { id: "inv-bg", year: "2026", title: "Background", amount: 300 };
		await engine.upsertEntry(
			"invoices",
			"invoices/2026/inv-bg.json",
			{ year: "2026", id: "inv-bg" },
			{ size: 42, lastModified: 1000 },
			doc,
		);

		await failedOnce;
		// Allow #triggerScheduledFlush() catch/finally to settle with zero unhandled rejections.
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Explicit flush() must retry and persist the still-dirty shard + meta.json.
		await engine.flush();

		const shardRead = await backend.readBytes("_cs-fs/index/invoices/2026.json");
		const shardEntries = JSON.parse(new TextDecoder().decode(shardRead.bytes)) as Array<{
			data: InvoiceDoc;
		}>;
		expect(shardEntries.map((e) => e.data.id)).toEqual(["inv-bg"]);

		const metaRead = await backend.readBytes("_cs-fs/meta.json");
		expect(JSON.parse(new TextDecoder().decode(metaRead.bytes)).formatVersion).toBe(1);
		engine.destroy();
	});

	it("preserves dirty state when concurrent removeEntry() occurs mid-write during flush() and prunes shard on next flush", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 5000,
		});

		const doc: InvoiceDoc = { id: "inv-1", year: "2026", title: "ToRemove", amount: 120 };
		await engine.upsertEntry(
			"invoices",
			"invoices/2026/inv-1.json",
			{ year: "2026", id: "inv-1" },
			{ size: 40, lastModified: 1000 },
			doc,
		);

		const { promise: writeStarted, resolve: markWriteStarted } = Promise.withResolvers<void>();
		const { promise: firstWriteGate, resolve: releaseFirstWrite } = Promise.withResolvers<void>();

		const origWriteBytes = backend.writeBytes.bind(backend);
		let gatedFirst = true;
		vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, options) => {
			if (gatedFirst && path === "_cs-fs/index/invoices/2026.json") {
				gatedFirst = false;
				markWriteStarted();
				await firstWriteGate;
			}
			return origWriteBytes(path, bytes, options);
		});

		const flushPromise = engine.flush();
		await writeStarted;

		await engine.removeEntry("invoices", "invoices/2026/inv-1.json");

		releaseFirstWrite();
		await flushPromise;
		await engine.flush();

		await expectFsErrorCode(
			() => backend.readBytes("_cs-fs/index/invoices/2026.json"),
			"NOT_FOUND",
		);
		const metaRead = await backend.readBytes("_cs-fs/meta.json");
		const meta = JSON.parse(new TextDecoder().decode(metaRead.bytes)) as {
			collections: Record<string, { partitions: Record<string, unknown> }>;
		};
		expect(meta.collections.invoices?.partitions["2026"]).toBeUndefined();
		engine.destroy();
	});

	it("serializes flush() behind #activeHeal and serializes concurrent heal() calls cleanly", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		const diskDoc: InvoiceDoc = { id: "inv-disk", year: "2026", title: "OnDisk", amount: 500 };
		await backend.injectExternalFile("invoices/2026/inv-disk.json", encodeJsonBytes(diskDoc));

		const engine = new CacheEngine({
			backend,
			writeQueue,
			collections: [makeInvoiceCollection()],
			indexFlushMs: 5000,
		});

		const { promise: walkStarted, resolve: markWalkStarted } = Promise.withResolvers<void>();
		const { promise: walkGate, resolve: releaseWalk } = Promise.withResolvers<void>();

		const origWalkFiles = backend.walkFiles.bind(backend);
		let gatedFirstWalk = true;
		const walkSpy = vi.spyOn(backend, "walkFiles").mockImplementation(async (dir, options) => {
			if (gatedFirstWalk) {
				gatedFirstWalk = false;
				markWalkStarted();
				await walkGate;
			}
			return origWalkFiles(dir, options);
		});

		const heal1 = engine.heal({ mode: "full" });
		await walkStarted;

		// Queue a concurrent heal() and flush() while heal1 is in-flight.
		const heal2 = engine.heal({ mode: "full" });
		let flushResolved = false;
		const flushPromise = (async () => {
			await engine.flush();
			flushResolved = true;
		})();

		await Promise.resolve();
		await Promise.resolve();
		expect(walkSpy).toHaveBeenCalledTimes(1);
		expect(flushResolved).toBe(false);

		releaseWalk();
		const [report1, report2] = await Promise.all([heal1, heal2, flushPromise]);

		expect(walkSpy).toHaveBeenCalledTimes(2);
		expect(flushResolved).toBe(true);
		expect(report1.added).toBe(1);
		expect(report2.added).toBe(1);
		expect(engine.getEntries<InvoiceDoc>("invoices").map((e) => e.data.id)).toEqual(["inv-disk"]);
		engine.destroy();
	});

	it("automatically runs incremental heal() when loadPartitions() encounters a missing or corrupt lazy shard on cache-only boot", async () => {
		const doc2025: InvoiceDoc = { id: "inv-1", year: "2025", title: "Lazy2025", amount: 150 };
		const doc2026: InvoiceDoc = { id: "inv-2", year: "2026", title: "Eager2026", amount: 250 };

		// Case 1: missing shard file on disk
		{
			const backend = new MemoryFsBackend();
			const writeQueue = new WriteQueue(backend);
			await backend.injectExternalFile("invoices/2025/inv-1.json", encodeJsonBytes(doc2025));
			await backend.injectExternalFile("invoices/2026/inv-2.json", encodeJsonBytes(doc2026));

			const engine1 = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
				indexFlushMs: 0,
			});
			await engine1.heal({ mode: "full" });
			engine1.destroy();

			await backend.deleteFile("_cs-fs/index/invoices/2025.json");

			const engine2 = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
				bootCheck: "cache-only",
			});
			await engine2.boot();
			expect(engine2.getEntries<InvoiceDoc>("invoices").map((e) => e.data.id)).toEqual(["inv-2"]);

			const healSpy = vi.spyOn(engine2, "heal");
			await engine2.loadPartitions("invoices", ["2025"]);

			expect(healSpy).toHaveBeenCalledWith({ mode: "incremental" });
			expect(
				engine2
					.getEntries<InvoiceDoc>("invoices")
					.map((e) => e.data.id)
					.toSorted((a, b) => a.localeCompare(b)),
			).toEqual(["inv-1", "inv-2"]);
			engine2.destroy();
		}

		// Case 2: corrupt shard JSON on disk
		{
			const backend = new MemoryFsBackend();
			const writeQueue = new WriteQueue(backend);
			await backend.injectExternalFile("invoices/2025/inv-1.json", encodeJsonBytes(doc2025));
			await backend.injectExternalFile("invoices/2026/inv-2.json", encodeJsonBytes(doc2026));

			const engine1 = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
				indexFlushMs: 0,
			});
			await engine1.heal({ mode: "full" });
			engine1.destroy();

			await backend.injectExternalFile(
				"_cs-fs/index/invoices/2025.json",
				new TextEncoder().encode("{corrupt-json"),
			);

			const engine2 = new CacheEngine({
				backend,
				writeQueue,
				collections: [makeInvoiceCollection({ eagerYears: ["2026"] })],
				bootCheck: "cache-only",
			});
			await engine2.boot();
			expect(engine2.getEntries<InvoiceDoc>("invoices").map((e) => e.data.id)).toEqual(["inv-2"]);

			const healSpy = vi.spyOn(engine2, "heal");
			await engine2.loadPartitions("invoices", ["2025"]);

			expect(healSpy).toHaveBeenCalledWith({ mode: "incremental" });
			expect(
				engine2
					.getEntries<InvoiceDoc>("invoices")
					.map((e) => e.data.id)
					.toSorted((a, b) => a.localeCompare(b)),
			).toEqual(["inv-1", "inv-2"]);
			engine2.destroy();
		}
	});
});
