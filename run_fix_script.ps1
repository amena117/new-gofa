# PowerShell script to run the SQL fix script
# This will execute the fix_model22_subaccessory_identity.sql script on the server

$ServerInstance = "WIN-HRMPGQA7MMN\SQLExpress"
$Database = "GofaDb"
$Username = "sa"
$Password = "signal@2025"
$SqlFile = "fix_model22_subaccessory_identity.sql"

Write-Host "Connecting to SQL Server: $ServerInstance" -ForegroundColor Cyan
Write-Host "Database: $Database" -ForegroundColor Cyan
Write-Host "Running script: $SqlFile" -ForegroundColor Cyan
Write-Host ""

try {
    # Check if sqlcmd is available
    $sqlcmdPath = Get-Command sqlcmd -ErrorAction SilentlyContinue
    
    if ($null -eq $sqlcmdPath) {
        Write-Host "ERROR: sqlcmd not found. Please install SQL Server Command Line Utilities." -ForegroundColor Red
        Write-Host "Download from: https://aka.ms/sqlcmd" -ForegroundColor Yellow
        exit 1
    }
    
    # Check if SQL file exists
    if (-not (Test-Path $SqlFile)) {
        Write-Host "ERROR: SQL file not found: $SqlFile" -ForegroundColor Red
        exit 1
    }
    
    # Execute the SQL script
    sqlcmd -S $ServerInstance -U $Username -P $Password -d $Database -i $SqlFile -b
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS: Script executed successfully!" -ForegroundColor Green
        Write-Host "The Model22ItemSubAccessories table has been fixed." -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Restart your backend application on the server" -ForegroundColor Yellow
        Write-Host "2. Test the Model22 withdrawal functionality" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "ERROR: Script execution failed. Check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: An exception occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
