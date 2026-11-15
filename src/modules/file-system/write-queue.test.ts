import { afterEach, describe, expect, it, vi } from "vitest";
import { FsError, isFsError } from "./errors.ts";
import { mapDomError, sha256Hex, type FsBackend, type FsWriteOptions } from "./fs-backend.internal.ts";
import { MemoryFsBackend } from "./memory-fs.internal.ts";
import { WriteQueue } from "./write-queue.internal.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(text: string): Uint8Array {
	return encoder.encode(text);
}

function decode(bytes: Uint8Array): string {
	return decoder.decode(bytes);
}

async function readText(backend: MemoryFsBackend, path: string): Promise<string> {
	const { bytes } = await backend.readBytes(path);
	return decode(bytes);
}

async function expectFsError(
	promise: Promise<unknown>,
	expectedCode: FsError["code"],
): Promise<FsError> {
	try {
		await promise;
	} catch (error) {
		expect(isFsError(error)).toBe(true);
		if (isFsError(error)) {
			expect(error.code).toBe(expectedCode);
			return error;
		}
	}
	throw new Error(`Expected FsError("${expectedCode}")`);
}

describe("write-queue: concurrency & barriers", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("uses navigator.locks with expected lock names by default and falls back when absent", async () => {
		const acquiredLocks: string[] = [];
		const requestMock = vi.fn(
			async (name: string, callback: () => Promise<unknown>): Promise<unknown> => {
				acquiredLocks.push(name);
				return callback();
			},
		);

		vi.stubGlobal("navigator", {
			locks: { request: requestMock },
		});

		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, { lockPrefix: "app-fs" });

		await queue.write("docs/readme.md", encode("hello"));
		await queue.withGlobalBarrier(async () => "synced");

		expect(acquiredLocks).toEqual(["app-fs:path:docs/readme.md", "app-fs:global-barrier"]);

		// Falls back cleanly when navigator.locks is absent
		vi.stubGlobal("navigator", {});
		const fallbackRev = await queue.write("docs/readme.md", encode("hello-2"));
		expect(fallbackRev.size).toBe(7);
	});

	it("drains all pending tasks when flush() is called", async () => {
		const backend = new MemoryFsBackend();
		const gate = Promise.withResolvers<void>();
		const gatedBackend: FsBackend = {
			readBytes: (p, o) => backend.readBytes(p, o),
			readFile: (p, o) => backend.readFile(p, o),
			stat: (p) => backend.stat(p),
			deleteFile: (p) => backend.deleteFile(p),
			moveFile: (f, t) => backend.moveFile(f, t),
			exists: (p) => backend.exists(p),
			listDir: (d) => backend.listDir(d),
			walkFiles: (d, o) => backend.walkFiles(d, o),
			ensureDir: (d) => backend.ensureDir(d),
			removeDir: (d, o) => backend.removeDir(d, o),
			async writeBytes(path: string, bytes: Uint8Array, options?: FsWriteOptions) {
				await gate.promise;
				return backend.writeBytes(path, bytes, options);
			},
		};

		const queue = new WriteQueue(gatedBackend, { useWebLocks: false });
		let flushed = false;
		const p1 = queue.write("one.txt", encode("1"));
		const p2 = queue.write("two.txt", encode("2"));
		const flushPromise = (async (): Promise<void> => {
			await queue.flush();
			flushed = true;
		})();

		await Promise.resolve();
		await Promise.resolve();
		expect(flushed).toBe(false);

		gate.resolve();
		await Promise.all([p1, p2, flushPromise]);
		expect(flushed).toBe(true);
		expect(await readText(backend, "one.txt")).toBe("1");
		expect(await readText(backend, "two.txt")).toBe("2");
	});

	it("flush() waits for writes queued during an active global barrier to complete after barrier release", async () => {
		const backend = new MemoryFsBackend();
		const writeGate = Promise.withResolvers<void>();
		const gatedBackend: FsBackend = {
			readBytes: (p, o) => backend.readBytes(p, o),
			readFile: (p, o) => backend.readFile(p, o),
			stat: (p) => backend.stat(p),
			deleteFile: (p) => backend.deleteFile(p),
			moveFile: (f, t) => backend.moveFile(f, t),
			exists: (p) => backend.exists(p),
			listDir: (d) => backend.listDir(d),
			walkFiles: (d, o) => backend.walkFiles(d, o),
			ensureDir: (d) => backend.ensureDir(d),
			removeDir: (d, o) => backend.removeDir(d, o),
			async writeBytes(path: string, bytes: Uint8Array, options?: FsWriteOptions) {
				await writeGate.promise;
				return backend.writeBytes(path, bytes, options);
			},
		};
		const queue = new WriteQueue(gatedBackend, { useWebLocks: false });

		const barrierEntered = Promise.withResolvers<void>();
		const barrierGate = Promise.withResolvers<void>();
		const barrierPromise = queue.withGlobalBarrier(async () => {
			barrierEntered.resolve();
			await barrierGate.promise;
		});
		await barrierEntered.promise;

		const writePromise = queue.write("queued.txt", encode("after-barrier"));
		let flushResolved = false;
		const flushPromise = (async () => {
			await queue.flush();
			flushResolved = true;
		})();

		barrierGate.resolve();
		await barrierPromise;
		await Promise.resolve();
		await Promise.resolve();
		expect(flushResolved).toBe(false);

		writeGate.resolve();
		await Promise.all([writePromise, flushPromise]);
		expect(flushResolved).toBe(true);
		expect(await readText(backend, "queued.txt")).toBe("after-barrier");
	});

	it("does not deadlock when move() overlaps with withGlobalBarrier() or opposing moves", async () => {
		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, { useWebLocks: false });

		await queue.write("a.txt", encode("alpha"));
		await queue.write("b.txt", encode("beta"));

		const barrierGate = Promise.withResolvers<void>();
		const barrierPromise = queue.withGlobalBarrier(async () => {
			await barrierGate.promise;
			return "barrier-done";
		});

		const moveDuringBarrier = queue.move("a.txt", "c.txt");
		await Promise.resolve();
		barrierGate.resolve();

		expect(await barrierPromise).toBe("barrier-done");
		await moveDuringBarrier;
		expect(await readText(backend, "c.txt")).toBe("alpha");

		// Opposing concurrent moves serialize deterministically without deadlocking
		await queue.write("a.txt", encode("alpha-2"));
		await Promise.all([queue.move("a.txt", "b.txt"), queue.move("b.txt", "a.txt")]);
		expect(await backend.exists("b.txt")).toBe(false);
		expect(await readText(backend, "a.txt")).toBe("alpha-2");
	});
	it("executes overlapping writes to the same path strictly in FIFO order and distinct paths concurrently", async () => {
		const backend = new MemoryFsBackend();
		const events: string[] = [];
		const gates = new Map<string, PromiseWithResolvers<void>>();

		const gatedBackend: FsBackend = {
			readBytes: (p, o) => backend.readBytes(p, o),
			readFile: (p, o) => backend.readFile(p, o),
			stat: (p) => backend.stat(p),
			deleteFile: (p) => backend.deleteFile(p),
			moveFile: (f, t) => backend.moveFile(f, t),
			exists: (p) => backend.exists(p),
			listDir: (d) => backend.listDir(d),
			walkFiles: (d, o) => backend.walkFiles(d, o),
			ensureDir: (d) => backend.ensureDir(d),
			removeDir: (d, o) => backend.removeDir(d, o),
			async writeBytes(path: string, bytes: Uint8Array, options?: FsWriteOptions) {
				const label = `${path}:${decode(bytes)}`;
				events.push(`start:${label}`);
				const gate = gates.get(label);
				if (gate) {
					await gate.promise;
				}
				const rev = await backend.writeBytes(path, bytes, options);
				events.push(`end:${label}`);
				return rev;
			},
		};

		const gateA1 = Promise.withResolvers<void>();
		const gateB1 = Promise.withResolvers<void>();
		gates.set("a.txt:1", gateA1);
		gates.set("b.txt:1", gateB1);

		const queue = new WriteQueue(gatedBackend, { useWebLocks: false });

		const pA1 = queue.write("a.txt", encode("1"));
		const pA2 = queue.write("a.txt", encode("2"));
		const pA3 = queue.write("a.txt", encode("3"));
		const pB1 = queue.write("b.txt", encode("1"));

		// Yield microtasks so both a.txt:1 and b.txt:1 start concurrently while a.txt:2 waits
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(events).toContain("start:a.txt:1");
		expect(events).toContain("start:b.txt:1");
		expect(events).not.toContain("start:a.txt:2");

		gateB1.resolve();
		await pB1;
		expect(events).toContain("end:b.txt:1");
		expect(events).not.toContain("start:a.txt:2");

		gateA1.resolve();
		await Promise.all([pA1, pA2, pA3]);

		const aEvents = events.filter((e) => e.includes("a.txt:"));
		expect(aEvents).toEqual([
			"start:a.txt:1",
			"end:a.txt:1",
			"start:a.txt:2",
			"end:a.txt:2",
			"start:a.txt:3",
			"end:a.txt:3",
		]);
		expect(await readText(backend, "a.txt")).toBe("3");
	});

	it("withGlobalBarrier drains active queues and blocks new operations until complete", async () => {
		const backend = new MemoryFsBackend();
		const events: string[] = [];
		const writeGate = Promise.withResolvers<void>();
		const barrierGate = Promise.withResolvers<void>();

		const gatedBackend: FsBackend = {
			readBytes: (p, o) => backend.readBytes(p, o),
			readFile: (p, o) => backend.readFile(p, o),
			stat: (p) => backend.stat(p),
			deleteFile: (p) => backend.deleteFile(p),
			moveFile: (f, t) => backend.moveFile(f, t),
			exists: (p) => backend.exists(p),
			listDir: (d) => backend.listDir(d),
			walkFiles: (d, o) => backend.walkFiles(d, o),
			ensureDir: (d) => backend.ensureDir(d),
			removeDir: (d, o) => backend.removeDir(d, o),
			async writeBytes(path: string, bytes: Uint8Array, options?: FsWriteOptions) {
				const tag = decode(bytes);
				events.push(`write-start:${tag}`);
				if (tag === "before") {
					await writeGate.promise;
				}
				const rev = await backend.writeBytes(path, bytes, options);
				events.push(`write-end:${tag}`);
				return rev;
			},
		};

		const queue = new WriteQueue(gatedBackend, { useWebLocks: false });

		const pBefore = queue.write("doc.txt", encode("before"));
		const pBarrier = queue.withGlobalBarrier(async () => {
			events.push("barrier-start");
			await barrierGate.promise;
			events.push("barrier-end");
			return "ok";
		});
		const pAfter = queue.write("other.txt", encode("after"));

		await Promise.resolve();
		await Promise.resolve();
		// Barrier waits for pBefore, and pAfter is blocked behind the barrier
		expect(events).toEqual(["write-start:before"]);

		writeGate.resolve();
		await pBefore;
		await Promise.resolve();
		await Promise.resolve();

		expect(events).toEqual(["write-start:before", "write-end:before", "barrier-start"]);

		barrierGate.resolve();
		const [barrierResult] = await Promise.all([pBarrier, pAfter]);
		expect(barrierResult).toBe("ok");
		expect(events).toEqual([
			"write-start:before",
			"write-end:before",
			"barrier-start",
			"barrier-end",
			"write-start:after",
			"write-end:after",
		]);
	});
});

describe("write-queue: atomicity, locks, and fault injection", () => {
	it("preserves prior valid file untouched when stream aborts mid-write", async () => {
		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, { useWebLocks: false });

		await queue.write("doc.json", encode('{"v":1}'));
		backend.simulateStreamAbort("doc.json", 1);

		await expectFsError(queue.write("doc.json", encode('{"v":2}')), "ABORTED");

		const onDisk = await backend.readBytes("doc.json");
		expect(decode(onDisk.bytes)).toBe('{"v":1}');

		// Subsequent write succeeds cleanly
		await queue.write("doc.json", encode('{"v":2}'));
		expect(await readText(backend, "doc.json")).toBe('{"v":2}');
	});

	it("retries transient FILE_LOCKED oplocks and surfaces persistent FILE_LOCKED", async () => {
		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, {
			useWebLocks: false,
			retryOnLock: { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 4 },
		});

		backend.simulateFileLocked("locked.txt", 2);
		const rev = await queue.write("locked.txt", encode("recovered"));
		expect(rev.size).toBe(9);
		expect(await readText(backend, "locked.txt")).toBe("recovered");

		// Persistent lock exceeds maxRetries
		backend.simulateFileLocked("locked.txt", 10);
		await expectFsError(queue.write("locked.txt", encode("fail")), "FILE_LOCKED");

		// Explicit retryOnLock: false does not retry even once
		backend.simulateFileLocked("locked.txt", 1);
		await expectFsError(
			queue.write("locked.txt", encode("no-retry"), { retryOnLock: false }),
			"FILE_LOCKED",
		);
	});

	it("never retries hard errors (CONFLICT, PERMISSION_DENIED, INVALID_PATH, HANDLE_STALE, FILE_TOO_LARGE)", async () => {
		const backend = new MemoryFsBackend({ maxFileBytes: 8 });
		const writeSpy = vi.spyOn(backend, "writeBytes");
		const queue = new WriteQueue(backend, {
			useWebLocks: false,
			retryOnLock: { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 4 },
		});

		// INVALID_PATH
		await expectFsError(queue.write("CON.txt", encode("x")), "INVALID_PATH");
		expect(writeSpy).toHaveBeenCalledTimes(0);

		// FILE_TOO_LARGE
		await expectFsError(queue.write("big.txt", encode("123456789")), "FILE_TOO_LARGE");
		expect(writeSpy).toHaveBeenCalledTimes(1);
		writeSpy.mockClear();

		// PERMISSION_DENIED
		backend.simulateError("perm.txt", "PERMISSION_DENIED", 3);
		await expectFsError(queue.write("perm.txt", encode("ok")), "PERMISSION_DENIED");
		expect(writeSpy).toHaveBeenCalledTimes(1);
		writeSpy.mockClear();

		// HANDLE_STALE
		backend.simulateError("stale.txt", "HANDLE_STALE", 3);
		await expectFsError(queue.write("stale.txt", encode("ok")), "HANDLE_STALE");
		expect(writeSpy).toHaveBeenCalledTimes(1);
		writeSpy.mockClear();

		// CONFLICT
		await backend.injectExternalFile("occ.txt", encode("ext"));
		await expectFsError(
			queue.write("occ.txt", encode("ok"), { expectedRevision: null }),
			"CONFLICT",
		);
		expect(writeSpy).toHaveBeenCalledTimes(0);
	});
});

describe("write-queue: OCC revisions, clock skew, move, verification, and backups", () => {
	it("enforces OCC expectedRevision across write, delete, and move against external mutations", async () => {
		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, { useWebLocks: false });

		// Create-if-absent succeeds once, then conflicts
		const rev1 = await queue.write("item.json", encode("v1"), { expectedRevision: null });
		const conflictCreate = await expectFsError(
			queue.write("item.json", encode("v2"), { expectedRevision: null }),
			"CONFLICT",
		);
		expect(conflictCreate.details?.remoteRevision).toEqual(rev1);

		// External mtime change with identical size triggers CONFLICT on write
		backend.setExternalMtime("item.json", rev1.lastModified + 5000);
		const conflictMtime = await expectFsError(
			queue.write("item.json", encode("v2"), { expectedRevision: rev1 }),
			"CONFLICT",
		);
		expect((conflictMtime.details?.remoteRevision as { lastModified: number }).lastModified).toBe(
			rev1.lastModified + 5000,
		);

		// External content replacement triggers CONFLICT on move
		const extRev = await backend.injectExternalFile("item.json", encode("external-v2"));
		await expectFsError(
			queue.move("item.json", "moved.json", { expectedRevision: rev1 }),
			"CONFLICT",
		);

		// Move with current revision succeeds, and old revision on delete after external delete conflicts
		const movedRev = await queue.move("item.json", "moved.json", { expectedRevision: extRev });
		backend.deleteExternalFile("moved.json");
		const conflictDel = await expectFsError(
			queue.delete("moved.json", { expectedRevision: movedRev }),
			"CONFLICT",
		);
		expect(conflictDel.details?.remoteRevision).toBeNull();
	});

	it("handles positive and negative clock skew cleanly without relying on Date.now() for OCC", async () => {
		const aheadBackend = new MemoryFsBackend({ clockSkewMs: 3_600_000 });
		const aheadQueue = new WriteQueue(aheadBackend, { useWebLocks: false, verifyAfterWrite: true });

		const rev1 = await aheadQueue.write("skew.json", encode("ahead"));
		expect(rev1.lastModified).toBeGreaterThan(Date.now() + 1_000_000);

		const rev2 = await aheadQueue.write("skew.json", encode("ahead-2"), { expectedRevision: rev1 });
		expect(rev2.hash).toBe(await sha256Hex(encode("ahead-2")));

		const behindBackend = new MemoryFsBackend({ clockSkewMs: -3_600_000 });
		const behindQueue = new WriteQueue(behindBackend, { useWebLocks: false, verifyAfterWrite: true });

		const revB1 = await behindQueue.write("skew.json", encode("behind"));
		expect(revB1.lastModified).toBeLessThan(Date.now() - 1_000_000);

		const revB2 = await behindQueue.write("skew.json", encode("behind-2"), {
			expectedRevision: revB1,
		});
		expect(await readText(behindBackend, "skew.json")).toBe("behind-2");
		expect(revB2.hash).toBe(await sha256Hex(encode("behind-2")));
	});

	it("performs safe move via native move and via verified copy+hash+delete fallback", async () => {
		const backend = new MemoryFsBackend({ nativeMoveMode: "supported" });
		const queue = new WriteQueue(backend, { useWebLocks: false });

		await queue.write("src/a.txt", encode("payload-a"));
		await queue.move("src/a.txt", "dst/a.txt");
		expect(backend.nativeMoveFallbackCount).toBe(0);
		expect(await backend.exists("src/a.txt")).toBe(false);
		expect(await readText(backend, "dst/a.txt")).toBe("payload-a");

		// Fallback when native move is unavailable / fails
		backend.simulateNativeMoveFailure("unavailable");
		await queue.move("dst/a.txt", "dst/b.txt");
		expect(backend.nativeMoveFallbackCount).toBe(1);
		expect(await backend.exists("dst/a.txt")).toBe(false);
		expect(await readText(backend, "dst/b.txt")).toBe("payload-a");

		// Same-path move returns current revision or throws NOT_FOUND
		const sameRev = await queue.move("dst/b.txt", "dst/b.txt");
		expect(sameRev.size).toBe(9);
		await expectFsError(queue.move("missing.txt", "missing.txt"), "NOT_FOUND");
	});

	it("performs post-write SHA-256 verification and detects read-back corruption", async () => {
		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, { useWebLocks: false, verifyAfterWrite: true });

		const payload = encode("verified-content");
		const rev = await queue.write("ok.bin", payload);
		expect(rev.hash).toBe(await sha256Hex(payload));

		// Simulate silent disk corruption on read-back
		vi.spyOn(backend, "readBytes").mockResolvedValueOnce({
			bytes: encode("corrupted-content"),
			revision: { size: 17, lastModified: Date.now() },
		});

		const err = await expectFsError(queue.write("bad.bin", payload), "IO_FAILED");
		expect(err.details?.expectedHash).toBe(await sha256Hex(payload));
		expect(err.details?.actualHash).toBe(await sha256Hex(encode("corrupted-content")));
	});

	it("creates rolling .bak snapshots in <systemDir>/backups/ and prunes by count and age", async () => {
		let now = 1_700_000_000_000;
		vi.spyOn(Date, "now").mockImplementation(() => now);

		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, {
			useWebLocks: false,
			backup: {
				enabled: true,
				maxBackupsPerFile: 2,
				maxBackupAgeDays: 7,
			},
		});

		// First write: no prior file -> no backup
		await queue.write("notes/log.txt", encode("v1"));
		expect(await backend.listDir("_cs-fs/backups")).toHaveLength(0);

		// Write v2, v3, v4 -> retains only 2 newest backups (v2 and v3)
		now += 1000;
		await queue.write("notes/log.txt", encode("v2"));
		now += 1000;
		await queue.write("notes/log.txt", encode("v3"));
		now += 1000;
		await queue.write("notes/log.txt", encode("v4"));

		let backups = await backend.listDir("_cs-fs/backups");
		expect(backups).toHaveLength(2);
		expect(backups.every((b) => b.name.startsWith("notes%2Flog.txt.") && b.name.endsWith(".bak"))).toBe(
			true,
		);

		const contents = await Promise.all(backups.map((b) => readText(backend, b.path)));
		expect(contents.toSorted((a, b) => a.localeCompare(b))).toEqual(["v2", "v3"]);

		// walkFiles must ignore _cs-fs/backups/
		const walked = await backend.walkFiles();
		expect(walked.map((f) => f.path)).toEqual(["notes/log.txt"]);

		// Advance time by 8 days (> maxBackupAgeDays: 7) and delete with backup: true -> old backups pruned, only v4 remains
		now += 8 * 86_400_000;
		await queue.delete("notes/log.txt");

		backups = await backend.listDir("_cs-fs/backups");
		expect(backups).toHaveLength(1);
		const [remainingBackup] = backups;
		expect(remainingBackup).toBeDefined();
		if (remainingBackup) {
			expect(await readText(backend, remainingBackup.path)).toBe("v4");
		}
	});

	it("does not create duplicate .bak backups when FILE_LOCKED triggers retries", async () => {
		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, {
			useWebLocks: false,
			backup: { enabled: true },
			retryOnLock: { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 4 },
		});

		await queue.write("notes/doc.txt", encode("v1"));
		expect(await backend.listDir("_cs-fs/backups")).toHaveLength(0);

		backend.simulateFileLocked("notes/doc.txt", 2);
		await queue.write("notes/doc.txt", encode("v2"));

		expect(await readText(backend, "notes/doc.txt")).toBe("v2");
		const backups = await backend.listDir("_cs-fs/backups");
		expect(backups).toHaveLength(1);
		const [backup] = backups;
		expect(backup).toBeDefined();
		if (backup) {
			expect(await readText(backend, backup.path)).toBe("v1");
		}
	});

	it("does not create duplicate .bak backups when delete() retries on FILE_LOCKED", async () => {
		const backend = new MemoryFsBackend();
		const queue = new WriteQueue(backend, {
			useWebLocks: false,
			retryOnLock: { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 4 },
		});

		await queue.write("notes/to-delete.txt", encode("final-v1"));
		expect(await backend.listDir("_cs-fs/backups")).toHaveLength(0);

		backend.simulateFileLocked("notes/to-delete.txt", 2);
		await queue.delete("notes/to-delete.txt", { backup: true });

		expect(await backend.exists("notes/to-delete.txt")).toBe(false);
		const backups = await backend.listDir("_cs-fs/backups");
		expect(backups).toHaveLength(1);
		const [backup] = backups;
		expect(backup).toBeDefined();
		if (backup) {
			expect(await readText(backend, backup.path)).toBe("final-v1");
		}
	});
});

describe("memory-fs: readFile & removeDir", () => {
	it("readFile(path) returns a File with exact basename, content, and lastModified, and enforces maxFileBytes", async () => {
		const backend = new MemoryFsBackend({ maxFileBytes: 10 });
		const rev = await backend.writeBytes("nested/report.txt", encode("hello-file"));

		const file = await backend.readFile("nested/report.txt");
		expect(file).toBeInstanceOf(File);
		expect(file.name).toBe("report.txt");
		expect(await file.text()).toBe("hello-file");
		expect(file.lastModified).toBe(rev.lastModified);

		await expectFsError(
			backend.readFile("nested/report.txt", { maxFileBytes: 5 }),
			"FILE_TOO_LARGE",
		);

		const smallBackend = new MemoryFsBackend({ maxFileBytes: 5 });
		await smallBackend.writeBytes("nested/big.txt", encode("123456"), { maxFileBytes: 10 });
		await expectFsError(smallBackend.readFile("nested/big.txt"), "FILE_TOO_LARGE");
	});

	it("removeDir(dir, { recursive: false }) throws IO_FAILED when dir contains only an empty subdirectory, and succeeds when recursive: true", async () => {
		const backend = new MemoryFsBackend();
		await backend.ensureDir("parent/empty-sub");

		await expectFsError(backend.removeDir("parent", { recursive: false }), "IO_FAILED");
		const parentEntries = await backend.listDir("parent");
		expect(parentEntries.map((entry) => entry.name)).toEqual(["empty-sub"]);

		await backend.removeDir("parent", { recursive: true });
		const rootEntries = await backend.listDir("");
		expect(rootEntries.map((entry) => entry.name)).not.toContain("parent");
	});
});

describe("fs-backend: mapDomError", () => {
	it("maps DOMException names and root-access NotFoundError to canonical FsError codes", () => {
		const rootErr = mapDomError(new DOMException("missing", "NotFoundError"), "a.txt", true);
		expect(rootErr.code).toBe("HANDLE_STALE");

		const childErr = mapDomError(new DOMException("missing", "NotFoundError"), "a.txt", false);
		expect(childErr.code).toBe("NOT_FOUND");

		const lockedErr = mapDomError(
			new DOMException("locked", "NoModificationAllowedError"),
			"a.txt",
		);
		expect(lockedErr.code).toBe("FILE_LOCKED");

		const deniedErr = mapDomError(new DOMException("denied", "NotAllowedError"), "a.txt");
		expect(deniedErr.code).toBe("PERMISSION_DENIED");

		const abortErr = mapDomError(new DOMException("aborted", "AbortError"), "a.txt");
		expect(abortErr.code).toBe("ABORTED");
	});
});
