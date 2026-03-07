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

if (-not (Test-Path $GcloudCmd)) {
  throw "gcloud.cmd not found at: $GcloudCmd"
}

if (-not (Test-Path $EnvFile)) {
  throw "Missing env file: $EnvFile"
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

Write-Host "==> Updating CLIENT_URL to $AppUrl ..."
& "$GcloudCmd" run services update $ServiceName `
  --region $Region `
  --project $ProjectId `
  --update-env-vars "CLIENT_URL=$AppUrl"
if ($LASTEXITCODE -ne 0) {
  throw "Updating CLIENT_URL failed."
}

Write-Host "==> Health check..."
$HealthUrl = "$AppUrl/api/health"
$Response = Invoke-WebRequest $HealthUrl -UseBasicParsing

if ($Response.StatusCode -ne 200) {
  throw "Health check failed with status $($Response.StatusCode)"
}

Write-Host ""
Write-Host "Deploy completed successfully."
Write-Host "Service URL: $AppUrl"
Write-Host "Health URL : $HealthUrl"
