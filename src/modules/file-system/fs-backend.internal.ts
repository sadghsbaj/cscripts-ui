import { FsError, isFsError } from "./errors.ts";
import { DEFAULT_SYSTEM_DIR, isIgnoredPath } from "./path-template.ts";

export const DEFAULT_MAX_FILE_BYTES = 100 * 1024 * 1024;

export interface FileRevision {
	size: number;
	lastModified: number;
	hash?: string;
}

export interface FileStat {
	path: string;
	size: number;
	lastModified: number;
}

export interface FsDirEntry {
	name: string;
	path: string;
	kind: "file" | "directory";
}

export interface FsReadOptions {
	maxFileBytes?: number;
	signal?: AbortSignal;
}

export interface FsWriteOptions {
	maxFileBytes?: number;
	signal?: AbortSignal;
}

export interface FsWalkOptions {
	systemDir?: string;
	shouldIgnore?: (relativePath: string) => boolean;
	signal?: AbortSignal;
}

export interface FsBackend {
	readBytes(
		path: string,
		options?: FsReadOptions,
	): Promise<{ bytes: Uint8Array; revision: FileRevision }>;
	readFile(path: string, options?: FsReadOptions): Promise<File>;
	stat(path: string): Promise<FileStat | null>;
	writeBytes(path: string, bytes: Uint8Array, options?: FsWriteOptions): Promise<FileRevision>;
	deleteFile(path: string): Promise<void>;
	moveFile(fromPath: string, toPath: string): Promise<FileRevision>;
	exists(path: string): Promise<boolean>;
	listDir(dirPath: string): Promise<FsDirEntry[]>;
	walkFiles(dirPath?: string, options?: FsWalkOptions): Promise<FileStat[]>;
	ensureDir(dirPath: string): Promise<void>;
	removeDir(dirPath: string, options?: { recursive?: boolean }): Promise<void>;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
	// Copy into a standalone ArrayBuffer so SharedArrayBuffer-backed views satisfy BufferSource.
	const buffer = new Uint8Array(bytes).buffer;
	const digest = await crypto.subtle.digest("SHA-256", buffer);
	const view = new Uint8Array(digest);
	let hex = "";
	for (const byte of view) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return hex;
}

function splitPath(relativePath: string): { dirs: string[]; fileName: string } {
	const parts = relativePath.split("/").filter((part) => part.length > 0);
	const fileName = parts.pop();
	if (fileName === undefined) {
		throw new FsError("INVALID_PATH", `Path "${relativePath}" must not be empty.`, {
			details: { path: relativePath },
		});
	}
	return { dirs: parts, fileName };
}

function checkAborted(signal: AbortSignal | undefined, path: string): void {
	if (signal?.aborted) {
		throw new FsError("ABORTED", `Operation aborted for "${path}".`, {
			details: { path },
			cause: signal.reason,
		});
	}
}

function getDomExceptionName(error: unknown): string | undefined {
	if (error instanceof DOMException) {
		return error.name;
	}
	if (typeof error === "object" && error !== null && "name" in error) {
		const name = (error as { name?: unknown }).name;
		return typeof name === "string" ? name : undefined;
	}
	return undefined;
}

export function mapDomError(error: unknown, path: string, isRootAccess = false): FsError {
	if (isFsError(error)) {
		return error;
	}
	const name = getDomExceptionName(error);
	switch (name) {
		case "NotFoundError": {
			if (isRootAccess) {
				return new FsError(
					"HANDLE_STALE",
					`Mounted root directory handle is stale or missing ("${path}").`,
					{ details: { path }, cause: error },
				);
			}
			return new FsError("NOT_FOUND", `File or directory not found: "${path}".`, {
				details: { path },
				cause: error,
			});
		}
		case "NoModificationAllowedError": {
			return new FsError("FILE_LOCKED", `File is locked by another process: "${path}".`, {
				details: { path },
				cause: error,
			});
		}
		case "NotAllowedError": {
			return new FsError("PERMISSION_DENIED", `Permission denied for "${path}".`, {
				details: { path },
				cause: error,
			});
		}
		case "AbortError": {
			return new FsError("ABORTED", `Operation aborted for "${path}".`, {
				details: { path },
				cause: error,
			});
		}
		default: {
			return new FsError("IO_FAILED", `Filesystem I/O failed for "${path}".`, {
				details: { path, domErrorName: name },
				cause: error,
			});
		}
	}
}

interface MovableFileHandle extends FileSystemFileHandle {
	move?: (destination: FileSystemDirectoryHandle, newName: string) => Promise<void>;
}

export interface BrowserFsBackendOptions {
	maxFileBytes?: number;
}

export class BrowserFsBackend implements FsBackend {
	readonly #rootHandle: FileSystemDirectoryHandle;
	readonly #maxFileBytes: number;

	constructor(rootHandle: FileSystemDirectoryHandle, options?: BrowserFsBackendOptions) {
		this.#rootHandle = rootHandle;
		this.#maxFileBytes = options?.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
	}

	async #assertRootAlive(path: string): Promise<void> {
		try {
			// Verify the root handle itself is still resolvable before reporting NOT_FOUND on a child.
			const iter = this.#rootHandle.values();
			await iter.next();
		} catch (error) {
			throw mapDomError(error, path, true);
		}
	}

	async #getDirHandle(
		dirs: readonly string[],
		create: boolean,
		fullPath: string,
	): Promise<FileSystemDirectoryHandle> {
		let current = this.#rootHandle;
		for (const [index, segment] of dirs.entries()) {
			try {
				current = await current.getDirectoryHandle(segment, { create });
			} catch (error) {
				if (index === 0 && getDomExceptionName(error) === "NotFoundError") {
					await this.#assertRootAlive(fullPath);
				}
				throw mapDomError(error, fullPath);
			}
		}
		return current;
	}

	async #getFileHandle(
		path: string,
		create: boolean,
	): Promise<{ dir: FileSystemDirectoryHandle; file: FileSystemFileHandle }> {
		const { dirs, fileName } = splitPath(path);
		const dir = await this.#getDirHandle(dirs, create, path);
		try {
			const file = await dir.getFileHandle(fileName, { create });
			return { dir, file };
		} catch (error) {
			if (dirs.length === 0 && getDomExceptionName(error) === "NotFoundError") {
				await this.#assertRootAlive(path);
			}
			throw mapDomError(error, path);
		}
	}

	async readFile(path: string, options?: FsReadOptions): Promise<File> {
		checkAborted(options?.signal, path);
		const maxBytes = options?.maxFileBytes ?? this.#maxFileBytes;
		const { file: handle } = await this.#getFileHandle(path, false);

		let file: File;
		try {
			file = await handle.getFile();
		} catch (error) {
			throw mapDomError(error, path);
		}

		checkAborted(options?.signal, path);
		if (Number.isFinite(maxBytes) && file.size > maxBytes) {
			throw new FsError(
				"FILE_TOO_LARGE",
				`File "${path}" (${file.size} bytes) exceeds maxFileBytes (${maxBytes}).`,
				{ details: { path, size: file.size, maxFileBytes: maxBytes } },
			);
		}

		return file;
	}

	async readBytes(
		path: string,
		options?: FsReadOptions,
	): Promise<{ bytes: Uint8Array; revision: FileRevision }> {
		const file = await this.readFile(path, options);

		try {
			const buffer = await file.arrayBuffer();
			checkAborted(options?.signal, path);
			return {
				bytes: new Uint8Array(buffer),
				revision: {
					size: file.size,
					lastModified: file.lastModified,
				},
			};
		} catch (error) {
			throw mapDomError(error, path);
		}
	}

	async stat(path: string): Promise<FileStat | null> {
		try {
			const { file: handle } = await this.#getFileHandle(path, false);
			const file = await handle.getFile();
			return {
				path,
				size: file.size,
				lastModified: file.lastModified,
			};
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return null;
			}
			throw error;
		}
	}

	async writeBytes(
		path: string,
		bytes: Uint8Array,
		options?: FsWriteOptions,
	): Promise<FileRevision> {
		checkAborted(options?.signal, path);
		const maxBytes = options?.maxFileBytes ?? this.#maxFileBytes;
		if (Number.isFinite(maxBytes) && bytes.byteLength > maxBytes) {
			throw new FsError(
				"FILE_TOO_LARGE",
				`Payload for "${path}" (${bytes.byteLength} bytes) exceeds maxFileBytes (${maxBytes}).`,
				{ details: { path, size: bytes.byteLength, maxFileBytes: maxBytes } },
			);
		}

		const { file: handle } = await this.#getFileHandle(path, true);
		let writable: FileSystemWritableFileStream;
		try {
			writable = await handle.createWritable();
		} catch (error) {
			throw mapDomError(error, path);
		}

		try {
			checkAborted(options?.signal, path);
			const payload = new Uint8Array(bytes);
			await writable.write(payload);
			checkAborted(options?.signal, path);
			await writable.close();
		} catch (error) {
			try {
				await writable.abort();
			} catch {
				// Ignore secondary abort errors when cleaning up a failed stream.
			}
			throw mapDomError(error, path);
		}

		try {
			const file = await handle.getFile();
			return {
				size: file.size,
				lastModified: file.lastModified,
			};
		} catch (error) {
			throw mapDomError(error, path);
		}
	}

	async deleteFile(path: string): Promise<void> {
		const { dirs, fileName } = splitPath(path);
		const dir = await this.#getDirHandle(dirs, false, path);
		try {
			await dir.removeEntry(fileName);
		} catch (error) {
			if (dirs.length === 0 && getDomExceptionName(error) === "NotFoundError") {
				await this.#assertRootAlive(path);
			}
			throw mapDomError(error, path);
		}
	}

	async moveFile(fromPath: string, toPath: string): Promise<FileRevision> {
		if (fromPath === toPath) {
			const existing = await this.stat(fromPath);
			if (!existing) {
				throw new FsError("NOT_FOUND", `File not found: "${fromPath}".`, {
					details: { path: fromPath },
				});
			}
			return { size: existing.size, lastModified: existing.lastModified };
		}

		const { file: sourceHandle } = await this.#getFileHandle(fromPath, false);
		const { dirs: targetDirs, fileName: targetName } = splitPath(toPath);
		const targetDir = await this.#getDirHandle(targetDirs, true, toPath);

		const movable = sourceHandle as MovableFileHandle;
		if (typeof movable.move === "function") {
			try {
				await movable.move(targetDir, targetName);
				const moved = await this.stat(toPath);
				if (moved) {
					return { size: moved.size, lastModified: moved.lastModified };
				}
			} catch (error) {
				const mapped = mapDomError(error, fromPath);
				if (["PERMISSION_DENIED", "FILE_LOCKED", "HANDLE_STALE"].includes(mapped.code)) {
					throw mapped;
				}
				// Fall back to verified copy + hash + delete for SMB / cross-directory move failures.
			}
		}

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
		const stat = await this.stat(path);
		return stat !== null;
	}

	async listDir(dirPath: string): Promise<FsDirEntry[]> {
		const dirs = dirPath.split("/").filter((part) => part.length > 0);
		let dir: FileSystemDirectoryHandle;
		try {
			dir = await this.#getDirHandle(dirs, false, dirPath);
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return [];
			}
			throw error;
		}

		const entries: FsDirEntry[] = [];
		try {
			for await (const handle of dir.values()) {
				const childPath = dirs.length > 0 ? `${dirs.join("/")}/${handle.name}` : handle.name;
				entries.push({
					name: handle.name,
					path: childPath,
					kind: handle.kind,
				});
			}
		} catch (error) {
			throw mapDomError(error, dirPath, dirs.length === 0);
		}
		return entries;
	}

	async walkFiles(dirPath = "", options?: FsWalkOptions): Promise<FileStat[]> {
		const systemDir = options?.systemDir ?? DEFAULT_SYSTEM_DIR;
		const results: FileStat[] = [];
		const rootDirs = dirPath.split("/").filter((part) => part.length > 0);

		let startDir: FileSystemDirectoryHandle;
		try {
			startDir = await this.#getDirHandle(rootDirs, false, dirPath);
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return [];
			}
			throw error;
		}

		const queue: Array<{ dir: FileSystemDirectoryHandle; prefix: string }> = [
			{ dir: startDir, prefix: rootDirs.join("/") },
		];

		const processDir = async (
			dir: FileSystemDirectoryHandle,
			prefix: string,
		): Promise<void> => {
			try {
				for await (const handle of dir.values()) {
					checkAborted(options?.signal, dirPath);
					const childPath = prefix ? `${prefix}/${handle.name}` : handle.name;

					if (isIgnoredPath(childPath, systemDir) || options?.shouldIgnore?.(childPath)) {
						continue;
					}

					if (handle.kind === "directory") {
						queue.push({
							dir: handle as FileSystemDirectoryHandle,
							prefix: childPath,
						});
					} else {
						const file = await (handle as FileSystemFileHandle).getFile();
						results.push({
							path: childPath,
							size: file.size,
							lastModified: file.lastModified,
						});
					}
				}
			} catch (error) {
				throw mapDomError(error, prefix || dirPath, prefix.length === 0);
			}
		};

		while (queue.length > 0) {
			checkAborted(options?.signal, dirPath);
			const current = queue.shift();
			if (!current) break;
			await processDir(current.dir, current.prefix);
		}

		return results;
	}

	async ensureDir(dirPath: string): Promise<void> {
		const dirs = dirPath.split("/").filter((part) => part.length > 0);
		await this.#getDirHandle(dirs, true, dirPath);
	}

	async removeDir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
		const { dirs, fileName } = splitPath(dirPath);
		let parent: FileSystemDirectoryHandle;
		try {
			parent = await this.#getDirHandle(dirs, false, dirPath);
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return;
			}
			throw error;
		}

		try {
			await parent.removeEntry(fileName, { recursive: options?.recursive ?? false });
		} catch (error) {
			if (getDomExceptionName(error) === "NotFoundError") {
				return;
			}
			throw mapDomError(error, dirPath);
		}
	}
}
