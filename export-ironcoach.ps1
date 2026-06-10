# Daily IronCoach dashboard export
# Copies the latest dashboard artifact from $SourceFile into the repo and
# commits any changes. Safe to run repeatedly: no-op if nothing changed.

$ErrorActionPreference = "Stop"

$RepoPath   = "C:\Users\angus\OneDrive\Enervest\Andrews Temp folder"
$SourceFile = "C:\Users\angus\Downloads\ironman-live-dashboard.jsx"
# Archive folder: daily snapshots of the raw Claude artifact for history.
# Deployed code lives in web/src/dashboard.jsx and is evolved via git -
# we no longer overwrite it from the artifact, since the deployed version
# has real Strava OAuth and other diffs the artifact doesn't know about.
$DestFolder = Join-Path $RepoPath "archive"
$DateStamp  = Get-Date -Format "yyyy-MM-dd"
$DestFile   = Join-Path $DestFolder "ironman-live-dashboard_$DateStamp.jsx"
$LogFile    = Join-Path $RepoPath ".export-log.txt"

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "$ts  $msg" -Encoding utf8
}

# Make git findable even if the scheduled task runs before PATH refreshes.
$gitCmd = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $gitCmd)) {
    $gitCmd = "git"
}

Set-Location $RepoPath

if (-not (Test-Path $SourceFile)) {
    Log "WARN: source file not found at $SourceFile - nothing to export."
    exit 0
}

if (-not (Test-Path $DestFolder)) {
    New-Item -ItemType Directory -Path $DestFolder | Out-Null
}

Copy-Item -Path $SourceFile -Destination $DestFile -Force

$status = & $gitCmd status --porcelain
if (-not $status) {
    Log "No changes to commit."
    exit 0
}

& $gitCmd add -A
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
& $gitCmd commit -m "Daily snapshot: $timestamp" | Out-Null
Log "Committed snapshot: $timestamp"
