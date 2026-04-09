Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function PortStatus([int]$port) {
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    return "LISTEN(PID=$($listener.OwningProcess))"
  }
  return "STOPPED"
}

Write-Host "=== Reclaim Maintenance Status ==="
Write-Host "Web 3000    : $(PortStatus 3000)"
Write-Host "Scheduler8000: $(PortStatus 8000)"
