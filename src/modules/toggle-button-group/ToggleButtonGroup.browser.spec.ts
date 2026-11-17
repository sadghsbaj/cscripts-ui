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

        // Click "Week" so a later-DOM sibling is pressed while "Day" is unpressed.
        await week.click();
        await expect(week).toHaveAttribute("aria-pressed", "true");
        await expect(day).toHaveAttribute("aria-pressed", "false");

        // Automatic ::after seam separator on the earlier button sits at z-index: 1 and fades out when neighbor is pressed.
        await expect.poll(() => day.evaluate((el) => getComputedStyle(el, "::after").zIndex)).toBe("1");
        await expect.poll(() => day.evaluate((el) => getComputedStyle(el, "::after").opacity)).toBe("0");

        // Move focus back to "Day" via keyboard so :focus-visible activates.
        await page.keyboard.press("Shift+Tab");
        await expect(day).toBeFocused();
        await expect(day.evaluate((el) => el.matches(":focus-visible"))).resolves.toBe(true);

        // Focused earlier button must stack above both its ::after separator (z-index: 1) and pressed later sibling (auto).
        await expect(day).toHaveCSS("z-index", "2");
        await expect(week).toHaveCSS("z-index", "auto");

        // Moving keyboard focus to "Week" restores "Day" to auto and lifts "Week" to 2.
        await page.keyboard.press("Tab");
        await expect(week).toBeFocused();
        await expect(day).toHaveCSS("z-index", "auto");
        await expect(week).toHaveCSS("z-index", "2");
    });
});
