import { PanelPlugin } from '@grafana/data';
import { DeviceActionPanel } from './DeviceActionPanel';
import { DEFAULT_PANEL_OPTIONS } from './defaults';
import type { PanelOptions } from './types';

export const plugin = new PanelPlugin<PanelOptions>(DeviceActionPanel).setPanelOptions((builder) =>
  builder
    .addTextInput({ path: 'title', name: 'Panel heading', defaultValue: DEFAULT_PANEL_OPTIONS.title })
    .addRadio({
      path: 'bindingSource',
      name: 'Device ID source',
      defaultValue: DEFAULT_PANEL_OPTIONS.bindingSource,
      settings: {
        options: [
          { value: 'variable', label: 'Dashboard variable' },
          { value: 'field', label: 'Query field' },
          { value: 'static', label: 'Static value' },
        ],
      },
    })
    .addTextInput({
      path: 'deviceVariable',
      name: 'Device ID variable',
      description: 'Raw variable value is used, not its display label.',
      defaultValue: DEFAULT_PANEL_OPTIONS.deviceVariable,
      showIf: (options) => options.bindingSource === 'variable',
    })
    .addTextInput({
      path: 'deviceField',
      name: 'Device ID query field',
      defaultValue: '',
      showIf: (options) => options.bindingSource === 'field',
    })
    .addTextInput({
      path: 'staticDeviceId',
      name: 'Static device ID',
      defaultValue: '',
      showIf: (options) => options.bindingSource === 'static',
    })
    .addTextInput({ path: 'tenantTemplate', name: 'Tenant template', description: 'Optional Grafana variable template.' })
    .addTextInput({ path: 'siteTemplate', name: 'Site template', description: 'Optional Grafana variable template.' })
    .addTextInput({ path: 'actionKeys', name: 'Visible action keys', defaultValue: DEFAULT_PANEL_OPTIONS.actionKeys })
    .addTextInput({
      path: 'actionsJson',
      name: 'Action catalog JSON',
      description: 'Panel-visible labels and confirmation rules. Backend settings remain authoritative.',
      settings: { useTextarea: true, rows: 18 },
      defaultValue: DEFAULT_PANEL_OPTIONS.actionsJson,
    })
    .addTextInput({ path: 'emptyMessage', name: 'No device message', defaultValue: DEFAULT_PANEL_OPTIONS.emptyMessage })
);

