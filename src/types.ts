export type ActionStyle = 'primary' | 'secondary' | 'destructive';
export type ConfirmationMode = 'none' | 'simple' | 'typed';

export interface ActionDefinition {
  key: string;
  label: string;
  description?: string;
  style?: ActionStyle;
  color?: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  bodyTemplate?: string;
  confirmation?: ConfirmationMode;
  confirmationText?: string;
  typedConfirmation?: string;
  cooldownSeconds?: number;
  timeoutSeconds?: number;
  allowedRoles?: string[];
}

export interface AppSettings {
  baseUrl: string;
  deviceIdPattern: string;
  defaultTimeoutSeconds: number;
  actions: ActionDefinition[];
}

export interface ActionRequest {
  actionKey: string;
  deviceId: string;
  tenantId?: string;
  siteId?: string;
  dashboardUid?: string;
  panelId?: number;
  parameters?: Record<string, string>;
  requestedAt: string;
}

export interface ActionResponse {
  accepted: boolean;
  status: 'queued' | 'sent' | 'succeeded' | 'failed' | 'denied' | 'timed_out';
  message: string;
  backendCode?: number;
  commandId?: string;
  completedAt: string;
  retryable?: boolean;
}
