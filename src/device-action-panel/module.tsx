import { PanelPlugin } from '@grafana/data';
import { DeviceActionPanel } from './DeviceActionPanel';
import { ConnectorSettingsEditor } from './ConnectorSettingsEditor';
import { ActionCatalogEditor } from './ActionCatalogEditor';
import { DEFAULT_ACTIONS } from '../defaults';
import { DEFAULT_PANEL_OPTIONS } from './defaults';
import type { PanelOptions } from './types';

export const plugin = new PanelPlugin<PanelOptions>(DeviceActionPanel).setPanelOptions((builder) =>
  builder
    .addCustomEditor<void, string>({
      id: 'connectorSettings',
      path: 'connectorSettings',
      name: 'REST connector',
      description: 'Server-side backend URL and encrypted bearer token.',
      category: ['Connector'],
      editor: ConnectorSettingsEditor,
    })
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
    .addCustomEditor<void, typeof DEFAULT_ACTIONS>({
      id: 'actions',
      path: 'actions',
      name: 'Buttons',
      description: 'Add and configure action buttons without editing JSON.',
      category: ['Actions'],
      editor: ActionCatalogEditor,
      defaultValue: DEFAULT_ACTIONS,
    })
    .addTextInput({ path: 'emptyMessage', name: 'No device message', defaultValue: DEFAULT_PANEL_OPTIONS.emptyMessage })
);
