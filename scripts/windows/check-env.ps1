Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$message) {
  Write-Host "[doctor] $message"
}

function Resolve-CommandPath([string[]]$names) {
  foreach ($name in $names) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) {
      return $cmd.Source
    }
  }
  return $null
}

function Compare-VersionAtLeast([Version]$actual, [Version]$minimum) {
  return $actual -ge $minimum
}

function Parse-NodeVersion([string]$raw) {
  $trimmed = $raw.Trim()
  if ($trimmed.StartsWith("v")) {
    $trimmed = $trimmed.Substring(1)
  }
  return [Version]$trimmed
}

function Test-PythonCommand([string]$exe, [string[]]$prefixArgs, [Version]$minimum) {
  try {
    $expr = "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}'); raise SystemExit(0 if sys.version_info >= ($($minimum.Major), $($minimum.Minor)) else 1)"
    $output = & $exe @prefixArgs -c $expr 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }
    return [PSCustomObject]@{
      Exe = $exe
      Prefix = $prefixArgs
      Version = [Version]($output | Select-Object -First 1)
    }
  } catch {
    return $null
  }
}

function Resolve-Python([Version]$minimum) {
  $candidates = @(
    @{ Exe = $env:RECLAIM_PYTHON; Prefix = @() },
    @{ Exe = "python"; Prefix = @() },
    @{ Exe = "python3"; Prefix = @() },
    @{ Exe = "py"; Prefix = @("-3.12") },
    @{ Exe = "py"; Prefix = @("-3.11") },
    @{ Exe = "py"; Prefix = @("-3") }
  )

  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate.Exe)) {
      continue
    }
    $result = Test-PythonCommand -exe $candidate.Exe -prefixArgs $candidate.Prefix -minimum $minimum
    if ($result) {
      return $result
    }
  }

  return $null
}

function Test-FileExists([string]$path, [string]$label) {
  if (Test-Path -LiteralPath $path) {
    Write-Step "PASS $label"
    return $true
  }
  Write-Host "[doctor] FAIL $label (missing: $path)" -ForegroundColor Red
  return $false
}

function Test-PortStatus([int]$port) {
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    Write-Step "INFO Port $port LISTEN (PID=$($listener.OwningProcess))"
  } else {
    Write-Step "INFO Port $port not listening"
  }
}

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$allPassed = $true

Write-Step "Workspace: $workspaceRoot"

$requiredFiles = @(
  @{ Path = (Join-Path $workspaceRoot "package.json"); Label = "Root package.json" },
  @{ Path = (Join-Path $workspaceRoot "pnpm-workspace.yaml"); Label = "pnpm workspace file" },
  @{ Path = (Join-Path $workspaceRoot "infra\compose\docker-compose.yml"); Label = "docker compose file" },
  @{ Path = (Join-Path $workspaceRoot "services\scheduler\scripts\run-python.ps1"); Label = "Scheduler runner script" },
  @{ Path = (Join-Path $workspaceRoot "services\scheduler\requirements.txt"); Label = "Scheduler requirements" }
)

foreach ($required in $requiredFiles) {
  $ok = Test-FileExists -path $required.Path -label $required.Label
  if (-not $ok) {
    $allPassed = $false
  }
}

$nodePath = Resolve-CommandPath @("node.exe", "node")
if (-not $nodePath) {
  Write-Host "[doctor] FAIL Node.js not found (need 18+)" -ForegroundColor Red
  $allPassed = $false
} else {
  $nodeVersionRaw = & $nodePath -v
  $nodeVersion = Parse-NodeVersion $nodeVersionRaw
  if (Compare-VersionAtLeast -actual $nodeVersion -minimum ([Version]"18.0.0")) {
    Write-Step "PASS Node.js $nodeVersion"
  } else {
    Write-Host "[doctor] FAIL Node.js $nodeVersion (need 18+)" -ForegroundColor Red
    $allPassed = $false
  }
}

$pnpmPath = Resolve-CommandPath @("pnpm.cmd", "pnpm")
if ($pnpmPath) {
  $pnpmVersion = & $pnpmPath --version
  Write-Step "PASS pnpm $pnpmVersion"
} else {
  $corepackPath = Resolve-CommandPath @("corepack.cmd", "corepack")
  if ($corepackPath) {
    Write-Step "WARN pnpm not found, corepack available (can auto-activate in start script)"
  } else {
    Write-Host "[doctor] FAIL pnpm/corepack not found" -ForegroundColor Red
    $allPassed = $false
  }
}

$python = Resolve-Python -minimum ([Version]"3.11.0")
if ($python) {
  Write-Step "PASS Python $($python.Version) via $($python.Exe) $($python.Prefix -join ' ')"
} else {
  Write-Host "[doctor] FAIL Python 3.11+ not found" -ForegroundColor Red
  $allPassed = $false
}

$dockerPath = Resolve-CommandPath @("docker.exe", "docker")
if (-not $dockerPath) {
  Write-Host "[doctor] FAIL Docker not found" -ForegroundColor Red
  $allPassed = $false
} else {
  $dockerVersion = & $dockerPath --version
  Write-Step "PASS $dockerVersion"
  try {
    & $dockerPath info *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Step "PASS Docker daemon reachable"
    } else {
      Write-Host "[doctor] WARN Docker CLI found but daemon not reachable" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "[doctor] WARN Docker CLI found but daemon not reachable" -ForegroundColor Yellow
  }

  try {
    & $dockerPath compose version *> $null
    if ($LASTEXITCODE -eq 0) {
      $composeVersion = & $dockerPath compose version
      Write-Step "PASS $composeVersion"
    } else {
      Write-Host "[doctor] FAIL docker compose plugin missing" -ForegroundColor Red
      $allPassed = $false
    }
  } catch {
    Write-Host "[doctor] FAIL docker compose plugin missing" -ForegroundColor Red
    $allPassed = $false
  }
}

$envPath = Join-Path $workspaceRoot ".env"
if (Test-Path -LiteralPath $envPath) {
  Write-Step "PASS .env exists"
} else {
  Write-Step "WARN .env missing (copy from .env.example)"
}

Write-Step "Port snapshot"
Test-PortStatus -port 3000
Test-PortStatus -port 8000
Test-PortStatus -port 5432
Test-PortStatus -port 6379

Write-Host ""
if ($allPassed) {
  Write-Host "[doctor] RESULT: PASS (environment is ready)" -ForegroundColor Green
  exit 0
}

Write-Host "[doctor] RESULT: FAIL (fix the failed items above)" -ForegroundColor Red
Write-Host "[doctor] Quick fix tips:"
Write-Host "  1) Install Node.js 18+ and Python 3.11+"
Write-Host "  2) Install/start Docker Desktop"
Write-Host "  3) Run: pnpm install"
Write-Host "  4) Run: docker compose -f infra/compose/docker-compose.yml up -d postgres redis"
exit 1
