# Troubleshooting

## Local URLs

Use `http://mock-api:8080` in the panel editor's **Connector** section. The Go backend runs inside the Grafana container, where `mock-api` is the Docker Compose service name.

Use `http://localhost:8080` only for requests made from your host machine:

```powershell
curl.exe http://localhost:8080/health
```

## Backend base URL errors

If the panel says the backend URL is missing or invalid:

1. Edit the panel.
2. Expand **Connector**.
3. Enter `http://mock-api:8080`.
4. Click **Save connector**.

Docker Compose provisions this value for fresh environments and stores later changes in the persistent `grafana-data` volume.

## Unsigned plugin warning

The local Docker Compose environment sets `GF_DEFAULT_APP_MODE=development` and allows the unsigned development plugins. Grafana logs an unsigned-plugin warning by design. Distribution builds must be signed.

## Backend startup failure

If Grafana logs that `gpx_device_action_linux_amd64` is missing, rebuild the backend:

```powershell
docker run --rm -v "${PWD}:/src" -w /src golang:1.25.5 go build -o dist/gpx_device_action_linux_amd64 ./pkg
docker compose restart grafana
```

The frontend Webpack configuration preserves compiled backend binaries during `npm run build`.

## Reset local state

To remove saved connector settings and recreate the provisioned environment:

```powershell
docker compose down -v
docker compose up -d --build
```

