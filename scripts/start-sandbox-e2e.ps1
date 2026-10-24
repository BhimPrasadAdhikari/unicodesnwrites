param(
  [int]$Port = 3100,
  [string]$NodePath = "node"
)

$ErrorActionPreference = "Stop"

if ($env:CODEX_PROJECT_SANDBOX -ne "1") {
  throw "This script must be launched through scripts/with-sandbox-env.ps1."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$nextCli = Join-Path $repoRoot "node_modules\next\dist\bin\next"
$envGuard = Join-Path $repoRoot "scripts\block-real-env-files.cjs"
$existingNodeOptions = $env:NODE_OPTIONS
$guardOption = "--require=$envGuard"
$env:NODE_OPTIONS = if ($existingNodeOptions) { "$existingNodeOptions $guardOption" } else { $guardOption }

Push-Location $repoRoot
try {
  & $NodePath $nextCli dev --webpack -p $Port
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
