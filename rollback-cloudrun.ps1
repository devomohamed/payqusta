param(
  [string]$ProjectId = $(if ($env:CLOUDRUN_PROJECT) { $env:CLOUDRUN_PROJECT } else { 'payqusta' }),
  [string]$ServiceName = $(if ($env:CLOUDRUN_SERVICE) { $env:CLOUDRUN_SERVICE } else { 'payqusta' }),
  [string]$Region = $(if ($env:CLOUDRUN_REGION) { $env:CLOUDRUN_REGION } else { 'us-central1' }),
  [string]$Revision = '',
  [switch]$DryRun,
  [switch]$SkipSmoke
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$GcloudCmd = 'C:\Users\Ahmed Elshikh\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'

if (-not (Test-Path $GcloudCmd)) {
  throw "gcloud.cmd not found at: $GcloudCmd"
}

function Get-ServiceDescription {
  $json = & "$GcloudCmd" run services describe $ServiceName --region $Region --project $ProjectId --format json
  if ($LASTEXITCODE -ne 0 -or -not $json) {
    throw 'Could not describe Cloud Run service.'
  }
  return $json | ConvertFrom-Json
}

function Get-Revisions {
  $json = & "$GcloudCmd" run revisions list --service $ServiceName --region $Region --project $ProjectId --format json
  if ($LASTEXITCODE -ne 0 -or -not $json) {
    throw 'Could not list Cloud Run revisions.'
  }
  return $json | ConvertFrom-Json
}

$service = Get-ServiceDescription
$appUrl = $service.status.url
$currentTraffic = @($service.status.traffic)
$currentRevision = ($currentTraffic | Where-Object { $_.percent -eq 100 } | Select-Object -First 1).revisionName
$revisions = @(Get-Revisions | Where-Object { $_.status.conditions | Where-Object { $_.type -eq 'Ready' -and $_.status -eq 'True' } })
$sorted = $revisions | Sort-Object { [datetime]$_.metadata.creationTimestamp } -Descending

if (-not $Revision) {
  $Revision = ($sorted | Where-Object { $_.metadata.name -ne $currentRevision } | Select-Object -First 1).metadata.name
}

if (-not $Revision) {
  throw 'Could not determine a rollback target revision. Provide -Revision explicitly.'
}

Write-Host "Current revision: $currentRevision"
Write-Host "Target revision : $Revision"
Write-Host "Service URL      : $appUrl"

if ($DryRun) {
  Write-Host 'Dry run complete. No traffic was changed.'
  exit 0
}

& "$GcloudCmd" run services update-traffic $ServiceName --region $Region --project $ProjectId --to-revisions "$Revision=100"
if ($LASTEXITCODE -ne 0) {
  throw 'Cloud Run traffic update failed.'
}

Write-Host 'Traffic shifted successfully.'

if (-not $SkipSmoke) {
  Write-Host 'Running post-rollback smoke...'
  $SmokeArgs = @('backend\scripts\post-deploy-smoke.js', "--app-url=$appUrl")
  if ($env:OPS_BEARER_TOKEN) {
    $SmokeArgs += "--ops-token=$($env:OPS_BEARER_TOKEN)"
  }
  node @SmokeArgs
  if ($LASTEXITCODE -ne 0) {
    throw 'Post-rollback smoke failed.'
  }
}

Write-Host ''
Write-Host 'Rollback completed successfully.'
Write-Host "Active revision: $Revision"
Write-Host "Service URL    : $appUrl"
