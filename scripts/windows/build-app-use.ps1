$ErrorActionPreference = "Stop"

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$appUseDir = Join-Path $workspaceRoot "app-use"
$desktopDist = Join-Path $workspaceRoot "apps\desktop\dist-release"
$docSource = Join-Path $workspaceRoot "docs\中文软件使用教程.md"
$docFallback = Join-Path $workspaceRoot "app-use\中文软件使用教程.md"
$pnpmCmd = Join-Path $env:USERPROFILE "AppData\Roaming\npm\pnpm.cmd"

if (-not (Test-Path -LiteralPath $pnpmCmd)) {
  throw "pnpm.cmd not found: $pnpmCmd"
}

Write-Host "[reclaim] Building web production bundle..."
Push-Location $workspaceRoot
& $pnpmCmd --filter @reclaim/web build | Out-Host

Write-Host "[reclaim] Building desktop exe..."
Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessName -in @("electron", "Reclaim Time Manager", "Reclaim 时间管家") } |
  ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }

$winUnpacked = Join-Path $desktopDist "win-unpacked"
if (Test-Path -LiteralPath $winUnpacked) {
  Remove-Item -LiteralPath $winUnpacked -Recurse -Force -ErrorAction SilentlyContinue
}

& $pnpmCmd --filter @reclaim/desktop dist:win | Out-Host
Pop-Location

New-Item -ItemType Directory -Path $appUseDir -Force | Out-Null

$latestExe = Get-ChildItem -LiteralPath $desktopDist -Filter "*.exe" -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestExe) {
  throw "No exe artifact found under $desktopDist"
}

Copy-Item -LiteralPath $latestExe.FullName -Destination (Join-Path $appUseDir $latestExe.Name) -Force
if (Test-Path -LiteralPath $docSource) {
  Copy-Item -LiteralPath $docSource -Destination (Join-Path $appUseDir "中文软件使用教程.md") -Force
} elseif (Test-Path -LiteralPath $docFallback) {
  Copy-Item -LiteralPath $docFallback -Destination (Join-Path $appUseDir "中文软件使用教程.md") -Force
}

Write-Host "[reclaim] Done."
Write-Host "[reclaim] Output folder: $appUseDir"
Write-Host "[reclaim] Exe: $($latestExe.Name)"
