# Release Readiness

## Validate locally

Run the full Stage 2 gate:

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

## Cooldown policy

The backend reserves cooldown immediately before dispatching a valid outbound request. This blocks duplicate in-flight submissions and also limits rapid retries after an upstream rejection or outage. Missing IDs, malformed IDs, invalid templates, and denied roles do not consume cooldown.

## Package

For distribution, build all required backend architectures with Mage or the Grafana SDK build tooling, sign the plugin, rename `dist` to `asim-device-action-app`, and create a ZIP archive containing that directory.

Backend binaries must be executable with mode `0755` on Unix platforms.

## Sign

Development builds can remain unsigned. Before private distribution or catalog publishing:

```powershell
$env:GRAFANA_ACCESS_POLICY_TOKEN = "<token>"
npx @grafana/sign-plugin@latest --rootUrls http://localhost:3000
```

For a public catalog plugin, submit it for review before signing and omit `--rootUrls` after Grafana grants the signature level.

## Plugin validator

Run Grafana's plugin validator against the packaged ZIP before publishing. Treat validator findings as release blockers unless they are documented and accepted intentionally.

## References

- [Package a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/package-a-plugin)
- [Sign a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)
- [Publishing best practices](https://grafana.com/developers/plugin-tools/publish-a-plugin/publishing-best-practices)

