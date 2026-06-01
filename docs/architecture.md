# Architecture

The app plugin owns administrator settings and the Go backend. The nested panel plugin is bundled below `src/device-action-panel` and is selectable as a dashboard visualization.

1. The panel resolves the selected raw dashboard-variable value or the latest configured query field value.
2. The operator confirms the action in the panel.
3. The panel posts a structured request to `/api/plugins/asim-device-action-app/resources/actions/execute`.
4. The Go backend loads its administrator-controlled action definition, validates the identifier and policy, renders a restricted relative URL template, applies the cooldown, and invokes the REST backend.
5. The backend logs an audit event and returns a normalized result for inline display.

The browser never receives the REST connector token and never calls the IoT service directly.

