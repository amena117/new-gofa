# Test Backend Connectivity
Write-Host "Testing backend connectivity..." -ForegroundColor Cyan

# Test if backend is listening
Write-Host "`n1. Checking if backend is listening on port 2024..." -ForegroundColor Yellow
$listening = netstat -ano | findstr ":2024"
if ($listening) {
    Write-Host "✓ Backend is listening on port 2024" -ForegroundColor Green
    Write-Host $listening
} else {
    Write-Host "✗ Backend is NOT listening on port 2024" -ForegroundColor Red
    Write-Host "Please start the backend server first!" -ForegroundColor Red
    exit
}

# Test API endpoint
Write-Host "`n2. Testing API endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://10.20.38.51:2024/api/items/by-roles?roles=VHF" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 10
    
    Write-Host "✓ API endpoint responded with status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response length: $($response.Content.Length) bytes"
} catch {
    Write-Host "✗ API endpoint failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    }
}

# Test with other roles for comparison
Write-Host "`n3. Testing with HF role for comparison..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://10.20.38.51:2024/api/items/by-roles?roles=HF" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 10
    
    Write-Host "✓ HF role endpoint responded with status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ HF role endpoint also failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDiagnostics complete!" -ForegroundColor Cyan
