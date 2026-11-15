import { expect, test } from "@playwright/test";

test.describe("ToggleButtonGroup focus ring stacking in Chromium", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.locator("button.cs-sidebar-item", { hasText: /^Toggle-Button-Group$/ }).click();
    });

    test("lifts :focus-visible earlier button above pressed later sibling and separator", async ({ page }) => {
        const group = page.locator(".cs-toggle-button-group").first();
        await expect(group).toBeVisible();

        const day = group.locator("button.cs-toggle-button", { hasText: "Day" });
        const week = group.locator("button.cs-toggle-button", { hasText: "Week" });
        const separator = group.locator(".cs-toggle-button-group-separator").first();

        // Click "Week" so a later-DOM sibling is pressed while "Day" is unpressed.
        await week.click();
        await expect(week).toHaveAttribute("aria-pressed", "true");
        await expect(day).toHaveAttribute("aria-pressed", "false");
        await expect(separator).toHaveCSS("z-index", "1");

        // Move focus back to "Day" via keyboard so :focus-visible activates.
        await page.keyboard.press("Shift+Tab");
        await expect(day).toBeFocused();
        await expect(day.evaluate((el) => el.matches(":focus-visible"))).resolves.toBe(true);

        // Focused earlier button must stack above both the separator (z-index: 1) and pressed later sibling (auto).
        await expect(day).toHaveCSS("z-index", "2");
        await expect(week).toHaveCSS("z-index", "auto");

        // Moving keyboard focus to "Week" restores "Day" to auto and lifts "Week" to 2.
        await page.keyboard.press("Tab");
        await expect(week).toBeFocused();
        await expect(day).toHaveCSS("z-index", "auto");
        await expect(week).toHaveCSS("z-index", "2");
    });
});
