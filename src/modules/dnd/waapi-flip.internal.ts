export interface RectLike {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

interface ActiveFlipEntry {
    anim: Animation;
    fromDx: number;
    fromDy: number;
}

const DEFAULT_FLIP_DUR_MS = 240;
const DEFAULT_PICKUP_DUR_MS = 160;
const DEFAULT_SETTLE_DUR_MS = 200;
const DEFAULT_CANCEL_DUR_MS = 240;
const DEFAULT_EASE = "cubic-bezier(0.25, 1, 0.5, 1)";
const SHORT_SETTLE_THRESHOLD_PX = 24;
const SHORT_SETTLE_FLOOR_MS = 120;

const activeFlips = new WeakMap<HTMLElement, ActiveFlipEntry>();

/**
 * Returns `true` when the user has enabled OS-level reduced motion.
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Parses a CSS custom property duration (`ms` or `s`) on `el`, falling back to `fallbackMs`.
 */
export function readCssDurationMs(el: Element, prop: string, fallbackMs: number): number {
    if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
        return fallbackMs;
    }
    const raw = window.getComputedStyle(el).getPropertyValue(prop).trim();
    if (!raw) return fallbackMs;

    if (raw.endsWith("ms")) {
        const parsed = Number(raw.slice(0, -2));
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackMs;
    }
    if (raw.endsWith("s")) {
        const parsed = Number(raw.slice(0, -1));
        return Number.isFinite(parsed) && parsed >= 0 ? parsed * 1000 : fallbackMs;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackMs;
}

/**
 * Reads a CSS custom property easing string on `el`, falling back to `fallback`.
 */
export function readCssEasing(el: Element, prop: string, fallback: string): string {
    if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
        return fallback;
    }
    const raw = window.getComputedStyle(el).getPropertyValue(prop).trim();
    return raw || fallback;
}

/**
 * Reads a numeric CSS custom property (such as `--cs-dnd-thumbnail-scale`) on `el`.
 */
export function readCssNumber(el: Element, prop: string, fallback: number): number {
    if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
        return fallback;
    }
    const raw = window.getComputedStyle(el).getPropertyValue(prop).trim();
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Computes effective ancestor CSS scale factors to normalize viewport pixel deltas
 * into local element coordinate space.
 */
function getElementScale(el: HTMLElement, rect: DOMRect): { scaleX: number; scaleY: number } {
    const offsetW = el.offsetWidth;
    const offsetH = el.offsetHeight;
    const scaleX = offsetW > 0 && rect.width > 0 ? rect.width / offsetW : 1;
    const scaleY = offsetH > 0 && rect.height > 0 ? rect.height / offsetH : 1;
    return {
        scaleX: Number.isFinite(scaleX) && scaleX > 0.01 ? scaleX : 1,
        scaleY: Number.isFinite(scaleY) && scaleY > 0.01 ? scaleY : 1,
    };
}

/**
 * Returns an element's invariant resting layout rect (subtracting any active WAAPI FLIP
 * `translate` offset). Uses a `WeakMap` fast-path with zero `getComputedStyle()` calls.
 */
export function getRestingRect(el: HTMLElement): RectLike {
    const rect = el.getBoundingClientRect();
    const active = activeFlips.get(el);
    if (!active) {
        return rect;
    }

    const timing = active.anim.effect?.getComputedTiming();
    const progress = typeof timing?.progress === "number" ? timing.progress : 0;
    const remaining = 1 - progress;
    const { scaleX, scaleY } = getElementScale(el, rect);
    const remDx = active.fromDx * remaining * scaleX;
    const remDy = active.fromDy * remaining * scaleY;

    return {
        left: rect.left - remDx,
        top: rect.top - remDy,
        right: rect.right - remDx,
        bottom: rect.bottom - remDy,
        width: rect.width,
        height: rect.height,
    };
}

export class WaapiFlipEngine {
    /**
     * Captures live visual rects for all provided elements prior to a structural DOM mutation.
     */
    snapshot(elements: Iterable<HTMLElement>): Map<HTMLElement, DOMRect> {
        const rects = new Map<HTMLElement, DOMRect>();
        for (const el of elements) {
            rects.set(el, el.getBoundingClientRect());
        }
        return rects;
    }

    /**
     * Plays additive WAAPI `translate` FLIP animations from `snapshots` to each element's
     * new resting layout rect. Cancels any prior mid-flight FLIP synchronously before
     * measuring the new rect so interrupted siblings redirect seamlessly.
     */
    play(
        snapshots: Map<HTMLElement, DOMRect>,
        elements: Iterable<HTMLElement>,
        options: { animate: boolean; exclude?: HTMLElement | null; tokenSource?: Element | null },
    ): void {
        const shouldAnimate = options.animate && !prefersReducedMotion();
        const tokenEl = options.tokenSource ?? document.documentElement;
        const duration = shouldAnimate ? readCssDurationMs(tokenEl, "--cs-dnd-flip-dur", DEFAULT_FLIP_DUR_MS) : 0;
        const easing = shouldAnimate ? readCssEasing(tokenEl, "--cs-dnd-flip-ease", DEFAULT_EASE) : DEFAULT_EASE;

        for (const el of elements) {
            if (el === options.exclude) continue;

            const prevRect = snapshots.get(el);
            const existing = activeFlips.get(el);
            if (existing) {
                existing.anim.cancel();
                activeFlips.delete(el);
            }

            if (!shouldAnimate || !prevRect || duration <= 0 || typeof el.animate !== "function") {
                continue;
            }

            const nextRect = el.getBoundingClientRect();
            const viewportDx = prevRect.left - nextRect.left;
            const viewportDy = prevRect.top - nextRect.top;
            if (Math.abs(viewportDx) < 0.5 && Math.abs(viewportDy) < 0.5) {
                continue;
            }

            const { scaleX, scaleY } = getElementScale(el, nextRect);
            const dx = viewportDx / scaleX;
            const dy = viewportDy / scaleY;

            // Effect-level `easing` is required so `getComputedTiming().progress` reflects eased progress.
            const anim = el.animate(
                [{ translate: `${dx}px ${dy}px 0px` }, { translate: "0px 0px 0px" }],
                { duration, easing, composite: "add" },
            );

            const entry: ActiveFlipEntry = { anim, fromDx: dx, fromDy: dy };
            activeFlips.set(el, entry);

            const cleanup = (): void => {
                if (activeFlips.get(el) === entry) {
                    activeFlips.delete(el);
                }
            };
            anim.addEventListener("finish", cleanup, { once: true });
            anim.addEventListener("cancel", cleanup, { once: true });
        }
    }

    /**
     * Cancels active FLIP animations on the specified elements.
     */
    cancelElements(elements: Iterable<HTMLElement>): void {
        for (const el of elements) {
            const existing = activeFlips.get(el);
            if (existing) {
                existing.anim.cancel();
                activeFlips.delete(el);
            }
        }
    }

    /**
     * Animates the Top-Layer drag thumbnail's lift-off scale, rotate, and shadow ramp.
     * Deliberately animates independent CSS `scale`/`rotate` (never `transform`) so
     * pointermove `translate3d(...)` updates track the cursor at full frame rate from frame 1.
     */
    animatePickup(
        thumbnailEl: HTMLElement,
        options: { animate: boolean; scale: number; rotate: string },
    ): Animation | null {
        if (!options.animate || prefersReducedMotion() || typeof thumbnailEl.animate !== "function") {
            return null;
        }

        const duration = readCssDurationMs(thumbnailEl, "--cs-dnd-pickup-dur", DEFAULT_PICKUP_DUR_MS);
        if (duration <= 0) return null;

        const easing = readCssEasing(thumbnailEl, "--cs-dnd-pickup-ease", DEFAULT_EASE);

        return thumbnailEl.animate(
            [
                {
                    scale: "1",
                    rotate: "0deg",
                    boxShadow: "var(--cs-shadow-elevated)",
                },
                {
                    scale: String(options.scale),
                    rotate: options.rotate,
                    boxShadow: "var(--cs-dnd-thumbnail-shadow, var(--cs-shadow-floating))",
                },
            ],
            { duration, easing },
        );
    }

    /**
     * Animates the Top-Layer thumbnail from its release coordinates to the final target
     * or origin resting rect. Resolves synchronously in 0ms under `prefers-reduced-motion`
     * or when `animate: false`.
     */
    async animateFlight(
        thumbnailEl: HTMLElement,
        params: {
            fromX: number;
            fromY: number;
            toX: number;
            toY: number;
            fromScale: number;
            rotate: string;
            kind: "settle" | "cancel";
            animate: boolean;
            targetPaddingInlineStart?: string;
        },
    ): Promise<void> {
        const endX = Math.round(params.toX);
        const endY = Math.round(params.toY);
        const endTransform = `translate3d(${endX}px, ${endY}px, 0)`;

        const fromPadding =
            params.targetPaddingInlineStart && typeof window.getComputedStyle === "function"
                ? window.getComputedStyle(thumbnailEl).paddingInlineStart
                : "";
        const shouldAnimatePadding = Boolean(
            params.targetPaddingInlineStart && fromPadding && fromPadding !== params.targetPaddingInlineStart,
        );

        if (!params.animate || prefersReducedMotion() || typeof thumbnailEl.animate !== "function") {
            thumbnailEl.style.transform = endTransform;
            thumbnailEl.style.scale = "1";
            thumbnailEl.style.rotate = "0deg";
            if (shouldAnimatePadding && params.targetPaddingInlineStart) {
                thumbnailEl.style.paddingInlineStart = params.targetPaddingInlineStart;
            }
            return;
        }

        const startX = Math.round(params.fromX);
        const startY = Math.round(params.fromY);
        const distance = Math.hypot(endX - startX, endY - startY);

        const baseDur =
            params.kind === "settle"
                ? readCssDurationMs(thumbnailEl, "--cs-dnd-settle-dur", DEFAULT_SETTLE_DUR_MS)
                : readCssDurationMs(thumbnailEl, "--cs-dnd-cancel-dur", DEFAULT_CANCEL_DUR_MS);

        if (baseDur <= 0) {
            thumbnailEl.style.transform = endTransform;
            thumbnailEl.style.scale = "1";
            thumbnailEl.style.rotate = "0deg";
            if (shouldAnimatePadding && params.targetPaddingInlineStart) {
                thumbnailEl.style.paddingInlineStart = params.targetPaddingInlineStart;
            }
            return;
        }

        // Compress short micro-drops (< 24px) proportionally down to 120ms so dropping in place feels crisp.
        const duration =
            params.kind === "settle" && distance < SHORT_SETTLE_THRESHOLD_PX
                ? Math.round(
                      SHORT_SETTLE_FLOOR_MS +
                          Math.max(0, baseDur - SHORT_SETTLE_FLOOR_MS) * (distance / SHORT_SETTLE_THRESHOLD_PX),
                  )
                : baseDur;

        const easing = readCssEasing(
            thumbnailEl,
            params.kind === "settle" ? "--cs-dnd-settle-ease" : "--cs-dnd-cancel-ease",
            DEFAULT_EASE,
        );

        const startFrame: Keyframe = {
            transform: `translate3d(${startX}px, ${startY}px, 0)`,
            scale: String(params.fromScale),
            rotate: params.rotate,
            boxShadow: "var(--cs-dnd-thumbnail-shadow, var(--cs-shadow-floating))",
            ...(shouldAnimatePadding && { paddingInlineStart: fromPadding }),
        };
        const endFrame: Keyframe = {
            transform: endTransform,
            scale: "1",
            rotate: "0deg",
            boxShadow: "none",
            ...(shouldAnimatePadding &&
                params.targetPaddingInlineStart && { paddingInlineStart: params.targetPaddingInlineStart }),
        };

        const anim = thumbnailEl.animate([startFrame, endFrame], { duration, easing, fill: "forwards" });

        try {
            await anim.finished;
        } catch {
            // Animation was cancelled mid-flight (e.g. destroy() or new drag).
        }
    }

    /**
     * Smoothly dissolves the thumbnail in place when a dropped item is consumed/unmounted
     * by the consumer (e.g. dropped into a free dropzone or trash target), avoiding a flight
     * to a detached element's `(0, 0)` rect.
     */
    async animateDissolve(
        thumbnailEl: HTMLElement,
        params: { fromScale: number; rotate: string; animate: boolean },
    ): Promise<void> {
        if (!params.animate || prefersReducedMotion() || typeof thumbnailEl.animate !== "function") {
            thumbnailEl.style.opacity = "0";
            return;
        }

        const anim = thumbnailEl.animate(
            [
                {
                    scale: String(params.fromScale),
                    rotate: params.rotate,
                    opacity: 1,
                },
                {
                    scale: "0.88",
                    rotate: "0deg",
                    opacity: 0,
                },
            ],
            { duration: 140, easing: "cubic-bezier(0.5, 1, 0.89, 1)", fill: "forwards" },
        );

        try {
            await anim.finished;
        } catch {
            // Animation was cancelled mid-flight.
        }
    }
}
