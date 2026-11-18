import { expect, test } from "@playwright/test";

test.describe("virtual-scroll browser E2E", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("measures variable-height items with ResizeObserver and anchors scroll when items above viewport resize", async ({
        page,
    }) => {
        const result = await page.evaluate(async () => {
            const modulePath = "/src/modules/virtual-scroll/index.ts";
            const { createVirtualScroll } = (await import(modulePath)) as typeof import("./index.ts");

            document.body.replaceChildren();
            const vp = document.createElement("div");
            vp.style.cssText = "height: 300px; width: 400px; overflow-y: auto; border: 1px solid #ccc;";
            const list = document.createElement("div");
            vp.append(list);
            document.body.append(vp);

            const mounted = new Map<number, { el: HTMLElement; cleanup: (() => void) | void }>();

            const virtual = createVirtualScroll({
                count: 100,
                estimateSize: 40,
                overscan: 2,
                onRangeChange: (): void => queueMicrotask(() => syncDom()),
            });

            const syncDom = (): void => {
                const active = new Set(virtual.items.map((item) => item.index));
                for (const [idx, entry] of mounted) {
                    if (active.has(idx)) {
                        continue;
                    }

                    entry.cleanup?.();
                    entry.el.remove();
                    mounted.delete(idx);
                }
                for (const item of virtual.items) {
                    let entry = mounted.get(item.index);
                    if (!entry) {
                        const el = document.createElement("div");
                        el.textContent = `Item ${item.index}`;
                        el.style.height = `${40 + (item.index % 3) * 15}px`;
                        el.style.boxSizing = "border-box";
                        const cleanup = virtual.attachItem(item.index)(el);
                        entry = { el, cleanup };
                        mounted.set(item.index, entry);
                    }
                    list.append(entry.el);
                }
            };

            const cleanVp = virtual.attachViewport(vp);
            const cleanList = virtual.attachList(list);
            syncDom();

            for (let frame = 0; frame < 4; frame++) {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }

            // Scroll down into the middle of the list
            virtual.scrollToOffset(800);
            syncDom();
            for (let frame = 0; frame < 4; frame++) {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }

            const firstVisibleIdx = virtual.visibleRange.startIndex;
            const anchorEntry = mounted.get(firstVisibleIdx);
            if (!anchorEntry) throw new Error(`Missing anchor item ${firstVisibleIdx}`);
            const anchorEl = anchorEntry.el;
            const beforeAnchorTop = anchorEl.getBoundingClientRect().top;
            const beforeScrollTop = vp.scrollTop;

            // Resize an item strictly above the first visible row (e.g. first rendered overscan item)
            const aboveIdx = virtual.startIndex;
            const aboveEntry = mounted.get(aboveIdx);
            if (!aboveEntry) throw new Error(`Missing above item ${aboveIdx}`);
            const aboveEl = aboveEntry.el;
            const oldHeight = aboveEl.getBoundingClientRect().height;
            aboveEl.style.height = `${oldHeight + 80}px`;

            for (let frame = 0; frame < 4; frame++) {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }

            const afterScrollTop = vp.scrollTop;
            const afterAnchorTop = anchorEl.getBoundingClientRect().top;

            cleanList?.();
            cleanVp?.();
            for (const entry of mounted.values()) entry.cleanup?.();

            return {
                aboveIdx,
                firstVisibleIdx,
                beforeScrollTop,
                afterScrollTop,
                scrollDelta: afterScrollTop - beforeScrollTop,
                anchorShift: Math.abs(afterAnchorTop - beforeAnchorTop),
            };
        });

        expect(result.aboveIdx).toBeLessThan(result.firstVisibleIdx);
        expect(result.scrollDelta).toBeGreaterThanOrEqual(79);
        expect(result.scrollDelta).toBeLessThanOrEqual(81);
        expect(result.anchorShift).toBeLessThanOrEqual(1);
    });

    test("supports <table> spacer <tr> layout and sticky <thead> scroll-padding-top alignment", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const modulePath = "/src/modules/virtual-scroll/index.ts";
            const { createVirtualScroll } = (await import(modulePath)) as typeof import("./index.ts");

            document.body.replaceChildren();
            const vp = document.createElement("div");
            vp.style.cssText =
                "height: 300px; width: 500px; overflow-y: auto; scroll-padding-top: 40px; position: relative;";
            const table = document.createElement("table");
            table.style.cssText = "width: 100%; border-collapse: collapse;";

            const thead = document.createElement("thead");
            thead.innerHTML = `<tr style="height: 40px; position: sticky; top: 0; background: #fff;"><th>Name</th></tr>`;
            const tbody = document.createElement("tbody");

            table.append(thead, tbody);
            vp.append(table);
            document.body.append(vp);

            const mounted = new Map<number, { el: HTMLTableRowElement; cleanup: (() => void) | void }>();

            const virtual = createVirtualScroll({
                count: 100,
                estimateSize: 36,
                fixed: true,
                overscan: 2,
                onRangeChange: (): void => queueMicrotask(() => syncTable()),
            });

            const syncTable = (): void => {
                tbody.replaceChildren();
                if (virtual.offsetBefore > 0) {
                    const beforeTr = document.createElement("tr");
                    beforeTr.setAttribute("aria-hidden", "true");
                    beforeTr.dataset.virtualScrollSpacer = "before";
                    beforeTr.innerHTML = `<td style="height: ${virtual.offsetBefore}px; padding: 0; border: 0;"></td>`;
                    tbody.append(beforeTr);
                }

                for (const item of virtual.items) {
                    let entry = mounted.get(item.index);
                    if (!entry) {
                        const tr = document.createElement("tr");
                        tr.style.height = "36px";
                        tr.innerHTML = `<td>Row ${item.index}</td>`;
                        const cleanup = virtual.attachItem(item.index)(tr);
                        entry = { el: tr, cleanup };
                        mounted.set(item.index, entry);
                    }
                    tbody.append(entry.el);
                }

                if (virtual.offsetAfter > 0) {
                    const afterTr = document.createElement("tr");
                    afterTr.setAttribute("aria-hidden", "true");
                    afterTr.dataset.virtualScrollSpacer = "after";
                    afterTr.innerHTML = `<td style="height: ${virtual.offsetAfter}px; padding: 0; border: 0;"></td>`;
                    tbody.append(afterTr);
                }
            };

            const cleanVp = virtual.attachViewport(vp);
            syncTable();

            const hasBeforeSpacerAtTop = tbody.querySelector('[data-virtual-scroll-spacer="before"]') !== null;
            const hasAfterSpacerAtTop = tbody.querySelector('[data-virtual-scroll-spacer="after"]') !== null;

            virtual.scrollToIndex(50, { align: "start" });
            syncTable();

            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

            const row50 = tbody.querySelector<HTMLElement>('[data-index="50"]');
            const vpTop = vp.getBoundingClientRect().top;
            const row50Top = row50 ? row50.getBoundingClientRect().top : -1;
            const scrollHeight = vp.scrollHeight;

            cleanVp?.();
            for (const entry of mounted.values()) entry.cleanup?.();

            return {
                hasBeforeSpacerAtTop,
                hasAfterSpacerAtTop,
                scrollHeight,
                expectedMinScrollHeight: 100 * 36 + 40,
                offsetFromVpTop: row50Top - vpTop,
            };
        });

        expect(result.hasBeforeSpacerAtTop).toBe(false);
        expect(result.hasAfterSpacerAtTop).toBe(true);
        expect(result.scrollHeight).toBeGreaterThanOrEqual(result.expectedMinScrollHeight - 2);
        // Respects scroll-padding-top: 40px for sticky <thead>
        expect(result.offsetFromVpTop).toBeGreaterThanOrEqual(39);
        expect(result.offsetFromVpTop).toBeLessThanOrEqual(41);
    });

    test("renders CSS Grid (lanes > 1) with gap and preserves column-1 alignment after scrolling", async ({
        page,
    }) => {
        const result = await page.evaluate(async () => {
            const modulePath = "/src/modules/virtual-scroll/index.ts";
            const { createVirtualScroll } = (await import(modulePath)) as typeof import("./index.ts");

            document.body.replaceChildren();
            const vp = document.createElement("div");
            vp.style.cssText = "height: 300px; width: 450px; overflow-y: auto;";
            const grid = document.createElement("div");
            grid.style.cssText =
                "display: grid; grid-template-columns: repeat(3, 1fr); row-gap: 12px; column-gap: 12px;";
            vp.append(grid);
            document.body.append(vp);

            const mounted = new Map<number, { el: HTMLElement; cleanup: (() => void) | void }>();

            const virtual = createVirtualScroll({
                count: 90,
                estimateSize: 70,
                lanes: 3,
                overscan: 1,
                onRangeChange: (): void => queueMicrotask(() => syncGrid()),
            });

            const syncGrid = (): void => {
                const active = new Set(virtual.items.map((i) => i.index));
                for (const [idx, entry] of mounted) {
                    if (active.has(idx)) {
                        continue;
                    }

                    entry.cleanup?.();
                    entry.el.remove();
                    mounted.delete(idx);
                }
                for (const item of virtual.items) {
                    let entry = mounted.get(item.index);
                    if (!entry) {
                        const card = document.createElement("div");
                        card.textContent = `Card ${item.index}`;
                        card.style.height = `${50 + (item.index % 3) * 20}px`;
                        const cleanup = virtual.attachItem(item.index)(card);
                        entry = { el: card, cleanup };
                        mounted.set(item.index, entry);
                    }
                    grid.append(entry.el);
                }
            };

            const cleanVp = virtual.attachViewport(vp);
            const cleanList = virtual.attachList(grid);
            syncGrid();

            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

            virtual.scrollToOffset(400);
            syncGrid();
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

            const firstItem = virtual.items[0];
            if (!firstItem) throw new Error("Missing first rendered item");
            const firstEntry = mounted.get(firstItem.index);
            const secondEntry = mounted.get(firstItem.index + 1);
            if (!firstEntry || !secondEntry) throw new Error("Missing grid lane entries");

            const gridLeft = grid.getBoundingClientRect().left;
            const firstLeft = firstEntry.el.getBoundingClientRect().left;
            const secondLeft = secondEntry.el.getBoundingClientRect().left;

            cleanList?.();
            cleanVp?.();
            for (const entry of mounted.values()) entry.cleanup?.();

            return {
                firstLane: firstItem.lane,
                firstAlignedToCol1: Math.abs(firstLeft - gridLeft) < 2,
                secondInNextCol: secondLeft > firstLeft + 50,
            };
        });

        expect(result.firstLane).toBe(0);
        expect(result.firstAlignedToCol1).toBe(true);
        expect(result.secondInNextCol).toBe(true);
    });

    test("composes with ScrollAreaContent-style flex overflow container", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const modulePath = "/src/modules/virtual-scroll/index.ts";
            const { createVirtualScroll } = (await import(modulePath)) as typeof import("./index.ts");

            document.body.replaceChildren();
            const scrollArea = document.createElement("div");
            scrollArea.className = "cs-scroll-area";
            scrollArea.style.cssText = "display: flex; flex-direction: column; height: 280px; overflow: hidden;";

            const content = document.createElement("div");
            content.className = "cs-scroll-area-content";
            content.style.cssText =
                "flex: 1 1 auto; width: 100%; min-width: 0; height: 100%; min-height: 0; overflow-y: auto;";

            const list = document.createElement("div");
            content.append(list);
            scrollArea.append(content);
            document.body.append(scrollArea);

            const virtual = createVirtualScroll({
                count: 100,
                estimateSize: 40,
                fixed: true,
                overscan: 2,
            });

            const cleanVp = virtual.attachViewport(content);
            const cleanList = virtual.attachList(list);

            content.scrollTop = 600;
            content.dispatchEvent(new Event("scroll"));

            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

            const scrollingAttr = Object.hasOwn(content.dataset, "scrolling");
            const startIdx = virtual.startIndex;
            const scrollOffset = virtual.scrollOffset;

            cleanList?.();
            cleanVp?.();

            return { scrollingAttr, startIdx, scrollOffset };
        });

        expect(result.scrollingAttr).toBe(true);
        expect(result.scrollOffset).toBe(600);
        expect(result.startIdx).toBe(13); // floor(600/40)=15, minus overscan 2 = 13
    });

    test("supports scrollTarget='window' with listPageTop > 0", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const modulePath = "/src/modules/virtual-scroll/index.ts";
            const { createVirtualScroll } = (await import(modulePath)) as typeof import("./index.ts");

            document.body.replaceChildren();
            document.body.style.margin = "0";

            const header = document.createElement("header");
            header.style.cssText = "height: 200px; background: #eee;";
            const list = document.createElement("div");
            document.body.append(header, list);

            const virtual = createVirtualScroll({
                count: 200,
                estimateSize: 40,
                fixed: true,
                overscan: 1,
                scrollTarget: "window",
            });

            const cleanList = virtual.attachList(list);

            window.scrollTo(0, 1000);
            window.dispatchEvent(new Event("scroll"));
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

            const offsetAt1000 = virtual.scrollOffset;
            const visibleStartAt1000 = virtual.visibleRange.startIndex;

            virtual.scrollToIndex(0, { align: "start" });
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const scrollYAtIndex0 = window.scrollY;

            cleanList?.();

            return {
                offsetAt1000,
                visibleStartAt1000,
                scrollYAtIndex0,
            };
        });

        expect(result.offsetAt1000).toBe(800);
        expect(result.visibleStartAt1000).toBe(20);
        expect(result.scrollYAtIndex0).toBe(200);
    });

    test("converges scrollToIndex on far unmeasured variable-height items", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const modulePath = "/src/modules/virtual-scroll/index.ts";
            const { createVirtualScroll } = (await import(modulePath)) as typeof import("./index.ts");

            document.body.replaceChildren();
            const vp = document.createElement("div");
            vp.style.cssText = "height: 300px; width: 400px; overflow-y: auto;";
            const list = document.createElement("div");
            vp.append(list);
            document.body.append(vp);

            const mounted = new Map<number, { el: HTMLElement; cleanup: (() => void) | void }>();

            const virtual = createVirtualScroll({
                count: 200,
                estimateSize: 40,
                overscan: 2,
                onRangeChange: (): void => queueMicrotask(() => syncDom()),
            });

            const syncDom = (): void => {
                const active = new Set(virtual.items.map((i) => i.index));
                for (const [idx, entry] of mounted) {
                    if (active.has(idx)) {
                        continue;
                    }

                    entry.cleanup?.();
                    entry.el.remove();
                    mounted.delete(idx);
                }
                for (const item of virtual.items) {
                    let entry = mounted.get(item.index);
                    if (!entry) {
                        const el = document.createElement("div");
                        el.textContent = `Row ${item.index}`;
                        // Variable heights 40..180px vs estimate 40px
                        el.style.height = `${40 + (item.index % 5) * 35}px`;
                        const cleanup = virtual.attachItem(item.index)(el);
                        entry = { el, cleanup };
                        mounted.set(item.index, entry);
                    }
                    list.append(entry.el);
                }
            };

            const cleanVp = virtual.attachViewport(vp);
            const cleanList = virtual.attachList(list);
            syncDom();

            for (let frame = 0; frame < 3; frame++) {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }

            // Jump to unmeasured item 150
            virtual.scrollToIndex(150, { align: "start" });
            syncDom();
            for (let frame = 0; frame < 8; frame++) {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }

            const targetEl = mounted.get(150)?.el ?? null;
            const vpTop = vp.getBoundingClientRect().top;
            const targetTop = targetEl ? targetEl.getBoundingClientRect().top : -9999;

            cleanList?.();
            cleanVp?.();
            for (const entry of mounted.values()) entry.cleanup?.();

            return {
                hasTarget: targetEl !== null,
                alignmentError: Math.abs(targetTop - vpTop),
            };
        });

        expect(result.hasTarget).toBe(true);
        expect(result.alignmentError).toBeLessThanOrEqual(2);
    });

    test("keeps scrollTop at 50000 when variable-height items measure smaller than estimateSize", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const modulePath = "/src/modules/virtual-scroll/index.ts";
            const { createVirtualScroll } = (await import(modulePath)) as typeof import("./index.ts");

            document.body.replaceChildren();
            const vp = document.createElement("div");
            vp.style.cssText = "height: 300px; width: 400px; overflow-y: auto;";
            const list = document.createElement("div");
            vp.append(list);
            document.body.append(vp);

            const mounted = new Map<number, { el: HTMLElement; cleanup: (() => void) | void }>();

            const virtual = createVirtualScroll({
                count: 2500,
                estimateSize: 50,
                overscan: 3,
                onRangeChange: (): void => queueMicrotask(() => syncDom()),
            });

            const syncDom = (): void => {
                const active = new Set(virtual.items.map((i) => i.index));
                for (const [idx, entry] of mounted) {
                    if (active.has(idx)) {
                        continue;
                    }

                    entry.cleanup?.();
                    entry.el.remove();
                    mounted.delete(idx);
                }
                for (const item of virtual.items) {
                    let entry = mounted.get(item.index);
                    if (!entry) {
                        const el = document.createElement("div");
                        el.textContent = `Row ${item.index}`;
                        // Strictly smaller than estimateSize (50px)
                        el.style.height = `${24 + (item.index % 3) * 4}px`;
                        el.style.boxSizing = "border-box";
                        const cleanup = virtual.attachItem(item.index)(el);
                        entry = { el, cleanup };
                        mounted.set(item.index, entry);
                    }
                    list.append(entry.el);
                }
            };

            const cleanVp = virtual.attachViewport(vp);
            const cleanList = virtual.attachList(list);
            syncDom();

            for (let frame = 0; frame < 4; frame++) {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }

            vp.scrollTop = 50_000;
            for (let frame = 0; frame < 6; frame++) {
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }

            const finalScrollTop = vp.scrollTop;
            const finalScrollOffset = virtual.scrollOffset;

            cleanList?.();
            cleanVp?.();
            for (const entry of mounted.values()) entry.cleanup?.();

            return { finalScrollTop, finalScrollOffset };
        });

        expect(result.finalScrollTop).toBeGreaterThanOrEqual(49_998);
        expect(result.finalScrollTop).toBeLessThanOrEqual(50_002);
        expect(result.finalScrollOffset).toBeGreaterThanOrEqual(49_998);
        expect(result.finalScrollOffset).toBeLessThanOrEqual(50_002);
    });
});
