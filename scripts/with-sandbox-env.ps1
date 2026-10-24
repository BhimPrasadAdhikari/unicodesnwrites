$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$sandboxEnvPath = Join-Path $repoRoot ".env.sandbox"

if (-not (Test-Path -LiteralPath $sandboxEnvPath)) {
  Write-Error "Missing .env.sandbox. Create it from .env.sandbox.example and use only test/sandbox credentials."
  exit 1
}

$CommandTokens = @($args)

if (-not $CommandTokens -or $CommandTokens.Count -eq 0) {
  Write-Error "Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 <command> [args...]"
  exit 1
}

if ($CommandTokens[0] -eq "--") {
  if ($CommandTokens.Count -eq 1) {
    Write-Error "Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 <command> [args...]"
    exit 1
  }

  $CommandTokens = @($CommandTokens | Select-Object -Skip 1)
}

$Executable = $CommandTokens[0]
$ExecutableArgs = @($CommandTokens | Select-Object -Skip 1)
$commandText = ($CommandTokens -join " ")
$blockedCommandPattern = '(?i)\b(seed:prod|seed-production|migrate-to-blob|next\s+start)\b'
if ($commandText -match $blockedCommandPattern) {
  Write-Error "Blocked in sandbox runner: '$commandText' looks production-oriented. Run only dev/test commands with .env.sandbox."
  exit 2
}

Get-Content -LiteralPath $sandboxEnvPath | ForEach-Object {
  $line = $_.Trim()
  if ($line.Length -eq 0 -or $line.StartsWith("#")) {
    return
  }

  $parts = $line -split "=", 2
  if ($parts.Count -ne 2) {
    return
  }

  $name = $parts[0].Trim()
  $value = $parts[1].Trim()

  if ($value.Length -ge 2) {
    $first = $value.Substring(0, 1)
    $last = $value.Substring($value.Length - 1, 1)
    if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }
  }

  if ($name -match '^[A-Za-z_][A-Za-z0-9_]*$') {
    Set-Item -Path "Env:$name" -Value $value
  }
}

$env:CODEX_PROJECT_SANDBOX = "1"
$env:NODE_ENV = if ($commandText -match '(?i)\bbuild\b') { "production" } else { "development" }
$env:NEXT_TELEMETRY_DISABLED = "1"

# Next.js scans conventional .env files even when the sandbox variables are
# already present. Preload a filesystem guard for this command and all Node
# children so agent-run tools cannot open protected real env files.
$envGuardPath = Join-Path $repoRoot "scripts\block-real-env-files.cjs"
if (Test-Path -LiteralPath $envGuardPath) {
  $guardOption = "--require=$envGuardPath"
  if (-not $env:NODE_OPTIONS -or $env:NODE_OPTIONS -notlike "*$guardOption*") {
    $env:NODE_OPTIONS = if ($env:NODE_OPTIONS) { "$env:NODE_OPTIONS $guardOption" } else { $guardOption }
  }
}

& $Executable @ExecutableArgs
exit $LASTEXITCODE
