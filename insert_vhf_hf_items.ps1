# PowerShell script to insert VHF and HF items with accessories into the database

$baseUrl = "http://localhost:5000"

# STEP 1: Login to get JWT token
Write-Host "=== Step 1: Getting JWT Token ===" -ForegroundColor Cyan
$loginPayload = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✓ Login successful! Token obtained." -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    Write-Host "Please ensure the backend is running and credentials are correct." -ForegroundColor Yellow
    exit 1
}

# Create headers with JWT token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# STEP 2: Insert VHF Portable Radio
Write-Host "`n=== Step 2: Inserting VHF Portable Radio ===" -ForegroundColor Cyan
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
    RegisteredBy = "Admin User"
    Role = "VHF"
    Model = "Motorola XTS5000"
    WarehouseId = "WH001"
    UnitPrice = 15000.00
    Currency = "ETB"
    Source = "Purchase"
    History = "New VHF radios for field operations"
    SerialNumbers = @(
        "VHF-SN-001",
        "VHF-SN-002",
        "VHF-SN-003",
        "VHF-SN-004",
        "VHF-SN-005"
    )
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
            SerialNumbers = @(
                "BAT-VHF-001", "BAT-VHF-002", "BAT-VHF-003", "BAT-VHF-004", "BAT-VHF-005",
                "BAT-VHF-006", "BAT-VHF-007", "BAT-VHF-008", "BAT-VHF-009", "BAT-VHF-010"
            )
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
                @{
                    Name = "Power Adapter"
                    Quantity = 5
                    UnitPrice = 300.00
                    Currency = "ETB"
                },
                @{
                    Name = "Charging Cable"
                    Quantity = 5
                    UnitPrice = 150.00
                    Currency = "ETB"
                }
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
} | ConvertTo-Json -Depth 10

try {
    $vhfResponse = Invoke-RestMethod -Uri "$baseUrl/api/items/receive" -Method Post -Body $vhfPortable -Headers $headers
    Write-Host "✓ VHF Portable Radio inserted successfully!" -ForegroundColor Green
    Write-Host "  Item ID: $($vhfResponse.itemId)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to insert VHF Portable Radio: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Yellow
}

# STEP 3: Insert HF Base Station Radio
Write-Host "`n=== Step 3: Inserting HF Base Station Radio ===" -ForegroundColor Cyan
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
    RegisteredBy = "Admin User"
    Role = "HF"
    Model = "Icom IC-7300"
    WarehouseId = "WH001"
    UnitPrice = 45000.00
    Currency = "ETB"
    Source = "Purchase"
    History = "New HF radios for long-range communication"
    SerialNumbers = @(
        "HF-SN-001",
        "HF-SN-002",
        "HF-SN-003"
    )
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
                @{
                    Name = "Antenna Mounting Kit"
                    Quantity = 3
                    UnitPrice = 800.00
                    Currency = "ETB"
                },
                @{
                    Name = "Coaxial Cable 20m"
                    Quantity = 3
                    UnitPrice = 1200.00
                    Currency = "ETB"
                }
            )
        },
        @{
            Name = "Power Supply Unit"
            Model = "PSU-HF-25A"
            Quantity = 3
            UnitPrice = 5000.00
            Currency = "ETB"
            RequiresSerialNumbers = $true
            SerialNumbers = @(
                "PSU-HF-001",
                "PSU-HF-002",
                "PSU-HF-003"
            )
            SubAccessories = @(
                @{
                    Name = "Power Cable"
                    Quantity = 3
                    UnitPrice = 400.00
                    Currency = "ETB"
                }
            )
        },
        @{
            Name = "Automatic Antenna Tuner"
            Model = "ATU-HF-AUTO"
            Quantity = 3
            UnitPrice = 8000.00
            Currency = "ETB"
            RequiresSerialNumbers = $true
            SerialNumbers = @(
                "ATU-HF-001",
                "ATU-HF-002",
                "ATU-HF-003"
            )
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
                @{
                    Name = "Ground Rod"
                    Quantity = 3
                    UnitPrice = 300.00
                    Currency = "ETB"
                },
                @{
                    Name = "Ground Wire 10m"
                    Quantity = 3
                    UnitPrice = 200.00
                    Currency = "ETB"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $hfResponse = Invoke-RestMethod -Uri "$baseUrl/api/items/receive" -Method Post -Body $hfBase -Headers $headers
    Write-Host "✓ HF Base Station Radio inserted successfully!" -ForegroundColor Green
    Write-Host "  Item ID: $($hfResponse.itemId)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to insert HF Base Station Radio: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Yellow
}

# STEP 4: Insert VHF Mobile Radio
Write-Host "`n=== Step 4: Inserting VHF Mobile Radio ===" -ForegroundColor Cyan
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
    RegisteredBy = "Admin User"
    Role = "VHF"
    Model = "Kenwood TM-281A"
    WarehouseId = "WH001"
    UnitPrice = 12000.00
    Currency = "ETB"
    Source = "Purchase"
    History = "VHF mobile radios for vehicle fleet"
    SerialNumbers = @(
        "VHF-MOB-001", "VHF-MOB-002", "VHF-MOB-003", "VHF-MOB-004", "VHF-MOB-005",
        "VHF-MOB-006", "VHF-MOB-007", "VHF-MOB-008", "VHF-MOB-009", "VHF-MOB-010"
    )
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
                @{
                    Name = "Antenna Cable 5m"
                    Quantity = 10
                    UnitPrice = 400.00
                    Currency = "ETB"
                }
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
                @{
                    Name = "Mounting Screws Kit"
                    Quantity = 10
                    UnitPrice = 100.00
                    Currency = "ETB"
                }
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
                @{
                    Name = "Inline Fuse Holder"
                    Quantity = 10
                    UnitPrice = 150.00
                    Currency = "ETB"
                }
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
} | ConvertTo-Json -Depth 10

try {
    $vhfMobileResponse = Invoke-RestMethod -Uri "$baseUrl/api/items/receive" -Method Post -Body $vhfMobile -Headers $headers
    Write-Host "✓ VHF Mobile Radio inserted successfully!" -ForegroundColor Green
    Write-Host "  Item ID: $($vhfMobileResponse.itemId)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to insert VHF Mobile Radio: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Yellow
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Script execution completed!" -ForegroundColor Green
Write-Host "Check your database to verify the items were inserted correctly." -ForegroundColor Yellow
