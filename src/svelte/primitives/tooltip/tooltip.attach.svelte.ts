/**
 * @description Svelte 5 DOM attachment that powers tooltips across simple text and custom overlays.
 *
 * Built on top of `popoverTrigger({ mode: "hint" })`, which owns all trigger behavior (anchor wiring,
 * `interestfor` and delays, warmup phase, focus-restoration guard, dismissal on press, key and scroll).
 *
 * Core Capabilities:
 * - Dual Mode: Automatically mounts a lightweight `<Tooltip />` instance when given a string or `text`,
 *   or pairs seamlessly with a custom compound tooltip element via its `target` ID.
 * - Accessibility: Manages `aria-describedby` without manual attribute wiring.
 * - Centralized Configuration: Drives positioning (`data-placement`) and `--popover-offset` directly
 *   on the target element, ensuring all settings live in the attachment rather than component props.
 */

import { mount, unmount } from "svelte";
import type { Attachment } from "svelte/attachments";

import type { TooltipIconConfig } from ".";
import { popoverTrigger, type PopoverPlacement } from "../popover";
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
          icon?: TooltipIconConfig;
          shortcut?: string | string[];
          target?: never;
      })
    | (TooltipBaseOptions & {
          target: string;
          text?: never;
          icon?: never;
          shortcut?: never;
      });

type NormalizedOptions = TooltipBaseOptions & {
    text?: string;
    icon?: TooltipIconConfig;
    shortcut?: string | string[];
    target?: string;
};

type MountedTooltipState = {
    id: string;
    props: {
        id: string;
        text: string;
        icon?: TooltipIconConfig;
        shortcut?: string | string[];
    };
    instance: Record<string, unknown>;
};

const mountedTooltips = new WeakMap<HTMLElement, MountedTooltipState>();

function resolveTooltipId(node: HTMLElement, opts: NormalizedOptions): string {
    if (typeof opts.target === "string") {
        return opts.target;
    }

    const text = opts.text ?? "";
    const existing = mountedTooltips.get(node);

    if (existing) {
        existing.props.text = text;
        existing.props.icon = opts.icon;
        existing.props.shortcut = opts.shortcut;
        return existing.id;
    }

    const id = `tooltip-${crypto.randomUUID()}`;
    const reactiveProps = $state({
        id,
        text,
        icon: opts.icon,
        shortcut: opts.shortcut,
    });
    const instance = mount(Tooltip, {
        target: document.body,
        props: reactiveProps,
    });

    mountedTooltips.set(node, { id, props: reactiveProps, instance });
    return id;
}

function applyTargetStyles(id: string, opts: NormalizedOptions): void {
    const targetEl = document.getElementById(id);
    if (!targetEl) return;

    targetEl.dataset.placement = opts.placement ?? targetEl.dataset.placement ?? "top";

    if (opts.offset) {
        targetEl.style.setProperty("--popover-offset", opts.offset);
    }
}

export function tooltip(options: TooltipAttachmentOptions): Attachment<HTMLElement> {
    return (node) => {
        const opts: NormalizedOptions = typeof options === "string" ? { text: options } : options;

        const id = resolveTooltipId(node, opts);
        const unbindTrigger = popoverTrigger({ target: id, mode: "hint", delay: opts.delay })(node);

        node.setAttribute("aria-describedby", id);
        applyTargetStyles(id, opts);

        return () => {
            if (typeof unbindTrigger === "function") unbindTrigger();

            // A reactive re-run re-applies `aria-describedby` synchronously, so the tooltip instance
            // is only unmounted once the trigger is really gone.
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

            node.removeAttribute("aria-describedby");
        };
    };
}
