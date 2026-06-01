# Stage 2 Checklist and E2E Test Plan

## Milestone

Stage 2 is complete when a fresh checkout can build the plugin, run `docker compose up`, open a provisioned example dashboard, and run Playwright tests that cover the three device actions and their important failure states.

## Current baseline

The technical foundation is working:

- [x] App plugin and nested panel plugin scaffolded.
- [x] Go resource handler implemented.
- [x] Normalized action request and response contracts defined.
- [x] Server-side REST connector implemented.
- [x] Connector URL and encrypted token editable from the panel side menu.
- [x] Flask mock API added under `test/mock-api`.
- [x] Mock API supports success, denied, failed, and delayed responses.
- [x] Docker Compose starts Grafana and the mock API.
- [x] End-to-end `Cancel Alert` request verified through Grafana's plugin resource route.

## Stage 2 work

### 1. Provision the example environment

- [x] Add `provisioning/dashboards/dashboard.yaml`.
- [x] Add `provisioning/dashboards/device-actions.json`.
- [x] Mount the provisioning directory into the Grafana container.
- [x] Provision a dashboard variable whose display text differs from its raw device ID.
- [x] Add example panels for selected device, missing device, denied device, failed device, and slow device.
- [x] Confirm `docker compose up --build` produces a usable dashboard without manual imports.

### 2. Add Playwright and Grafana plugin-e2e

- [ ] Add `@grafana/plugin-e2e` and `@playwright/test` dev dependencies.
- [ ] Add `playwright.config.ts`.
- [ ] Add an `e2e` script that runs `playwright test`.
- [ ] Add `tests-e2e/` with panel and connector specs.
- [ ] Install Playwright Chromium in local development and CI.
- [ ] Add a CI workflow that runs supported Grafana versions from `src/plugin.json`.

### 3. Harden backend behavior

- [ ] Add tests for backend unavailable and timeout mapping.
- [ ] Add tests for missing and malformed device IDs.
- [ ] Add tests for cooldown rejection and expiry.
- [ ] Add tests for role allow and deny behavior.
- [ ] Confirm audit logs are emitted for success, rejection, denial, and timeout.
- [ ] Decide whether cooldown should start before dispatch or only after an accepted backend response.

### 4. Improve operator documentation

- [ ] Document the panel-side connector flow.
- [ ] Document why Docker Compose uses `http://mock-api:8080` while host curl checks use `http://localhost:8080`.
- [ ] Add screenshots for the panel, confirmation dialog, and connector side menu.
- [ ] Add troubleshooting steps for unsigned-plugin loading and backend startup.

### 5. Prepare release validation

- [ ] Add Grafana plugin validator instructions.
- [ ] Add packaging instructions.
- [ ] Add signing instructions for private or catalog distribution.
- [ ] Verify that frontend builds preserve the compiled backend binaries in `dist`.
- [ ] Test a fresh clone with no existing Grafana database.

## E2E scenarios

| Scenario | Setup | Expected result |
|---|---|---|
| Plugin registration | Start Docker Compose | App and nested panel plugin load without backend startup errors. |
| Panel rendering | Open provisioned dashboard | Panel shows the selected raw device ID and three action buttons. |
| Raw variable binding | Select a variable option with a friendly label | Panel displays and sends the raw device ID, not the label. |
| Connector save | Open panel editor, expand Connector, save URL | URL persists in app settings without dashboard JSON token leakage. |
| Cancel alert | Click `Cancel Alert`, confirm | Inline result shows `succeeded`. |
| Acknowledge alarm | Click `Acknowledge Alarm`, confirm | Inline result shows `succeeded`. |
| Reboot confirmation | Click `Reboot Device` | Submit remains disabled until `REBOOT` is typed. |
| Reboot queued | Type `REBOOT`, submit | Inline result shows success and a command ID. |
| Cooldown | Submit the same action twice rapidly | Second attempt is blocked until cooldown expires. |
| Missing ID | Open the missing-device example panel | Empty-state message appears and actions are unavailable. |
| Invalid ID | Use a malformed device ID | Inline result explains that the device ID is invalid. |
| Denied action | Use a `denied...` mock device ID | Inline result shows a denied or rejected state clearly. |
| Backend failure | Use a `fail...` mock device ID | Inline result shows an actionable failure message. |
| Backend timeout | Use a `slow...` mock device ID | Inline result shows `timed_out`. |

## Suggested test files

```text
provisioning/
  dashboards/
    dashboard.yaml
    device-actions.json
tests-e2e/
  plugin-registration.spec.ts
  connector-settings.spec.ts
  device-actions.spec.ts
  failure-states.spec.ts
playwright.config.ts
```

## Completion gate

Before declaring Stage 2 complete:

1. Remove local Grafana containers and volumes.
2. Run `npm install`, build the frontend and Go backend, then run `docker compose up --build`.
3. Verify the provisioned dashboard appears automatically.
4. Run `npm run e2e`.
5. Run TypeScript checks and Go tests.
6. Record any intentionally deferred release-readiness items.

## References

- [Grafana plugin e2e overview](https://grafana.com/developers/plugin-tools/e2e-test-a-plugin/)
- [Get started with plugin e2e](https://grafana.com/developers/plugin-tools/e2e-test-a-plugin/get-started)
- [Test a panel plugin](https://grafana.com/developers/plugin-tools/e2e-test-a-plugin/test-a-panel-plugin)
- [Configure necessary resources](https://grafana.com/developers/plugin-tools/e2e-test-a-plugin/setup-resources)
- [Provide a plugin test environment](https://grafana.com/developers/plugin-tools/publish-a-plugin/provide-test-environment)
- [Sign a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)
