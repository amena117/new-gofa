# Manual script to insert VHF and HF items
# INSTRUCTIONS:
# 1. Make sure your backend is running (dotnet run in Gofabackend folder)
# 2. Update the $username and $password below with valid credentials
# 3. Run this script: .\insert_items_manual.ps1

$baseUrl = "http://localhost:5000"

# UPDATE THESE WITH YOUR CREDENTIALS
$username = "admin"  # Change this
$password = "admin123"  # Change this

Write-Host "=== Checking if backend is running ===" -ForegroundColor Cyan
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Options -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is NOT running!" -ForegroundColor Red
    Write-Host "Please start the backend first:" -ForegroundColor Yellow
    Write-Host "  cd Gofabackend" -ForegroundColor Gray
    Write-Host "  dotnet run" -ForegroundColor Gray
    exit 1
}

Write-Host "`n=== Logging in ===" -ForegroundColor Cyan
$loginPayload = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✓ Login successful!" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "`nPlease check:" -ForegroundColor Yellow
    Write-Host "  1. Username and password are correct" -ForegroundColor Gray
    Write-Host "  2. Backend is running on port 5000" -ForegroundColor Gray
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Function to insert item
function Insert-Item {
    param (
        [string]$Name,
        [hashtable]$ItemData
    )
    
    Write-Host "`n=== Inserting $Name ===" -ForegroundColor Cyan
    $json = $ItemData | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/items/receive" -Method Post -Body $json -Headers $headers
        Write-Host "✓ $Name inserted successfully!" -ForegroundColor Green
        Write-Host "  Item ID: $($response.itemId)" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "✗ Failed to insert $Name" -ForegroundColor Red
        $errorDetails = $_.ErrorDetails.Message
        if ($errorDetails) {
            Write-Host "  Error: $errorDetails" -ForegroundColor Yellow
        } else {
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        return $false
    }
}

# VHF Portable Radio
$vhfPortable = @{
    Category = "VHF_RADIO"
    Description = "VHF Portable Radio"
    Shelf = "A1"
    ItemColumn = "C1"
    ItemRow = "R1"
    VoucherNumber = "VHF-2024-001"
    HasVoucherNumber = $true
    ReceivedFrom = "Motorola Solutions"
    Condition = "New"
    Quantity = 5
    NumOfBox = 2
    RegisteredBy = $username
    Role = "VHF"
    Model = "Motorola XTS5000"
    WarehouseId = "WH001"
    UnitPrice = 15000.00
    Currency = "ETB"
    Source = "Purchase"
    History = "New VHF radios for field operations"
    SerialNumbers = @("VHF-SN-001", "VHF-SN-002", "VHF-SN-003", "VHF-SN-004", "VHF-SN-005")
    Accessories = @(
        @{
            Name = "VHF Antenna"
            Model = "ANT-VHF-136-174MHz"
            Quantity = 5
            UnitPrice = 500.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @()
        },
        @{
            Name = "Rechargeable Battery"
            Model = "BAT-7.4V-2200mAh"
            Quantity = 10
            UnitPrice = 800.00
            Currency = "ETB"
            RequiresSerialNumbers = $true
            SerialNumbers = @("BAT-VHF-001", "BAT-VHF-002", "BAT-VHF-003", "BAT-VHF-004", "BAT-VHF-005", "BAT-VHF-006", "BAT-VHF-007", "BAT-VHF-008", "BAT-VHF-009", "BAT-VHF-010")
            SubAccessories = @()
        },
        @{
            Name = "Desktop Charger"
            Model = "CHG-VHF-DESK"
            Quantity = 5
            UnitPrice = 1200.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @(
                @{ Name = "Power Adapter"; Quantity = 5; UnitPrice = 300.00; Currency = "ETB" },
                @{ Name = "Charging Cable"; Quantity = 5; UnitPrice = 150.00; Currency = "ETB" }
            )
        },
        @{
            Name = "Belt Clip"
            Model = "CLIP-VHF-STD"
            Quantity = 5
            UnitPrice = 200.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @()
        },
        @{
            Name = "Earpiece with Microphone"
            Model = "EAR-MIC-VHF"
            Quantity = 5
            UnitPrice = 600.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @()
        }
    )
}

$result1 = Insert-Item -Name "VHF Portable Radio" -ItemData $vhfPortable

# HF Base Station Radio
$hfBase = @{
    Category = "HF_RADIO"
    Description = "HF Base Station Radio"
    Shelf = "B2"
    ItemColumn = "C2"
    ItemRow = "R2"
    VoucherNumber = "HF-2024-001"
    HasVoucherNumber = $true
    ReceivedFrom = "Icom Inc."
    Condition = "New"
    Quantity = 3
    NumOfBox = 3
    RegisteredBy = $username
    Role = "HF"
    Model = "Icom IC-7300"
    WarehouseId = "WH001"
    UnitPrice = 45000.00
    Currency = "ETB"
    Source = "Purchase"
    History = "New HF radios for long-range communication"
    SerialNumbers = @("HF-SN-001", "HF-SN-002", "HF-SN-003")
    Accessories = @(
        @{
            Name = "HF Antenna"
            Model = "ANT-HF-1.8-30MHz"
            Quantity = 3
            UnitPrice = 3500.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @(
                @{ Name = "Antenna Mounting Kit"; Quantity = 3; UnitPrice = 800.00; Currency = "ETB" },
                @{ Name = "Coaxial Cable 20m"; Quantity = 3; UnitPrice = 1200.00; Currency = "ETB" }
            )
        },
        @{
            Name = "Power Supply Unit"
            Model = "PSU-HF-25A"
            Quantity = 3
            UnitPrice = 5000.00
            Currency = "ETB"
            RequiresSerialNumbers = $true
            SerialNumbers = @("PSU-HF-001", "PSU-HF-002", "PSU-HF-003")
            SubAccessories = @(
                @{ Name = "Power Cable"; Quantity = 3; UnitPrice = 400.00; Currency = "ETB" }
            )
        },
        @{
            Name = "Automatic Antenna Tuner"
            Model = "ATU-HF-AUTO"
            Quantity = 3
            UnitPrice = 8000.00
            Currency = "ETB"
            RequiresSerialNumbers = $true
            SerialNumbers = @("ATU-HF-001", "ATU-HF-002", "ATU-HF-003")
            SubAccessories = @()
        },
        @{
            Name = "Desktop Microphone"
            Model = "MIC-HF-DESK"
            Quantity = 3
            UnitPrice = 2500.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @()
        },
        @{
            Name = "Headset"
            Model = "HEAD-HF-PRO"
            Quantity = 3
            UnitPrice = 1800.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @()
        },
        @{
            Name = "Grounding Kit"
            Model = "GND-KIT-HF"
            Quantity = 3
            UnitPrice = 600.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @(
                @{ Name = "Ground Rod"; Quantity = 3; UnitPrice = 300.00; Currency = "ETB" },
                @{ Name = "Ground Wire 10m"; Quantity = 3; UnitPrice = 200.00; Currency = "ETB" }
            )
        }
    )
}

$result2 = Insert-Item -Name "HF Base Station Radio" -ItemData $hfBase

# VHF Mobile Radio
$vhfMobile = @{
    Category = "VHF_RADIO"
    Description = "VHF Mobile Radio"
    Shelf = "A2"
    ItemColumn = "C3"
    ItemRow = "R1"
    VoucherNumber = "VHF-MOB-2024-001"
    HasVoucherNumber = $true
    ReceivedFrom = "Kenwood Communications"
    Condition = "New"
    Quantity = 10
    NumOfBox = 5
    RegisteredBy = $username
    Role = "VHF"
    Model = "Kenwood TM-281A"
    WarehouseId = "WH001"
    UnitPrice = 12000.00
    Currency = "ETB"
    Source = "Purchase"
    History = "VHF mobile radios for vehicle fleet"
    SerialNumbers = @("VHF-MOB-001", "VHF-MOB-002", "VHF-MOB-003", "VHF-MOB-004", "VHF-MOB-005", "VHF-MOB-006", "VHF-MOB-007", "VHF-MOB-008", "VHF-MOB-009", "VHF-MOB-010")
    Accessories = @(
        @{
            Name = "Mobile Antenna"
            Model = "ANT-VHF-MAG-MOUNT"
            Quantity = 10
            UnitPrice = 800.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @(
                @{ Name = "Antenna Cable 5m"; Quantity = 10; UnitPrice = 400.00; Currency = "ETB" }
            )
        },
        @{
            Name = "Mounting Bracket"
            Model = "MNT-VHF-VEHICLE"
            Quantity = 10
            UnitPrice = 500.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @(
                @{ Name = "Mounting Screws Kit"; Quantity = 10; UnitPrice = 100.00; Currency = "ETB" }
            )
        },
        @{
            Name = "Hand Microphone"
            Model = "MIC-VHF-HAND"
            Quantity = 10
            UnitPrice = 900.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @()
        },
        @{
            Name = "DC Power Cable"
            Model = "PWR-CABLE-VHF-12V"
            Quantity = 10
            UnitPrice = 350.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @(
                @{ Name = "Inline Fuse Holder"; Quantity = 10; UnitPrice = 150.00; Currency = "ETB" }
            )
        },
        @{
            Name = "External Speaker"
            Model = "SPK-VHF-EXT"
            Quantity = 10
            UnitPrice = 600.00
            Currency = "ETB"
            RequiresSerialNumbers = $false
            SerialNumbers = @()
            SubAccessories = @()
        }
    )
}

$result3 = Insert-Item -Name "VHF Mobile Radio" -ItemData $vhfMobile

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$successCount = @($result1, $result2, $result3) | Where-Object { $_ -eq $true } | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "Successfully inserted: $successCount out of 3 items" -ForegroundColor $(if ($successCount -eq 3) { "Green" } else { "Yellow" })
