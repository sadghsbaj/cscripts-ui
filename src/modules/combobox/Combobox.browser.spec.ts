import { expect, test } from "@playwright/test";

test.describe("Combobox openOnFocus + popover='manual' in Chromium", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.locator("button.cs-sidebar-item", { hasText: /^Combobox$/ }).click();
    });

    test("clicking ComboboxInput with openOnFocus={true} opens popover='manual', stays open after pointerup, and closes on outside click", async ({
        page,
    }) => {
        const input = page.locator('input.cs-combobox-input[placeholder="Focus to open…"]');
        await expect(input).toBeVisible();

        const listboxId = await input.getAttribute("aria-controls");
        if (!listboxId) throw new Error("Expected ComboboxInput aria-controls");

        const content = page.locator(`#${listboxId}`);
        await expect(content).toHaveAttribute("popover", "manual");
        await expect(content).not.toBeVisible();

        const box = await input.boundingBox();
        if (!box) throw new Error("Expected ComboboxInput bounding box");

        // Real mouse press-and-release sequence: pointerdown -> focus -> pointerup -> click
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await expect.poll(() => content.evaluate((el) => el.matches(":popover-open"))).toBe(true);

        await page.mouse.up();
        await expect(content).toBeVisible();
        await expect(input).toHaveAttribute("aria-expanded", "true");
        await expect.poll(() => content.evaluate((el) => el.matches(":popover-open"))).toBe(true);

        // Clicking ComboboxInput again while already open keeps it open
        await input.click();
        await expect(content).toBeVisible();
        await expect(input).toHaveAttribute("aria-expanded", "true");

        // Clicking outside both ComboboxControl and ComboboxContent closes the popover
        await page.locator("h1, h2").first().click();
        await expect(input).toHaveAttribute("aria-expanded", "false");
        await expect.poll(() => content.evaluate((el) => el.matches(":popover-open"))).toBe(false);
    });
});
