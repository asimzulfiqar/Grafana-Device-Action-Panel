# Grafana Device Action Panel

An app plugin with a nested dashboard panel for safe, backend-mediated IoT device actions.

## MVP capabilities

- Bind a device ID from the raw value of a dashboard variable, the latest query field value, or a static value.
- Trigger cancel-alert, acknowledge-alarm, and reboot actions without browser-to-IoT-backend requests.
- Validate identifiers, restrict endpoint templates, enforce optional role policies, apply cooldowns, and emit audit logs.
- Configure a generic REST connector and encrypted bearer token from the panel side menu.
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

Docker Compose provisions a ready-to-use demo dashboard automatically:

```text
http://localhost:3000/d/device-action-panel-demo/device-action-panel-demo
```

The dashboard includes a friendly-label/raw-ID variable example and fixtures for missing IDs, denied actions, backend failures, and timeouts.

Docker Compose also provisions the local connector URL as `http://mock-api:8080` and persists Grafana data in a named volume. Connector changes saved from the panel editor survive container recreation.

## Configuration

The panel editor's **Connector** section stores `baseUrl` in app JSON settings and the bearer token in Grafana secure JSON data. The token is only decrypted for the Go backend and is never written to dashboard JSON. The app configuration page retains advanced validation and default-timeout settings.

Use the panel editor's **Actions** section to add buttons visually. Each button supports a label, stable action key, description, style, custom color, HTTP method, relative path, optional JSON body, confirmation mode, cooldown, timeout, and allowed roles. Click **Save action catalog** after editing so the server-side connector authorizes the updated buttons, then save the dashboard.

Action paths must stay relative to the configured backend. Supported template placeholders are `{{deviceId}}`, `{{tenantId}}`, `{{siteId}}`, and `{{parameters.<name>}}`.

## Verification

```powershell
npm run typecheck
npm run build
npm run e2e:install
npm run e2e
```

Run the Go tests with a local Go 1.25.5 installation or Docker:

```powershell
docker run --rm -v "${PWD}:/src" -w /src golang:1.25.5 go test ./pkg/...
```

See `docs/troubleshooting.md` for local setup issues and `docs/release.md` for packaging and signing guidance.

## Project status

Last reconciled against `requirements.md`: 2026-06-01.

The core MVP works locally. The plugin can render visually configured buttons, resolve raw dashboard-variable values or query fields, validate IDs, confirm actions, call a REST backend through the Go plugin, enforce cooldowns, show normalized results, and emit audit log entries. The provisioned dashboard and Flask mock API exercise success, denial, rejection, timeout, missing-ID, and malformed-ID cases.

There are two stage lists in the repository. Use this table for the delivery stages under **Suggested development stages** in `requirements.md`:

| Delivery stage | Status | Notes |
|---|---|---|
| Stage 0: Discovery | Partial | Generic REST and the first three actions are chosen. A real customer backend, production identity mapping, and audit retention requirements still need decisions. |
| Stage 1: Technical foundation | Done | App plugin, nested panel, Go resource handler, normalized contract, and REST connector are implemented. |
| Stage 2: MVP action flow | Done | Variable binding, validation, confirmation, result states, cooldowns, and audit log emission are implemented. |
| Stage 3: Hardening | Partial | Error handling, configuration UI, policy configuration, Go tests, Playwright tests, CI, and a realistic provisioned dashboard exist. Production role integration and theme/responsive verification remain. |
| Stage 4: Release readiness | Partial | Documentation, screenshots, mock integration, example dashboard, and release instructions exist. A release archive has not been built, validated, signed, or submitted. |

`docs/next-steps.md` describes the completed local MVP verification milestone. It is not the post-MVP product roadmap.

The separate **Post-MVP stages** in `requirements.md` are future product expansion and are not complete:

| Post-MVP stage | Status | Main remaining scope |
|---|---|---|
| Stage 2 | Mostly not started | Parameter input forms, capability checks, multi-step confirmations, richer audit views, webhook signatures, and adapter abstraction. JSON body templates provide only a foundation. |
| Stage 3 | Not started | Batch actions, history panel, approvals, scheduling, MQTT adapters, and fleet policy packs. |
| Stage 4 | Not started | Marketplace UX polish, integration library, enterprise RBAC patterns, and result streaming or refresh. |

## Remaining before release

Resolve these before calling the plugin product-ready:

1. Integrate production identity and authorization. Live Docker audit logs currently show empty `user` and `role` values. Verify the Grafana identity source, enforce the intended role mapping end to end, and hide or disable unavailable actions in the panel.
2. Complete the audit contract. Include Grafana organization context, send `dashboardUid` from the panel, add a safe parameter summary, and decide whether logs alone satisfy retention and tamper-evidence requirements or whether an audit sink is required.
3. Decide the first-release feature boundary. The requirements still describe optional icons, enabled states, custom success/failure templates, user-entered parameters, configurable headers, retry policy, and richer identifier presets. Either implement them or explicitly defer them from version `0.1.0`.
4. Broaden release verification. Add frontend unit tests, role-aware browser tests through Grafana, and explicit light-theme, dark-theme, and smaller-layout checks. Run the CI matrix successfully on Grafana `12.3.0` and `12.4.2`.
5. Choose private distribution or public catalog publication. Confirm ownership of the final plugin ID and add product metadata such as a license and changelog as needed.
6. Build distribution binaries for the supported operating systems and architectures, ensure Unix binaries have mode `0755`, create the ZIP archive, run Grafana's plugin validator, and resolve its findings.
7. Sign the final archive. Private plugins require matching `--rootUrls`; public catalog plugins must be submitted for Grafana review before public signing.
8. For public catalog publication, host the ZIP and source repository, calculate the SHA1, and submit the plugin with testing guidance and the included provisioned environment.

## Resume guide

For the next development session:

```powershell
npm ci
npm run e2e:install
npm run typecheck
npm run build
docker run --rm -v "${PWD}:/src" -w /src golang:1.25.5 go test ./pkg/...
docker run --rm -v "${PWD}:/src" -w /src golang:1.25.5 go build -o dist/gpx_device_action_linux_amd64 ./pkg
docker compose up -d --build
npm run e2e
```

Then open:

```text
Grafana:        http://localhost:3000
Demo dashboard: http://localhost:3000/d/device-action-panel-demo/device-action-panel-demo
Host mock API:  http://localhost:8080
Docker URL:     http://mock-api:8080
```

The highest-priority next engineering task is production Grafana identity and role integration, followed by audit completeness.

## Screenshots

![Provisioned demo dashboard](docs/images/demo-dashboard.png)

![Typed reboot confirmation](docs/images/reboot-confirmation.png)

![Panel connector side menu](docs/images/connector-side-menu.png)
