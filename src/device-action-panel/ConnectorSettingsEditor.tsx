import React, { useEffect, useState, type FormEvent } from 'react';
import type { PluginMeta, StandardEditorProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { Alert, Button, Field, Input, SecretInput } from '@grafana/ui';
import { DEFAULT_SETTINGS } from '../defaults';
import type { AppSettings } from '../types';

const APP_ID = 'asim-deviceaction-app';

export function ConnectorSettingsEditor(_props: StandardEditorProps<string>) {
  const [plugin, setPlugin] = useState<PluginMeta<AppSettings>>();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_SETTINGS.baseUrl);
  const [apiToken, setApiToken] = useState('');
  const [isApiTokenSet, setIsApiTokenSet] = useState(false);
  const [message, setMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const meta = await getBackendSrv().get<PluginMeta<AppSettings>>(`/api/plugins/${APP_ID}/settings`);
      setPlugin(meta);
      setBaseUrl(meta.jsonData?.baseUrl ?? DEFAULT_SETTINGS.baseUrl);
      setIsApiTokenSet(Boolean(meta.secureJsonFields?.apiToken));
    } catch (error) {
      setMessage(extractError(error, 'Unable to load connector settings. Grafana Admin access is required.'));
    }
  };

  const save = async () => {
    if (!plugin) {
      return;
    }
    setIsSaving(true);
    setMessage(undefined);
    try {
      await getBackendSrv().post(`/api/plugins/${APP_ID}/settings`, {
        enabled: plugin.enabled,
        pinned: plugin.pinned,
        jsonData: { ...DEFAULT_SETTINGS, ...plugin.jsonData, baseUrl: baseUrl.trim() },
        secureJsonData: isApiTokenSet ? undefined : { apiToken },
      });
      setApiToken('');
      setIsApiTokenSet(Boolean(apiToken) || isApiTokenSet);
      setMessage('Connector saved. New actions will use this server-side URL.');
      await loadSettings();
    } catch (error) {
      setMessage(extractError(error, 'Unable to save connector settings. Grafana Admin access is required.'));
    } finally {
      setIsSaving(false);
    }
  };

  const changeToken = (event: FormEvent<HTMLInputElement>) => {
    setApiToken(event.currentTarget.value);
    setIsApiTokenSet(false);
  };

  return (
    <div>
      {message && <Alert title={message} severity="info" />}
      <Field label="Backend URL" description="Use http://mock-api:8080 with the included Docker Compose setup.">
        <Input
          value={baseUrl}
          placeholder="https://iot-api.example.com"
          onChange={(event) => setBaseUrl(event.currentTarget.value)}
        />
      </Field>
      <Field label="Bearer token" description="Encrypted in Grafana app settings. It is never saved in dashboard JSON.">
        <SecretInput
          value={apiToken}
          isConfigured={isApiTokenSet}
          onChange={changeToken}
          onReset={() => {
            setApiToken('');
            setIsApiTokenSet(false);
          }}
        />
      </Field>
      <Button disabled={!plugin || !baseUrl.trim() || isSaving} onClick={() => void save()}>
        {isSaving ? 'Saving...' : 'Save connector'}
      </Button>
    </div>
  );
}

function extractError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) {
      return data.message;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

