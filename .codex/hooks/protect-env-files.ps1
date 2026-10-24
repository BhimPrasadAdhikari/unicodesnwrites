$ErrorActionPreference = "Stop"

$payload = [Console]::In.ReadToEnd()

# Allow sandbox/example env files, but block real env file access in Codex tool payloads.
$protectedEnvPattern = '(?i)(^|[^A-Za-z0-9_.-])\.env(?!\.sandbox(?:\.example)?|\.example)(?:\.[A-Za-z0-9_-]+)?(?=$|[^A-Za-z0-9_-])'

if ($payload -match $protectedEnvPattern) {
  Write-Error "Blocked: Codex must not read, write, patch, print, copy, rename, delete, or reference real .env files in this repo. Use .env.sandbox for agent/test runs."
  exit 2
}

exit 0
