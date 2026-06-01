# API Contract

## Execute action

`POST /api/plugins/asim-device-action-app/resources/actions/execute`

```json
{
  "actionKey": "cancel_alert",
  "deviceId": "e726ff618db6bbdc",
  "tenantId": "customer-1",
  "siteId": "site-2",
  "panelId": 7,
  "requestedAt": "2026-06-01T12:00:00Z"
}
```

```json
{
  "accepted": true,
  "status": "succeeded",
  "message": "Cancel Alert accepted for device e726ff618db6bbdc",
  "backendCode": 202,
  "commandId": "cmd-123",
  "completedAt": "2026-06-01T12:00:01Z"
}
```

