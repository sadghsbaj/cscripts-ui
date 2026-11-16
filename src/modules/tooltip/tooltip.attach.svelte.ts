import { mount, unmount } from "svelte";
import type { Attachment } from "svelte/attachments";

import type { TooltipIconConfig } from ".";
import { resolveGetter } from "../../shared/resolve-getter.ts";
import { popoverTrigger, type PopoverPlacement } from "../popover";
import Tooltip from "./Tooltip.svelte";

export type TooltipBaseOptions = {
    placement?: PopoverPlacement;
    offset?: string;
    /**
     * Open and close delays in milliseconds: `[openMs, closeMs]`.
     * @default [400, 150]
     */
    delay?: [number, number];
    /**
     * Whether the tooltip attachment is active.
     * @default true
     */
    enabled?: boolean | (() => boolean);
};

export type TooltipOptions =
    | (TooltipBaseOptions & {
          text: string;
          icon?: TooltipIconConfig;
          target?: never;
      })
    | (TooltipBaseOptions & {
          target: string;
          text?: never;
          icon?: never;
      });

type NormalizedOptions = TooltipBaseOptions & {
    text?: string;
    icon?: TooltipIconConfig;
    target?: string;
};

type MountedTooltipState = {
    id: string;
    props: {
        id: string;
        text: string;
        icon?: TooltipIconConfig;
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
        return existing.id;
    }

    const id = `tooltip-${crypto.randomUUID()}`;
    const reactiveProps = $state({
        id,
        text,
        icon: opts.icon,
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
        targetEl.style.setProperty("--cs-popover-offset", opts.offset);
    }
}

export function tooltip(options: TooltipOptions): Attachment<HTMLElement> {
    return (node) => {
        if (!(resolveGetter(options.enabled) ?? true)) {
            return () => {};
        }

        const id = resolveTooltipId(node, options);
        const unbindTrigger = popoverTrigger({ target: id, triggerOn: "hover", delay: options.delay })(node);

        node.setAttribute("aria-describedby", id);
        applyTargetStyles(id, options);

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
