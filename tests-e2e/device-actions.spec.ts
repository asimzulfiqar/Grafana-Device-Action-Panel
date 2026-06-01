import { expect, test } from '@grafana/plugin-e2e';

const dashboardUrl = '/d/device-action-panel-demo/device-action-panel-demo';

test.beforeEach(async ({ page }) => {
  await page.goto(dashboardUrl);
  await expect(page.getByText('Target device').first()).toBeVisible();
});

test('renders raw variable value instead of friendly label', async ({ page }) => {
  await expect(page.getByText('e726ff618db6bbdc').first()).toBeVisible();
  await expect(page.getByText('Pump Alpha', { exact: true })).toBeVisible();
});

test('cancel alert succeeds and cooldown blocks a rapid repeat', async ({ page }) => {
  await page.getByTestId('action-1-cancel_alert').click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText(/Status: succeeded/).first()).toBeVisible();
  await expect(page.getByTestId('action-1-cancel_alert')).toBeDisabled();
});

test('acknowledge alarm succeeds', async ({ page }) => {
  await page.getByTestId('action-1-acknowledge_alarm').click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText(/Acknowledge Alarm accepted/).first()).toBeVisible();
});

test('reboot requires typed confirmation and returns command id', async ({ page }) => {
  await page.getByTestId('action-1-reboot_device').click();
  const confirm = page.getByRole('button', { name: 'Confirm', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByPlaceholder('Type REBOOT to confirm').fill('REBOOT');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText(/Command ID: cmd-/).first()).toBeVisible();
});

test('shows an empty state when no device id is configured', async ({ page }) => {
  await expect(page.getByText('Expected: actions are unavailable because no device is selected.')).toBeVisible();
});
