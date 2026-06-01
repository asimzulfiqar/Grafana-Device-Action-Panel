import React from 'react';
import type { AppRootProps } from '@grafana/data';
import { Alert } from '@grafana/ui';

export function LandingPage(_props: AppRootProps) {
  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1>Grafana Device Action Panel</h1>
      <Alert title="Backend-mediated IoT actions" severity="info">
        Add the <strong>Device Action Panel</strong> visualization to a dashboard, bind it to a raw dashboard variable
        or query field, then configure the REST backend from the panel editor's Connector section.
      </Alert>
      <h3>Included MVP actions</h3>
      <p>Cancel alert, acknowledge alarm, and reboot device. Administrators can replace or extend the catalog as JSON.</p>
    </div>
  );
}
