Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$message) {
  Write-Host "[reclaim] $message"
}

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$pidFile = Join-Path $workspaceRoot ".runtime\maintenance-pids.json"

if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Step "No maintenance state file found. Nothing to stop."
  exit 0
}

$state = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json

foreach ($name in @("web", "scheduler")) {
  $procId = $state.processes.$name
  if (-not $procId) {
    continue
  }

  $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Write-Step "Stopped $name (PID=$procId)"
  } else {
    Write-Step "$name process does not exist (PID=$procId)"
  }
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Write-Step "Maintenance environment stopped."
