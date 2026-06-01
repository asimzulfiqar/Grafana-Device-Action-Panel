import { expect, test } from '@grafana/plugin-e2e';

const dashboardUrl = '/d/device-action-panel-demo/device-action-panel-demo';

test('exposes the trusted Grafana identity to the panel backend', async ({ request }) => {
  const response = await request.get('/api/plugins/asim-deviceaction-app/resources/identity');
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    user: 'admin',
    role: 'Admin',
    orgId: 1,
  });
});

for (const theme of ['light', 'dark']) {
  test(`renders the action panel in the ${theme} theme on a narrow layout`, async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(`${dashboardUrl}?theme=${theme}`);
    await expect(page.getByText('Target device').first()).toBeVisible();
    await expect(page.getByTestId('action-1-cancel_alert')).toBeVisible();
  });
}
