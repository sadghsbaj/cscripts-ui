export function isUncFileOrigin(): boolean {
	return (
		typeof window !== "undefined" &&
		window.location?.protocol === "file:" &&
		(window.location?.host ?? "") !== ""
	);
}
