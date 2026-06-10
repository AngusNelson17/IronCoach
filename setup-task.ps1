# One-time: register a Windows scheduled task that runs export-ironcoach.ps1
# every day at 7:00 AM. Re-run safely - uses -Force to replace any existing entry.

$TaskName   = "IronCoach Dashboard Daily Export"
$RepoPath   = "C:\Users\angus\OneDrive\Enervest\Andrews Temp folder"
$ScriptPath = Join-Path $RepoPath "export-ironcoach.ps1"

if (-not (Test-Path $ScriptPath)) {
    Write-Error "Cannot find export script at $ScriptPath"
    exit 1
}

$Action    = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
$Trigger   = New-ScheduledTaskTrigger -Daily -At 7am
$Settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger `
    -Settings $Settings -Principal $Principal -Force | Out-Null

Write-Host "Registered scheduled task: $TaskName (daily 7:00 AM)"
Write-Host "To run now:    Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "To inspect:    Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host "To remove:     Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
