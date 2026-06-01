import { DEFAULT_ACTIONS } from '../defaults';
import type { PanelOptions } from './types';

export const DEFAULT_PANEL_OPTIONS: PanelOptions = {
  title: 'Device actions',
  bindingSource: 'variable',
  deviceVariable: 'dev_eui',
  deviceField: '',
  staticDeviceId: '',
  tenantTemplate: '',
  siteTemplate: '',
  actionKeys: 'cancel_alert,acknowledge_alarm,reboot_device',
  actionsJson: JSON.stringify(DEFAULT_ACTIONS, null, 2),
  emptyMessage: 'Select a device to enable actions.',
};

