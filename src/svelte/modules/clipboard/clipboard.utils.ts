/**
 * @description Clipboard utility functions for copying and reading plain text with non-secure context fallbacks.
 */

/**
 * Copies the specified text to the clipboard.
 * Tries the modern `navigator.clipboard` API first, falling back to legacy textarea selection
 * in non-secure contexts (`http://` LAN or `file://`) while preserving active DOM focus.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof window === "undefined") return false;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall back to legacy execCommand
        }
    }

    const activeEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const textArea = document.createElement("textarea");

    try {
        textArea.value = text;
        textArea.setAttribute("readonly", "");

        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.pointerEvents = "none";

        document.body.append(textArea);
        textArea.focus({ preventScroll: true });
        textArea.select();

        return document.execCommand("copy");
    } catch {
        return false;
    } finally {
        textArea.remove();
        activeEl?.focus({ preventScroll: true });
    }
}

/**
 * Reads text from the clipboard.
 * Returns null if not supported, rejected, or in insecure contexts.
 */
export async function readFromClipboard(): Promise<string | null> {
    if (typeof window === "undefined" || !navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
        return null;
    }

    try {
        return await navigator.clipboard.readText();
    } catch {
        return null;
    }
}
