param(
  [string]$Branch = "main",
  [int]$Retries = 3,
  [switch]$SkipConnectivityCheck
)

$ErrorActionPreference = "Continue"

function Log([string]$message) {
  Write-Host "[reclaim-git] $message"
}

function Parse-RemoteHost([string]$url) {
  if ($url -match '^https?://([^/]+)/') { return $Matches[1] }
  if ($url -match '^[^@]+@([^:]+):') { return $Matches[1] }
  return "github.com"
}

function Ensure-Connectivity([string]$remoteHost, [int]$retries) {
  for ($i = 1; $i -le $retries; $i++) {
    $ok = Test-NetConnection -ComputerName $remoteHost -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($ok) { return $true }
    Log "Network check failed ($i/$retries): ${remoteHost}:443"
    Start-Sleep -Seconds 2
  }
  return $false
}

function Parse-AheadBehind([string]$branch) {
  $raw = (& git rev-list --left-right --count "$branch...origin/$branch").Trim()
  $parts = $raw -split '\s+'
  if ($parts.Length -lt 2) {
    throw "Unable to parse ahead/behind counts: $raw"
  }
  return @{ LocalAhead = [int]$parts[0]; RemoteAhead = [int]$parts[1] }
}

function Merge-RemoteIfNeeded([string]$branch) {
  $counts = Parse-AheadBehind -branch $branch
  if ($counts.RemoteAhead -gt 0) {
    Log "Remote has $($counts.RemoteAhead) commit(s), merging origin/$branch"
    & git merge "origin/$branch" --no-edit
    if ($LASTEXITCODE -ne 0) {
      throw "Merge failed. Resolve conflicts manually, then re-run script."
    }
  }
}

& git rev-parse --is-inside-work-tree | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Current directory is not a git repository."
}

$remoteUrl = (& git remote get-url origin 2>$null).Trim()
if (-not $remoteUrl) {
  throw "No remote named 'origin' found."
}

$remoteHost = Parse-RemoteHost -url $remoteUrl
if (-not $SkipConnectivityCheck) {
  Log "Checking connectivity to ${remoteHost}:443"
  if (-not (Ensure-Connectivity -remoteHost $remoteHost -retries $Retries)) {
    throw "Cannot connect to ${remoteHost}:443. Check VPN/proxy/network and retry."
  }
}

& git config --local pull.rebase false
& git config --local core.quotepath false

Log "Fetching origin/$Branch"
& git fetch origin $Branch --prune
if ($LASTEXITCODE -ne 0) {
  throw "git fetch failed"
}

& git show-ref --verify --quiet "refs/heads/$Branch"
if ($LASTEXITCODE -ne 0) {
  Log "Local branch '$Branch' does not exist, creating from origin/$Branch"
  & git checkout -b $Branch "origin/$Branch"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create local branch '$Branch'"
  }
}
else {
  & git checkout $Branch | Out-Null
}

Merge-RemoteIfNeeded -branch $Branch

$pushSucceeded = $false
for ($attempt = 1; $attempt -le 2; $attempt++) {
  Log "Pushing to origin/$Branch (attempt $attempt/2)"
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $pushOutput = cmd /c "git push -u origin $Branch" 2>&1
  $ErrorActionPreference = $previousErrorAction
  $outputText = ($pushOutput | Out-String)
  $pushOutput | Out-Host

  if ($LASTEXITCODE -eq 0) {
    $pushSucceeded = $true
    break
  }

  if ($outputText -match "fetch first|non-fast-forward") {
    Log "Remote changed during push, refetching and merging"
    & git fetch origin $Branch --prune
    if ($LASTEXITCODE -ne 0) { throw "git fetch failed during retry" }
    Merge-RemoteIfNeeded -branch $Branch
    continue
  }

  if ($outputText -match "Could not connect to server|timed out|Failed to connect") {
    if (-not (Ensure-Connectivity -remoteHost $remoteHost -retries $Retries)) {
      throw "Network unstable and retry failed."
    }
    continue
  }

  throw "Push failed: $outputText"
}

if (-not $pushSucceeded) {
  throw "Push failed after retries."
}

Log "Git sync completed successfully."
