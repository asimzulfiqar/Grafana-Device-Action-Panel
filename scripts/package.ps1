$ErrorActionPreference = 'Stop'

$pluginId = 'asim-deviceaction-app'
$version = (Get-Content package.json | ConvertFrom-Json).version
$archive = "$pluginId-$version.zip"
$targets = @(
  @{ Os = 'linux'; Arch = 'amd64'; Suffix = '' },
  @{ Os = 'linux'; Arch = 'arm64'; Suffix = '' },
  @{ Os = 'darwin'; Arch = 'amd64'; Suffix = '' },
  @{ Os = 'darwin'; Arch = 'arm64'; Suffix = '' },
  @{ Os = 'windows'; Arch = 'amd64'; Suffix = '.exe' }
)

npm run build
if ($LASTEXITCODE -ne 0) {
  throw 'Frontend build failed.'
}

docker run --rm -v "${PWD}:/src" -w /src alpine:3.22 sh -lc 'rm -f dist/gpx_device_action_*'
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to clear previous backend binaries.'
}

foreach ($target in $targets) {
  $output = "dist/gpx_device_action_$($target.Os)_$($target.Arch)$($target.Suffix)"
  $build = "CGO_ENABLED=0 GOOS=$($target.Os) GOARCH=$($target.Arch) go build -o $output ./pkg"
  docker run --rm -v "${PWD}:/src" -v grafana-device-action-go-mod:/go/pkg/mod -v grafana-device-action-go-build:/root/.cache/go-build -w /src golang:1.25.5 sh -c $build
  if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed for $($target.Os)/$($target.Arch)."
  }
}

$package = @"
set -eu
apk add --no-cache zip >/dev/null
rm -rf release/package release/$archive
mkdir -p release/package/$pluginId
cp -R dist/. release/package/$pluginId/
chmod 0755 release/package/$pluginId/gpx_device_action_*
cd release/package
zip -qr ../$archive $pluginId
"@
docker run --rm -v "${PWD}:/src" -w /src alpine:3.22 sh -lc $package
if ($LASTEXITCODE -ne 0) {
  throw 'ZIP packaging failed.'
}

Write-Host "Created release/$archive"
