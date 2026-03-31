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

function Get-CloudRunServiceState {
  param(
    [switch]$AllowMissing
  )

  $DescribeOutput = & "$GcloudCmd" run services describe $ServiceName `
    --region $Region `
    --project $ProjectId `
    --format json 2>&1

  if ($LASTEXITCODE -ne 0) {
    $DescribeText = ($DescribeOutput | Out-String).Trim()
    if ($AllowMissing -and $DescribeText -match 'NOT_FOUND|not found') {
      return $null
    }

    throw "Could not describe Cloud Run service.`n$DescribeText"
  }

  return (($DescribeOutput | Out-String) | ConvertFrom-Json)
}

function Test-CloudRunDeploymentResult {
  param(
    $PreviousServiceState
  )

  $CurrentServiceState = Get-CloudRunServiceState
  $CurrentStatus = $CurrentServiceState.status
  $CurrentMetadata = $CurrentServiceState.metadata
  $PreviousStatus = if ($PreviousServiceState) { $PreviousServiceState.status } else { $null }
  $PreviousMetadata = if ($PreviousServiceState) { $PreviousServiceState.metadata } else { $null }

  $CurrentGeneration = [int]$CurrentMetadata.generation
  $ObservedGeneration = [int]$CurrentStatus.observedGeneration
  $CurrentReadyRevision = [string]$CurrentStatus.latestReadyRevisionName
  $CurrentCreatedRevision = [string]$CurrentStatus.latestCreatedRevisionName
  $PreviousGeneration = if ($PreviousMetadata) { [int]$PreviousMetadata.generation } else { -1 }
  $PreviousCreatedRevision = if ($PreviousStatus) { [string]$PreviousStatus.latestCreatedRevisionName } else { "" }

  $GenerationAdvanced = $null -eq $PreviousServiceState -or $CurrentGeneration -gt $PreviousGeneration
  $RevisionAdvanced = $null -eq $PreviousServiceState -or $CurrentCreatedRevision -ne $PreviousCreatedRevision
  $HasReadyRevision = -not [string]::IsNullOrWhiteSpace($CurrentReadyRevision)
  $ReadyRevisionMatchesCreated = $HasReadyRevision -and $CurrentReadyRevision -eq $CurrentCreatedRevision
  $ObservedLatestGeneration = $ObservedGeneration -ge $CurrentGeneration

  return [pscustomobject]@{
    ServiceState = $CurrentServiceState
    Succeeded = ($HasReadyRevision -and $ReadyRevisionMatchesCreated -and $ObservedLatestGeneration -and ($GenerationAdvanced -or $RevisionAdvanced))
  }
}

function Wait-CloudRunDeploymentResult {
  param(
    $PreviousServiceState,
    [int]$TimeoutSeconds = 90,
    [int]$PollIntervalSeconds = 5
  )

  $Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $DeployResult = Test-CloudRunDeploymentResult -PreviousServiceState $PreviousServiceState
    if ($DeployResult.Succeeded) {
      return $DeployResult
    }

    if ((Get-Date) -ge $Deadline) {
      return $DeployResult
    }

    Start-Sleep -Seconds $PollIntervalSeconds
  } while ($true)
}

function Ensure-CloudRunPublicAccess {
  $PolicyOutput = & "$GcloudCmd" run services get-iam-policy $ServiceName `
    --region $Region `
    --project $ProjectId `
    --format json 2>&1

  if ($LASTEXITCODE -ne 0) {
    throw "Could not read Cloud Run IAM policy.`n$(($PolicyOutput | Out-String).Trim())"
  }

  $Policy = (($PolicyOutput | Out-String) | ConvertFrom-Json)
  $HasPublicInvoker = @($Policy.bindings) | Where-Object {
    $_.role -eq "roles/run.invoker" -and @($_.members) -contains "allUsers"
  } | Select-Object -First 1

  if ($HasPublicInvoker) {
    Write-Host "==> Public invoker IAM already configured."
    return
  }

  Write-Host "==> Granting public invoker IAM..."
  & "$GcloudCmd" run services add-iam-policy-binding $ServiceName `
    --region $Region `
    --project $ProjectId `
    --member "allUsers" `
    --role "roles/run.invoker"

  if ($LASTEXITCODE -ne 0) {
    throw "Setting public invoker IAM failed."
  }
}

function Normalize-SourceArchiveTimestamps {
  $MinZipDate = Get-Date "1980-01-01T00:00:00"
  $MaxZipDate = Get-Date "2107-12-31T23:59:58"
  $SafeTimestamp = Get-Date

  $OutOfRangeFiles = Get-ChildItem -Path $PSScriptRoot -Recurse -File -Force | Where-Object {
    $_.LastWriteTime -lt $MinZipDate -or $_.LastWriteTime -gt $MaxZipDate
  }

  if (-not $OutOfRangeFiles) {
    return
  }

  Write-Host "==> Normalizing out-of-range file timestamps for Cloud Build source archive..."
  foreach ($File in $OutOfRangeFiles) {
    Write-Host "   fixing timestamp: $($File.FullName)"
    $File.LastWriteTime = $SafeTimestamp
    $File.LastWriteTimeUtc = $SafeTimestamp.ToUniversalTime()
  }
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

Normalize-SourceArchiveTimestamps

$PreviousServiceState = Get-CloudRunServiceState -AllowMissing

Write-Host "==> Deploying Cloud Run service..."
& "$GcloudCmd" run deploy $ServiceName `
  --source . `
  --region $Region `
  --project $ProjectId `
  --env-vars-file $EnvFile `
  --min-instances $MinInstances `
  --max-instances $MaxInstances

$DeployExitCode = $LASTEXITCODE
$ServiceState = $null
if ($DeployExitCode -ne 0) {
  Write-Warning "gcloud run deploy exited with code $DeployExitCode. Verifying Cloud Run service state before failing..."
  $DeployResult = Wait-CloudRunDeploymentResult -PreviousServiceState $PreviousServiceState
  if (-not $DeployResult.Succeeded) {
    throw "Cloud Run deploy failed."
  }

  $ServiceState = $DeployResult.ServiceState
  Write-Warning "Cloud Run reports ready revision $($ServiceState.status.latestReadyRevisionName). Continuing despite the gcloud exit code."
}

Ensure-CloudRunPublicAccess

Write-Host "==> Reading service URL..."
if (-not $ServiceState) {
  $ServiceState = Get-CloudRunServiceState
}

$AppUrl = [string]$ServiceState.status.url

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
