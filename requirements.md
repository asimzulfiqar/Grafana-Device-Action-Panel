# Grafana IoT Device Action Panel Requirements

## Document purpose

This document defines the product requirements for a Grafana plugin that allows operators to trigger IoT device actions safely from dashboards without relying on fragile Canvas buttons, Business Text HTML, raw links, or browser-side JavaScript workarounds.[cite:44][cite:46]

The intended audience is developers, product owners, and technical stakeholders who need a complete and practical specification for planning, building, and shipping the plugin.[cite:61]

## Product summary

### Working plugin name

**Grafana Device Action Panel**

Alternative names:
- Fleet Action Panel
- IoT Command Panel
- Safe Device Actions for Grafana
- Grafana Device Control Panel

Recommended public name: **Grafana Device Action Panel**. The name is clear, searchable, and broad enough to support multiple IoT backends such as ChirpStack, MQTT bridges, custom REST APIs, and fleet management services.[cite:44][cite:48]

### Product vision

Turn Grafana from a monitoring-only dashboard into a safe operational console for IoT devices by enabling trusted, validated, and auditable device actions directly from panels.[cite:46][cite:67]

### One-line value proposition

A Grafana plugin that lets users trigger device commands safely, correctly, and with feedback, without relying on Canvas or Text panel hacks.[cite:43][cite:46]

## Problem statement

Grafana is widely used for observing IoT telemetry, fleet status, alerts, and maps, but operational actions inside dashboards remain awkward and error-prone.[cite:45][cite:47]

Developers often try to implement buttons for actions such as cancel alert, reboot device, acknowledge alarm, send downlink, or toggle an actuator using Canvas panels, Business Text panels, or custom HTML/JavaScript snippets.[cite:43][cite:56]

These approaches create several recurring problems:

- Dashboard variables may send display text instead of the true device identifier, causing the wrong target to be used for an action.[cite:58]
- Browser-originated API calls often fail because of CORS when Grafana and the IoT backend are on different origins or ports.[cite:8][cite:57]
- HTML and JavaScript embedded in text-oriented panels can break because of sanitization, rendering timing, or missing DOM elements.[cite:7][cite:60]
- Current workflows often open a new page, create poor confirmations, or give weak success and failure feedback to the operator.[cite:59]
- Sensitive actions have no consistent policy layer for permission checks, cooldowns, confirmations, or audit logging.[cite:46][cite:70]

The result is that many teams can visualize their devices in Grafana, but cannot safely operate them from Grafana in a production-grade way.[cite:46][cite:67]

## Goals

### Primary goals

- Provide a native Grafana UI for triggering IoT device actions from a panel.[cite:46]
- Eliminate dependence on Text, Business Text, and Canvas workarounds for critical actions.[cite:43][cite:56]
- Ensure the correct device identifier is used for every action.[cite:58]
- Support safe execution with validation, confirmation, and structured feedback.[cite:46]
- Support backend-mediated execution to avoid fragile browser-only request paths and reduce CORS issues.[cite:8][cite:57]
- Make the plugin usable across common IoT architectures including REST APIs, MQTT-backed services, and LoRaWAN/fleet platforms.[cite:48][cite:51]
- Create a foundation for auditability, permissions, and enterprise-safe operations.[cite:70]

### Non-goals

- Replace Grafana alerting.
- Replace full device management platforms.
- Replace provisioning and fleet inventory systems.
- Act as a firmware deployment system in the MVP.
- Build a generic low-code workflow engine in the MVP.

## Target users

- IoT solution developers building dashboards for customers.[cite:45]
- Fleet operators monitoring many deployed devices.[cite:47]
- Industrial, utility, smart-building, or field-service teams that need light control actions from an observability screen.[cite:70]
- Integrators using ChirpStack, MQTT, REST backends, or custom device services.[cite:48][cite:51]
- Grafana administrators who want a safer alternative to custom dashboard buttons.[cite:43][cite:46]

## Key use cases

### Core use cases

- Cancel an active alert for the selected device.
- Acknowledge an alarm or event.
- Reboot a device.
- Send a downlink or command payload.
- Toggle a relay, valve, or actuator.
- Switch an operating mode such as normal, maintenance, or sleep.
- Trigger a remote diagnostic command.

### Example workflow

An operator selects a device from a Grafana variable such as `dev_eui`, sees current health and status in the dashboard, clicks **Cancel Alert**, reviews the confirmation text, submits the action, and receives an inline status such as queued, sent, accepted, failed, or denied without leaving the dashboard.[cite:57][cite:60]

## Product scope

### In scope

- A Grafana plugin with a panel UI for device actions.[cite:46]
- Backend-mediated command execution.
- Variable binding to current dashboard context.
- Inline confirmation and result feedback.
- Configurable action definitions.
- Device identifier validation.
- Permission-aware behavior at the plugin level.
- Audit event generation.
- Support for one or more generic HTTP/REST command backends in MVP.

### Out of scope for MVP

- Full visual workflow builders.
- Batch actions across thousands of devices.
- Complex scheduling and deferred execution.
- Offline command queue orchestration beyond simple backend handoff.
- Native support for every IoT platform on day one.

## Main product problems and required solutions

| Problem | Why it hurts | Required solution |
|---|---|---|
| Wrong variable value is used | Friendly name may be sent instead of real device ID.[cite:58] | Explicit binding to value fields; validation before dispatch. |
| Browser-side fetch fails | Cross-origin calls break due to CORS.[cite:8][cite:57] | Route commands through plugin backend or same-origin proxy. |
| Canvas/Text solutions are fragile | Rendering or sanitization can break buttons.[cite:7][cite:60] | Provide a native action UI as a real plugin panel. |
| Poor operator feedback | Users do not know if the command worked.[cite:59] | Provide pending, success, failure, denied, and timeout states. |
| Unsafe actions | No consistent role checks, cooldowns, or audit trail.[cite:46][cite:70] | Add policy checks, confirmation rules, cooldowns, and logging. |
| Repeated ad hoc development | Every team rebuilds the same button logic differently.[cite:43][cite:67] | Offer a reusable plugin with standard configuration patterns. |

## Recommended plugin type and architecture

### Recommended plugin type

The recommended implementation is an **app plugin with a panel component**, not a frontend-only panel plugin. Grafana supports plugin types that include panels and broader app functionality, and this product needs more than presentation because secure command execution, policy enforcement, and backend integrations are part of the core value.[cite:46][cite:61]

### Architecture overview

The plugin should contain the following logical parts:

1. **Panel frontend**: renders actions, states, confirmations, and feedback inside Grafana.
2. **Backend component**: receives action requests from the panel, validates them, applies policy, and forwards them to the actual IoT backend.
3. **Integration layer**: supports configurable command targets such as REST endpoints, webhooks, internal service endpoints, or adapters for systems like ChirpStack and MQTT bridges.[cite:48][cite:51]
4. **Audit/event layer**: records who triggered what, when, for which device, and with what outcome.
5. **Configuration layer**: lets administrators define actions, mappings, templates, permissions, and safety rules.

### High-level request flow

1. Panel reads dashboard variables and/or query fields.
2. User clicks an action.
3. Frontend sends a structured action request to the plugin backend.
4. Backend validates identity, parameters, permissions, and policy.
5. Backend calls the configured target system.
6. Backend returns a normalized result.
7. Panel shows the result and optionally emits an audit event.

## Functional requirements

### FR1. Action rendering

The panel must render one or more configurable actions as buttons, menu items, or compact cards.

Each action must support:
- Label
- Description or help text
- Visual severity or style, for example primary, warning, danger
- Enabled or disabled state
- Optional icon
- Confirmation requirement
- Success and failure message templates

### FR2. Variable and field binding

The plugin must support binding action inputs from:
- Grafana dashboard variables
- Query result fields in the panel data frame
- Static configuration values

The plugin must support explicit mapping for:
- Device ID, such as `dev_eui`, UUID, serial number, or asset ID
- Tenant or customer ID
- Site or fleet ID
- Optional user-entered parameters
- Optional action payload values

The plugin must allow administrators to choose whether display text or raw value is used, with raw value as the default for identifiers because variable text/value mismatches are a known source of action errors.[cite:58]

### FR3. Action definitions

The plugin must let administrators define actions through configuration.

Each action definition should support:
- Action key, for example `cancel_alert`
- User-visible name
- Action type, for example REST POST, REST GET, webhook, adapter call
- Target endpoint or adapter mapping
- HTTP method where relevant
- Header configuration
- Request body template
- Variable interpolation rules
- Timeout
- Retry policy, if enabled
- Confirmation text
- Cooldown duration
- Allowed roles or policy tags

### FR4. Safe execution

The plugin must validate all action requests before execution.

Validation requirements:
- Device identifier exists and matches expected format.
- Required parameters are present.
- Action is allowed for the current user context.
- Cooldown window is respected.
- Dangerous actions require confirmation.
- Request templates cannot inject unsupported or unsafe data.

### FR5. Confirmation patterns

The plugin must support multiple confirmation modes:
- None
- Simple confirm dialog
- Strong confirmation with custom text
- Typed confirmation for destructive actions

Examples:
- “Cancel alert for device e726ff618db6bbdc?”
- “Type REBOOT to confirm device reboot.”

### FR6. Result feedback

The panel must display structured result states:
- Idle
- In progress
- Queued
- Sent
- Succeeded
- Failed
- Denied
- Timed out

Each result must support a visible message and timestamp. If the backend returns a command identifier, it should be displayed and stored in the panel state where possible.

### FR7. Auditability

The plugin must emit an audit event for each attempted action, including failed and denied requests.

Minimum audit fields:
- Timestamp
- User identifier
- Grafana organization or tenant context if available
- Dashboard identifier
- Panel identifier
- Device identifier
- Action key
- Input parameters or safe summary
- Outcome
- Backend response code or normalized status

### FR8. Access control integration

The plugin must support role-aware behavior. At minimum, it must allow actions to be hidden or disabled based on configured policy. Grafana permissions and deployment context may vary, so the plugin should support a plugin-level mapping approach rather than assuming a single auth model.[cite:46]

### FR9. Generic backend connector

The MVP must support at least one generic connector based on HTTP/REST, because that covers a large number of IoT control APIs and minimizes initial integration cost.

The connector should support:
- Base URL
- Per-action path templates
- Auth headers or token injection
- JSON body templates
- Query parameters
- Timeout and error mapping

### FR10. Observability of the plugin itself

The plugin should expose logs and normalized status codes so administrators can troubleshoot failures such as backend unreachable, timeout, invalid device ID, policy denied, or malformed payload.

## Non-functional requirements

### Security

- No direct browser-only execution path should be required for production use when backend mediation is available.
- Secrets must not be exposed in the panel configuration visible to normal viewers.
- Device identifiers and payloads must be validated before sending.
- Dangerous actions must support strong confirmation.
- Audit logs must be tamper-evident as far as practical within deployment constraints.

### Reliability

- Action requests must return consistent normalized states even when target backends vary.
- The panel must handle temporary backend failures gracefully.
- The UI must not allow accidental duplicate submissions during an in-flight request unless explicitly configured.

### Performance

- Button rendering should be immediate in normal dashboards.
- Common actions should complete or fail fast with visible status.
- The plugin should not noticeably degrade dashboard render time.

### Usability

- A user should understand within seconds which actions are available and whether they are safe to click.
- Confirmation text must be clear and device-specific.
- Error messages must be actionable, not generic.

### Compatibility

- The plugin should support recent Grafana versions compatible with current plugin development guidance.[cite:61]
- The UI should work in light and dark themes.
- The plugin should support common desktop dashboard usage first; responsive behavior for smaller layouts should still be usable.

## MVP definition

### MVP objective

Ship a production-usable first version that solves the most common single-device action workflow safely.

### MVP statement

A Grafana panel that can trigger a validated action such as **Cancel Alert** or **Reboot Device** for the currently selected device, through a plugin backend, with confirmation, result feedback, and audit logging.[cite:57][cite:60]

### MVP features

- One panel type with configurable actions.
- One generic backend connector using HTTP/REST.
- Variable binding for device ID and tenant/site context.
- Safe use of raw variable values for identifiers.[cite:58]
- Simple and strong confirmation options.
- Inline success and error feedback.
- Cooldown to prevent double-click repeat.
- Audit event emission.
- Basic role-based hide/disable rules.
- Per-action timeout and friendly error messages.

### MVP actions to support first

1. Cancel alert
2. Acknowledge alarm
3. Reboot device

These three are broad enough to validate the model across water monitoring, utility fleets, industrial sensors, and LoRaWAN-style device operations.[cite:45][cite:70]

## Post-MVP stages

### Stage 2

- Support custom action payload forms.
- Support query-derived device capability checks.
- Add multi-step confirmations.
- Add richer audit views.
- Add webhook signature support.
- Add adapter abstraction for ChirpStack-style command services.

### Stage 3

- Add batch actions for selected device sets.
- Add action history panel.
- Add approval workflows for sensitive commands.
- Add scheduling and delayed execution.
- Add MQTT-specific adapters and command templates.[cite:48][cite:51]
- Add fleet-wide policy packs.

### Stage 4

- Marketplace-ready polished UX.
- Multi-backend integration library.
- Enterprise-grade RBAC integration patterns.
- Optional command result streaming and status refresh.

## Detailed user stories

### Operator stories

- As an operator, I want to trigger **Cancel Alert** for the selected device without opening a new page so that I can stay focused on the dashboard.[cite:57]
- As an operator, I want the panel to use the real device ID and not the display name so that the action targets the correct device.[cite:58]
- As an operator, I want clear success or failure feedback so that I know whether the command was accepted.[cite:59]
- As an operator, I want destructive actions to ask for confirmation so that accidental clicks are reduced.

### Administrator stories

- As an administrator, I want to define actions centrally so that teams stop embedding custom HTML and JavaScript into dashboards.[cite:43][cite:60]
- As an administrator, I want to route actions through a backend so that cross-origin issues do not break operations.[cite:8][cite:57]
- As an administrator, I want audit logs for every command so that actions are traceable.
- As an administrator, I want to disable actions for viewers and allow them only for trusted roles.

### Developer stories

- As a developer, I want a generic action model so that one plugin can support multiple IoT backends.
- As a developer, I want normalized request and response objects so that UI logic stays simple across integrations.
- As a developer, I want staged scope so that MVP ships quickly and extensions can be added cleanly.

## UX requirements

### Panel states

The panel must handle and display:
- No device selected
- Device selected and action available
- Device selected but action unavailable
- Action in progress
- Action succeeded
- Action failed
- Action denied
- Configuration error
- Backend unavailable

### UX principles

- Actions must be obvious but not reckless.
- Dangerous actions should look visually distinct.
- The panel should always show which device the action applies to.
- The panel should never silently fail.
- The panel should avoid surprising navigation behavior.

### Suggested layout

A minimum useful layout for MVP:
- Header with current target device name and raw ID
- Current connectivity or status summary if query data is present
- One to three action buttons
- Result area with timestamp and latest message
- Optional “last action by / at” block

## API and backend expectations

### Normalized request object

Example fields:
- actionKey
- deviceId
- tenantId
- siteId
- initiatedBy
- dashboardUid
- panelId
- parameters
- requestedAt

### Normalized response object

Example fields:
- accepted
- status
- message
- backendCode
- commandId
- completedAt
- retryable

### Backend behaviors

The backend should:
- Validate identifiers.
- Sanitize templates and payloads.
- Apply policy checks.
- Enforce timeouts.
- Return normalized results.
- Emit logs and audit events.

## Configuration requirements

### Administrator configuration

The plugin should provide settings for:
- Backend base URL
- Authentication method
- Action catalog
- Variable mappings
- Identifier format rules
- Default timeout
- Cooldown settings
- Confirmation defaults
- Role/policy mapping
- Audit sink settings

### Per-panel configuration

The panel should provide settings for:
- Visible actions
- Button order
- Labels and styles
- Which query fields to display
- Whether to show latest result history
- Empty-state message
- No-device-selected behavior

## Data validation requirements

The plugin must support validating at least:
- Hexadecimal device IDs such as LoRaWAN DevEUI-like identifiers
- UUIDs
- Numeric IDs
- Alphanumeric serial numbers

Validation rules should be configurable, because different fleets use different identifier formats.

## Error handling requirements

The plugin must distinguish between:
- Invalid configuration
- Missing device ID
- Invalid device ID
- User not authorized
- Action disabled by policy
- Backend unavailable
- Timeout
- Backend rejected command
- Unknown internal error

Each error type must map to a user-facing message and a developer-facing log entry.

## Acceptance criteria for MVP

The MVP is complete when all of the following are true:

- A configured panel can trigger **Cancel Alert** for a selected device through the plugin backend.
- The panel uses the raw bound device value, not the display label, for identifiers.[cite:58]
- The action executes without opening a new page or relying on browser-side direct calls to the target API.[cite:57]
- A CORS issue in the target backend does not break the panel when routed through the plugin backend as designed.[cite:8]
- The operator sees a confirmation dialog before destructive actions.
- The operator receives inline success or failure feedback.
- Duplicate rapid clicks are prevented for the configured cooldown period.
- An audit event is recorded for each action attempt.
- An administrator can configure at least three actions without editing source code.

## Risks and implementation notes

### Main risks

- Grafana deployment environments may vary in auth and proxy behavior.[cite:46]
- Different IoT backends return inconsistent statuses and payload shapes.[cite:48][cite:51]
- Teams may ask for too many backend-specific adapters too early.
- Scope can expand quickly from “button panel” to “device management platform.”

### Mitigations

- Keep MVP generic and HTTP-first.
- Normalize backend responses behind a consistent contract.
- Build adapters only after MVP validation.
- Keep the UI focused on action execution, not full fleet administration.

## Suggested repository structure

```text
plugin-root/
  src/
    frontend/
      panel/
      components/
      hooks/
      types/
    backend/
      actions/
      connectors/
      policy/
      audit/
      validation/
  docs/
    requirements.md
    architecture.md
    api-contract.md
  tests/
    frontend/
    backend/
    integration/
```

## Suggested development stages

### Stage 0: Discovery

- Confirm first backend target, for example generic REST plus one real customer use case.
- Confirm the first three supported actions.
- Confirm identity mapping rules for target devices.
- Confirm expected audit requirements.

### Stage 1: Technical foundation

- Create plugin skeleton.
- Implement frontend panel scaffold.
- Implement backend request handler.
- Define normalized request and response schemas.
- Implement REST connector.

### Stage 2: MVP action flow

- Add variable binding.
- Add identifier validation.
- Add confirmation flow.
- Add result state handling.
- Add cooldown logic.
- Add audit events.

### Stage 3: Hardening

- Improve error handling.
- Add configuration UI.
- Add policy mapping.
- Add automated tests.
- Test on realistic Grafana dashboards and themes.

### Stage 4: Release readiness

- Write user documentation.
- Produce example integrations.
- Add screenshots and example dashboards.
- Package and sign the plugin if targeting public distribution.

## Testing requirements

### Frontend tests

- Correct button states for each action state.
- Confirmation flow behavior.
- Variable binding behavior.
- Disabled state and cooldown behavior.
- Result message rendering.

### Backend tests

- Request validation.
- Policy enforcement.
- REST connector success/failure mapping.
- Timeout handling.
- Audit event generation.

### Integration tests

- Selected device action through dashboard variable.
- Wrong variable text/value mismatch handling.[cite:58]
- No-device-selected behavior.
- Backend unavailable behavior.
- End-to-end cancel alert example.

## Example first release positioning

### Problem statement for marketing

Grafana users can already monitor devices well, but device control inside dashboards still depends on hacks like Canvas actions, HTML snippets, popups, and raw API calls that are fragile in production.[cite:43][cite:56]

### Product statement for marketing

Grafana Device Action Panel provides a native, safe, and auditable way to trigger IoT commands from dashboards through a controlled backend path, with proper validation, confirmations, and operator feedback.[cite:46]

## Open questions

- Will the first real backend be generic REST only, or should ChirpStack-style command endpoints be supported from day one?
- How much of role enforcement should live inside the plugin versus the surrounding Grafana deployment?
- Should action results be persisted only in an audit sink, or also shown as historical UI within the panel?
- Will MVP support only single-device actions, or a tightly limited multi-device mode for small fleets?
- Which Grafana versions are mandatory for the first release?

## Final recommendation

Build the first version around a single strong workflow: selected device in Grafana, operator clicks **Cancel Alert**, the plugin backend validates the request, forwards it safely, and the panel shows an inline result without any popup, cross-origin hack, or custom HTML workaround.[cite:57][cite:60][cite:8]

That workflow is narrow enough for a clean MVP and broad enough to prove the core value of the product for IoT fleets.[cite:47][cite:70]
