param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PyArgs
)

$ErrorActionPreference = "Stop"

function Log([string]$message) {
  Write-Host "[scheduler] $message"
}

function Test-PythonCommand([string]$exe, [string[]]$prefixArgs) {
  try {
    $null = & $exe @prefixArgs -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Resolve-BasePython() {
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
    if (Test-PythonCommand -exe $candidate.Exe -prefixArgs $candidate.Prefix) {
      return $candidate
    }
  }

  throw "No Python 3.11+ interpreter found. Install Python or set RECLAIM_PYTHON."
}

function Ensure-SchedulerVenv([string]$schedulerRoot) {
  $venvDir = Join-Path $schedulerRoot ".venv"
  $venvPython = Join-Path $venvDir "Scripts\python.exe"
  $pyproject = Join-Path $schedulerRoot "pyproject.toml"
  $stamp = Join-Path $venvDir ".deps-stamp"

  if (-not (Test-Path -LiteralPath $venvPython)) {
    $base = Resolve-BasePython
    Log "Creating virtual environment at $venvDir"
    if (Test-Path -LiteralPath $venvDir) {
      Remove-Item -LiteralPath $venvDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    & $base.Exe @($base.Prefix + @("-m", "venv", $venvDir)) | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create scheduler virtual environment."
    }
  }

  # Some broken venv states miss the python launcher binary.
  if (-not (Test-Path -LiteralPath $venvPython)) {
    throw "Virtual environment python not found at $venvPython"
  }

  $requirementsFile = Join-Path $schedulerRoot "requirements.txt"
  if (-not (Test-Path -LiteralPath $requirementsFile)) {
    throw "Missing scheduler requirements file: $requirementsFile"
  }

  $needsInstall = -not (Test-Path -LiteralPath $stamp)
  if (-not $needsInstall) {
    $stampTime = (Get-Item -LiteralPath $stamp).LastWriteTimeUtc
    if (Test-Path -LiteralPath $pyproject) {
      $needsInstall = (Get-Item -LiteralPath $pyproject).LastWriteTimeUtc -gt $stampTime
    }
    if (-not $needsInstall) {
      $needsInstall = (Get-Item -LiteralPath $requirementsFile).LastWriteTimeUtc -gt $stampTime
    }
  }

  if ($needsInstall) {
    Log "Installing scheduler dependencies in virtual environment"
    & $venvPython -m pip install -r $requirementsFile | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to install scheduler dependencies."
    }
    Set-Content -LiteralPath $stamp -Encoding ASCII -Value ((Get-Date).ToString("o"))
  }

  return $venvPython
}

$schedulerRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$venvPythonPath = Ensure-SchedulerVenv -schedulerRoot $schedulerRoot

if (-not $PyArgs -or $PyArgs.Count -eq 0) {
  & $venvPythonPath -c "import sys; print(sys.executable)"
  exit $LASTEXITCODE
}

& $venvPythonPath @PyArgs
exit $LASTEXITCODE
