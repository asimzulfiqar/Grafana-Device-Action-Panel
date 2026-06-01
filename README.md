# Grafana Device Action Panel

An app plugin with a nested dashboard panel for safe, backend-mediated IoT device actions.

## MVP capabilities

- Bind a device ID from the raw value of a dashboard variable, the latest query field value, or a static value.
- Trigger cancel-alert, acknowledge-alarm, and reboot actions without browser-to-IoT-backend requests.
- Validate identifiers, restrict endpoint templates, enforce optional role policies, apply cooldowns, and emit audit logs.
- Configure a generic REST connector and encrypted bearer token from the app configuration page.
- Show confirmation, typed confirmation, progress, success, denied, timeout, and failure states inline.

## Development

```powershell
npm install
npm run build
```

The Go backend requires Go 1.25.5 and Mage:

```powershell
go mod tidy
mage -v build:linux
docker compose up
```

Open Grafana at `http://localhost:3000`, enable **Grafana Device Action Panel**, and add the nested **Device Action Panel** visualization to a dashboard. Configure the REST connector from the panel editor's **Connector** section. For local testing, set the plugin backend URL to `http://mock-api:8080`; `http://localhost:8080` is only for curl commands run from your host machine. See `test/mock-api/README.md`.

## Configuration

The panel editor's **Connector** section stores `baseUrl` in app JSON settings and the bearer token in Grafana secure JSON data. The token is only decrypted for the Go backend and is never written to dashboard JSON. The app configuration page retains advanced validation, timeout, and action-catalog settings.

Action paths must stay relative to the configured backend. Supported template placeholders are `{{deviceId}}`, `{{tenantId}}`, `{{siteId}}`, and `{{parameters.<name>}}`.
