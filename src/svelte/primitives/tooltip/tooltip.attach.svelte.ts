/**
 * @description Svelte 5 DOM attachment that powers tooltips across simple text and custom overlays.
 *
 * Core Capabilities:
 * - Dual Mode: Automatically mounts a lightweight `<Tooltip />` instance when given a string or `text`,
 *   or pairs seamlessly with a custom compound tooltip element via its `target` ID.
 * - Automated Wiring: Manages `--anchor-${id}`, `interest-delay`, `interestfor`, and accessibility
 *   via `aria-describedby` without manual attribute wiring.
 * - Centralized Configuration: Drives positioning (`data-placement`) and `--popover-offset` directly
 *   on the target element, ensuring all settings live in the attachment rather than component props.
 * - Warmup Phase: Tracks global tooltip dismissal timestamps (`WARMUP_WINDOW_MS = 300`) to open
 *   instantaneously (`0ms` delay) when moving between adjacent tooltip triggers, and restores the
 *   full delay once cold.
 * - Dismissal Lifecycle: Automatically dismisses on click (`pointerdown`), keyboard action (`Space` / `Enter`),
 *   and viewport or container scrolling (`scroll` with capture), re-arming upon pointer leave so tooltips
 *   never obstruct ongoing interactions.
 */

import { mount, unmount } from "svelte";
import type { Attachment } from "svelte/attachments";

import { type PopoverPlacement } from "../popover";
import Tooltip from "./Tooltip.svelte";

export type TooltipBaseOptions = {
    placement?: PopoverPlacement;
    offset?: string;
    delay?: string;
};

export type TooltipAttachmentOptions =
    | string
    | (TooltipBaseOptions & {
          text: string;
          target?: never;
      })
    | (TooltipBaseOptions & {
          target: string;
          text?: never;
      });

type NormalizedOptions = TooltipBaseOptions & {
    text?: string;
    target?: string;
};

type MountedTooltipState = {
    id: string;
    props: { id: string; text: string };
    instance: Record<string, unknown>;
};

const mountedTooltips = new WeakMap<HTMLElement, MountedTooltipState>();

let lastCloseTimestamp = 0;
const WARMUP_WINDOW_MS = 300;

function resolveTooltipId(node: HTMLElement, opts: NormalizedOptions): string {
    if (typeof opts.target === "string") {
        return opts.target;
    }

    const text = opts.text ?? "";
    const existing = mountedTooltips.get(node);

    if (existing) {
        existing.props.text = text;
        return existing.id;
    }

    const id = `tooltip-${crypto.randomUUID()}`;
    const reactiveProps = $state({ id, text });
    const instance = mount(Tooltip, {
        target: document.body,
        props: reactiveProps,
    });

    mountedTooltips.set(node, { id, props: reactiveProps, instance });
    return id;
}

function applyTriggerAttributes(node: HTMLElement, id: string, delay: string): void {
    node.style.setProperty("anchor-name", `--anchor-${id}`);
    node.style.setProperty("interest-delay", delay);
    node.setAttribute("interestfor", id);
    node.setAttribute("aria-describedby", id);
}

function applyTargetStyles(id: string, opts: NormalizedOptions): HTMLElement | null {
    const targetEl = document.getElementById(id);
    if (!targetEl) return null;

    if (opts.placement) {
        targetEl.dataset.placement = opts.placement;
    }
    if (opts.offset) {
        targetEl.style.setProperty("--popover-offset", opts.offset);
    }

    return targetEl;
}

function bindDismissLifecycle(
    node: HTMLElement,
    id: string,
    targetEl: HTMLElement | null,
    defaultDelay: string
): () => void {
    const closeDelay = defaultDelay.split(" ", 2)[1] ?? "150ms";

    const dismiss = (): void => {
        if (targetEl?.matches(":popover-open")) {
            targetEl.hidePopover();
            lastCloseTimestamp = Date.now();
        }
        node.removeAttribute("interestfor");
    };

    const restore = (): void => {
        if (targetEl?.matches(":popover-open")) {
            lastCloseTimestamp = Date.now();
        }
        if (!node.hasAttribute("interestfor")) {
            node.setAttribute("interestfor", id);
        }
        node.style.setProperty("interest-delay", defaultDelay);
    };

    const applyWarmup = (): void => {
        const isWarm = Date.now() - lastCloseTimestamp < WARMUP_WINDOW_MS;
        node.style.setProperty("interest-delay", isWarm ? `0ms ${closeDelay}` : defaultDelay);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "Enter" || event.key === " ") {
            dismiss();
        }
    };

    const handleScroll = (event: Event): void => {
        if (!targetEl?.matches(":popover-open")) return;
        if (event.target instanceof Node && targetEl.contains(event.target)) return;
        dismiss();
    };

    node.addEventListener("pointerenter", applyWarmup);
    node.addEventListener("focusin", applyWarmup);
    node.addEventListener("pointerdown", dismiss);
    node.addEventListener("keydown", handleKeyDown);
    node.addEventListener("pointerleave", restore);
    node.addEventListener("focusout", restore);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    return () => {
        node.removeEventListener("pointerenter", applyWarmup);
        node.removeEventListener("focusin", applyWarmup);
        node.removeEventListener("pointerdown", dismiss);
        node.removeEventListener("keydown", handleKeyDown);
        node.removeEventListener("pointerleave", restore);
        node.removeEventListener("focusout", restore);
        window.removeEventListener("scroll", handleScroll, { capture: true });
    };
}

export function tooltip(options: TooltipAttachmentOptions): Attachment<HTMLElement> {
    return (node) => {
        const opts: NormalizedOptions = typeof options === "string" ? { text: options } : options;
        const delay = opts.delay ?? "400ms 150ms";

        const id = resolveTooltipId(node, opts);
        applyTriggerAttributes(node, id, delay);

        const targetEl = applyTargetStyles(id, opts);
        const unbindLifecycle = bindDismissLifecycle(node, id, targetEl, delay);

        return () => {
            unbindLifecycle();

            queueMicrotask(() => {
                if (node.isConnected && node.hasAttribute("aria-describedby")) {
                    return;
                }

                const entry = mountedTooltips.get(node);
                if (entry) {
                    unmount(entry.instance);
                    mountedTooltips.delete(node);
                }
            });

            node.style.removeProperty("anchor-name");
            node.style.removeProperty("interest-delay");
            node.removeAttribute("interestfor");
            node.removeAttribute("aria-describedby");
        };
    };
}
