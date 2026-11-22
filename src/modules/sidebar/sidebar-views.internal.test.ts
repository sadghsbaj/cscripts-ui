import { afterEach, describe, expect, test } from "vitest";

import { extractSidebarItemLabel } from "./sidebar-context.internal.ts";
import {
    isFocusInsideElement,
    resolveIncomingViewFocusTarget,
    resolveViewHistoryTransition,
} from "./sidebar-views.internal.ts";

describe("sidebar-views.internal", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    describe("resolveViewHistoryTransition", () => {
        test("pushes new views onto stack and resolves forward direction in auto mode", () => {
            const step1 = resolveViewHistoryTransition(["root"], "settings", "auto");
            expect(step1).toEqual({
                nextHistory: ["root", "settings"],
                direction: "forward",
            });

            const step2 = resolveViewHistoryTransition(step1.nextHistory, "account", "auto");
            expect(step2).toEqual({
                nextHistory: ["root", "settings", "account"],
                direction: "forward",
            });
        });

        test("pops stack when revisiting an earlier entry and resolves backward direction", () => {
            const backToSettings = resolveViewHistoryTransition(
                ["root", "settings", "account"],
                "settings",
                "auto"
            );
            expect(backToSettings).toEqual({
                nextHistory: ["root", "settings"],
                direction: "backward",
            });

            const backToRoot = resolveViewHistoryTransition(
                ["root", "settings", "account"],
                "root",
                "auto"
            );
            expect(backToRoot).toEqual({
                nextHistory: ["root"],
                direction: "backward",
            });
        });

        test("respects explicit direction override on push and pop", () => {
            const forcedForwardOnPop = resolveViewHistoryTransition(
                ["root", "settings", "account"],
                "root",
                "forward"
            );
            expect(forcedForwardOnPop).toEqual({
                nextHistory: ["root"],
                direction: "forward",
            });

            const forcedBackwardOnPush = resolveViewHistoryTransition(
                ["root"],
                "settings",
                "backward"
            );
            expect(forcedBackwardOnPush).toEqual({
                nextHistory: ["root", "settings"],
                direction: "backward",
            });
        });

        test("handles same-view no-op without mutating or duplicating stack", () => {
            const history = ["root", "settings"];
            const sameAuto = resolveViewHistoryTransition(history, "settings", "auto");
            expect(sameAuto).toEqual({
                nextHistory: ["root", "settings"],
                direction: "forward",
            });
            expect(sameAuto.nextHistory).not.toBe(history);

            const sameBackward = resolveViewHistoryTransition(history, "settings", "backward");
            expect(sameBackward).toEqual({
                nextHistory: ["root", "settings"],
                direction: "backward",
            });
        });

        test("handles empty history gracefully", () => {
            expect(resolveViewHistoryTransition([], "root", "auto")).toEqual({
                nextHistory: ["root"],
                direction: "forward",
            });
        });
    });

    describe("resolveIncomingViewFocusTarget", () => {
        test("returns null for null viewElement or initialFocus='none'", () => {
            const view = document.createElement("div");
            const btn = document.createElement("button");
            view.append(btn);
            document.body.append(view);

            expect(resolveIncomingViewFocusTarget(null, "auto")).toBeNull();
            expect(resolveIncomingViewFocusTarget(view, "none")).toBeNull();
        });

        test("resolves [data-autofocus] before earlier focusable elements", () => {
            const view = document.createElement("div");
            const firstBtn = document.createElement("button");
            firstBtn.textContent = "Back";
            const autoBtn = document.createElement("button");
            autoBtn.dataset.autofocus = "";
            autoBtn.textContent = "Primary";
            view.append(firstBtn, autoBtn);
            document.body.append(view);

            expect(resolveIncomingViewFocusTarget(view, "auto")).toBe(autoBtn);
        });

        test("skips disabled, aria-disabled, inert, negative tabindex, and hidden candidates", () => {
            const view = document.createElement("div");

            const disabledBtn = document.createElement("button");
            disabledBtn.disabled = true;
            disabledBtn.dataset.autofocus = "";

            const ariaDisabledLink = document.createElement("a");
            ariaDisabledLink.href = "#";
            ariaDisabledLink.setAttribute("aria-disabled", "true");

            const negTabBtn = document.createElement("button");
            negTabBtn.setAttribute("tabindex", "-1");

            const hiddenBtn = document.createElement("button");
            hiddenBtn.hidden = true;

            const ariaHiddenBtn = document.createElement("button");
            ariaHiddenBtn.setAttribute("aria-hidden", "true");

            const inertWrapper = document.createElement("div");
            inertWrapper.setAttribute("inert", "");
            const inertBtn = document.createElement("button");
            inertWrapper.append(inertBtn);

            const validInput = document.createElement("input");
            validInput.type = "text";

            view.append(
                disabledBtn,
                ariaDisabledLink,
                negTabBtn,
                hiddenBtn,
                ariaHiddenBtn,
                inertWrapper,
                validInput
            );
            document.body.append(view);

            expect(resolveIncomingViewFocusTarget(view, "auto")).toBe(validInput);
        });

        test("supports explicit HTMLElement and function initialFocus when connected and non-inert", () => {
            const view = document.createElement("div");
            const target = document.createElement("button");
            const disconnected = document.createElement("button");
            view.append(target);
            document.body.append(view);

            expect(resolveIncomingViewFocusTarget(view, target)).toBe(target);
            expect(resolveIncomingViewFocusTarget(view, () => target)).toBe(target);
            expect(resolveIncomingViewFocusTarget(view, disconnected)).toBeNull();
            expect(resolveIncomingViewFocusTarget(view, () => null)).toBeNull();

            view.setAttribute("inert", "");
            expect(resolveIncomingViewFocusTarget(view, target)).toBeNull();
            expect(resolveIncomingViewFocusTarget(view, () => target)).toBeNull();
        });
    });

    describe("isFocusInsideElement", () => {
        test("detects whether document.activeElement is inside container", () => {
            const container = document.createElement("div");
            const insideBtn = document.createElement("button");
            const outsideBtn = document.createElement("button");
            container.append(insideBtn);
            document.body.append(container, outsideBtn);

            expect(isFocusInsideElement(null)).toBe(false);

            outsideBtn.focus();
            expect(isFocusInsideElement(container)).toBe(false);

            insideBtn.focus();
            expect(isFocusInsideElement(container)).toBe(true);
        });
    });
});

describe("sidebar-context.internal", () => {
    describe("extractSidebarItemLabel", () => {
        test("prefers registered label element text", () => {
            const root = document.createElement("button");
            const label = document.createElement("span");
            label.textContent = "  Dashboard  ";
            root.append(label);

            expect(extractSidebarItemLabel(label, root)).toBe("Dashboard");
        });

        test("falls back to root text nodes and non-decorative children", () => {
            const root = document.createElement("button");

            const hitArea = document.createElement("span");
            hitArea.className = "cs-hit-area";
            hitArea.textContent = "Hit";

            const icon = document.createElement("span");
            icon.className = "cs-sidebar-item-icon";
            icon.textContent = "Icon";

            const badge = document.createElement("span");
            badge.className = "cs-sidebar-item-badge";
            badge.textContent = "99";

            const chevron = document.createElement("span");
            chevron.className = "cs-sidebar-group-chevron";
            chevron.textContent = ">";

            const labelSpan = document.createElement("span");
            labelSpan.textContent = "Settings";

            root.append(hitArea, icon, document.createTextNode("  "), labelSpan, badge, chevron);

            expect(extractSidebarItemLabel(null, root)).toBe("Settings");
            expect(extractSidebarItemLabel(null, null)).toBe("");
        });
    });
});
