import { expect, test } from '@grafana/plugin-e2e';

test('persists connector URL without leaking a token into dashboard JSON', async ({ request }) => {
  const settingsResponse = await request.get('/api/plugins/asim-deviceaction-app/settings');
  expect(settingsResponse.ok()).toBeTruthy();
  const settings = await settingsResponse.json();

  const save = await request.post('/api/plugins/asim-deviceaction-app/settings', {
    data: {
      enabled: settings.enabled,
      pinned: settings.pinned,
      jsonData: {
        ...settings.jsonData,
        baseUrl: 'http://mock-api:8080',
      },
      secureJsonData: {
        apiToken: 'stage-2-test-token',
      },
    },
  });
  expect(save.ok()).toBeTruthy();

  const reloaded = await request.get('/api/plugins/asim-deviceaction-app/settings');
  await expect(reloaded.json()).resolves.toMatchObject({
    jsonData: {
      baseUrl: 'http://mock-api:8080',
    },
    secureJsonFields: {
      apiToken: true,
    },
  });

  const dashboard = await request.get('/api/dashboards/uid/device-action-panel-demo');
  expect(await dashboard.text()).not.toContain('stage-2-test-token');

  const clearToken = await request.post('/api/plugins/asim-deviceaction-app/settings', {
    data: {
      enabled: settings.enabled,
      pinned: settings.pinned,
      jsonData: settings.jsonData,
      secureJsonData: {
        apiToken: '',
      },
    },
  });
  expect(clearToken.ok()).toBeTruthy();
});

