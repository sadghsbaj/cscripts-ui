import { FsError } from "./errors.ts";
import {
	DEFAULT_MAX_FILE_BYTES,
	sha256Hex,
	type FileRevision,
	type FileStat,
	type FsBackend,
	type FsDirEntry,
	type FsReadOptions,
	type FsWalkOptions,
	type FsWriteOptions,
} from "./fs-backend.internal.ts";
import { DEFAULT_SYSTEM_DIR, isIgnoredPath } from "./path-template.ts";

export type NativeMoveFaultMode = "supported" | "unavailable" | "fail-once" | "always-fail";

export type SimulatedFaultCode =
	| "FILE_LOCKED"
	| "HANDLE_STALE"
	| "PERMISSION_DENIED"
	| "IO_FAILED";

interface StoredFile {
	bytes: Uint8Array;
	lastModified: number;
}

interface FaultEntry {
	code: SimulatedFaultCode;
	remaining: number;
}

export interface MemoryFsBackendOptions {
	maxFileBytes?: number;
	clockSkewMs?: number;
	nativeMoveMode?: NativeMoveFaultMode;
}

export class MemoryFsBackend implements FsBackend {
	readonly #files = new Map<string, StoredFile>();
	readonly #dirs = new Set<string>();
	readonly #faults = new Map<string, FaultEntry>();
	readonly #streamAborts = new Map<string, number>();

	#maxFileBytes: number;
	#clockSkewMs: number;
	#nativeMoveMode: NativeMoveFaultMode;
	#moveFallbackCount = 0;
	#lastTimestamp = 0;

	constructor(options?: MemoryFsBackendOptions) {
		this.#maxFileBytes = options?.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
		this.#clockSkewMs = options?.clockSkewMs ?? 0;
		this.#nativeMoveMode = options?.nativeMoveMode ?? "supported";
	}

	get clockSkewMs(): number {
		return this.#clockSkewMs;
	}

	set clockSkewMs(value: number) {
		this.#clockSkewMs = value;
	}

	get nativeMoveFallbackCount(): number {
		return this.#moveFallbackCount;
	}

	simulateFileLocked(path: string, count = Infinity): void {
		this.#faults.set(path, { code: "FILE_LOCKED", remaining: count });
	}

	simulateError(path: string, code: SimulatedFaultCode, count = Infinity): void {
		this.#faults.set(path, { code, remaining: count });
	}

	clearFault(path: string): void {
		this.#faults.delete(path);
		this.#streamAborts.delete(path);
	}

	simulateStreamAbort(path: string, count = 1): void {
		this.#streamAborts.set(path, count);
	}

	simulateNativeMoveFailure(mode: NativeMoveFaultMode): void {
		this.#nativeMoveMode = mode;
	}

	async injectExternalFile(
		path: string,
		bytes: Uint8Array,
		lastModified?: number,
	): Promise<FileRevision> {
		this.#ensureParentDirs(path);
		const mtime = lastModified ?? this.#nextTimestamp();
		const copy = new Uint8Array(bytes);
		this.#files.set(path, { bytes: copy, lastModified: mtime });
		return {
			size: copy.byteLength,
			lastModified: mtime,
		};
	}

	deleteExternalFile(path: string): boolean {
		return this.#files.delete(path);
	}

	setExternalMtime(path: string, lastModified: number): void {
		const entry = this.#files.get(path);
		if (!entry) {
			throw new FsError("NOT_FOUND", `Cannot set mtime on missing file "${path}".`, {
				details: { path },
			});
		}
		entry.lastModified = lastModified;
	}

	#nextTimestamp(): number {
		const candidate = Date.now() + this.#clockSkewMs;
		this.#lastTimestamp = candidate > this.#lastTimestamp ? candidate : this.#lastTimestamp + 1;
		return this.#lastTimestamp;
	}

	#ensureParentDirs(path: string): void {
		const parts = path.split("/");
		parts.pop();
		let current = "";
		for (const part of parts) {
			if (part.length === 0) continue;
			current = current.length > 0 ? `${current}/${part}` : part;
			this.#dirs.add(current);
		}
	}

	#consumeFault(path: string): void {
		const fault = this.#faults.get(path);
		if (!fault) return;
		if (fault.remaining <= 1) {
			this.#faults.delete(path);
		} else {
			fault.remaining -= 1;
		}
		throw new FsError(fault.code, `Simulated ${fault.code} for "${path}".`, {
			details: { path, simulated: true },
		});
	}

	#consumeStreamAbort(path: string): void {
		const count = this.#streamAborts.get(path);
		if (count === undefined) return;
		if (count <= 1) {
			this.#streamAborts.delete(path);
		} else {
			this.#streamAborts.set(path, count - 1);
		}
		throw new FsError("ABORTED", `Simulated stream abort mid-write for "${path}".`, {
			details: { path, simulated: true },
		});
	}

	async readBytes(
		path: string,
		options?: FsReadOptions,
	): Promise<{ bytes: Uint8Array; revision: FileRevision }> {
		if (options?.signal?.aborted) {
			throw new FsError("ABORTED", `Read aborted for "${path}".`, {
				details: { path },
				cause: options.signal.reason,
			});
		}
		this.#consumeFault(path);

		const entry = this.#files.get(path);
		if (!entry) {
			throw new FsError("NOT_FOUND", `File not found: "${path}".`, { details: { path } });
		}

		const maxBytes = options?.maxFileBytes ?? this.#maxFileBytes;
		if (Number.isFinite(maxBytes) && entry.bytes.byteLength > maxBytes) {
			throw new FsError(
				"FILE_TOO_LARGE",
				`File "${path}" (${entry.bytes.byteLength} bytes) exceeds maxFileBytes (${maxBytes}).`,
				{ details: { path, size: entry.bytes.byteLength, maxFileBytes: maxBytes } },
			);
		}

		return {
			bytes: new Uint8Array(entry.bytes),
			revision: {
				size: entry.bytes.byteLength,
				lastModified: entry.lastModified,
			},
		};
	}

	async stat(path: string): Promise<FileStat | null> {
		this.#consumeFault(path);
		const entry = this.#files.get(path);
		if (!entry) {
			return null;
		}
		return {
			path,
			size: entry.bytes.byteLength,
			lastModified: entry.lastModified,
		};
	}

	async writeBytes(
		path: string,
		bytes: Uint8Array,
		options?: FsWriteOptions,
	): Promise<FileRevision> {
		if (options?.signal?.aborted) {
			throw new FsError("ABORTED", `Write aborted for "${path}".`, {
				details: { path },
				cause: options.signal.reason,
			});
		}
		this.#consumeFault(path);

		const maxBytes = options?.maxFileBytes ?? this.#maxFileBytes;
		if (Number.isFinite(maxBytes) && bytes.byteLength > maxBytes) {
			throw new FsError(
				"FILE_TOO_LARGE",
				`Payload for "${path}" (${bytes.byteLength} bytes) exceeds maxFileBytes (${maxBytes}).`,
				{ details: { path, size: bytes.byteLength, maxFileBytes: maxBytes } },
			);
		}

		// Simulate aborting mid-stream before committing so prior file state remains intact.
		this.#consumeStreamAbort(path);

		this.#ensureParentDirs(path);
		const mtime = this.#nextTimestamp();
		const copy = new Uint8Array(bytes);
		this.#files.set(path, { bytes: copy, lastModified: mtime });
		return {
			size: copy.byteLength,
			lastModified: mtime,
		};
	}

	async deleteFile(path: string): Promise<void> {
		this.#consumeFault(path);
		if (!this.#files.has(path)) {
			throw new FsError("NOT_FOUND", `File not found: "${path}".`, { details: { path } });
		}
		this.#files.delete(path);
	}

	async moveFile(fromPath: string, toPath: string): Promise<FileRevision> {
		this.#consumeFault(fromPath);
		this.#consumeFault(toPath);

		const source = this.#files.get(fromPath);
		if (!source) {
			throw new FsError("NOT_FOUND", `File not found: "${fromPath}".`, {
				details: { path: fromPath },
			});
		}

		if (fromPath === toPath) {
			return { size: source.bytes.byteLength, lastModified: source.lastModified };
		}

		let canUseNativeMove = this.#nativeMoveMode === "supported";
		if (this.#nativeMoveMode === "fail-once") {
			this.#nativeMoveMode = "supported";
			canUseNativeMove = false;
		}

		if (canUseNativeMove) {
			this.#ensureParentDirs(toPath);
			const mtime = this.#nextTimestamp();
			this.#files.set(toPath, { bytes: new Uint8Array(source.bytes), lastModified: mtime });
			this.#files.delete(fromPath);
			return { size: source.bytes.byteLength, lastModified: mtime };
		}

		// Verified copy + hash + delete fallback matching BrowserFsBackend.
		this.#moveFallbackCount += 1;
		const { bytes } = await this.readBytes(fromPath);
		const sourceHash = await sha256Hex(bytes);
		await this.writeBytes(toPath, bytes);
		const written = await this.readBytes(toPath);
		const targetHash = await sha256Hex(written.bytes);

		if (written.bytes.byteLength !== bytes.byteLength || targetHash !== sourceHash) {
			throw new FsError(
				"IO_FAILED",
				`Move verification failed when copying "${fromPath}" to "${toPath}".`,
				{ details: { fromPath, toPath } },
			);
		}

		await this.deleteFile(fromPath);
		return written.revision;
	}

	async exists(path: string): Promise<boolean> {
		this.#consumeFault(path);
		return this.#files.has(path);
	}

	async listDir(dirPath: string): Promise<FsDirEntry[]> {
		const prefix = dirPath.length > 0 ? `${dirPath}/` : "";
		const seen = new Map<string, FsDirEntry>();

		for (const dir of this.#dirs) {
			if (!dir.startsWith(prefix)) continue;
			const rest = dir.slice(prefix.length);
			if (rest.length === 0 || rest.includes("/")) continue;
			seen.set(rest, { name: rest, path: dir, kind: "directory" });
		}

		for (const filePath of this.#files.keys()) {
			if (!filePath.startsWith(prefix)) continue;
			const rest = filePath.slice(prefix.length);
			if (rest.length === 0) continue;
			const slashIndex = rest.indexOf("/");
			if (slashIndex === -1) {
				seen.set(rest, { name: rest, path: filePath, kind: "file" });
			} else {
				const dirName = rest.slice(0, slashIndex);
				const fullDir = prefix.length > 0 ? `${prefix}${dirName}` : dirName;
				if (!seen.has(dirName)) {
					seen.set(dirName, { name: dirName, path: fullDir, kind: "directory" });
				}
			}
		}

		return seen
			.values()
			.toArray()
			.toSorted((a, b) => a.name.localeCompare(b.name));
	}

	async walkFiles(dirPath = "", options?: FsWalkOptions): Promise<FileStat[]> {
		const systemDir = options?.systemDir ?? DEFAULT_SYSTEM_DIR;
		const prefix = dirPath.length > 0 ? `${dirPath}/` : "";
		const results: FileStat[] = [];

		for (const [filePath, entry] of this.#files.entries()) {
			if (options?.signal?.aborted) {
				throw new FsError("ABORTED", `Walk aborted for "${dirPath}".`, {
					details: { path: dirPath },
					cause: options.signal.reason,
				});
			}
			if (prefix.length > 0 && !filePath.startsWith(prefix)) {
				continue;
			}
			if (isIgnoredPath(filePath, systemDir) || options?.shouldIgnore?.(filePath)) {
				continue;
			}
			results.push({
				path: filePath,
				size: entry.bytes.byteLength,
				lastModified: entry.lastModified,
			});
		}

		return results.toSorted((a, b) => a.path.localeCompare(b.path));
	}

	async ensureDir(dirPath: string): Promise<void> {
		const parts = dirPath.split("/").filter((part) => part.length > 0);
		let current = "";
		for (const part of parts) {
			current = current.length > 0 ? `${current}/${part}` : part;
			this.#dirs.add(current);
		}
	}

	async removeDir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
		const prefix = `${dirPath}/`;
		const recursive = options?.recursive ?? false;

		if (!recursive) {
			for (const filePath of this.#files.keys()) {
				if (filePath.startsWith(prefix)) {
					throw new FsError("IO_FAILED", `Directory "${dirPath}" is not empty.`, {
						details: { path: dirPath },
					});
				}
			}
			this.#dirs.delete(dirPath);
			return;
		}

		for (const filePath of this.#files.keys()) {
			if (filePath.startsWith(prefix)) {
				this.#files.delete(filePath);
			}
		}
		for (const dir of this.#dirs) {
			if (dir === dirPath || dir.startsWith(prefix)) {
				this.#dirs.delete(dir);
			}
		}
	}
}
