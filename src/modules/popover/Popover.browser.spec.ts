import { expect, test } from "@playwright/test";

interface ExitTrace {
    inFlightReady: boolean;
    inFlightPlacement: string | null;
    afterReady: boolean;
    afterPlacement: string | null;
    afterOpen: boolean;
    done: boolean;
}

test.describe("Popover fallback placement resolution in Chromium", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.locator("button.cs-sidebar-item", { hasText: /^Popover$/ }).click();
    });

    test('flips placement="bottom" to "top" near bottom viewport edge, preserves placement during exit transition, and cleans up after transitionend', async ({
        page,
    }) => {
        const trigger = page.locator("button.cs-button", { hasText: /^Open popover$/ });
        const popover = page.locator("#popover-basic-demo");

        await expect(trigger).toBeVisible();
        await expect(popover).toHaveAttribute("data-placement", "bottom");
        await expect(popover).not.toHaveAttribute("data-ready");
        await expect(popover).not.toHaveAttribute("data-resolved-placement");

        // Shrink viewport height so the trigger sits 12px above the bottom edge, forcing flip-block to "top".
        const box = await trigger.boundingBox();
        if (!box) throw new Error("Expected trigger bounding box");
        await page.setViewportSize({
            width: 1280,
            height: Math.ceil(box.y + box.height + 12),
        });

        await trigger.click();

        await expect(popover).toHaveAttribute("data-resolved-placement", "top");
        await expect(popover).toHaveAttribute("data-ready", "");

        const computed = await popover.evaluate((el) => {
            const htmlEl = el as HTMLElement;
            const style = getComputedStyle(htmlEl);
            const [originX = NaN, originY = NaN] = style.transformOrigin
                .split(" ")
                .map((v) => Number(v.replace("px", "")));
            return {
                dirY: style.getPropertyValue("--cs-popover-dir-y").trim(),
                originX,
                originY,
                width: htmlEl.offsetWidth,
                height: htmlEl.offsetHeight,
            };
        });

        expect(computed.dirY).toBe("1");
        expect(computed.height).toBeGreaterThan(0);
        // "bottom center" transform-origin: y sits at the bottom edge (offsetHeight), not 0.
        expect(computed.originY).toBeGreaterThan(0);
        expect(Math.abs(computed.originY - computed.height)).toBeLessThan(1);
        expect(Math.abs(computed.originX - computed.width / 2)).toBeLessThan(1);

        // Attach exit transition observers before pressing Escape.
        await popover.evaluate((el) => {
            const htmlEl = el as HTMLElement;
            const trace: ExitTrace = {
                inFlightReady: true,
                inFlightPlacement: null,
                afterReady: true,
                afterPlacement: null,
                afterOpen: true,
                done: false,
            };
            const save = (): void => {
                htmlEl.dataset.exitTrace = JSON.stringify(trace);
            };
            save();

            const onToggle = (event: Event): void => {
                if ((event as ToggleEvent).newState !== "closed") return;
                requestAnimationFrame(() => {
                    trace.inFlightReady = "ready" in htmlEl.dataset;
                    trace.inFlightPlacement = htmlEl.dataset.resolvedPlacement ?? null;
                    save();
                });
            };

            const onTransitionDone = (event: Event): void => {
                if (event.target !== htmlEl || htmlEl.matches(":popover-open")) return;
                htmlEl.removeEventListener("toggle", onToggle);
                htmlEl.removeEventListener("transitionend", onTransitionDone);
                htmlEl.removeEventListener("transitioncancel", onTransitionDone);
                queueMicrotask(() => {
                    trace.afterReady = "ready" in htmlEl.dataset;
                    trace.afterPlacement = htmlEl.dataset.resolvedPlacement ?? null;
                    trace.afterOpen = htmlEl.matches(":popover-open");
                    trace.done = true;
                    save();
                });
            };

            htmlEl.addEventListener("toggle", onToggle);
            htmlEl.addEventListener("transitionend", onTransitionDone);
            htmlEl.addEventListener("transitioncancel", onTransitionDone);
        });

        await page.keyboard.press("Escape");

        await expect
            .poll(() =>
                popover.evaluate((el) => {
                    const raw = (el as HTMLElement).dataset.exitTrace;
                    return raw ? (JSON.parse(raw) as ExitTrace) : null;
                }),
            )
            .toMatchObject({
                done: true,
                inFlightReady: false,
                inFlightPlacement: "top",
                afterReady: false,
                afterPlacement: null,
                afterOpen: false,
            });
    });

    test("re-measures placement on resize flip while open before exit transition", async ({ page }) => {
        const trigger = page.locator("button.cs-button", { hasText: /^Open popover$/ });
        const popover = page.locator("#popover-basic-demo");

        await expect(trigger).toBeVisible();
        await trigger.click();

        await expect(popover).toHaveAttribute("data-resolved-placement", "bottom");
        await expect(popover).toHaveAttribute("data-ready", "");

        // Shrink viewport while open so CSS anchor positioning flips the popover above the trigger.
        const box = await trigger.boundingBox();
        if (!box) throw new Error("Expected trigger bounding box");
        await page.setViewportSize({
            width: 1280,
            height: Math.ceil(box.y + box.height + 12),
        });

        await popover.evaluate((el) => {
            const htmlEl = el as HTMLElement;
            const trace: ExitTrace = {
                inFlightReady: true,
                inFlightPlacement: null,
                afterReady: true,
                afterPlacement: null,
                afterOpen: true,
                done: false,
            };
            const save = (): void => {
                htmlEl.dataset.exitTrace = JSON.stringify(trace);
            };
            save();

            const onToggle = (event: Event): void => {
                if ((event as ToggleEvent).newState !== "closed") return;
                trace.inFlightPlacement = htmlEl.dataset.resolvedPlacement ?? null;
                save();
            };

            const onTransitionDone = (event: Event): void => {
                if (event.target !== htmlEl || htmlEl.matches(":popover-open")) return;
                htmlEl.removeEventListener("toggle", onToggle);
                htmlEl.removeEventListener("transitionend", onTransitionDone);
                htmlEl.removeEventListener("transitioncancel", onTransitionDone);
                queueMicrotask(() => {
                    trace.afterPlacement = htmlEl.dataset.resolvedPlacement ?? null;
                    trace.done = true;
                    save();
                });
            };

            htmlEl.addEventListener("toggle", onToggle);
            htmlEl.addEventListener("transitionend", onTransitionDone);
            htmlEl.addEventListener("transitioncancel", onTransitionDone);
        });

        await page.keyboard.press("Escape");

        await expect
            .poll(() =>
                popover.evaluate((el) => {
                    const raw = (el as HTMLElement).dataset.exitTrace;
                    return raw ? (JSON.parse(raw) as ExitTrace) : null;
                }),
            )
            .toMatchObject({
                done: true,
                inFlightPlacement: "top",
                afterPlacement: null,
            });
    });

    test("dual flips bottom-start to top-end near bottom-right corner", async ({ page }) => {
        await page.locator("button.cs-sidebar-item", { hasText: /^Dropdown$/ }).click();

        const trigger = page.locator("button.cs-button", { hasText: /^Actions$/ }).first();
        await expect(trigger).toBeVisible();

        const popoverId = await trigger.getAttribute("popovertarget");
        if (!popoverId) throw new Error("Expected popovertarget on Dropdown trigger");
        const popover = page.locator(`#${popoverId}`);
        await expect(popover).toHaveAttribute("data-placement", "bottom-start");

        // Pin trigger near the bottom-right corner so CSS anchor positioning performs a dual flip (flip-block + flip-inline).
        await trigger.evaluate((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.position = "fixed";
            htmlEl.style.right = "12px";
            htmlEl.style.bottom = "12px";
        });

        await trigger.click();

        await expect(popover).toHaveAttribute("data-resolved-placement", "top-end");
        await expect(popover).toHaveAttribute("data-ready", "");

        const computed = await popover.evaluate((el) => {
            const htmlEl = el as HTMLElement;
            const style = getComputedStyle(htmlEl);
            const [originX = NaN, originY = NaN] = style.transformOrigin
                .split(" ")
                .map((v) => Number(v.replace("px", "")));
            return {
                originX,
                originY,
                width: htmlEl.offsetWidth,
                height: htmlEl.offsetHeight,
            };
        });

        expect(computed.width).toBeGreaterThan(0);
        expect(computed.height).toBeGreaterThan(0);
        expect(Math.abs(computed.originX - computed.width)).toBeLessThan(1);
        expect(Math.abs(computed.originY - computed.height)).toBeLessThan(1);
    });

    test("data-warm and data-instant resolve placement and do not get stuck at opacity 0", async ({ page }) => {
        const trigger = page.locator("button.cs-button", { hasText: /^Open popover$/ });
        const popover = page.locator("#popover-basic-demo");

        await expect(trigger).toBeVisible();

        await popover.evaluate((el) => {
            (el as HTMLElement).dataset.warm = "";
        });
        await trigger.click();

        await expect(popover).toHaveAttribute("data-resolved-placement", "bottom");
        await expect(popover).toHaveCSS("opacity", "1");

        await page.keyboard.press("Escape");
        await expect(popover).not.toHaveAttribute("data-resolved-placement");

        await popover.evaluate((el) => {
            const htmlEl = el as HTMLElement;
            delete htmlEl.dataset.warm;
            htmlEl.dataset.instant = "";
        });
        await trigger.click();

        await expect(popover).toHaveAttribute("data-resolved-placement", "bottom");
        await expect(popover).toHaveCSS("opacity", "1");
    });
});
