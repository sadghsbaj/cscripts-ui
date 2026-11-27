export type FileSystemSupportStatus =
	| "supported"
	| "unsupported-api"
	| "insecure-context"
	| "unc-file-origin"
	| "ssr";

export interface FileSystemSupportFeatures {
	directoryPicker: boolean;
	nativeMove: boolean;
	indexedDb: boolean;
	webLocks: boolean;
}

export interface FileSystemSupportReport {
	supported: boolean;
	status: FileSystemSupportStatus;
	features: FileSystemSupportFeatures;
}

export function checkFileSystemSupport(): FileSystemSupportReport {
	if (typeof window === "undefined") {
		return {
			supported: false,
			status: "ssr",
			features: {
				directoryPicker: false,
				nativeMove: false,
				indexedDb: false,
				webLocks: false,
			},
		};
	}

	const directoryPicker =
		"showDirectoryPicker" in window &&
		typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
			"function";

	const nativeMove =
		typeof FileSystemFileHandle !== "undefined" &&
		typeof (FileSystemFileHandle.prototype as unknown as { move?: unknown }).move ===
			"function";

	const indexedDb = typeof indexedDB !== "undefined";

	const webLocks =
		typeof navigator !== "undefined" &&
		"locks" in navigator &&
		typeof navigator.locks?.request === "function";

	const features: FileSystemSupportFeatures = {
		directoryPicker,
		nativeMove,
		indexedDb,
		webLocks,
	};

	if (window.location?.protocol === "file:" && (window.location?.host ?? "") !== "") {
		return {
			supported: false,
			status: "unc-file-origin",
			features,
		};
	}

	if (!window.isSecureContext) {
		return {
			supported: false,
			status: "insecure-context",
			features,
		};
	}

	if (!directoryPicker || !indexedDb) {
		return {
			supported: false,
			status: "unsupported-api",
			features,
		};
	}

	return {
		supported: true,
		status: "supported",
		features,
	};
}
