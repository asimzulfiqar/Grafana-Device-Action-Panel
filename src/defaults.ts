import type { ActionDefinition, AppSettings } from './types';

export const DEFAULT_ACTIONS: ActionDefinition[] = [
  {
    key: 'cancel_alert',
    label: 'Cancel Alert',
    description: 'Cancel the active alert for this device.',
    path: '/devices/{{deviceId}}/alerts/cancel',
    method: 'POST',
    confirmation: 'simple',
    confirmationText: 'Cancel the active alert for {{deviceId}}?',
    cooldownSeconds: 5,
  },
  {
    key: 'acknowledge_alarm',
    label: 'Acknowledge Alarm',
    description: 'Acknowledge the current alarm.',
    path: '/devices/{{deviceId}}/alarms/acknowledge',
    method: 'POST',
    confirmation: 'simple',
    cooldownSeconds: 5,
  },
  {
    key: 'reboot_device',
    label: 'Reboot Device',
    description: 'Restart the selected device.',
    style: 'destructive',
    path: '/devices/{{deviceId}}/reboot',
    method: 'POST',
    confirmation: 'typed',
    typedConfirmation: 'REBOOT',
    cooldownSeconds: 30,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  baseUrl: 'http://host.docker.internal:8080',
  deviceIdPattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$',
  defaultTimeoutSeconds: 10,
  actions: DEFAULT_ACTIONS,
};

