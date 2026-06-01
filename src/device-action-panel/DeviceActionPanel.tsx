import React, { useEffect, useMemo, useState } from 'react';
import type { PanelProps } from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { Alert, Button, Input, Modal, Spinner } from '@grafana/ui';
import type { ActionDefinition, ActionResponse, GrafanaIdentity } from '../types';
import { DEFAULT_PANEL_OPTIONS } from './defaults';
import type { PanelOptions } from './types';

const APP_ID = 'asim-deviceaction-app';

interface PendingConfirmation {
  action: ActionDefinition;
  typedValue: string;
}

export function DeviceActionPanel({
  options: configuredOptions,
  data,
  id,
  replaceVariables,
}: PanelProps<PanelOptions>) {
  const options = { ...DEFAULT_PANEL_OPTIONS, ...configuredOptions };
  const [inFlight, setInFlight] = useState<string>();
  const [result, setResult] = useState<ActionResponse>();
  const [confirming, setConfirming] = useState<PendingConfirmation>();
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [identity, setIdentity] = useState<GrafanaIdentity>();

  const deviceId = resolveDeviceId(options, data.series);
  const actions = useMemo(
    () => configuredOptions.actions ?? parseActions(options.actionsJson, options.actionKeys),
    [configuredOptions.actions, options.actionsJson, options.actionKeys]
  );
  const visibleActions = actions.filter((action) => roleAllowed(identity?.role, action.allowedRoles));

  useEffect(() => {
    void getBackendSrv()
      .get<GrafanaIdentity>(`/api/plugins/${APP_ID}/resources/identity`)
      .then(setIdentity)
      .catch(() => setIdentity({ user: '', role: '', orgId: 0 }));
  }, []);

  useEffect(() => {
    if (!Object.values(cooldowns).some((until) => until > now)) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldowns, now]);

  const execute = async (action: ActionDefinition) => {
    setConfirming(undefined);
    setInFlight(action.key);
    setResult(undefined);
    try {
      const response = await getBackendSrv().post<ActionResponse>(`/api/plugins/${APP_ID}/resources/actions/execute`, {
        actionKey: action.key,
        deviceId,
        tenantId: replaceVariables(options.tenantTemplate),
        siteId: replaceVariables(options.siteTemplate),
        dashboardUid: resolveDashboardUid(),
        panelId: id,
        requestedAt: new Date().toISOString(),
      });
      setResult(response);
      setCooldowns((current) => ({ ...current, [action.key]: Date.now() + (action.cooldownSeconds ?? 0) * 1000 }));
      setNow(Date.now());
    } catch (error) {
      setResult(extractActionError(error));
    } finally {
      setInFlight(undefined);
    }
  };

  const startAction = (action: ActionDefinition) => {
    if (action.confirmation && action.confirmation !== 'none') {
      setConfirming({ action, typedValue: '' });
      return;
    }
    void execute(action);
  };

  return (
    <div data-testid={`device-action-panel-${id}`} style={{ padding: 12, height: '100%', overflow: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>{options.title}</h3>
      {!deviceId ? (
        <Alert title={options.emptyMessage} severity="warning" />
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: 'var(--text-secondary)' }}>Target device</div>
            <strong>{deviceId}</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {visibleActions.map((action) => {
              const remaining = Math.max(0, Math.ceil(((cooldowns[action.key] ?? 0) - now) / 1000));
              return (
                <Button
                  key={action.key}
                  data-testid={`action-${id}-${action.key}`}
                  variant={action.style === 'destructive' ? 'destructive' : action.style ?? 'primary'}
                  style={action.color ? { backgroundColor: action.color, borderColor: action.color } : undefined}
                  disabled={Boolean(inFlight) || remaining > 0}
                  title={action.description}
                  onClick={() => startAction(action)}
                >
                  {inFlight === action.key && <Spinner inline />} {action.label}
                  {remaining > 0 ? ` (${remaining}s)` : ''}
                </Button>
              );
            })}
          </div>
        </>
      )}
      {actions.length === 0 && <Alert title="No valid actions are configured for this panel." severity="error" />}
      {actions.length > 0 && visibleActions.length === 0 && (
        <Alert title="No actions are available for your Grafana role." severity="info" />
      )}
      {result && (
        <div style={{ marginTop: 12 }}>
          <Alert title={result.message} severity={result.accepted ? 'success' : result.status === 'denied' ? 'warning' : 'error'}>
            Status: {result.status}. Completed: {new Date(result.completedAt).toLocaleString()}.
            {result.commandId && <> Command ID: {result.commandId}.</>}
          </Alert>
        </div>
      )}
      {confirming && (
        <ConfirmationModal
          deviceId={deviceId}
          state={confirming}
          onChange={(typedValue) => setConfirming({ ...confirming, typedValue })}
          onDismiss={() => setConfirming(undefined)}
          onConfirm={() => void execute(confirming.action)}
        />
      )}
    </div>
  );
}

function roleAllowed(role: string | undefined, allowedRoles: string[] | undefined): boolean {
  return !allowedRoles?.length || Boolean(role && allowedRoles.some((allowed) => allowed.toLowerCase() === role.toLowerCase()));
}

function resolveDashboardUid(): string {
  const parts = window.location.pathname.split('/');
  return parts[1] === 'd' ? parts[2] ?? '' : '';
}

function ConfirmationModal({
  deviceId,
  state,
  onChange,
  onDismiss,
  onConfirm,
}: {
  deviceId: string;
  state: PendingConfirmation;
  onChange: (value: string) => void;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const expected = state.action.typedConfirmation ?? state.action.key.toUpperCase();
  const message = (state.action.confirmationText ?? `Run ${state.action.label} for {{deviceId}}?`)
    .split('{{deviceId}}')
    .join(deviceId);
  const typed = state.action.confirmation === 'typed';

  return (
    <Modal title={`Confirm ${state.action.label}`} isOpen onDismiss={onDismiss}>
      <p>{message}</p>
      {typed && (
        <Input
          autoFocus
          value={state.typedValue}
          placeholder={`Type ${expected} to confirm`}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
      <Modal.ButtonRow>
        <Button variant={state.action.style === 'destructive' ? 'destructive' : 'primary'} disabled={typed && state.typedValue !== expected} onClick={onConfirm}>
          Confirm
        </Button>
        <Button variant="secondary" onClick={onDismiss}>
          Cancel
        </Button>
      </Modal.ButtonRow>
    </Modal>
  );
}

function parseActions(raw: string, keys: string): ActionDefinition[] {
  try {
    const parsed = JSON.parse(raw) as ActionDefinition[];
    const visible = new Set(keys.split(',').map((key) => key.trim()).filter(Boolean));
    return parsed.filter((action) => action.key && action.label && visible.has(action.key));
  } catch {
    return [];
  }
}

function resolveDeviceId(options: PanelOptions, series: PanelProps<PanelOptions>['data']['series']): string {
  if (options.bindingSource === 'static') {
    return options.staticDeviceId.trim();
  }
  if (options.bindingSource === 'field') {
    for (const frame of series) {
      const field = frame.fields.find((candidate) => candidate.name === options.deviceField);
      if (field?.values.length) {
        return String(field.values[field.values.length - 1] ?? '').trim();
      }
    }
    return '';
  }
  const variable = getTemplateSrv()
    .getVariables()
    .find((candidate) => candidate.name === options.deviceVariable) as { current?: { value?: unknown } } | undefined;
  const raw = variable?.current?.value;
  return Array.isArray(raw) ? String(raw[0] ?? '').trim() : String(raw ?? '').trim();
}

function extractActionError(error: unknown): ActionResponse {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: Partial<ActionResponse> }).data;
    if (data?.message && data.status) {
      return {
        accepted: false,
        status: data.status,
        message: data.message,
        backendCode: data.backendCode,
        completedAt: data.completedAt ?? new Date().toISOString(),
        retryable: data.retryable,
      };
    }
  }
  return {
    accepted: false,
    status: 'failed',
    message: error instanceof Error ? error.message : 'The device action failed.',
    completedAt: new Date().toISOString(),
  };
}
