import { expect, test } from "@playwright/test";

test.describe("autoResize CSS layer & nesting integration in Chromium", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.locator("button.cs-sidebar-item", { hasText: /^Auto-Resize$/ }).click();
    });

    test("applies @layer components.primitive &[data-auto-resize] min-width and max-width on TextInputField", async ({
        page,
    }) => {
        const input = page.locator('input.cs-text-input-field[placeholder="Tag..."]');
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute("data-auto-resize", "");
        await expect(input).toHaveCSS("min-width", "80px");
        await expect(input).toHaveCSS("max-width", "260px");
    });

    test("applies @layer components.primitive &[data-auto-resize] resize and min-width fallback on TextArea", async ({
        page,
    }) => {
        const textarea = page.locator('textarea.cs-text-area[placeholder="Comment..."]');
        await expect(textarea).toBeVisible();
        await expect(textarea).toHaveAttribute("data-auto-resize", "");
        await expect(textarea).toHaveCSS("resize", "none");
        await expect(textarea).toHaveCSS("min-width", "0px");
    });
});
