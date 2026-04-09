param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

function Log([string]$message) {
  Write-Host "[reclaim] $message"
}

function Get-PortPid([int]$port) {
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    return [int]$listener.OwningProcess
  }
  return 0
}

function Test-HttpHealthy([string]$url) {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Load-DotEnv([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    return
  }

  foreach ($line in Get-Content -LiteralPath $path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed.Split("=", 2)
    if ($parts.Length -ne 2) {
      continue
    }

    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
  }
}

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeDir = Join-Path $workspaceRoot ".runtime"
$logDir = Join-Path $runtimeDir "logs"
$pidFile = Join-Path $runtimeDir "maintenance-pids.json"

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$nodePath = "C:\Program Files\nodejs"
$pnpmPath = Join-Path $env:USERPROFILE "AppData\Roaming\npm"
$pnpmCmd = Join-Path $pnpmPath "pnpm.cmd"
$pythonExe = Join-Path $env:USERPROFILE "AppData\Local\Python\pythoncore-3.14-64\python.exe"

$env:Path = "$nodePath;$pnpmPath;" + $env:Path
Load-DotEnv (Join-Path $workspaceRoot ".env")

if (-not $env:DATABASE_URL) { $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/reclaim" }
if (-not $env:REDIS_URL) { $env:REDIS_URL = "redis://localhost:6379" }
if (-not $env:NEXTAUTH_SECRET) { $env:NEXTAUTH_SECRET = "replace-me" }
if (-not $env:NEXTAUTH_URL) { $env:NEXTAUTH_URL = "http://localhost:3000" }
if (-not $env:SCHEDULER_BASE_URL) { $env:SCHEDULER_BASE_URL = "http://localhost:8000" }

if (-not (Test-Path -LiteralPath $pnpmCmd)) {
  throw "pnpm.cmd not found at $pnpmCmd"
}

if (-not (Test-Path -LiteralPath $pythonExe)) {
  throw "Python not found at $pythonExe"
}

try {
  Log "Applying database migrations"
  & $pnpmCmd --filter @reclaim/database exec prisma migrate deploy | Out-Host
} catch {
  Log "Migration step failed, continue with startup"
}

$schedulerPid = Get-PortPid 8000
if ($schedulerPid -eq 0 -or -not (Test-HttpHealthy "http://localhost:8000/health")) {
  if ($schedulerPid -ne 0) {
    Log "Restarting unhealthy scheduler (PID=$schedulerPid)"
    Stop-Process -Id $schedulerPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
  Log "Starting scheduler on 8000"
  $scheduler = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory (Join-Path $workspaceRoot "services\scheduler") `
    -PassThru `
    -RedirectStandardOutput (Join-Path $logDir "scheduler.out.log") `
    -RedirectStandardError (Join-Path $logDir "scheduler.err.log")
  $schedulerPid = [int]$scheduler.Id
}
else {
  Log "Scheduler already running (PID=$schedulerPid)"
}

Log "Building apps/web (always)"
& $pnpmCmd --filter @reclaim/web build | Out-Host

$webPid = Get-PortPid 3000
if ($webPid -ne 0) {
  Log "Restarting web process to load latest build (PID=$webPid)"
  Stop-Process -Id $webPid -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}

Log "Starting web on 3000"
$web = Start-Process -FilePath $pnpmCmd `
  -ArgumentList "--filter", "@reclaim/web", "start" `
  -WorkingDirectory $workspaceRoot `
  -PassThru `
  -RedirectStandardOutput (Join-Path $logDir "web.out.log") `
  -RedirectStandardError (Join-Path $logDir "web.err.log")
$webPid = [int]$web.Id

Start-Sleep -Seconds 5

if (-not (Test-HttpHealthy "http://localhost:8000/health")) {
  throw "Scheduler health check failed after startup."
}

if (-not (Test-HttpHealthy "http://localhost:3000/")) {
  throw "Web health check failed after startup."
}

$state = @{
  startedAt = (Get-Date).ToString("o")
  workspaceRoot = $workspaceRoot
  processes = @{
    scheduler = $schedulerPid
    web = $webPid
  }
}
$state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $pidFile -Encoding UTF8

Log "Ready: http://localhost:3000/ and http://localhost:3000/ops"
if (-not $NoBrowser) {
  Start-Process "http://localhost:3000/"
  Start-Process "http://localhost:3000/ops"
}
