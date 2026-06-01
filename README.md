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

Open Grafana at `http://localhost:3000`, enable **Grafana Device Action Panel**, configure the REST connector, and add the nested **Device Action Panel** visualization to a dashboard.

## Configuration

The app configuration page stores `baseUrl`, `deviceIdPattern`, default timeout, and the action catalog in app JSON settings. The bearer token is stored in Grafana secure JSON data and is only decrypted for the Go backend.

Action paths must stay relative to the configured backend. Supported template placeholders are `{{deviceId}}`, `{{tenantId}}`, `{{siteId}}`, and `{{parameters.<name>}}`.

