import { expect, test, type Locator } from "@playwright/test";

function getIconParts(input: Locator): { check: Locator; dash: Locator; morph: Locator } {
    const icon = input.locator("+ .cs-checkbox-icon");
    return {
        check: icon.locator(".cs-checkbox-check"),
        dash: icon.locator(".cs-checkbox-dash").first(),
        morph: icon.locator(".cs-checkbox-morph"),
    };
}

test.describe("Checkbox tri-state morph in Chromium", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.locator("button.cs-sidebar-item", { hasText: /^Checkbox$/ }).click();
    });

    test("Cycle A: unchecked -> indeterminate (no morph) -> checked (morph) -> unchecked", async ({ page }) => {
        const cycleA = page.locator('input.cs-checkbox[aria-label="Unchecked to Indeterminate to Checked"]');
        await expect(cycleA).toBeVisible();
        const { dash, morph } = getIconParts(cycleA);

        // Initial: unchecked
        await expect(cycleA).not.toBeChecked();
        await expect(cycleA).toHaveJSProperty("indeterminate", false);
        await expect(cycleA).not.toHaveAttribute("data-morph");

        // Click 1: unchecked -> indeterminate (must NOT morph from Check)
        await cycleA.click();
        await expect(cycleA).not.toBeChecked();
        await expect(cycleA).toHaveJSProperty("indeterminate", true);
        await expect(cycleA).not.toHaveAttribute("data-morph");
        await expect(dash).toHaveCSS("opacity", "1");
        await expect(morph).toHaveCSS("opacity", "0");

        // Click 2: indeterminate -> checked (morphs dash -> check)
        await cycleA.click();
        await expect(cycleA).toBeChecked();
        await expect(cycleA).toHaveJSProperty("indeterminate", false);
        await expect(cycleA).toHaveAttribute("data-morph", "");
        await expect(morph).toHaveCSS("opacity", "1");
        await expect(morph).toHaveAttribute("d", "M4 12L9 17L20 6");

        // Click 3: checked -> unchecked
        await cycleA.click();
        await expect(cycleA).not.toBeChecked();
        await expect(cycleA).toHaveJSProperty("indeterminate", false);
        await expect(cycleA).not.toHaveAttribute("data-morph");
    });

    test("Cycle B: unchecked -> checked (no morph) -> indeterminate (morph) -> unchecked", async ({ page }) => {
        const cycleB = page.locator('input.cs-checkbox[aria-label="Unchecked to Checked to Indeterminate"]');
        await expect(cycleB).toBeVisible();
        const { check, morph } = getIconParts(cycleB);

        // Initial: unchecked
        await expect(cycleB).not.toBeChecked();
        await expect(cycleB).toHaveJSProperty("indeterminate", false);
        await expect(cycleB).not.toHaveAttribute("data-morph");

        // Click 1: unchecked -> checked (no morph)
        await cycleB.click();
        await expect(cycleB).toBeChecked();
        await expect(cycleB).toHaveJSProperty("indeterminate", false);
        await expect(cycleB).not.toHaveAttribute("data-morph");
        await expect(check).toHaveCSS("opacity", "1");

        // Click 2: checked -> indeterminate (morphs check -> dash)
        await cycleB.click();
        await expect(cycleB).not.toBeChecked();
        await expect(cycleB).toHaveJSProperty("indeterminate", true);
        await expect(cycleB).toHaveAttribute("data-morph", "");
        await expect(morph).toHaveCSS("opacity", "1");
        await expect(morph).toHaveAttribute("d", "M5 12L12 12L19 12");

        // Click 3: indeterminate -> unchecked
        await cycleB.click();
        await expect(cycleB).not.toBeChecked();
        await expect(cycleB).toHaveJSProperty("indeterminate", false);
        await expect(cycleB).not.toHaveAttribute("data-morph");
    });
});
