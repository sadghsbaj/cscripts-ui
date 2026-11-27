import { afterEach, describe, expect, it, vi } from "vitest";
import { FS_ERROR_CODES, FsError, isFsError } from "./errors.ts";
import { checkFileSystemSupport } from "./support.ts";

describe("file-system errors", () => {
	it("constructs FsError with code, message, details, and cause", () => {
		const rootCause = new Error("disk full");
		const err = new FsError("IO_FAILED", "Write failed", {
			details: { path: "logs/app.json", retryable: false },
			cause: rootCause,
		});

		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(FsError);
		expect(err.name).toBe("FsError");
		expect(err.code).toBe("IO_FAILED");
		expect(err.message).toBe("Write failed");
		expect(err.details).toEqual({ path: "logs/app.json", retryable: false });
		expect(err.cause).toBe(rootCause);
	});

	it("identifies FsError instances and duck-typed FsError objects via isFsError", () => {
		for (const code of FS_ERROR_CODES) {
			expect(isFsError(new FsError(code, "msg"))).toBe(true);
			expect(isFsError({ name: "FsError", code })).toBe(true);
		}

		expect(isFsError(null)).toBe(false);
		expect(isFsError(undefined)).toBe(false);
		expect(isFsError("FsError")).toBe(false);
		expect(isFsError(new Error("plain"))).toBe(false);
		expect(isFsError({ name: "FsError", code: "NOT_A_REAL_CODE" })).toBe(false);
		expect(isFsError({ name: "TypeError", code: "CONFLICT" })).toBe(false);
	});
});

describe("checkFileSystemSupport", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reports ssr when window is undefined", () => {
		vi.stubGlobal("window", undefined);

		const report = checkFileSystemSupport();
		expect(report).toEqual({
			supported: false,
			status: "ssr",
			features: {
				directoryPicker: false,
				nativeMove: false,
				indexedDb: false,
				webLocks: false,
			},
		});
	});

	it("reports insecure-context when window.isSecureContext is false", () => {
		vi.stubGlobal("window", {
			isSecureContext: false,
			showDirectoryPicker: vi.fn(),
		});
		vi.stubGlobal("indexedDB", {});

		const report = checkFileSystemSupport();
		expect(report.supported).toBe(false);
		expect(report.status).toBe("insecure-context");
		expect(report.features.directoryPicker).toBe(true);
		expect(report.features.indexedDb).toBe(true);
	});

	it("reports unsupported-api when showDirectoryPicker is missing", () => {
		vi.stubGlobal("window", {
			isSecureContext: true,
		});
		vi.stubGlobal("indexedDB", {});

		const report = checkFileSystemSupport();
		expect(report.supported).toBe(false);
		expect(report.status).toBe("unsupported-api");
		expect(report.features.directoryPicker).toBe(false);
		expect(report.features.indexedDb).toBe(true);
	});

	it("reports unsupported-api when indexedDB is missing", () => {
		vi.stubGlobal("window", {
			isSecureContext: true,
			showDirectoryPicker: vi.fn(),
		});
		vi.stubGlobal("indexedDB", undefined);

		const report = checkFileSystemSupport();
		expect(report.supported).toBe(false);
		expect(report.status).toBe("unsupported-api");
		expect(report.features.directoryPicker).toBe(true);
		expect(report.features.indexedDb).toBe(false);
	});

	it("reports supported when secure context and required APIs are present", () => {
		class MockFileSystemFileHandle {
			move(): Promise<void> {
				return Promise.resolve();
			}
		}

		vi.stubGlobal("window", {
			isSecureContext: true,
			showDirectoryPicker: vi.fn(),
		});
		vi.stubGlobal("indexedDB", {});
		vi.stubGlobal("FileSystemFileHandle", MockFileSystemFileHandle);
		vi.stubGlobal("navigator", {
			locks: {
				request: vi.fn(),
			},
		});

		const report = checkFileSystemSupport();
		expect(report).toEqual({
			supported: true,
			status: "supported",
			features: {
				directoryPicker: true,
				nativeMove: true,
				indexedDb: true,
				webLocks: true,
			},
		});
	});

	it("reports unc-file-origin when window.location is a UNC file:// URL", () => {
		vi.stubGlobal("window", {
			isSecureContext: true,
			showDirectoryPicker: vi.fn(),
			location: { protocol: "file:", host: "pfleiderer.loc" },
		});
		vi.stubGlobal("indexedDB", {});

		const report = checkFileSystemSupport();
		expect(report).toEqual({
			supported: false,
			status: "unc-file-origin",
			features: {
				directoryPicker: true,
				nativeMove: false,
				indexedDb: true,
				webLocks: false,
			},
		});
	});

	it("reports supported when window.location is a mapped-drive file:// URL with empty host", () => {
		vi.stubGlobal("window", {
			isSecureContext: true,
			showDirectoryPicker: vi.fn(),
			location: { protocol: "file:", host: "" },
		});
		vi.stubGlobal("indexedDB", {});

		const report = checkFileSystemSupport();
		expect(report).toEqual({
			supported: true,
			status: "supported",
			features: {
				directoryPicker: true,
				nativeMove: false,
				indexedDb: true,
				webLocks: false,
			},
		});
	});
});
