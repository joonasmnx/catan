import { expect, test, type Page } from '@playwright/test';

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

const tiles = (page: Page) => page.locator('#board polygon.tile');
const boardText = (page: Page) => page.locator('#rows').textContent();

async function noHorizontalScroll(page: Page) {
  const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(scroll).toBeLessThanOrEqual(client);
}

test('generates both modes with no errors and no sideways scroll', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(tiles(page)).toHaveCount(19);
  await expect(page.locator('h1')).toHaveText(/^Board 4-[0-9A-Z]{7}$/);
  await noHorizontalScroll(page);

  const first = await page.locator('h1').textContent();
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('h1')).not.toHaveText(first!);
  await expect(tiles(page)).toHaveCount(19);

  await page.getByRole('radio', { name: '5–6 players' }).check();
  await expect(tiles(page)).toHaveCount(30);
  await expect(page.locator('h1')).toHaveText(/^Board 6-/);
  await expect(page.locator('#board .token-n')).toHaveCount(28);
  await expect(page.locator('#board .port')).toHaveCount(11);
  await expect(page.locator('#checks .ok')).toHaveCount(4);
  await noHorizontalScroll(page);

  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(tiles(page)).toHaveCount(30);
  expect(errors).toEqual([]);
});

test('a shared link reproduces the exact board', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: '5–6 players' }).check();
  await expect(tiles(page)).toHaveCount(30);
  const url = page.url();
  expect(url).toMatch(/\?b=6-[0-9A-Z]{7}$/);
  const svg = await page.locator('#board').innerHTML();

  const friend = await browser.newPage();
  await friend.goto(url);
  await expect(friend.locator('h1')).toHaveText(await page.locator('h1').textContent() as string);
  expect(await friend.locator('#board').innerHTML()).toBe(svg);
  await friend.close();
});

test('back returns to the previous board', async ({ page }) => {
  await page.goto('/?b=4-0000001');
  const before = await boardText(page);
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.locator('h1')).not.toHaveText('Board 4-0000001');
  await page.goBack();
  await expect(page.locator('h1')).toHaveText('Board 4-0000001');
  expect(await boardText(page)).toBe(before);
});

test('share copies the link when there is no share sheet', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?b=4-0000042');
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined }));
  await page.getByRole('button', { name: 'Share link' }).click();
  await expect(page.locator('#status')).toHaveText('Link copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('?b=4-0000042');
});

test('save image downloads a PNG', async ({ page }) => {
  await page.goto('/?b=6-0000007');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image' }).click();
  expect((await download).suggestedFilename()).toBe('catan-board-6-0000007.png');
});

test('works offline after the first visit', async ({ page, context }) => {
  const errors = watchErrors(page);
  await page.goto('/?b=4-0000005');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const online = await boardText(page);

  await context.setOffline(true);
  await page.goto('/?b=4-0000005');
  await expect(tiles(page)).toHaveCount(19);
  expect(await boardText(page)).toBe(online);
  await page.goto('/?b=6-00000AB');
  await expect(tiles(page)).toHaveCount(30);
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test('an unknown code falls back to a new board with a note', async ({ page }) => {
  await page.goto('/?b=nonsense');
  await expect(tiles(page)).toHaveCount(19);
  await expect(page.locator('#status')).toContainText('not recognised');
});
