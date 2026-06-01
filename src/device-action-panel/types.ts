export type BindingSource = 'variable' | 'field' | 'static';

export interface PanelOptions {
  title: string;
  bindingSource: BindingSource;
  deviceVariable: string;
  deviceField: string;
  staticDeviceId: string;
  tenantTemplate: string;
  siteTemplate: string;
  actionKeys: string;
  actionsJson: string;
  actions?: import('../types').ActionDefinition[];
  emptyMessage: string;
}
