# Check production backend status and logs

Write-Host "=== Checking Backend Process ===" -ForegroundColor Cyan
Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, StartTime, Path

Write-Host "`n=== Checking Latest Backend Log ===" -ForegroundColor Cyan
$logPath = "C:\GofaApp11\Backend\logs"
if (Test-Path $logPath) {
    $latestLog = Get-ChildItem $logPath -Filter "*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestLog) {
        Write-Host "Latest log file: $($latestLog.FullName)" -ForegroundColor Green
        Write-Host "Last modified: $($latestLog.LastWriteTime)" -ForegroundColor Green
        Write-Host "`nLast 50 lines:" -ForegroundColor Yellow
        Get-Content $latestLog.FullName -Tail 50
    } else {
        Write-Host "No log files found" -ForegroundColor Red
    }
} else {
    Write-Host "Log directory not found: $logPath" -ForegroundColor Red
}

Write-Host "`n=== Verifying Database Columns ===" -ForegroundColor Cyan
$sqlQuery = @"
USE GofaDb;
SELECT 'TransactionEntries' AS TableName, COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'TransactionEntries' AND COLUMN_NAME = 'History'
UNION ALL
SELECT 'Model22Items', COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Model22Items' AND COLUMN_NAME IN ('Category', 'IsAccessoryOnly', 'ParentItemId')
ORDER BY TableName, COLUMN_NAME;
"@

sqlcmd -S "WIN-HRMPGQA7MMN\SQLExpress" -U sa -P "signal@2025" -Q $sqlQuery -s","

Write-Host "`n=== Testing Backend Endpoint ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://10.20.38.51:2024/api/items/16541" -Method GET -ErrorAction Stop
    Write-Host "Success! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
