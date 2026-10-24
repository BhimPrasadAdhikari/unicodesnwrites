$ErrorActionPreference = "Stop"

if ($env:CODEX_PROJECT_SANDBOX -ne "1") {
  throw "Run this script through scripts/with-sandbox-env.ps1."
}

$containerName = "unicodesnwrites-course-auth-e2e"
$mongoPort = 27019
$existing = docker ps -a --filter "name=^/$containerName$" --format "{{.Names}}"
if ($existing) {
  throw "Docker container '$containerName' already exists. Remove it or choose another test container name."
}

docker info --format "Docker server {{.ServerVersion}}" | Write-Output
$containerId = docker run --detach --rm --name $containerName --publish "127.0.0.1:${mongoPort}:27017" mongo:7.0
if ($LASTEXITCODE -ne 0 -or -not $containerId) {
  throw "Unable to start the local Mongo test container."
}

try {
  $ready = $false
  $strictErrorActionPreference = $ErrorActionPreference
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    # A freshly created Mongo container can accept `docker exec` before mongod
    # is listening. Treat that expected startup failure as a retry signal.
    $ErrorActionPreference = "Continue"
    docker exec $containerName mongosh --quiet --eval "quit(db.runCommand({ ping: 1 }).ok ? 0 : 1)" 2>$null
    $mongoReadyExitCode = $LASTEXITCODE
    $ErrorActionPreference = $strictErrorActionPreference
    if ($mongoReadyExitCode -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    throw "The local Mongo test container did not become ready."
  }

  $env:COURSE_AUTH_E2E_MONGODB_URI = "mongodb://127.0.0.1:${mongoPort}/course-auth-e2e"
  npx tsx scripts/test-course-auth-e2e.ts
  if ($LASTEXITCODE -ne 0) {
    throw "Course authentication end-to-end test failed."
  }
}
finally {
  docker stop $containerName | Out-Null
}
