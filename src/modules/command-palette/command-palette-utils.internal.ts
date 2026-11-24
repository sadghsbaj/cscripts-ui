export function isMacLikePlatform(): boolean {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? "";
    return /mac|iphone|ipad|ipod/i.test(platform);
}

export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    if (target.closest(".cs-command-palette")) return false;
    if (target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) {
        return true;
    }
    return target instanceof HTMLElement && target.isContentEditable;
}

/**
 * Returns true when an event originates inside an interactive widget/preview/footer control
 * rather than the command palette's primary combobox input.
 */
export function isCustomWidgetTarget(target: EventTarget | null, inputRef: HTMLInputElement | null): boolean {
    if (!(target instanceof Element)) return false;
    if (inputRef && target === inputRef) return false;

    if (
        target.closest(
            ".cs-command-palette-widget, .cs-command-palette-preview, .cs-command-palette-footer"
        )
    ) {
        return true;
    }

    return Boolean(
        target.closest(
            'input, textarea, select, button, a[href], [contenteditable="true"], [contenteditable=""], [role="switch"], [role="slider"]'
        )
    );
}
