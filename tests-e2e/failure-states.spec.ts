import { expect, test } from '@grafana/plugin-e2e';

const dashboardUrl = '/d/device-action-panel-demo/device-action-panel-demo';

test.beforeEach(async ({ page }) => {
  await page.goto(dashboardUrl);
});

test('shows denied response from the backend', async ({ page }) => {
  await page.getByTestId('action-3-cancel_alert').click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText(/device backend denied the command/i)).toBeVisible();
});

test('shows backend failure response', async ({ page }) => {
  await page.getByTestId('action-4-cancel_alert').click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText(/status 500/i)).toBeVisible();
});

test('shows backend timeout response', async ({ page }) => {
  await page.getByTestId('action-5-cancel_alert').click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByTestId('device-action-panel-5').getByText(/timed out/i).first()).toBeVisible({ timeout: 15_000 });
});

test('shows malformed device id validation', async ({ page }) => {
  await page.getByTestId('action-6-cancel_alert').click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText(/device ID is invalid/i)).toBeVisible();
});
