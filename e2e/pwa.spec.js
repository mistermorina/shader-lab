import { expect, test } from "@playwright/test";

test("pwa app shell remains available offline after first load", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /shader\.lab/i })).toBeVisible();

  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller))).toBe(true);

  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /shader\.lab/i })).toBeVisible();
  await context.setOffline(false);
});

test("manifest is served as install metadata", async ({ page }) => {
  const response = await page.goto("/manifest.webmanifest");
  expect(response?.ok()).toBe(true);

  const manifest = JSON.parse(await page.locator("body").innerText());
  expect(manifest).toMatchObject({
    name: "shader.lab",
    start_url: "/",
    display: "standalone",
  });
});
