import React, { useState, type FormEvent } from 'react';
import type { AppPluginMeta, PluginConfigPageProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { Alert, Button, Field, FieldSet, Input, SecretInput, TextArea } from '@grafana/ui';
import { DEFAULT_SETTINGS } from '../defaults';
import type { AppSettings } from '../types';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<AppSettings>> {}

export function AppConfig({ plugin }: AppConfigProps) {
  const { enabled, pinned, jsonData, secureJsonFields } = plugin.meta;
  const initial = { ...DEFAULT_SETTINGS, ...jsonData };
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [deviceIdPattern, setDeviceIdPattern] = useState(initial.deviceIdPattern);
  const [defaultTimeoutSeconds, setDefaultTimeoutSeconds] = useState(initial.defaultTimeoutSeconds);
  const [actionsJson, setActionsJson] = useState(JSON.stringify(initial.actions, null, 2));
  const [apiToken, setApiToken] = useState('');
  const [isApiTokenSet, setIsApiTokenSet] = useState(Boolean(secureJsonFields?.apiToken));
  const [message, setMessage] = useState<string>();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const actions = JSON.parse(actionsJson);
      if (!Array.isArray(actions) || actions.length === 0) {
        throw new Error('Action catalog must contain at least one action.');
      }
      await getBackendSrv().post(`/api/plugins/${plugin.meta.id}/settings`, {
        enabled,
        pinned,
        jsonData: { baseUrl, deviceIdPattern, defaultTimeoutSeconds, actions },
        secureJsonData: isApiTokenSet ? undefined : { apiToken },
      });
      setMessage('Settings saved. Reload Grafana dashboards to use the updated catalog.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save settings.');
    }
  };

  const changeInput = (setter: (value: string) => void) => (event: FormEvent<HTMLInputElement>) =>
    setter(event.currentTarget.value);
  const changeTextArea = (setter: (value: string) => void) => (event: FormEvent<HTMLTextAreaElement>) =>
    setter(event.currentTarget.value);

  return (
    <form onSubmit={submit} style={{ maxWidth: 920 }}>
      <FieldSet label="REST connector">
        {message && <Alert title={message} severity="info" />}
        <Field label="Backend base URL" description="Called only by the server-side plugin backend.">
          <Input value={baseUrl} onChange={changeInput(setBaseUrl)} placeholder="https://iot-api.example.com" />
        </Field>
        <Field label="Bearer token" description="Stored as encrypted secure JSON data and never returned to the browser.">
          <SecretInput
            value={apiToken}
            isConfigured={isApiTokenSet}
            onChange={changeInput(setApiToken)}
            onReset={() => {
              setApiToken('');
              setIsApiTokenSet(false);
            }}
          />
        </Field>
        <Field label="Device ID regular expression">
          <Input value={deviceIdPattern} onChange={changeInput(setDeviceIdPattern)} />
        </Field>
        <Field label="Default timeout in seconds">
          <Input
            type="number"
            value={defaultTimeoutSeconds}
            onChange={(event) => setDefaultTimeoutSeconds(Number(event.currentTarget.value))}
          />
        </Field>
      </FieldSet>
      <FieldSet label="Action catalog">
        <Field label="Actions JSON" description="Define paths, confirmation rules, cooldowns, and optional allowedRoles.">
          <TextArea rows={24} value={actionsJson} onChange={changeTextArea(setActionsJson)} />
        </Field>
      </FieldSet>
      <Button type="submit">Save settings</Button>
    </form>
  );
}
