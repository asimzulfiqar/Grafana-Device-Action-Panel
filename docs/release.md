# Release Readiness

## Validate locally

Run the full local validation gate:

```powershell
npm ci
npm run e2e:install
npm run typecheck
npm run build
docker run --rm -v "${PWD}:/src" -w /src golang:1.25.5 go test ./pkg/...
docker run --rm -v "${PWD}:/src" -w /src golang:1.25.5 go build -o dist/gpx_device_action_linux_amd64 ./pkg
docker compose up -d --build
npm run e2e
npm run release:package
```

## Cooldown policy

The backend reserves cooldown immediately before dispatching a valid outbound request. This blocks duplicate in-flight submissions and also limits rapid retries after an upstream rejection or outage. Missing IDs, malformed IDs, invalid templates, and denied roles do not consume cooldown.

## Package

Create an unsigned release candidate:

```powershell
npm run release:package
```

This creates `release/asim-deviceaction-app-0.1.0.zip` with Linux, macOS, and Windows backend binaries. The packaging script assigns mode `0755` to packaged backend binaries.

Add a `LICENSE` file before publishing. The build includes it automatically when present. The license is a product-owner decision and is intentionally not selected by the build tooling.

## Sign

Development builds can remain unsigned. Before private distribution or catalog publishing:

```powershell
$env:GRAFANA_ACCESS_POLICY_TOKEN = "<token>"
npx @grafana/sign-plugin@latest --rootUrls http://localhost:3000
```

For a public catalog plugin, submit it for review before signing and omit `--rootUrls` after Grafana grants the signature level.

## Plugin validator

Run Grafana's plugin validator against the packaged ZIP before publishing:

```powershell
docker run --rm -v "${PWD}/release/asim-deviceaction-app-0.1.0.zip:/archive.zip" grafana/plugin-validator-cli /archive.zip
```

The archive-only validator currently passes structural checks and reports the expected unsigned warning plus the missing `LICENSE` release blocker. Run the full source scan in CI or before submission:

```powershell
docker run --rm `
  -v "${PWD}/release/asim-deviceaction-app-0.1.0.zip:/archive.zip" `
  -v "${PWD}:/source_code" `
  grafana/plugin-validator-cli `
  -sourceCodeUri file:///source_code `
  /archive.zip
```

## References

- [Package a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/package-a-plugin)
- [Sign a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)
- [Publishing best practices](https://grafana.com/developers/plugin-tools/publish-a-plugin/publishing-best-practices)
