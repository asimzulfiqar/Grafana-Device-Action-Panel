import React, { useEffect, useState, type FormEvent } from 'react';
import type { PluginMeta, SelectableValue, StandardEditorProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { Alert, Button, ColorPickerInput, Field, IconButton, Input, Select, TextArea } from '@grafana/ui';
import { DEFAULT_SETTINGS } from '../defaults';
import type { ActionDefinition, ActionStyle, AppSettings, ConfirmationMode } from '../types';

const APP_ID = 'asim-device-action-app';
const METHODS: Array<SelectableValue<ActionDefinition['method']>> = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];
const STYLES: Array<SelectableValue<ActionStyle>> = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Destructive', value: 'destructive' },
];
const CONFIRMATIONS: Array<SelectableValue<ConfirmationMode>> = [
  { label: 'None', value: 'none' },
  { label: 'Simple dialog', value: 'simple' },
  { label: 'Typed confirmation', value: 'typed' },
];

export function ActionCatalogEditor({ value, onChange }: StandardEditorProps<ActionDefinition[]>) {
  const actions = value ?? [];
  const [plugin, setPlugin] = useState<PluginMeta<AppSettings>>();
  const [expanded, setExpanded] = useState<number>();
  const [message, setMessage] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void getBackendSrv()
      .get<PluginMeta<AppSettings>>(`/api/plugins/${APP_ID}/settings`)
      .then(setPlugin)
      .catch((error) => setMessage(extractError(error, 'Unable to load backend catalog.')));
  }, []);

  const update = (index: number, patch: Partial<ActionDefinition>) => {
    onChange(actions.map((action, actionIndex) => (actionIndex === index ? { ...action, ...patch } : action)));
  };

  const add = () => {
    const next = actions.length + 1;
    onChange([
      ...actions,
      {
        key: `action_${next}`,
        label: `Action ${next}`,
        description: '',
        style: 'primary',
        color: '#1f60c4',
        path: '/devices/{{deviceId}}/action',
        method: 'POST',
        confirmation: 'simple',
        confirmationText: 'Run this action for {{deviceId}}?',
        cooldownSeconds: 5,
        timeoutSeconds: 10,
      },
    ]);
    setExpanded(actions.length);
  };

  const remove = (index: number) => {
    onChange(actions.filter((_action, actionIndex) => actionIndex !== index));
    setExpanded(undefined);
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= actions.length) {
      return;
    }
    const reordered = [...actions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onChange(reordered);
    setExpanded(target);
  };

  const saveBackendCatalog = async () => {
    const error = validateActions(actions);
    if (error) {
      setMessage(error);
      return;
    }
    if (!plugin) {
      setMessage('Backend settings are still loading.');
      return;
    }
    setIsSaving(true);
    setMessage(undefined);
    try {
      await getBackendSrv().post(`/api/plugins/${APP_ID}/settings`, {
        enabled: plugin.enabled,
        pinned: plugin.pinned,
        jsonData: { ...DEFAULT_SETTINGS, ...plugin.jsonData, actions },
      });
      setPlugin({ ...plugin, jsonData: { ...DEFAULT_SETTINGS, ...plugin.jsonData, actions } });
      setMessage('Action catalog saved for this panel and the server-side connector.');
    } catch (error) {
      setMessage(extractError(error, 'Unable to save action catalog. Grafana Admin access is required.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {message && <Alert title={message} severity="info" />}
      {actions.map((action, index) => (
        <div key={`${action.key}-${index}`} style={{ borderBottom: '1px solid var(--border-weak)', paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Button fill="text" style={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => setExpanded(expanded === index ? undefined : index)}>
              {action.label || action.key || `Action ${index + 1}`}
            </Button>
            <IconButton name="arrow-up" aria-label="Move action up" disabled={index === 0} onClick={() => move(index, -1)} />
            <IconButton name="arrow-down" aria-label="Move action down" disabled={index === actions.length - 1} onClick={() => move(index, 1)} />
            <IconButton name="trash-alt" aria-label="Remove action" variant="destructive" onClick={() => remove(index)} />
          </div>
          {expanded === index && <ActionForm action={action} onChange={(patch) => update(index, patch)} />}
        </div>
      ))}
      {actions.length === 0 && <p>No buttons configured yet.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button icon="plus" variant="secondary" onClick={add}>
          Add action
        </Button>
        <Button disabled={isSaving || !plugin} onClick={() => void saveBackendCatalog()}>
          {isSaving ? 'Saving...' : 'Save action catalog'}
        </Button>
      </div>
      <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
        Save the dashboard after editing. Save the action catalog to authorize these actions in the server-side connector.
      </p>
    </div>
  );
}

function ActionForm({ action, onChange }: { action: ActionDefinition; onChange: (patch: Partial<ActionDefinition>) => void }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <Field label="Action key" description="Stable backend identifier, for example cancel_alert.">
        <Input value={action.key} onChange={input((key) => onChange({ key }))} />
      </Field>
      <Field label="Button label">
        <Input value={action.label} onChange={input((label) => onChange({ label }))} />
      </Field>
      <Field label="Description">
        <Input value={action.description ?? ''} onChange={input((description) => onChange({ description }))} />
      </Field>
      <Field label="Button style">
        <Select options={STYLES} value={action.style ?? 'primary'} onChange={(option) => onChange({ style: option.value })} />
      </Field>
      <Field label="Custom button color" description="Optional visual override.">
        <ColorPickerInput value={action.color ?? ''} returnColorAs="hex" onChange={(color) => onChange({ color })} />
      </Field>
      <Field label="HTTP method">
        <Select options={METHODS} value={action.method ?? 'POST'} onChange={(option) => onChange({ method: option.value })} />
      </Field>
      <Field label="Relative backend path" description="Use {{deviceId}}, {{tenantId}}, or {{siteId}} placeholders.">
        <Input value={action.path} onChange={input((path) => onChange({ path }))} />
      </Field>
      <Field label="JSON body template" description="Optional JSON sent to the REST backend.">
        <TextArea rows={4} value={action.bodyTemplate ?? ''} onChange={textArea((bodyTemplate) => onChange({ bodyTemplate }))} />
      </Field>
      <Field label="Confirmation">
        <Select
          options={CONFIRMATIONS}
          value={action.confirmation ?? 'none'}
          onChange={(option) => onChange({ confirmation: option.value })}
        />
      </Field>
      {action.confirmation !== 'none' && (
        <Field label="Confirmation message" description="Use {{deviceId}} to show the selected device.">
          <Input value={action.confirmationText ?? ''} onChange={input((confirmationText) => onChange({ confirmationText }))} />
        </Field>
      )}
      {action.confirmation === 'typed' && (
        <Field label="Required confirmation text">
          <Input value={action.typedConfirmation ?? ''} onChange={input((typedConfirmation) => onChange({ typedConfirmation }))} />
        </Field>
      )}
      <Field label="Cooldown seconds">
        <Input type="number" min={0} value={action.cooldownSeconds ?? 0} onChange={inputNumber((cooldownSeconds) => onChange({ cooldownSeconds }))} />
      </Field>
      <Field label="Timeout seconds">
        <Input type="number" min={1} value={action.timeoutSeconds ?? 10} onChange={inputNumber((timeoutSeconds) => onChange({ timeoutSeconds }))} />
      </Field>
      <Field label="Allowed Grafana roles" description="Optional comma-separated list, for example Admin, Editor.">
        <Input
          value={(action.allowedRoles ?? []).join(', ')}
          onChange={input((value) => onChange({ allowedRoles: value.split(',').map((role) => role.trim()).filter(Boolean) }))}
        />
      </Field>
    </div>
  );
}

function input(onValue: (value: string) => void) {
  return (event: FormEvent<HTMLInputElement>) => onValue(event.currentTarget.value);
}

function textArea(onValue: (value: string) => void) {
  return (event: FormEvent<HTMLTextAreaElement>) => onValue(event.currentTarget.value);
}

function inputNumber(onValue: (value: number) => void) {
  return (event: FormEvent<HTMLInputElement>) => onValue(Number(event.currentTarget.value));
}

function validateActions(actions: ActionDefinition[]): string | undefined {
  const keys = new Set<string>();
  for (const action of actions) {
    if (!action.key.trim() || !action.label.trim() || !action.path.trim()) {
      return 'Every action requires a key, label, and relative backend path.';
    }
    if (keys.has(action.key)) {
      return `Action key "${action.key}" is duplicated.`;
    }
    keys.add(action.key);
  }
  return undefined;
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
