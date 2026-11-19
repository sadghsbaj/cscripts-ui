import { BookOpen, FileCode2 } from "@lucide/svelte";
import type { Component } from "svelte";
import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import WorkAppDocsTestHost from "./WorkAppDocsTestHost.internal.svelte";
import {
    WORK_APP_DOCS_CALLOUT_VARIANTS,
    WORK_APP_DOCS_MARK_TONES,
    WORK_APP_DOCS_TABLE_ALIGNS,
} from "./index.ts";

function mustQuery<T extends Element>(root: ParentNode, selector: string): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Expected element matching "${selector}"`);
    return el;
}

function mustAt<T>(items: readonly T[], index: number): T {
    const item = items[index];
    if (item === undefined) throw new Error(`Expected item at index ${index}`);
    return item;
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
    props: TProps;
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
        props,
        update(next: Partial<NoInfer<TProps>>): void {
            Object.assign(props, next);
            flushSync();
        },
    };
}

function getTabButtons(root: ParentNode): HTMLButtonElement[] {
    return [
        ...root.querySelectorAll<HTMLButtonElement>(
            ":scope .cs-work-app-docs-tabs .cs-segmented-control-item",
        ),
    ];
}

function getTabPanels(root: ParentNode): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('.cs-work-app-docs-chapter[role="tabpanel"]')];
}

describe("work/app-docs", () => {
    let container: HTMLDivElement;
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(async () => {
        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;

        await Promise.resolve();
        container.remove();
        vi.restoreAllMocks();
    });

    describe("Chapter Tabs & Context", () => {
        test("auto-generates tabs in DOM order, defaults activeChapter to the first chapter, and renders only the active tabpanel", () => {
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "docs",
                tabsMode: "auto",
                firstChapterIcon: BookOpen,
                secondChapterIcon: FileCode2,
            });

            const control = mustQuery<HTMLElement>(container, ".cs-work-app-docs-tabs .cs-segmented-control");
            expect(control.getAttribute("aria-label")).toBe("Chapters");

            update({ tabsAriaLabel: "Documentation chapters" });
            expect(control.getAttribute("aria-label")).toBe("Documentation chapters");

            const tabs = getTabButtons(container);
            expect(tabs.map((tab) => tab.dataset.value)).toEqual(["overview", "reference"]);
            expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(["Overview", "Reference"]);

            const overviewTab = mustAt(tabs, 0);
            const referenceTab = mustAt(tabs, 1);
            expect(overviewTab.getAttribute("aria-checked")).toBe("true");
            expect(overviewTab.dataset.state).toBe("active");
            expect(overviewTab.querySelector("svg.lucide-book-open")).not.toBeNull();
            expect(referenceTab.getAttribute("aria-checked")).toBe("false");
            expect(referenceTab.dataset.state).toBe("inactive");
            expect(referenceTab.querySelector("svg.lucide-file-code-2")).not.toBeNull();

            const panels = getTabPanels(container);
            expect(panels).toHaveLength(1);
            const activePanel = mustAt(panels, 0);
            expect(activePanel.id).toBe("overview");
            expect(activePanel.dataset.chapterId).toBe("overview");
            expect(activePanel.querySelector("h2.cs-work-app-docs-chapter-title")?.textContent?.trim()).toBe(
                "Overview",
            );
            expect(activePanel.querySelector(".cs-work-app-docs-chapter-lead")?.textContent?.trim()).toBe(
                "Overview chapter lead.",
            );
            expect(container.querySelector("section#reference")).toBeNull();
        });

        test("switches active chapter on tab click, updates bound activeChapter, and fires onChapterChange idempotently", () => {
            const onChapterChange = vi.fn();
            const { instance } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "docs",
                tabsMode: "auto",
                onChapterChange,
            });

            const tabs = getTabButtons(container);
            const overviewTab = mustAt(tabs, 0);
            const referenceTab = mustAt(tabs, 1);

            // Re-clicking already active tab is a no-op
            overviewTab.click();
            flushSync();
            expect(onChapterChange).not.toHaveBeenCalled();

            // Click second tab -> swaps tabpanel and fires onChapterChange
            referenceTab.click();
            flushSync();

            expect(onChapterChange).toHaveBeenCalledTimes(1);
            expect(onChapterChange).toHaveBeenLastCalledWith("reference");
            expect(instance.getBoundActiveChapter()).toBe("reference");
            expect(overviewTab.getAttribute("aria-checked")).toBe("false");
            expect(overviewTab.dataset.state).toBe("inactive");
            expect(referenceTab.getAttribute("aria-checked")).toBe("true");
            expect(referenceTab.dataset.state).toBe("active");

            const panels = getTabPanels(container);
            expect(panels).toHaveLength(1);
            expect(mustAt(panels, 0).id).toBe("reference");
            expect(container.querySelector("section#overview")).toBeNull();
            expect(container.querySelector("section#summary")).not.toBeNull();

            // Click back to first tab
            overviewTab.click();
            flushSync();
            expect(onChapterChange).toHaveBeenCalledTimes(2);
            expect(onChapterChange).toHaveBeenLastCalledWith("overview");
            expect(instance.getBoundActiveChapter()).toBe("overview");
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);
        });

        test("supports defaultChapter, external activeChapter updates, and strict controlled mode", () => {
            const onChapterChange = vi.fn();
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "docs",
                tabsMode: "auto",
                defaultChapter: "reference",
                onChapterChange,
            });

            expect(getTabPanels(container).map((p) => p.id)).toEqual(["reference"]);
            expect(mustAt(getTabButtons(container), 1).getAttribute("aria-checked")).toBe("true");

            // External activeChapter prop takes precedence over defaultChapter and syncs in both directions
            update({ activeChapter: "overview" });
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);
            expect(mustAt(getTabButtons(container), 0).getAttribute("aria-checked")).toBe("true");

            update({ activeChapter: "reference" });
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["reference"]);

            // Strict controlled mode: clicking fires onChapterChange, but DOM stays controlled until parent updates prop
            update({ strictControlled: true, activeChapter: "overview" });
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);

            mustAt(getTabButtons(container), 1).click();
            flushSync();
            expect(onChapterChange).toHaveBeenCalledTimes(1);
            expect(onChapterChange).toHaveBeenLastCalledWith("reference");
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);
            expect(mustAt(getTabButtons(container), 0).getAttribute("aria-checked")).toBe("true");

            update({ activeChapter: "reference" });
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["reference"]);
            expect(mustAt(getTabButtons(container), 1).getAttribute("aria-checked")).toBe("true");
        });

        test("supports explicit WorkAppDocsTab children mode with icons and custom onclick preventDefault", () => {
            const onChapterChange = vi.fn();
            const onExplicitTabClick = vi.fn((id: string, event: MouseEvent) => {
                if (id === "reference") {
                    event.preventDefault();
                }
            });

            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "docs",
                tabsMode: "explicit",
                firstChapterIcon: BookOpen,
                secondChapterIcon: FileCode2,
                onChapterChange,
                onExplicitTabClick,
            });

            const tabs = getTabButtons(container);
            expect(tabs.map((tab) => tab.dataset.value)).toEqual(["overview", "reference"]);
            expect(mustAt(tabs, 0).querySelector("svg.lucide-book-open")).not.toBeNull();
            expect(mustAt(tabs, 1).querySelector("svg.lucide-file-code-2")).not.toBeNull();
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);

            // preventDefault on explicit tab blocks chapter switch
            mustAt(tabs, 1).click();
            flushSync();
            expect(onExplicitTabClick).toHaveBeenCalledTimes(1);
            expect(onChapterChange).not.toHaveBeenCalled();
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);

            // Allowing click switches chapter cleanly
            update({ onExplicitTabClick: undefined });
            mustAt(tabs, 1).click();
            flushSync();
            expect(onChapterChange).toHaveBeenCalledTimes(1);
            expect(onChapterChange).toHaveBeenLastCalledWith("reference");
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["reference"]);
        });

        test("updates tabs on dynamic chapter mount and falls back to the first remaining chapter when the active chapter unmounts", () => {
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "docs",
                tabsMode: "auto",
                showFirstChapter: true,
                showMiddleChapter: false,
                showThirdChapter: true,
            });

            expect(getTabButtons(container).map((tab) => tab.dataset.value)).toEqual(["overview", "reference"]);
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);

            // Mount a middle chapter dynamically -> appears in auto-generated tabs
            update({ showMiddleChapter: true });
            expect(getTabButtons(container).map((tab) => tab.dataset.value)).toEqual([
                "overview",
                "reference",
                "workflows",
            ]);
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["overview"]);

            // Unmount the active first chapter -> falls back cleanly to the first remaining chapter
            update({ showFirstChapter: false });
            expect(getTabButtons(container).map((tab) => tab.dataset.value)).toEqual(["reference", "workflows"]);
            const remainingTabs = getTabButtons(container);
            expect(mustAt(remainingTabs, 0).getAttribute("aria-checked")).toBe("true");
            expect(getTabPanels(container).map((p) => p.id)).toEqual(["reference"]);
        });
    });

    describe("Content Primitives", () => {
        test("WorkAppDocsHeader renders eyebrow, h1 title, lead, and children, and omits optional parts when absent", () => {
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "primitives",
                headerEyebrow: "Reference",
                headerTitle: "Workspace API",
                headerLead: "Manage local folders safely.",
            });

            const header = mustQuery<HTMLElement>(container, ".cs-work-app-docs-header");
            expect(header.querySelector(".cs-work-app-docs-eyebrow")?.textContent?.trim()).toBe("Reference");
            expect(header.querySelector("h1.cs-work-app-docs-title")?.textContent?.trim()).toBe(
                "Workspace API",
            );
            expect(header.querySelector(".cs-work-app-docs-lead")?.textContent?.trim()).toBe(
                "Manage local folders safely.",
            );
            expect(header.querySelector('[data-testid="header-extra"]')).not.toBeNull();

            update({ headerEyebrow: undefined, headerLead: undefined });
            expect(header.querySelector(".cs-work-app-docs-eyebrow")).toBeNull();
            expect(header.querySelector(".cs-work-app-docs-lead")).toBeNull();
        });

        test("WorkAppDocsSection renders h2/h3, optional id, data-level, aria-labelledby, and optional lead", () => {
            mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "primitives",
            });

            const intro = mustQuery<HTMLElement>(container, "section#intro");
            expect(intro.dataset.level).toBe("2");
            const h2 = mustQuery<HTMLHeadingElement>(intro, "h2.cs-work-app-docs-heading");
            expect(h2.dataset.level).toBe("2");
            expect(intro.getAttribute("aria-labelledby")).toBe(h2.id);
            expect(intro.querySelector(".cs-work-app-docs-section-lead")?.textContent?.trim()).toBe(
                "First section lead.",
            );

            const sub = mustQuery<HTMLElement>(container, "section#intro-sub");
            expect(sub.dataset.level).toBe("3");
            const h3 = mustQuery<HTMLHeadingElement>(sub, "h3.cs-work-app-docs-heading");
            expect(h3.dataset.level).toBe("3");
            expect(sub.getAttribute("aria-labelledby")).toBe(h3.id);
            expect(sub.querySelector(".cs-work-app-docs-section-lead")).toBeNull();

            const sections = [...container.querySelectorAll<HTMLElement>("section.cs-work-app-docs-section")];
            const unidentified = mustAt(sections, 2);
            expect(unidentified.hasAttribute("id")).toBe(false);
            expect(unidentified.dataset.level).toBe("2");
            expect(unidentified.querySelector("h2.cs-work-app-docs-heading")?.textContent?.trim()).toBe(
                "Unidentified Section",
            );
        });

        test("WorkAppDocsCallout renders variants, default icon, custom icon, icon={null}, and optional title", () => {
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "primitives",
                calloutVariant: "note",
            });

            const callout = mustQuery<HTMLElement>(container, ".cs-work-app-docs-callout");
            for (const variant of WORK_APP_DOCS_CALLOUT_VARIANTS) {
                update({ calloutVariant: variant });
                expect(callout.dataset.variant).toBe(variant);
                expect("hasIcon" in callout.dataset).toBe(true);
                expect(callout.querySelector(":scope .cs-work-app-docs-callout-badge svg")).not.toBeNull();
            }

            expect(callout.querySelector(".cs-work-app-docs-callout-title")).toBeNull();

            // Custom title and custom icon
            update({ calloutTitle: "Heads up", calloutIcon: BookOpen });
            expect(callout.querySelector(".cs-work-app-docs-callout-title")?.textContent?.trim()).toBe(
                "Heads up",
            );
            expect(callout.querySelector(":scope .cs-work-app-docs-callout-badge svg")).not.toBeNull();

            // icon={null} omits badge and data-has-icon
            update({ calloutIcon: null });
            expect("hasIcon" in callout.dataset).toBe(false);
            expect(callout.querySelector(".cs-work-app-docs-callout-badge")).toBeNull();
        });

        test("WorkAppDocsMark, WorkAppDocsKbd, and WorkAppDocsCode render expected tags and attributes", () => {
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "primitives",
                markTone: "accent",
            });

            const mark = mustQuery<HTMLElement>(container, "mark.cs-work-app-docs-mark");
            for (const tone of WORK_APP_DOCS_MARK_TONES) {
                update({ markTone: tone });
                expect(mark.dataset.tone).toBe(tone);
            }
            expect(mark.textContent?.trim()).toBe("highlighted");

            const kbd = mustQuery<HTMLElement>(container, "kbd.cs-work-app-docs-kbd");
            expect(kbd.dataset.variant).toBe("keycap");
            expect(kbd.dataset.size).toBe("xs");
            expect(kbd.textContent?.trim()).toBe("Ctrl+S");

            const code = mustQuery<HTMLElement>(container, "code.cs-work-app-docs-code");
            expect(code.textContent?.trim()).toBe("saveWorkspace()");
        });

        test("WorkAppDocsCardGrid and WorkAppDocsCard render title, description, optional icon, and children", () => {
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "primitives",
                cardIcon: BookOpen,
                cardDescription: "Card summary",
            });

            const grid = mustQuery<HTMLDivElement>(container, ".cs-work-app-docs-card-grid");
            const cards = [...grid.querySelectorAll<HTMLDivElement>(".cs-work-app-docs-card")];
            expect(cards).toHaveLength(2);

            const firstCard = mustAt(cards, 0);
            const minimalCard = mustAt(cards, 1);
            expect(firstCard.querySelector(":scope .cs-work-app-docs-card-icon svg")).not.toBeNull();
            expect(firstCard.querySelector(".cs-work-app-docs-card-title")?.textContent?.trim()).toBe(
                "First Card",
            );
            expect(firstCard.querySelector(".cs-work-app-docs-card-description")?.textContent?.trim()).toBe(
                "Card summary",
            );
            expect(firstCard.querySelector(".cs-work-app-docs-card-body")?.textContent?.trim()).toBe(
                "Card body content",
            );

            expect(minimalCard.querySelector(".cs-work-app-docs-card-icon")).toBeNull();
            expect(minimalCard.querySelector(".cs-work-app-docs-card-description")).toBeNull();
            expect(minimalCard.querySelector(".cs-work-app-docs-card-body")).toBeNull();

            update({ cardIcon: undefined, cardDescription: undefined });
            expect(firstCard.querySelector(".cs-work-app-docs-card-icon")).toBeNull();
            expect(firstCard.querySelector(".cs-work-app-docs-card-description")).toBeNull();
        });

        test("WorkAppDocsTable and subparts render caption, header/body cells, and data-align values", () => {
            const { update } = mountReactive(WorkAppDocsTestHost, container, instances, {
                mode: "primitives",
                tableCaption: "Shortcut reference",
                tableAlign: "start",
            });

            const wrap = mustQuery<HTMLDivElement>(container, ".cs-work-app-docs-table-wrap");
            const table = mustQuery<HTMLTableElement>(wrap, "table.cs-work-app-docs-table");
            expect(table.querySelector("caption.cs-work-app-docs-table-caption")?.textContent?.trim()).toBe(
                "Shortcut reference",
            );

            const ths = [...table.querySelectorAll<HTMLTableCellElement>(":scope thead th")];
            const tds = [...table.querySelectorAll<HTMLTableCellElement>(":scope tbody td")];
            expect(ths.map((th) => th.dataset.align)).toEqual(["start", "center", "end"]);
            expect(ths.map((th) => th.getAttribute("scope"))).toEqual(["col", "col", "col"]);
            expect(tds.map((td) => td.dataset.align)).toEqual(["start", "center", "end"]);

            const firstTh = mustAt(ths, 0);
            const firstTd = mustAt(tds, 0);
            for (const align of WORK_APP_DOCS_TABLE_ALIGNS) {
                update({ tableAlign: align });
                expect(firstTh.dataset.align).toBe(align);
                expect(firstTd.dataset.align).toBe(align);
            }

            update({ tableCaption: undefined });
            expect(table.querySelector("caption")).toBeNull();
        });
    });
});
