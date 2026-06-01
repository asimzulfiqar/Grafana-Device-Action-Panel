# Device Action Mock API

This Flask service provides deterministic REST endpoints for local plugin testing:

- `POST /devices/<device_id>/alerts/cancel`
- `POST /devices/<device_id>/alarms/acknowledge`
- `POST /devices/<device_id>/reboot`
- `GET /health`

Start Grafana and the mock API:

```powershell
docker compose up --build
```

Configure the plugin backend URL as `http://mock-api:8080`. Leave the bearer token blank unless `MOCK_API_TOKEN` is set for the container.

## Quick checks

```powershell
curl.exe http://localhost:8080/health
curl.exe -X POST http://localhost:8080/devices/e726ff618db6bbdc/alerts/cancel
curl.exe -X POST http://localhost:8080/devices/e726ff618db6bbdc/alarms/acknowledge
curl.exe -X POST http://localhost:8080/devices/e726ff618db6bbdc/reboot
```

## Failure simulation

```powershell
curl.exe -X POST "http://localhost:8080/devices/e726ff618db6bbdc/reboot?simulate=denied"
curl.exe -X POST "http://localhost:8080/devices/e726ff618db6bbdc/reboot?simulate=failed"
curl.exe -X POST "http://localhost:8080/devices/e726ff618db6bbdc/reboot?simulate=timeout"
```

Device IDs beginning with `denied`, `fail`, or `slow` trigger the same behaviors without query parameters.

