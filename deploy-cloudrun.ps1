$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$GcloudCmd = "C:\Users\Ahmed Elshikh\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$ProjectId = "payqusta"
$ServiceName = "payqusta"
$Region = "us-central1"
$EnvFile = "cloudrun.env"
$UploadsMigrationScript = "backend\scripts\migrate-local-uploads-to-db.js"
$MinInstances = [Math]::Max(0, [int]($(if ($env:CLOUDRUN_MIN_INSTANCES) { $env:CLOUDRUN_MIN_INSTANCES } else { 1 })))
$MaxInstances = [Math]::Max($MinInstances, [int]($(if ($env:CLOUDRUN_MAX_INSTANCES) { $env:CLOUDRUN_MAX_INSTANCES } else { 10 })))

function Get-EnvFileValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $prefix = "$Key="
  $line = Get-Content $FilePath | Where-Object { $_.TrimStart().StartsWith($prefix) } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return $line.Substring($prefix.Length).Trim().Trim('"').Trim("'")
}

if (-not (Test-Path $GcloudCmd)) {
  throw "gcloud.cmd not found at: $GcloudCmd"
}

if (-not (Test-Path $EnvFile)) {
  throw "Missing env file: $EnvFile"
}

Write-Host "==> Running release preflight..."
node backend\scripts\release-preflight.js --env-file=$EnvFile
if ($LASTEXITCODE -ne 0) {
  throw "Release preflight failed."
}

if (Test-Path $UploadsMigrationScript) {
  Write-Host "==> Syncing local uploads to MongoDB fallback storage..."
  node $UploadsMigrationScript --env-file=$EnvFile
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Local uploads sync failed on this machine. Cloud Run will still try to import backend/uploads on startup if Mongo is reachable there."
  }
}

Write-Host "==> Building frontend..."
npm --prefix frontend run build
if ($LASTEXITCODE -ne 0) {
  throw "Frontend build failed."
}

Write-Host "==> Deploying Cloud Run service..."
& "$GcloudCmd" run deploy $ServiceName `
  --source . `
  --region $Region `
  --project $ProjectId `
  --allow-unauthenticated `
  --env-vars-file $EnvFile `
  --min-instances $MinInstances `
  --max-instances $MaxInstances
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run deploy failed."
}

Write-Host "==> Reading service URL..."
$AppUrl = (& "$GcloudCmd" run services describe $ServiceName `
  --region $Region `
  --project $ProjectId `
  --format "value(status.url)").Trim()

if (-not $AppUrl) {
  throw "Could not read service URL from Cloud Run."
}

if ($env:DEPLOY_PUBLIC_URL) {
  $PublicUrl = $env:DEPLOY_PUBLIC_URL.Trim()
} else {
  $PublicUrl = Get-EnvFileValue -FilePath $EnvFile -Key "APP_URL"
  if (-not $PublicUrl) {
    $PublicUrl = Get-EnvFileValue -FilePath $EnvFile -Key "CLIENT_URL"
  }
  if (-not $PublicUrl) {
    $PublicUrl = $AppUrl
  }
}

Write-Host "==> Updating public URLs to $PublicUrl ..."
& "$GcloudCmd" run services update $ServiceName `
  --region $Region `
  --project $ProjectId `
  --update-env-vars "CLIENT_URL=$PublicUrl,APP_URL=$PublicUrl"
if ($LASTEXITCODE -ne 0) {
  throw "Updating public URLs failed."
}

Write-Host "==> Health check..."
$HealthUrl = "$AppUrl/api/health"
$Response = Invoke-WebRequest $HealthUrl -UseBasicParsing

if ($Response.StatusCode -ne 200) {
  throw "Health check failed with status $($Response.StatusCode)"
}

Write-Host "==> Post-deploy smoke..."
$SmokeArgs = @("backend\scripts\post-deploy-smoke.js", "--app-url=$AppUrl")
if ($env:OPS_BEARER_TOKEN) {
  $SmokeArgs += "--ops-token=$($env:OPS_BEARER_TOKEN)"
}
node @SmokeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Post-deploy smoke failed."
}

Write-Host ""
Write-Host "Deploy completed successfully."
Write-Host "Service URL: $AppUrl"
Write-Host "Public URL : $PublicUrl"
Write-Host "Health URL : $HealthUrl"
