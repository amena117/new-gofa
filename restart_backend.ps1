# Restart backend and clear connection pools

Write-Host "=== Stopping Backend ===" -ForegroundColor Cyan
$dotnetProcesses = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
if ($dotnetProcesses) {
    $dotnetProcesses | ForEach-Object {
        Write-Host "Stopping process ID: $($_.Id)" -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force
    }
    Start-Sleep -Seconds 2
    Write-Host "Backend stopped" -ForegroundColor Green
} else {
    Write-Host "No dotnet processes found" -ForegroundColor Yellow
}

Write-Host "`n=== Clearing SQL Server Connection Pools ===" -ForegroundColor Cyan
$clearPoolsQuery = @"
USE master;
DECLARE @kill varchar(8000) = '';
SELECT @kill = @kill + 'KILL ' + CONVERT(varchar(5), session_id) + ';'
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID('GofaDb')
AND session_id <> @@SPID;
EXEC(@kill);
PRINT 'Connection pools cleared';
"@

try {
    sqlcmd -S "WIN-HRMPGQA7MMN\SQLExpress" -U sa -P "signal@2025" -Q $clearPoolsQuery
    Write-Host "SQL connection pools cleared" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not clear connection pools: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== Starting Backend ===" -ForegroundColor Cyan
cd C:\GofaApp11\Backend
Start-Process -FilePath "dotnet" -ArgumentList "Gofabackend.dll" -NoNewWindow -RedirectStandardOutput "startup.log" -RedirectStandardError "startup_error.log"

Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`n=== Checking Backend Status ===" -ForegroundColor Cyan
$dotnetProcesses = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
if ($dotnetProcesses) {
    Write-Host "Backend is running (PID: $($dotnetProcesses.Id))" -ForegroundColor Green
} else {
    Write-Host "Backend failed to start!" -ForegroundColor Red
    if (Test-Path "startup_error.log") {
        Write-Host "`nStartup errors:" -ForegroundColor Red
        Get-Content "startup_error.log"
    }
    exit 1
}

Write-Host "`n=== Testing Endpoint ===" -ForegroundColor Cyan
Start-Sleep -Seconds 3
try {
    $response = Invoke-RestMethod -Uri "http://localhost:2024/api/items/16541" -Method GET -TimeoutSec 10
    Write-Host "Success! Item loaded successfully" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nCheck logs at: C:\GofaApp11\Backend\logs\" -ForegroundColor Yellow
}

Write-Host "`n=== Backend Restart Complete ===" -ForegroundColor Cyan
