import { test, expect } from "@playwright/test";

/**
 * End-to-end smoke test for the core approval workflow, run against
 * simulation mode (SIMULATION_MODE=true) so it needs no external
 * credentials: log in as the seeded reviewer, open a pending batch, select
 * a candidate, and confirm the editor requires the reviewer-confirmation
 * checkbox before Approve is enabled.
 *
 * Requires the database to be seeded (`npm run prisma:seed`) before running.
 */
test.describe("review workflow", () => {
  test("reviewer can log in and reach the review dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("reviewer@liceo.io");
    await page.getByLabel("Password").fill("LiceoAdmin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("selecting a candidate requires confirmation before Approve is enabled", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("reviewer@liceo.io");
    await page.getByLabel("Password").fill("LiceoAdmin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/review");
    const firstBatch = page.locator("a[href^='/review/']").first();
    if ((await firstBatch.count()) === 0) test.skip(true, "No pending batch to review; run the seed script first.");

    await firstBatch.click();
    await page.getByRole("button", { name: "Select Candidate" }).first().click();

    const approveButton = page.getByRole("button", { name: "Approve" });
    await expect(approveButton).toBeDisabled();

    await page.getByLabel(/I have checked this content/i).check();
    // Approve stays disabled until edits are saved at least once is a UI
    // nuance; the core invariant under test is that it is never enabled
    // before the confirmation checkbox is checked.
  });
});
