import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    formatConflictFieldLabel,
    formatConflictKindHint,
    formatConflictValue,
} from "./conflict-format.internal.ts";
import * as ConflictModalBarrel from "./index.ts";
import {
    WORK_CONFLICT_KINDS,
    type WorkConflictField,
    type WorkConflictFieldRenderContext,
    WorkConflictModal,
    type WorkConflictValueRenderContext,
} from "./index.ts";

function dispatchKey(
    key: string,
    options: KeyboardEventInit = {},
    target: EventTarget = document,
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });
    target.dispatchEvent(event);
    return event;
}

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Expected element matching "${selector}"`);
    return el;
}

function getButtonByText(root: ParentNode, text: string): HTMLButtonElement | undefined {
    return [...root.querySelectorAll<HTMLButtonElement>("button")].find(
        (btn) => btn.textContent?.trim() === text,
    );
}

function mustGetButtonByText(root: ParentNode, text: string): HTMLButtonElement {
    const btn = getButtonByText(root, text);
    if (!btn) throw new Error(`Expected button with text "${text}"`);
    return btn;
}

function getFieldGroups(root: ParentNode): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('.cs-work-conflict-field[role="radiogroup"]')];
}

function mustGetFieldGroup(root: ParentNode, index: number): HTMLElement {
    const group = getFieldGroups(root)[index];
    if (!group) throw new Error(`Expected field radiogroup at index ${index}`);
    return group;
}

function mustGetFieldRadios(
    root: ParentNode,
    index: number,
): [HTMLButtonElement, HTMLButtonElement] {
    const group = mustGetFieldGroup(root, index);
    const radios = group.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    const localBtn = radios[0];
    const remoteBtn = radios[1];
    if (!localBtn || !remoteBtn) {
        throw new Error(`Expected 2 radio buttons in field radiogroup at index ${index}`);
    }
    return [localBtn, remoteBtn];
}

function mountReactive<
    TProps extends object,
    TExports extends Record<string, unknown>,
    TBindings extends "" | keyof TProps = "" | keyof TProps,
>(
    component: Component<TProps, TExports, TBindings>,
    target: HTMLElement,
    instances: Array<Record<string, unknown>>,
    initialProps: NoInfer<TProps>,
): {
    instance: TExports;
    update: (next: Partial<NoInfer<TProps>>) => void;
} {
    const props = $state(initialProps);
    const instance = mount(component, {
        target,
        props,
    });
    instances.push(instance as Record<string, unknown>);
    flushSync();

    return {
        instance,
        update(next: Partial<NoInfer<TProps>>): void {
            Object.assign(props, next);
            flushSync();
        },
    };
}

function makeField(
    id: string,
    overrides: Partial<Omit<WorkConflictField, "id">> = {},
): WorkConflictField {
    return {
        id,
        label: overrides.label,
        localValue: "Local value",
        remoteValue: "Remote value",
        ...overrides,
    };
}

function makeCustomFieldSnippet(customValue: unknown): Snippet<[WorkConflictFieldRenderContext]> {
    return createRawSnippet<[WorkConflictFieldRenderContext]>((getCtx) => ({
        render: () =>
            `<div class="custom-field"><button type="button" class="pick-custom">Merge</button></div>`,
        setup(node) {
            const btn = mustQuery<HTMLButtonElement>(node, ".pick-custom");
            btn.addEventListener("click", () => {
                getCtx().choose({ custom: customValue });
            });
        },
    }));
}

describe("work/conflict-modal", () => {
    let container: HTMLDivElement;
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(async () => {
        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;

        await Promise.resolve();
        vi.advanceTimersByTime(500);
        vi.clearAllTimers();

        container.remove();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe("barrel isolation & public exports", () => {
        test("exports only WorkConflictModal and WORK_CONFLICT_KINDS and never leaks internal formatters", () => {
            expect(Object.keys(ConflictModalBarrel).toSorted((a, b) => a.localeCompare(b))).toEqual([
                "WORK_CONFLICT_KINDS",
                "WorkConflictModal",
            ]);
            expect(WORK_CONFLICT_KINDS).toEqual([
                "value-mismatch",
                "delete-edit",
                "type-mismatch",
                "duplicate-array-key",
            ]);
            expect("formatConflictFieldLabel" in ConflictModalBarrel).toBe(false);
            expect("formatConflictKindHint" in ConflictModalBarrel).toBe(false);
            expect("formatConflictValue" in ConflictModalBarrel).toBe(false);
        });
    });

    describe("simple mode (data-mode='simple')", () => {
        test("renders dialog A11y attributes, default copy, resourceLabel pill, queuePosition, and CTA callbacks", () => {
            const onKeepLocal = vi.fn();
            const onKeepRemote = vi.fn();
            let modalRef: HTMLDivElement | null = null;

            const { update } = mountReactive(WorkConflictModal, container, instances, {
                get ref() {
                    return modalRef;
                },
                set ref(el: HTMLDivElement | null) {
                    modalRef = el;
                },
                resourceLabel: "  Auftrag #42  ",
                queuePosition: { current: 1, total: 3 },
                onKeepLocal,
                onKeepRemote,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            expect(modalRef).toBe(dialog);
            expect(dialog.dataset.mode).toBe("simple");
            expect("remoteDeleted" in dialog.dataset).toBe(false);
            expect(dialog.getAttribute("role")).toBe("dialog");
            expect(dialog.getAttribute("aria-modal")).toBe("true");

            const labelledBy = dialog.getAttribute("aria-labelledby");
            const describedBy = dialog.getAttribute("aria-describedby");
            expect(labelledBy).toBeTruthy();
            expect(describedBy).toBeTruthy();

            const titleEl = labelledBy ? document.getElementById(labelledBy) : null;
            const descEl = describedBy ? document.getElementById(describedBy) : null;
            expect(titleEl?.textContent?.trim()).toBe("Version conflict");
            expect(descEl?.textContent?.trim()).toBe(
                "This entry was changed in the meantime. Choose which version to keep.",
            );

            expect(
                container.querySelector(".cs-work-conflict-resource-pill-name")?.textContent?.trim(),
            ).toBe("Auftrag #42");
            expect(container.querySelector(".cs-work-conflict-queue")?.textContent?.trim()).toBe(
                "1 of 3",
            );

            const keepLocalBtn = mustGetButtonByText(dialog, "Keep your version");
            const keepRemoteBtn = mustGetButtonByText(dialog, "Use current version");

            keepLocalBtn.click();
            expect(onKeepLocal).toHaveBeenCalledTimes(1);
            expect(onKeepRemote).not.toHaveBeenCalled();

            keepRemoteBtn.click();
            expect(onKeepRemote).toHaveBeenCalledTimes(1);
            expect(onKeepLocal).toHaveBeenCalledTimes(1);

            // Whitespace resourceLabel and single-item queuePosition hide optional pills
            update({ resourceLabel: " ".repeat(3), queuePosition: { current: 1, total: 1 } });
            expect(container.querySelector(".cs-work-conflict-resource-pill")).toBeNull();
            expect(container.querySelector(".cs-work-conflict-queue")).toBeNull();

            // Custom title and description override defaults
            update({ title: "Custom title", description: "Custom description" });
            expect(titleEl?.textContent?.trim()).toBe("Custom title");
            expect(descEl?.textContent?.trim()).toBe("Custom description");
        });

        test("renders remoteDeleted copy, data-remote-deleted attribute, negative CTA, and calls onKeepRemote", () => {
            const onKeepLocal = vi.fn();
            const onKeepRemote = vi.fn();

            const { update } = mountReactive(WorkConflictModal, container, instances, {
                remoteDeleted: true,
                onKeepLocal,
                onKeepRemote,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            expect(dialog.dataset.mode).toBe("simple");
            expect("remoteDeleted" in dialog.dataset).toBe(true);
            expect(
                container.querySelector(".cs-work-conflict-simple-title")?.textContent?.trim(),
            ).toBe("Entry deleted");
            expect(
                container
                    .querySelector(".cs-work-conflict-simple-description")
                    ?.textContent?.trim(),
            ).toBe(
                "This entry was deleted in the meantime. Do you want to keep your version or accept the deletion?",
            );

            const keepLocalBtn = mustGetButtonByText(dialog, "Keep your version");
            const acceptDeletionBtn = mustGetButtonByText(dialog, "Accept deletion");
            expect("negative" in acceptDeletionBtn.dataset).toBe(true);
            expect(getButtonByText(dialog, "Use current version")).toBeUndefined();

            acceptDeletionBtn.click();
            expect(onKeepRemote).toHaveBeenCalledTimes(1);
            expect(onKeepLocal).not.toHaveBeenCalled();

            keepLocalBtn.click();
            expect(onKeepLocal).toHaveBeenCalledTimes(1);

            // Clearing remoteDeleted restores normal conflict CTA and removes data-remote-deleted
            update({ remoteDeleted: false });
            expect("remoteDeleted" in dialog.dataset).toBe(false);
            expect(getButtonByText(dialog, "Accept deletion")).toBeUndefined();
            expect(getButtonByText(dialog, "Use current version")).toBeDefined();
        });

        test("renders role='alert' for non-empty errorMessage and disables actions when busy={true}", () => {
            const onKeepLocal = vi.fn();
            const onKeepRemote = vi.fn();

            const { update } = mountReactive(WorkConflictModal, container, instances, {
                errorMessage: " ".repeat(3),
                busy: true,
                onKeepLocal,
                onKeepRemote,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            expect(container.querySelector('[role="alert"]')).toBeNull();
            expect("busy" in dialog.dataset).toBe(true);

            const keepLocalBtn = mustGetButtonByText(dialog, "Keep your version");
            const keepRemoteBtn = mustGetButtonByText(dialog, "Use current version");
            expect(keepLocalBtn.disabled).toBe(true);
            expect(keepRemoteBtn.disabled).toBe(true);

            keepLocalBtn.click();
            keepRemoteBtn.click();
            expect(onKeepLocal).not.toHaveBeenCalled();
            expect(onKeepRemote).not.toHaveBeenCalled();

            update({ errorMessage: "  Save failed  ", busy: false });
            const alert = mustQuery<HTMLElement>(container, '[role="alert"]');
            expect(alert.textContent?.trim()).toBe("Save failed");
            expect("busy" in dialog.dataset).toBe(false);
            expect(keepLocalBtn.disabled).toBe(false);
            expect(keepRemoteBtn.disabled).toBe(false);

            keepLocalBtn.click();
            expect(onKeepLocal).toHaveBeenCalledTimes(1);

            update({ errorMessage: null });
            expect(container.querySelector('[role="alert"]')).toBeNull();
        });

        test("nudge() sets data-blocked, clears on self animationend or timeout, and restarts on repeated calls", () => {
            const onanimationend = vi.fn();
            const { instance } = mountReactive(WorkConflictModal, container, instances, {
                onanimationend,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            const title = mustQuery<HTMLElement>(container, ".cs-work-conflict-simple-title");
            const modalApi = instance as unknown as { nudge: () => void };

            expect("blocked" in dialog.dataset).toBe(false);

            modalApi.nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Bubbling child animationend must NOT clear data-blocked
            title.dispatchEvent(new Event("animationend", { bubbles: true }));
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Repeated nudge clears synchronously, re-applies on next rAF, and resets 320ms timer
            vi.advanceTimersByTime(200);
            flushSync();
            modalApi.nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);

            vi.advanceTimersByTime(20);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            vi.advanceTimersByTime(200);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);

            // Self animationend clears immediately and forwards onanimationend
            dialog.dispatchEvent(new Event("animationend", { bubbles: true }));
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);
            expect(onanimationend).toHaveBeenCalled();

            // Timeout fallback also clears data-blocked
            modalApi.nudge();
            flushSync();
            expect("blocked" in dialog.dataset).toBe(true);
            vi.advanceTimersByTime(320);
            flushSync();
            expect("blocked" in dialog.dataset).toBe(false);
        });

        test("activates focusTrap only inside .cs-overlay where Escape triggers nudge()", () => {
            const outsideBtn = document.createElement("button");
            outsideBtn.textContent = "Outside";
            document.body.append(outsideBtn);
            outsideBtn.focus();

            // Inline mount: focus stays outside and Escape does not nudge
            const inlineHost = document.createElement("div");
            container.append(inlineHost);
            mountReactive(WorkConflictModal, inlineHost, instances, {});
            vi.advanceTimersByTime(20);

            const inlineDialog = mustQuery<HTMLDivElement>(inlineHost, ".cs-work-conflict-modal");
            expect(document.activeElement).toBe(outsideBtn);
            dispatchKey("Escape");
            flushSync();
            expect("blocked" in inlineDialog.dataset).toBe(false);

            const inlineInstance = instances.pop();
            if (inlineInstance) unmount(inlineInstance);
            inlineHost.remove();

            // Inside .cs-overlay: focusTrap focuses first CTA and Escape triggers nudge()
            const overlay = document.createElement("div");
            overlay.className = "cs-overlay";
            container.append(overlay);
            mountReactive(WorkConflictModal, overlay, instances, {});
            vi.advanceTimersByTime(20);

            const overlayDialog = mustQuery<HTMLDivElement>(overlay, ".cs-work-conflict-modal");
            const firstCta = mustGetButtonByText(overlayDialog, "Keep your version");
            expect(document.activeElement).toBe(firstCta);

            const escapeEvent = dispatchKey("Escape");
            flushSync();
            expect(escapeEvent.defaultPrevented).toBe(true);
            expect("blocked" in overlayDialog.dataset).toBe(true);

            outsideBtn.remove();
        });
    });

    describe("per-field mode (data-mode='fields')", () => {
        test("omits SegmentedControl for 1–2 fields and renders synced quick-select for 3+ fields", () => {
            const fields2 = [
                makeField("a", { label: "Alpha" }),
                makeField("b", { label: "Beta" }),
            ];
            const fields3 = [
                makeField("a", { label: "Alpha", localValue: "L1", remoteValue: "R1" }),
                makeField("b", { label: "Beta", localValue: "L2", remoteValue: "R2" }),
                makeField("c", { label: "Gamma", localValue: "L3", remoteValue: "R3" }),
            ];

            const { update } = mountReactive(WorkConflictModal, container, instances, {
                fields: fields2,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            expect(dialog.dataset.mode).toBe("fields");
            expect(container.querySelector(".cs-work-conflict-quick-select")).toBeNull();

            // Upgrade to 3 fields -> SegmentedControl appears with no initial active item
            update({ fields: fields3 });
            const quickSelect = mustQuery<HTMLElement>(container, ".cs-work-conflict-quick-select");
            const quickLocal = mustQuery<HTMLButtonElement>(
                quickSelect,
                'button[data-value="local"]',
            );
            const quickRemote = mustQuery<HTMLButtonElement>(
                quickSelect,
                'button[data-value="remote"]',
            );
            expect(quickLocal.dataset.state).toBe("inactive");
            expect(quickRemote.dataset.state).toBe("inactive");
            expect(quickLocal.getAttribute("aria-checked")).toBe("false");
            expect(quickRemote.getAttribute("aria-checked")).toBe("false");

            // Select all local via SegmentedControl
            quickLocal.click();
            flushSync();
            expect(quickLocal.dataset.state).toBe("active");
            expect(quickRemote.dataset.state).toBe("inactive");
            for (const i of [0, 1, 2]) {
                const [localBtn, remoteBtn] = mustGetFieldRadios(dialog, i);
                expect(localBtn.getAttribute("aria-checked")).toBe("true");
                expect(remoteBtn.getAttribute("aria-checked")).toBe("false");
            }

            // Select all remote via SegmentedControl
            quickRemote.click();
            flushSync();
            expect(quickLocal.dataset.state).toBe("inactive");
            expect(quickRemote.dataset.state).toBe("active");
            for (const i of [0, 1, 2]) {
                const [localBtn, remoteBtn] = mustGetFieldRadios(dialog, i);
                expect(localBtn.getAttribute("aria-checked")).toBe("false");
                expect(remoteBtn.getAttribute("aria-checked")).toBe("true");
            }

            // Changing one field back to local clears the SegmentedControl active state
            const [firstLocal] = mustGetFieldRadios(dialog, 0);
            firstLocal.click();
            flushSync();
            expect(quickLocal.dataset.state).toBe("inactive");
            expect(quickRemote.dataset.state).toBe("inactive");
            expect(quickLocal.getAttribute("aria-checked")).toBe("false");
            expect(quickRemote.getAttribute("aria-checked")).toBe("false");

            // Selecting the remaining fields individually to local re-activates quickLocal
            mustGetFieldRadios(dialog, 1)[0].click();
            mustGetFieldRadios(dialog, 2)[0].click();
            flushSync();
            expect(quickLocal.dataset.state).toBe("active");
            expect(quickRemote.dataset.state).toBe("inactive");
        });

        test("renders radiogroups, arrow-key toggling, kind hints, showBaseValue, and deleted/empty states", () => {
            const fields: WorkConflictField[] = [
                {
                    id: "f1",
                    label: "Title",
                    conflictKind: "delete-edit",
                    baseValue: "Old title",
                    localValue: undefined,
                    remoteValue: "New title",
                },
                {
                    id: "f2",
                    label: "Amount",
                    conflictKind: "type-mismatch",
                    baseValue: undefined,
                    localValue: "",
                    remoteValue: null,
                },
                {
                    id: "f3",
                    label: "Item",
                    conflictKind: "duplicate-array-key",
                    localValue: "A",
                    remoteValue: "B",
                },
            ];

            const { update } = mountReactive(WorkConflictModal, container, instances, {
                fields,
                showBaseValue: true,
                localLabel: "Mine",
                remoteLabel: "Server",
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            const groups = getFieldGroups(dialog);
            expect(groups).toHaveLength(3);

            // Kind hint badges
            const kindHints = groups.map((g) =>
                g.querySelector(".cs-work-conflict-field-kind")?.textContent?.trim(),
            );
            expect(kindHints).toEqual(["Deleted & edited", "Format changed", "Duplicate entry"]);

            const group0 = mustGetFieldGroup(dialog, 0);
            const group1 = mustGetFieldGroup(dialog, 1);

            // showBaseValue renders only when baseValue !== undefined
            expect(
                group0.querySelector(".cs-work-conflict-field-base-value")?.textContent?.trim(),
            ).toBe("Old title");
            expect(group1.querySelector(".cs-work-conflict-field-base")).toBeNull();

            // Custom localLabel / remoteLabel propagate to SegmentedControl and option headers
            const quickSelect = mustQuery<HTMLElement>(dialog, ".cs-work-conflict-quick-select");
            expect(
                mustQuery<HTMLElement>(quickSelect, 'button[data-value="local"]').textContent?.trim(),
            ).toBe("All: Mine");
            expect(
                mustQuery<HTMLElement>(
                    quickSelect,
                    'button[data-value="remote"]',
                ).textContent?.trim(),
            ).toBe("All: Server");

            // Deleted vs Empty value states
            const f1Values = group0.querySelectorAll<HTMLElement>(".cs-work-conflict-option-value");
            expect(f1Values[0]?.textContent?.trim()).toBe("Removed");
            expect(f1Values[0]?.dataset.state).toBe("deleted");
            expect(f1Values[1]?.textContent?.trim()).toBe("New title");
            expect(f1Values[1]?.dataset.state).toBe("value");

            const f2Values = group1.querySelectorAll<HTMLElement>(".cs-work-conflict-option-value");
            expect(f2Values[0]?.textContent?.trim()).toBe("Empty");
            expect(f2Values[0]?.dataset.state).toBe("empty");
            expect(f2Values[1]?.textContent?.trim()).toBe("Empty");
            expect(f2Values[1]?.dataset.state).toBe("empty");

            // Arrow-key navigation inside first radiogroup
            const [f1Local, f1Remote] = mustGetFieldRadios(dialog, 0);
            expect(f1Local.tabIndex).toBe(0);
            expect(f1Remote.tabIndex).toBe(0);

            f1Local.focus();
            const arrowRight = dispatchKey("ArrowRight", {}, f1Local);
            flushSync();
            expect(arrowRight.defaultPrevented).toBe(true);
            expect(f1Remote.getAttribute("aria-checked")).toBe("true");
            expect(f1Local.getAttribute("aria-checked")).toBe("false");
            expect("selected" in f1Remote.dataset).toBe(true);
            expect("dimmed" in f1Local.dataset).toBe(true);
            expect(document.activeElement).toBe(f1Remote);
            expect(f1Remote.tabIndex).toBe(0);
            expect(f1Local.tabIndex).toBe(-1);

            const arrowLeft = dispatchKey("ArrowLeft", {}, f1Remote);
            flushSync();
            expect(arrowLeft.defaultPrevented).toBe(true);
            expect(f1Local.getAttribute("aria-checked")).toBe("true");
            expect(document.activeElement).toBe(f1Local);

            // ArrowDown on local -> remote; ArrowUp on remote -> local
            dispatchKey("ArrowDown", {}, f1Local);
            flushSync();
            expect(f1Remote.getAttribute("aria-checked")).toBe("true");
            expect(document.activeElement).toBe(f1Remote);

            dispatchKey("ArrowUp", {}, f1Remote);
            flushSync();
            expect(f1Local.getAttribute("aria-checked")).toBe("true");
            expect(document.activeElement).toBe(f1Local);

            // No-op direction on local (ArrowLeft) does not toggle or preventDefault
            const noopArrow = dispatchKey("ArrowLeft", {}, f1Local);
            flushSync();
            expect(noopArrow.defaultPrevented).toBe(false);
            expect(f1Local.getAttribute("aria-checked")).toBe("true");

            // When busy={true}, arrow keys and clicks do not mutate selection
            update({ busy: true });
            dispatchKey("ArrowRight", {}, f1Local);
            f1Remote.click();
            flushSync();
            expect(f1Local.getAttribute("aria-checked")).toBe("true");
            expect(f1Remote.getAttribute("aria-checked")).toBe("false");
        });

        test("enforces apply CTA progress, adaptive label, and always calls onApplyChoices when provided", () => {
            const onApplyChoices = vi.fn();
            const onKeepLocal = vi.fn();
            const onKeepRemote = vi.fn();
            const fields = [
                makeField("a", { label: "A" }),
                makeField("b", { label: "B" }),
            ];

            mountReactive(WorkConflictModal, container, instances, {
                fields,
                onApplyChoices,
                onKeepLocal,
                onKeepRemote,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            const applyBtn = mustQuery<HTMLButtonElement>(dialog, ".cs-work-conflict-footer button");
            const [aLocal, aRemote] = mustGetFieldRadios(dialog, 0);
            const [bLocal, bRemote] = mustGetFieldRadios(dialog, 1);

            // Initially 0 of 2 selected -> disabled CTA + progress counter
            expect(applyBtn.disabled).toBe(true);
            expect(applyBtn.textContent?.trim()).toBe("Apply selection");
            expect(dialog.querySelector(".cs-work-conflict-counter")?.textContent?.trim()).toBe(
                "0 of 2 fields selected",
            );

            // 1 of 2 selected -> still disabled
            aLocal.click();
            flushSync();
            expect(applyBtn.disabled).toBe(true);
            expect(dialog.querySelector(".cs-work-conflict-counter")?.textContent?.trim()).toBe(
                "1 of 2 fields selected",
            );

            // All local -> enabled, label adapts, counter hides, invokes onApplyChoices (NOT onKeepLocal)
            bLocal.click();
            flushSync();
            expect(applyBtn.disabled).toBe(false);
            expect(applyBtn.textContent?.trim()).toBe("Keep your version");
            expect(dialog.querySelector(".cs-work-conflict-counter")).toBeNull();

            applyBtn.click();
            expect(onApplyChoices).toHaveBeenCalledTimes(1);
            expect(onApplyChoices).toHaveBeenLastCalledWith({ a: "local", b: "local" });
            expect(onKeepLocal).not.toHaveBeenCalled();
            expect(onKeepRemote).not.toHaveBeenCalled();

            // Mixed -> label is "Apply selection", invokes onApplyChoices
            bRemote.click();
            flushSync();
            expect(applyBtn.textContent?.trim()).toBe("Apply selection");
            applyBtn.click();
            expect(onApplyChoices).toHaveBeenCalledTimes(2);
            expect(onApplyChoices).toHaveBeenLastCalledWith({ a: "local", b: "remote" });

            // All remote -> label is "Use current version", still invokes onApplyChoices (NOT onKeepRemote)
            aRemote.click();
            flushSync();
            expect(applyBtn.textContent?.trim()).toBe("Use current version");
            applyBtn.click();
            expect(onApplyChoices).toHaveBeenCalledTimes(3);
            expect(onApplyChoices).toHaveBeenLastCalledWith({ a: "remote", b: "remote" });
            expect(onKeepRemote).not.toHaveBeenCalled();
        });

        test("falls back to onKeepLocal / onKeepRemote only when onApplyChoices is omitted and choices are unanimous", () => {
            const onKeepLocal = vi.fn();
            const onKeepRemote = vi.fn();
            const fields = [
                makeField("a", { label: "A" }),
                makeField("b", { label: "B" }),
            ];

            mountReactive(WorkConflictModal, container, instances, {
                fields,
                onKeepLocal,
                onKeepRemote,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            const applyBtn = mustQuery<HTMLButtonElement>(dialog, ".cs-work-conflict-footer button");
            const [aLocal, aRemote] = mustGetFieldRadios(dialog, 0);
            const [bLocal, bRemote] = mustGetFieldRadios(dialog, 1);

            // Unanimous local -> onKeepLocal
            aLocal.click();
            bLocal.click();
            flushSync();
            applyBtn.click();
            expect(onKeepLocal).toHaveBeenCalledTimes(1);
            expect(onKeepRemote).not.toHaveBeenCalled();

            // Mixed without onApplyChoices -> neither fallback fires
            bRemote.click();
            flushSync();
            applyBtn.click();
            expect(onKeepLocal).toHaveBeenCalledTimes(1);
            expect(onKeepRemote).not.toHaveBeenCalled();

            // Unanimous remote -> onKeepRemote
            aRemote.click();
            flushSync();
            applyBtn.click();
            expect(onKeepRemote).toHaveBeenCalledTimes(1);
        });

        test("supports custom renderValue snippet with reactive selected state", () => {
            const fields = [
                makeField("price", { label: "Price", localValue: 100, remoteValue: 120 }),
            ];

            const renderValue = createRawSnippet<[WorkConflictValueRenderContext]>((getCtx) => ({
                render: () => `<span class="custom-val"></span>`,
                setup(node) {
                    $effect(() => {
                        const ctx = getCtx();
                        node.textContent = `${ctx.side}:${String(ctx.value)}:${ctx.selected ? "on" : "off"}`;
                    });
                },
            }));

            mountReactive(WorkConflictModal, container, instances, {
                fields,
                renderValue,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            const customVals = dialog.querySelectorAll<HTMLElement>(".custom-val");
            expect(customVals[0]?.textContent).toBe("local:100:off");
            expect(customVals[1]?.textContent).toBe("remote:120:off");

            const localRadio = mustQuery<HTMLButtonElement>(dialog, '[role="radio"]');
            localRadio.click();
            flushSync();
            expect(customVals[0]?.textContent).toBe("local:100:on");
            expect(customVals[1]?.textContent).toBe("remote:120:off");
        });

        test("supports custom renderField snippet with { custom } choices", () => {
            const onApplyChoices = vi.fn();
            const fields = [
                makeField("price", { label: "Price", localValue: 100, remoteValue: 120 }),
            ];

            mountReactive(WorkConflictModal, container, instances, {
                fields,
                renderField: makeCustomFieldSnippet(110),
                onApplyChoices,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            const applyBtn = mustQuery<HTMLButtonElement>(dialog, ".cs-work-conflict-footer button");
            expect(applyBtn.disabled).toBe(true);

            mustQuery<HTMLButtonElement>(dialog, ".pick-custom").click();
            flushSync();
            expect(applyBtn.disabled).toBe(false);
            expect(applyBtn.textContent?.trim()).toBe("Apply selection");

            applyBtn.click();
            expect(onApplyChoices).toHaveBeenCalledTimes(1);
            expect(onApplyChoices).toHaveBeenLastCalledWith({ price: { custom: 110 } });
        });
    });

    describe("re-conflict reset", () => {
        test("resets internal choices on conflictKey or fields identity change while respecting defaultChoice", () => {
            const onApplyChoices = vi.fn();
            const initialFields = [
                makeField("a", { label: "A" }),
                makeField("b", { label: "B" }),
            ];

            const { update } = mountReactive(WorkConflictModal, container, instances, {
                conflictKey: "c1",
                fields: initialFields,
                defaultChoice: null,
                onApplyChoices,
            });

            const dialog = mustQuery<HTMLDivElement>(container, ".cs-work-conflict-modal");
            const applyBtn = mustQuery<HTMLButtonElement>(dialog, ".cs-work-conflict-footer button");

            // Select both fields as local
            mustGetFieldRadios(dialog, 0)[0].click();
            mustGetFieldRadios(dialog, 1)[0].click();
            flushSync();
            expect(applyBtn.disabled).toBe(false);

            // Simulate scrolled list before re-conflict
            const list = mustQuery<HTMLDivElement>(dialog, ".cs-work-conflict-modal-list");
            list.scrollTop = 120;

            // 1. Updating conflictKey with the SAME fields reference resets choices & scrollTop
            update({ conflictKey: "c2" });
            expect(applyBtn.disabled).toBe(true);
            for (const i of [0, 1]) {
                const [localBtn, remoteBtn] = mustGetFieldRadios(dialog, i);
                expect(localBtn.getAttribute("aria-checked")).toBe("false");
                expect(remoteBtn.getAttribute("aria-checked")).toBe("false");
            }
            expect(list.scrollTop).toBe(0);
            // Same dialog node remained mounted
            expect(container.querySelector(".cs-work-conflict-modal")).toBe(dialog);

            // 2. Updating fields identity with defaultChoice="remote" pre-selects remote on all new fields
            const nextFields = [
                makeField("a", { label: "A2" }),
                makeField("b", { label: "B2" }),
            ];
            update({ fields: nextFields, defaultChoice: "remote" });
            expect(applyBtn.disabled).toBe(false);
            expect(applyBtn.textContent?.trim()).toBe("Use current version");

            applyBtn.click();
            expect(onApplyChoices).toHaveBeenCalledTimes(1);
            expect(onApplyChoices).toHaveBeenLastCalledWith({ a: "remote", b: "remote" });

            // 3. Transitioning from field mode back to simple mode updates data-mode cleanly
            update({ fields: [] });
            expect(dialog.dataset.mode).toBe("simple");
        });
    });

    describe("conflict-format.internal.ts", () => {
        test("formatConflictFieldLabel follows precedence: label > segments > path > pointer > id", () => {
            expect(
                formatConflictFieldLabel({
                    id: "fallbackId",
                    label: "  Explicit Label  ",
                    segments: [{ kind: "prop", key: "ignored" }],
                    path: ["ignored"],
                    pointer: "/ignored",
                }),
            ).toBe("Explicit Label");

            expect(
                formatConflictFieldLabel({
                    id: "fallbackId",
                    label: " ".repeat(3),
                    segments: [
                        { kind: "prop", key: "lineItems" },
                        { kind: "index", index: 0 },
                        { kind: "array-item", keyField: "sku", keyValue: "SKU-9" },
                        { kind: "prop", key: "unit_price" },
                    ],
                    path: ["ignored"],
                    pointer: "/ignored",
                }),
            ).toBe("Line Items › #1 › SKU-9 › Unit price");

            expect(
                formatConflictFieldLabel({
                    id: "fallbackId",
                    path: ["shippingAddress", 1, "postal-code"],
                    pointer: "/ignored",
                }),
            ).toBe("Shipping Address › #2 › Postal code");

            expect(
                formatConflictFieldLabel({
                    id: "fallbackId",
                    pointer: "/items/2/a~1b/c~0d",
                }),
            ).toBe("Items › #3 › A/b › C~d");

            // Root pointer "/" falls through to humanized id
            expect(
                formatConflictFieldLabel({
                    id: "dueDateISO",
                    pointer: "/",
                }),
            ).toBe("Due Date ISO");
        });

        test("formatConflictKindHint maps known kinds and returns null for value-mismatch / undefined", () => {
            expect(formatConflictKindHint("delete-edit")).toBe("Deleted & edited");
            expect(formatConflictKindHint("type-mismatch")).toBe("Format changed");
            expect(formatConflictKindHint("duplicate-array-key")).toBe("Duplicate entry");
            expect(formatConflictKindHint("value-mismatch")).toBeNull();
            expect(formatConflictKindHint(undefined)).toBeNull();
        });

        test("formatConflictValue formats undefined, empty, booleans, numbers, arrays, dates, and objects without [object Object]", () => {
            expect(formatConflictValue(undefined)).toEqual({ text: "Removed", state: "deleted" });
            expect(formatConflictValue(null)).toEqual({ text: "Empty", state: "empty" });
            expect(formatConflictValue("")).toEqual({ text: "Empty", state: "empty" });
            expect(formatConflictValue(" ".repeat(3))).toEqual({ text: "Empty", state: "empty" });
            expect(formatConflictValue("Hello")).toEqual({ text: "Hello", state: "value" });

            expect(formatConflictValue(true)).toEqual({ text: "Yes", state: "value" });
            expect(formatConflictValue(false)).toEqual({ text: "No", state: "value" });
            expect(formatConflictValue(0)).toEqual({ text: "0", state: "value" });
            expect(formatConflictValue(42.5)).toEqual({ text: "42.5", state: "value" });

            // Arrays
            expect(formatConflictValue([])).toEqual({ text: "Empty", state: "empty" });
            expect(formatConflictValue(["A", true, 3])).toEqual({
                text: "A, Yes, 3",
                state: "value",
            });
            expect(formatConflictValue(["A", "B", "C", "D", "E"])).toEqual({
                text: "A, B, C (+2)",
                state: "value",
            });
            expect(formatConflictValue([{ id: 1 }])).toEqual({ text: "1 item", state: "value" });
            expect(formatConflictValue([{ id: 1 }, { id: 2 }])).toEqual({
                text: "2 items",
                state: "value",
            });

            // Dates
            expect(formatConflictValue(new Date("2026-04-15T12:00:00.000Z"))).toEqual({
                text: "2026-04-15",
                state: "value",
            });
            expect(formatConflictValue(new Date("invalid"))).toEqual({
                text: "Invalid date",
                state: "value",
            });

            // Plain objects (never "[object Object]")
            expect(formatConflictValue({})).toEqual({ text: "Empty", state: "empty" });
            const smallObj = formatConflictValue({ firstName: "Ada", active: true });
            expect(smallObj).toEqual({ text: "First Name: Ada, Active: Yes", state: "value" });
            expect(smallObj.text).not.toContain("[object Object]");

            const bigObj = formatConflictValue({ a: 1, b: 2, c: 3 });
            expect(bigObj).toEqual({ text: "3 fields", state: "value" });
            expect(bigObj.text).not.toContain("[object Object]");

            const nestedObj = formatConflictValue({ meta: { nested: true } });
            expect(nestedObj).toEqual({ text: "1 field", state: "value" });
            expect(nestedObj.text).not.toContain("[object Object]");
        });
    });
});
