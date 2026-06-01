import { expect, test } from '@grafana/plugin-e2e';

test('registers the app and nested panel plugins', async ({ request }) => {
  const app = await request.get('/api/plugins/asim-device-action-app/settings');
  expect(app.ok()).toBeTruthy();
  await expect(app.json()).resolves.toMatchObject({
    id: 'asim-device-action-app',
    enabled: true,
  });

  const panel = await request.get('/api/plugins/asim-device-action-panel/settings');
  expect(panel.ok()).toBeTruthy();
  await expect(panel.json()).resolves.toMatchObject({
    id: 'asim-device-action-panel',
  });
});

test('provisions the demo dashboard and connector URL', async ({ request }) => {
  const dashboard = await request.get('/api/dashboards/uid/device-action-panel-demo');
  expect(dashboard.ok()).toBeTruthy();
  await expect(dashboard.json()).resolves.toMatchObject({
    dashboard: {
      title: 'Device Action Panel Demo',
      uid: 'device-action-panel-demo',
    },
  });

  const settings = await request.get('/api/plugins/asim-device-action-app/settings');
  await expect(settings.json()).resolves.toMatchObject({
    jsonData: {
      baseUrl: 'http://mock-api:8080',
    },
  });
});

