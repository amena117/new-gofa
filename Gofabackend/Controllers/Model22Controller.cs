using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Serilog;
using Microsoft.AspNetCore.Authorization;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class Model22Controller : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public Model22Controller(ApplicationDbContext context)
        {
            _context = context;
            _context.Database.SetCommandTimeout(180); // Increased to 3 minutes
        }

        [HttpGet]
public async Task<ActionResult<IEnumerable<Model22>>> GetModel22s([FromQuery] string? role)
{
    IQueryable<Model22> query = _context.Model22s
        .Include(m => m.Items)
            .ThenInclude(i => i.WithdrawnAccessories)
                .ThenInclude(a => a.WithdrawnSubAccessories);
    
    if (!string.IsNullOrEmpty(role))
    {
        query = query.Where(m => m.Role == role);
    }
    
    var model22s = await query.ToListAsync();
    Log.Information("Fetched {Count} Model22 records with role filter '{Role}'", model22s.Count, role ?? "none");
    return Ok(model22s);
}

    [HttpGet("{id}")]
public async Task<ActionResult<Model22>> GetModel22(int id, [FromQuery] string? role)
{
    var query = _context.Model22s
        .Include(m => m.Items)
            .ThenInclude(i => i.WithdrawnAccessories)
                .ThenInclude(a => a.WithdrawnSubAccessories)
        .Where(m => m.Model22Id == id);
    
    if (!string.IsNullOrEmpty(role))
    {
        query = query.Where(m => m.Role == role);
    }
    
    var model22 = await query.FirstOrDefaultAsync();
    
    if (model22 == null)
    {
        Log.Error("Model22 record not found for ID {Model22Id}", id);
        return NotFound(new { success = false, message = $"Model22 record not found for ID {id}." });
    }
    
    return Ok(model22);
}
     [HttpGet("filter")]
public async Task<ActionResult<IEnumerable<Model22>>> FilterModel22s(
    [FromQuery] string? search,
    [FromQuery] string? period,
    [FromQuery] string[]? roles,
    [FromQuery] string? role, // Keep backward compatibility
    [FromQuery] string? voucherNumber)
{
    try
    {
        IQueryable<Model22> query = _context.Model22s
            .Include(m => m.Items)
                .ThenInclude(i => i.WithdrawnAccessories)
                    .ThenInclude(a => a.WithdrawnSubAccessories);

        // Handle legacy 'role' parameter (single role)
        if (!string.IsNullOrEmpty(role))
        {
            query = query.Where(m => m.Role == role);
        }

        // Handle new 'roles' parameter (multiple roles)
        if (roles != null && roles.Any())
        {
            var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART", "SUPPLY_AND_DISTRIBUTION_TEAMLEADER" }, StringComparer.OrdinalIgnoreCase);
            var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();

            if (invalidRoles.Any())
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART, SUPPLY_AND_DISTRIBUTION_TEAMLEADER."
                });
            }

            query = query.Where(m => roles.Select(r => r.ToUpper()).Contains(m.Role.ToUpper()));
        }

        // Handle voucher number filter
        if (!string.IsNullOrEmpty(voucherNumber))
        {
            query = query.Where(m => m.VoucherNumber.Contains(voucherNumber));
        }

        // Handle search across multiple fields (including voucher number)
        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(m =>
                m.Department.Contains(searchLower) ||
                m.RecipientName.Contains(searchLower) ||
                m.RecipientOrganization.Contains(searchLower) ||
                m.EthiopianDate.Contains(searchLower) ||
                m.RegisteredBy.Contains(searchLower) ||
                m.VoucherNumber.Contains(searchLower) ||
                m.Items.Any(i =>
                    i.Description.Contains(searchLower) ||
                    i.Model.Contains(searchLower) ||
                    i.Currency.Contains(searchLower)
                )
            );
        }

        // Handle date filtering (period)
        if (!string.IsNullOrEmpty(period))
        {
            DateTime now = DateTime.UtcNow.AddHours(3);
            DateTime lowerBound;

            switch (period.ToLower())
            {
                case "1week":
                    lowerBound = now.AddDays(-7);
                    break;
                case "1month":
                    lowerBound = now.AddMonths(-1);
                    break;
                case "3months":
                    lowerBound = now.AddMonths(-3);
                    break;
                case "6months":
                    lowerBound = now.AddMonths(-6);
                    break;
                case "9months":
                    lowerBound = now.AddMonths(-9);
                    break;
                case "1year":
                    lowerBound = now.AddYears(-1);
                    break;
                default:
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid period. Allowed values: 1week, 1month, 3months, 6months, 9months, 1year."
                    });
            }

            var allRecords = await query.ToListAsync();

            var filteredRecords = allRecords
                .Where(m => EthiopianCalendarConverter.TryParseEthiopianDate(m.EthiopianDate, out DateTime gregorianDate)
                            && gregorianDate >= lowerBound
                            && gregorianDate <= now)
                .ToList();

            Log.Information("Filtered Model22 records by search='{Search}', period='{Period}', roles={Roles}, voucher='{Voucher}', Count={Count}",
                search ?? "(none)", period ?? "(none)", roles?.Length ?? 0, voucherNumber ?? "(none)", filteredRecords.Count);

            return Ok(filteredRecords);
        }
        else
        {
            var result = await query.ToListAsync();
            Log.Information("Filtered Model22 records by search='{Search}', roles={Roles}, voucher='{Voucher}', Count={Count}",
                search ?? "(none)", roles?.Length ?? 0, voucherNumber ?? "(none)", result.Count);
            return Ok(result);
        }
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error filtering Model22 records: Search={Search}, Period={Period}, Roles={Roles}, Voucher={Voucher}",
            search, period, roles?.Length ?? 0, voucherNumber);
        return StatusCode(500, new
        {
            success = false,
            message = "Internal server error during filtering.",
            detailedMessage = ex.Message
        });
    }
}
[HttpGet("filter-by-date")]
public async Task<ActionResult<IEnumerable<Model22>>> GetModel22sByDateRange([FromQuery] string period)
{
    try
    {
        DateTime now = DateTime.UtcNow.AddHours(3);
        DateTime lowerBound;

        // Define supported periods and their date ranges
        switch (period.ToLower())
        {
            case "1week":
                lowerBound = now.AddDays(-7);
                break;
            case "1month":
                lowerBound = now.AddMonths(-1);
                break;
            case "3months":
                lowerBound = now.AddMonths(-3);
                break;
            case "6months":
                lowerBound = now.AddMonths(-6);
                break;
            case "9months":
                lowerBound = now.AddMonths(-9);
                break;
            case "1year":
                lowerBound = now.AddYears(-1);
                break;
            default:
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid period. Allowed values: 1week, 1month, 3months, 6months, 9months, 1year."
                });
        }

        // Fetch ALL records (we're filtering in-memory due to EthiopianDate being a string)
        var allModel22s = await _context.Model22s
            .Include(m => m.Items)
                .ThenInclude(i => i.WithdrawnAccessories) // Include accessories
            .ToListAsync();

        // Filter in-memory using our helper method
        var filteredModel22s = allModel22s
            .Where(m => EthiopianCalendarConverter.TryParseEthiopianDate(m.EthiopianDate, out DateTime gregorianDate) 
                        && gregorianDate >= lowerBound 
                        && gregorianDate <= now)
            .ToList();

        Log.Information("Filtered Model22 records by period: {Period}, Count: {Count}", period, filteredModel22s.Count);
        return Ok(filteredModel22s);
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error filtering Model22 records by date period: {Period}", period);
        return StatusCode(500, new
        {
            success = false,
            message = "Internal error filtering by date.",
            detailedMessage = ex.Message
        });
    }
}
private static bool TryParseEthiopianDate(string ethiopianDate, out DateTime gregorianDate)
{
    gregorianDate = DateTime.MinValue;

    if (string.IsNullOrWhiteSpace(ethiopianDate))
        return false;

    try
    {
        // Expected format: "ነሐሴ 1, 2017" or "ነሐሴ 1,2017"
        var parts = ethiopianDate.Split(',');
        if (parts.Length != 2) return false;

        var monthDay = parts[0].Trim();
        var yearStr = parts[1].Trim();

        if (!int.TryParse(yearStr, out int year)) return false;

        // Split month and day (handle "ነሐሴ 1" → split on space)
        var monthDayParts = monthDay.Split(' ');
        if (monthDayParts.Length < 2) return false;

        string amharicMonth = monthDayParts[0];
        if (!int.TryParse(monthDayParts[1], out int day)) return false;

        // Map Amharic months to numbers
        var monthMap = new Dictionary<string, int>
        {
            ["መስከረም"] = 1,
            ["ጥቅምት"] = 2,
            ["ህዳር"] = 3,
            ["ታህሳስ"] = 4,
            ["ጥር"] = 5,
            ["የካቲት"] = 6,
            ["መጋቢት"] = 7,
            ["ሚያዝያ"] = 8,
            ["ግንቦት"] = 9,
            ["ሰኔ"] = 10,
            ["ሐምሌ"] = 11,
            ["ነሐሴ"] = 12,
            ["ጳጉሜ"] = 13
        };

        if (!monthMap.TryGetValue(amharicMonth, out int month)) return false;

        // Convert Ethiopian date to Gregorian
        // We use the reverse logic from EthiopianCalendarConverter.GregorianToEthiopian

        // Ethiopian New Year in Gregorian: Sep 11 or 12
        bool isGregorianLeapYear = DateTime.IsLeapYear(year + 7); // approximate
        int newYearDay = isGregorianLeapYear ? 12 : 11;
        DateTime ethiopianNewYear = new DateTime(year + 7, 9, newYearDay);

        // Days since start of Ethiopian year
        int daysSinceStart = (month - 1) * 30 + (day - 1);

        // Pagumé handling
        bool isEthiopianLeapYear = (year + 1) % 4 == 0;
        if (month == 13) // Pagumé
        {
            int pagumeDays = isEthiopianLeapYear ? 6 : 5;
            if (day > pagumeDays) return false;
            daysSinceStart = 360 + (day - 1);
        }

        gregorianDate = ethiopianNewYear.AddDays(daysSinceStart);
        return true;
    }
    catch
    {
        return false;
    }
}


        [HttpPost]
public async Task<ActionResult<Model22>> PostModel22(Model22 model22)
{
    try
    {
        Log.Information("Received Model22 creation request. VoucherNumber: {VoucherNumber}", model22.VoucherNumber);

        // Initialize collections and defaults
        model22.Items = model22.Items ?? new List<Model22Item>();
        model22.RegisteredBy = User.Identity?.Name ?? "Anonymous";
        
        // Validate required fields including VoucherNumber
        if (string.IsNullOrEmpty(model22.Department) || string.IsNullOrEmpty(model22.RecipientName) ||
            string.IsNullOrEmpty(model22.RecipientOrganization) || string.IsNullOrEmpty(model22.Role) ||
            string.IsNullOrEmpty(model22.VoucherNumber))
        {
            Log.Warning("Invalid Model22 payload: Missing required fields.");
            return BadRequest(new
            {
                success = false,
                message = "Missing required fields: Department, RecipientName, RecipientOrganization, Role, or VoucherNumber."
            });
        }

        // Validate VoucherNumber format
        // if (!System.Text.RegularExpressions.Regex.IsMatch(model22.VoucherNumber, @"^M22-\d{3,}$"))
        // {
        //     Log.Warning("Invalid VoucherNumber format: {VoucherNumber}", model22.VoucherNumber);
        //     return BadRequest(new
        //     {
        //         success = false,
        //         message = "VoucherNumber must be in format: M22-XXX (e.g., M22-001)"
        //     });
        // }

        // Check if VoucherNumber already exists
        var existingVoucher = await _context.Model22s
            .FirstOrDefaultAsync(m => m.VoucherNumber == model22.VoucherNumber);
        if (existingVoucher != null)
        {
            Log.Warning("Duplicate VoucherNumber: {VoucherNumber}", model22.VoucherNumber);
            return BadRequest(new
            {
                success = false,
                message = $"VoucherNumber {model22.VoucherNumber} already exists."
            });
        }

        // Validate items
        if (!model22.Items.Any())
        {
            Log.Warning("Model22 payload contains no items.");
            return BadRequest(new { success = false, message = "At least one item is required." });
        }

        foreach (var item in model22.Items)
        {
            item.Model22 = model22;
            item.Currency = string.IsNullOrEmpty(item.Currency) ? "ETB" : item.Currency;
            
            if (item.Quantity <= 0)
            {
                Log.Warning("Invalid item in Model22: {Description}, Quantity: {Quantity}",
                    item.Description, item.Quantity);
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid item {item.Description}: Quantity must be greater than 0."
                });
            }
            
            if (item.Currency != "FOC" && item.UnitPrice <= 0)
            {
                Log.Warning("Invalid item in Model22: {Description}, UnitPrice: {UnitPrice}, Currency: {Currency}",
                    item.Description, item.UnitPrice, item.Currency);
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid item {item.Description}: UnitPrice must be greater than 0 unless currency is FOC."
                });
            }
            
            if (item.Currency == "FOC")
            {
                item.UnitPrice = 0;
            }
        }

        // Validate ModelState - Remove Model22 navigation property validation errors
        var keysToRemove = ModelState.Keys.Where(k => k.Contains(".Model22") || k.Contains("Model22")).ToList();
        foreach (var key in keysToRemove)
        {
            ModelState.Remove(key);
        }
        
        // Also remove any validation errors that mention Model22
        foreach (var modelState in ModelState.Values)
        {
            var errorsToRemove = modelState.Errors
                .Where(e => e.ErrorMessage.Contains("Model22") || e.ErrorMessage.Contains("The Model22 field is required"))
                .ToList();
            foreach (var error in errorsToRemove)
            {
                modelState.Errors.Remove(error);
            }
        }
        
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .Where(e => !string.IsNullOrEmpty(e))
                .ToList();
            if (errors.Any())
            {
                Log.Warning("Invalid ModelState for Model22: {@Errors}", errors);
                return BadRequest(new { success = false, message = "Invalid request.", errors });
            }
        }

        // Set Ethiopian date
        var currentDate = DateTime.UtcNow.AddHours(3);
        try
        {
            var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate);
            if (string.IsNullOrEmpty(ethiopianDate))
            {
                Log.Warning("Ethiopian date conversion failed, using fallback date.");
                ethiopianDate = "ነሐሴ 1, 2017";
            }
            model22.EthiopianDate = ethiopianDate;
            Log.Information("Set EthiopianDate to {EthiopianDate}", ethiopianDate);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to convert Ethiopian date for {Date}", currentDate);
            return StatusCode(500, new
            {
                success = false,
                message = "Failed to convert Ethiopian date.",
                detailedMessage = ex.Message,
                stackTrace = ex.StackTrace
            });
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        
        foreach (var model22Item in model22.Items)
        {
            Log.Information("Processing item: Description={Description}, Model={Model}, Quantity={Quantity}, Currency={Currency}, SerialNumbers={SerialNumbers}",
                model22Item.Description, model22Item.Model, model22Item.Quantity, model22Item.Currency, model22Item.SerialNumbers);

            var item = await _context.Items
                .Include(i => i.SerialNumbers)
                .Include(i => i.TransactionHistory)
                .FirstOrDefaultAsync(i => i.Description == model22Item.Description && i.Model == model22Item.Model);

            if (item == null)
            {
                Log.Error("Item not found: Description={Description}, Model={Model}", model22Item.Description, model22Item.Model);
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    success = false,
                    message = $"Item {model22Item.Description} (Model: {model22Item.Model}) not found in database."
                });
            }

            if (item.Quantity < model22Item.Quantity)
            {
                Log.Error("Insufficient quantity for item {Description}. Requested: {Requested}, Available: {Available}",
                    model22Item.Description, model22Item.Quantity, item.Quantity);
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    success = false,
                    message = $"Insufficient quantity for {model22Item.Description}. Available: {item.Quantity}"
                });
            }

            if (model22Item.SerialNumbers != null && model22Item.SerialNumbers.Any())
            {
                if (model22.Role != "SPAREPART" && model22Item.Quantity != model22Item.SerialNumbers.Count)
                {
                    Log.Error("For non-SPAREPART item {Description}, serial numbers count must match quantity.", model22Item.Description);
                    await transaction.RollbackAsync();
                    return BadRequest(new
                    {
                        success = false,
                        message = $"For non-SPAREPART item {model22Item.Description}, serial numbers count must match quantity."
                    });
                }

                foreach (var serial in model22Item.SerialNumbers)
                {
                    if (string.IsNullOrEmpty(serial))
                    {
                        Log.Error("Empty serial number provided for item {Description}", model22Item.Description);
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Empty serial number provided for {model22Item.Description}."
                        });
                    }
                    var serialNumber = item.SerialNumbers.FirstOrDefault(s => s.SerialNumber == serial);
                    if (serialNumber == null)
                    {
                        Log.Error("Serial number {Serial} not found for item {Description}", serial, model22Item.Description);
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Serial number {serial} not found for {model22Item.Description}."
                        });
                    }

                    // Handle serial number removal based on role
                    if (model22.Role == "SPAREPART")
                    {
                        // For SPAREPART: NEVER remove serial numbers - they are reused
                        // Serial numbers represent the item type, not individual units
                        var newQuantity = item.Quantity - model22Item.Quantity;
                        Log.Information("Keeping serial number {Serial} for SPAREPART item {Description} - new quantity: {NewQuantity} (serial numbers are reused)", 
                            serial, model22Item.Description, newQuantity);
                    }
                    else
                    {
                        // For non-SPAREPART: Remove serial number immediately (existing logic)
                        Log.Information("Removing serial number {Serial} for item {Description}", serial, model22Item.Description);
                        _context.ItemSerialNumbers.Remove(serialNumber);
                    }
                }
            }

            item.Quantity -= model22Item.Quantity;
            item.VoucherNumber = model22.VoucherNumber; // Use the Model22 VoucherNumber
            item.ReceivedFrom = model22.RecipientName;
            item.RegisteredBy = model22.RegisteredBy;

            var transactionEntry = new TransactionEntry
            {
                ItemId = item.ItemId,
                Action = "Withdrawn",
                Quantity = model22Item.Quantity,
                VoucherNumber = model22.VoucherNumber, // Use the Model22 VoucherNumber
                History = string.Empty,
                Details = $"Issued To: {model22.RecipientName}, Registered By: {model22.RegisteredBy}, Date: {model22.EthiopianDate}, Currency: {model22Item.Currency}, Voucher: {model22.VoucherNumber}",
                Date = model22.EthiopianDate,
                GregorianDate = currentDate,
                Model22Id = model22.Model22Id
            };

            item.TransactionHistory.Add(transactionEntry);
            _context.TransactionEntries.Add(transactionEntry);
            model22Item.SerialNumber = model22Item.SerialNumbers != null && model22Item.SerialNumbers.Any()
                ? model22Item.SerialNumbers.First()
                : null;
        }

        Log.Information("Adding Model22 to context. VoucherNumber: {VoucherNumber}", model22.VoucherNumber);
        _context.Model22s.Add(model22);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        Log.Information("Successfully created Model22 with ID {Model22Id} and VoucherNumber {VoucherNumber}", 
            model22.Model22Id, model22.VoucherNumber);

        return CreatedAtAction(nameof(GetModel22), new { id = model22.Model22Id }, new
        {
            success = true,
            message = "Model22 created successfully.",
            data = model22
        });
    }
    catch (DbUpdateException dbEx)
    {
        Log.Error(dbEx, "Database error creating Model22. VoucherNumber: {VoucherNumber}", model22.VoucherNumber);
        return StatusCode(500, new
        {
            success = false,
            message = "Database error occurred while creating Model22.",
            detailedMessage = dbEx.InnerException?.Message ?? dbEx.Message,
            stackTrace = dbEx.StackTrace
        });
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error creating Model22. VoucherNumber: {VoucherNumber}", model22.VoucherNumber);
        return StatusCode(500, new
        {
            success = false,
            message = "Server error occurred while creating Model22.",
            detailedMessage = ex.Message,
            stackTrace = ex.StackTrace
        });
    }
}


       [HttpGet("by-roles")]
public async Task<ActionResult<IEnumerable<Model22>>> GetModel22sByRoles(
    [FromQuery] string[] roles,
    [FromQuery] string? voucherNumber)
{
    try
    {
        if (roles == null || !roles.Any())
        {
            Log.Warning("No roles provided for GetModel22sByRoles");
            return BadRequest(new { success = false, message = "At least one role must be provided." });
        }

        var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART", "SUPPLY_AND_DISTRIBUTION_TEAMLEADER" }, StringComparer.OrdinalIgnoreCase);
        var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();

        if (invalidRoles.Any())
        {
            Log.Warning("Invalid roles provided: {InvalidRoles}", string.Join(", ", invalidRoles));
            return BadRequest(new { success = false, message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART, SUPPLY_AND_DISTRIBUTION_TEAMLEADER." });
        }

        var query = _context.Model22s
            .Include(m => m.Items)
                .ThenInclude(i => i.WithdrawnAccessories) // Include accessories
            .Where(m => roles.Select(r => r.ToUpper()).Contains(m.Role.ToUpper()));

        // Add voucher number filter if provided
        if (!string.IsNullOrEmpty(voucherNumber))
        {
            query = query.Where(m => m.VoucherNumber.Contains(voucherNumber));
        }

        var model22s = await query.ToListAsync();
        
        Log.Information("Fetched {Count} Model22 records for roles: {Roles}, voucher: {Voucher}", 
            model22s.Count, string.Join(", ", roles), voucherNumber ?? "(none)");
            
        return Ok(model22s);
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error fetching Model22 records for roles: {Roles}, voucher: {Voucher}", 
            string.Join(", ", roles), voucherNumber);
        return StatusCode(500, new { 
            success = false, 
            message = "Internal server error", 
            detailedMessage = ex.Message 
        });
    }
}

        [HttpPut("{id}")]
public async Task<IActionResult> PutModel22(int id, Model22 model22)
{
    if (id != model22.Model22Id)
    {
        Log.Warning("Model22 ID mismatch. Provided ID: {Id}, Payload ID: {Model22Id}", id, model22.Model22Id);
        return BadRequest(new { success = false, message = "Model22 ID mismatch." });
    }

    // Validate VoucherNumber
    if (string.IsNullOrEmpty(model22.VoucherNumber))
    {
        Log.Warning("VoucherNumber is required for update");
        return BadRequest(new { success = false, message = "VoucherNumber is required." });
    }

    // Check for duplicate VoucherNumber (excluding current record)
    var existingVoucher = await _context.Model22s
        .FirstOrDefaultAsync(m => m.VoucherNumber == model22.VoucherNumber && m.Model22Id != id);
    if (existingVoucher != null)
    {
        Log.Warning("Duplicate VoucherNumber during update: {VoucherNumber}", model22.VoucherNumber);
        return BadRequest(new
        {
            success = false,
            message = $"VoucherNumber {model22.VoucherNumber} already exists."
        });
    }

    model22.RegisteredBy = User.Identity?.Name ?? "Anonymous";
    if (!ModelState.IsValid)
    {
        Log.Warning("Invalid ModelState for PutModel22: {@Errors}", ModelState.Values.SelectMany(v => v.Errors));
        return BadRequest(new
        {
            success = false,
            message = "Invalid request.",
            errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
        });
    }

    try
    {
        var existingModel22 = await _context.Model22s
            .Include(m => m.Items)
            .FirstOrDefaultAsync(m => m.Model22Id == id);

        if (existingModel22 == null)
        {
            Log.Error("Model22 record not found for ID {Model22Id}", id);
            return NotFound(new { success = false, message = $"Model22 record not found for ID {id}." });
        }

        // Update all properties including VoucherNumber
        existingModel22.VoucherNumber = model22.VoucherNumber;
        existingModel22.Department = model22.Department;
        existingModel22.RecipientName = model22.RecipientName;
        existingModel22.RecipientOrganization = model22.RecipientOrganization;
        existingModel22.Role = model22.Role;
        existingModel22.RegisteredBy = model22.RegisteredBy;
        
        existingModel22.Items.Clear();
        foreach (var item in model22.Items)
        {
            item.Currency = item.Currency ?? "ETB";
            existingModel22.Items.Add(item);
        }
        
        var currentDate = DateTime.UtcNow.AddHours(3);
        try
        {
            existingModel22.EthiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate) ?? "ነሐሴ 1, 2017";
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to convert Ethiopian date for {Date}", currentDate);
            return StatusCode(500, new
            {
                success = false,
                message = "Failed to convert Ethiopian date.",
                detailedMessage = ex.Message
            });
        }

        _context.Entry(existingModel22).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        Log.Information("Updated Model22 record {Model22Id} with VoucherNumber {VoucherNumber}", id, model22.VoucherNumber);
        return NoContent();
    }
    catch (DbUpdateConcurrencyException)
    {
        if (!Model22Exists(id))
        {
            Log.Error("Model22 record not found for ID {Model22Id} during update", id);
            return NotFound(new { success = false, message = $"Model22 record not found for ID {id}." });
        }
        throw;
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error updating Model22 record {Model22Id} with VoucherNumber {VoucherNumber}", id, model22.VoucherNumber);
        return StatusCode(500, new
        {
            success = false,
            message = $"Server error updating Model22: {ex.Message}",
            detailedMessage = ex.Message,
            stackTrace = ex.StackTrace
        });
    }
}

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteModel22(int id)
        {
            var model22 = await _context.Model22s.FindAsync(id);
            if (model22 == null)
            {
                Log.Error("Model22 record not found for ID {Model22Id}", id);
                return NotFound(new { success = false, message = $"Model22 record not found for ID {id}." });
            }

            try
            {
                _context.Model22s.Remove(model22);
                await _context.SaveChangesAsync();
                Log.Information("Deleted Model22 record {Model22Id}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error deleting Model22 record {Model22Id}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = $"Server error deleting Model22: {ex.Message}",
                    detailedMessage = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }
        [HttpPost("with-accessories")]
public async Task<ActionResult<Model22>> PostModel22WithAccessories(Model22WithAccessoriesRequest request)
{
    try
    {
        Log.Information("Received Model22 creation request with accessories. VoucherNumber: {VoucherNumber}", request.VoucherNumber);

        // Create the main Model22 entity
        var model22 = new Model22
        {
            VoucherNumber = request.VoucherNumber,
            Department = request.Department,
            RecipientName = request.RecipientName,
            RecipientOrganization = request.RecipientOrganization,
            EthiopianDate = request.EthiopianDate,
            Role = request.Role,
            RegisteredBy = request.RegisteredBy,
            Comment = request.Comment,
            Items = new List<Model22Item>()
        };

        // Validate required fields
        if (string.IsNullOrEmpty(model22.Department) || string.IsNullOrEmpty(model22.RecipientName) ||
            string.IsNullOrEmpty(model22.RecipientOrganization) || string.IsNullOrEmpty(model22.Role) ||
            string.IsNullOrEmpty(model22.VoucherNumber))
        {
            return BadRequest(new { success = false, message = "Missing required fields." });
        }

        // Check for duplicate VoucherNumber
        var existingVoucher = await _context.Model22s
            .FirstOrDefaultAsync(m => m.VoucherNumber == model22.VoucherNumber);
        if (existingVoucher != null)
        {
            return BadRequest(new { success = false, message = $"VoucherNumber {model22.VoucherNumber} already exists." });
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        
        foreach (var itemRequest in request.Items)
        {
            // Sanitize serial numbers — remove empty/whitespace entries
            itemRequest.SerialNumbers = itemRequest.SerialNumbers?
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList() ?? new List<string>();

            var model22Item = new Model22Item
            {
                Description = itemRequest.Description,
                Model = itemRequest.Model,
                Quantity = itemRequest.Quantity,
                UnitPrice = itemRequest.UnitPrice,
                Currency = itemRequest.Currency,
                SerialNumbers = itemRequest.SerialNumbers,
                WithdrawnAccessories = new List<Model22ItemAccessory>(),
                IsAccessoryOnly = itemRequest.IsAccessoryOnly,
                ParentItemId = itemRequest.ParentItemId
            };

            // Find the actual item in database
            // In accessory-only mode, prefer lookup by ParentItemId for precision
            Item? item = null;
            if (itemRequest.IsAccessoryOnly && itemRequest.ParentItemId.HasValue)
            {
                item = await _context.Items
                    .Include(i => i.Accessories)
                        .ThenInclude(a => a.SerialNumbers)
                    .Include(i => i.Accessories)
                        .ThenInclude(a => a.SubAccessories)
                    .Include(i => i.SerialNumbers)
                    .FirstOrDefaultAsync(i => i.ItemId == itemRequest.ParentItemId.Value);
            }
            
            if (item == null)
            {
                item = await _context.Items
                    .Include(i => i.Accessories)
                        .ThenInclude(a => a.SerialNumbers)
                    .Include(i => i.Accessories)
                        .ThenInclude(a => a.SubAccessories)
                    .Include(i => i.SerialNumbers)
                    .FirstOrDefaultAsync(i => i.Description == itemRequest.Description && i.Model == itemRequest.Model);
            }

            if (item == null)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { success = false, message = $"Item {itemRequest.Description} not found." });
            }

            // Set the category from the item
            model22Item.Category = item.Category;

            // Validate accessory-only mode
            if (itemRequest.IsAccessoryOnly)
            {
                // In accessory-only mode, at least one accessory must be selected
                if (itemRequest.SelectedAccessories == null || !itemRequest.SelectedAccessories.Any())
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { success = false, message = $"Accessory-only mode requires at least one accessory to be selected for {itemRequest.Description}." });
                }
                
                Log.Information("Processing accessory-only withdrawal for item {Description} - parent item quantity will NOT be changed", itemRequest.Description);
            }
            else
            {
                // Regular mode - validate parent item quantity
                if (item.Quantity < itemRequest.Quantity)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { success = false, message = $"Insufficient quantity for {itemRequest.Description}. Available: {item.Quantity}" });
                }
            }

            // Process accessory withdrawals
            if (itemRequest.SelectedAccessories != null && itemRequest.SelectedAccessories.Any())
            {
                foreach (var accessoryRequest in itemRequest.SelectedAccessories)
                {
                    var accessory = item.Accessories.FirstOrDefault(a => a.Id == accessoryRequest.AccessoryId);
                    
                    if (accessory == null)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { success = false, message = $"Accessory with ID {accessoryRequest.AccessoryId} not found." });
                    }

                    if (accessory.Quantity < accessoryRequest.Quantity)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new { success = false, message = $"Insufficient quantity for accessory {accessory.Name}. Available: {accessory.Quantity}" });
                    }

                    // Validate accessory serial numbers if the accessory requires them
                    if (accessory.RequiresSerialNumbers)
                    {
                        if (accessoryRequest.SerialNumbers == null || !accessoryRequest.SerialNumbers.Any())
                        {
                            await transaction.RollbackAsync();
                            return BadRequest(new { success = false, message = $"Accessory {accessory.Name} requires serial numbers but none provided." });
                        }

                        if (accessoryRequest.Quantity != accessoryRequest.SerialNumbers.Count)
                        {
                            await transaction.RollbackAsync();
                            return BadRequest(new { success = false, message = $"Accessory {accessory.Name}: quantity ({accessoryRequest.Quantity}) must match serial numbers count ({accessoryRequest.SerialNumbers.Count})." });
                        }

                        // Validate that all provided serial numbers exist for this accessory
                        foreach (var serial in accessoryRequest.SerialNumbers)
                        {
                            var accessorySerial = accessory.SerialNumbers.FirstOrDefault(s => s.SerialNumber == serial);
                            if (accessorySerial == null)
                            {
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Serial number {serial} not found for accessory {accessory.Name}." });
                            }
                        }

                        // Remove accessory serial numbers (similar logic to item serial numbers)
                        foreach (var serial in accessoryRequest.SerialNumbers)
                        {
                            var accessorySerial = accessory.SerialNumbers.FirstOrDefault(s => s.SerialNumber == serial);
                            if (accessorySerial != null)
                            {
                                if (model22.Role == "SPAREPART")
                                {
                                    // For SPAREPART: Only remove serial number if accessory quantity will be 0 after withdrawal
                                    var newAccessoryQuantity = accessory.Quantity - accessoryRequest.Quantity;
                                    if (newAccessoryQuantity == 0)
                                    {
                                        Log.Information("Removing accessory serial number {Serial} for SPAREPART accessory {AccessoryName} - quantity reaching 0", serial, accessory.Name);
                                        _context.AccessorySerialNumbers.Remove(accessorySerial);
                                    }
                                    else
                                    {
                                        Log.Information("Keeping accessory serial number {Serial} for SPAREPART accessory {AccessoryName} - remaining quantity: {RemainingQuantity}", serial, accessory.Name, newAccessoryQuantity);
                                    }
                                }
                                else
                                {
                                    // For non-SPAREPART: Remove serial number immediately
                                    Log.Information("Removing accessory serial number {Serial} for accessory {AccessoryName}", serial, accessory.Name);
                                    _context.AccessorySerialNumbers.Remove(accessorySerial);
                                }
                            }
                        }
                    }

                    // ✅ CRITICAL: Store original accessory quantity BEFORE reducing it
                    int originalAccessoryQuantity = accessory.Quantity;

                    // Reduce accessory quantity
                    accessory.Quantity -= accessoryRequest.Quantity;

                    // Record the accessory withdrawal - use price/currency from request if provided
                    var withdrawnAccessory = new Model22ItemAccessory
                    {
                        AccessoryId = accessory.Id,
                        Name = accessory.Name,
                        Model = accessory.Model,
                        Quantity = accessoryRequest.Quantity,
                        UnitPrice = accessoryRequest.UnitPrice ?? accessory.UnitPrice,
                        Currency = accessoryRequest.Currency ?? accessory.Currency,
                        WithdrawnSerialNumbers = accessoryRequest.SerialNumbers ?? new List<string>(),
                        WithdrawnSubAccessories = new List<Model22ItemSubAccessory>() // ✅ Initialize sub-accessories list
                    };

                    // ✅ NEW: Automatically withdraw ALL sub-accessories with this accessory
                    if (accessory.SubAccessories != null && accessory.SubAccessories.Any())
                    {
                        Log.Information("Processing {Count} sub-accessories for accessory {AccessoryName} (Original Qty: {OriginalQty}, Withdrawing: {WithdrawQty})",
                            accessory.SubAccessories.Count, accessory.Name, originalAccessoryQuantity, accessoryRequest.Quantity);
                        
                        foreach (var subAccessory in accessory.SubAccessories)
                        {
                            Log.Information("Sub-accessory BEFORE: {Name}, Current Qty (per-unit): {CurrentQty}", 
                                subAccessory.Name, subAccessory.Quantity);
                            
                            // ✅ IMPORTANT: Sub-accessories are stored as PER-UNIT quantities in the database
                            // So we just multiply by the number of accessories being withdrawn
                            int subAccessoryQuantityToWithdraw = subAccessory.Quantity * accessoryRequest.Quantity;
                            
                            Log.Information("Sub-accessory calculation: {Name}, PerUnit: {PerUnit}, ToWithdraw: {ToWithdraw} (formula: {PerUnit} * {WithdrawQty})",
                                subAccessory.Name, subAccessory.Quantity, subAccessoryQuantityToWithdraw, 
                                subAccessory.Quantity, accessoryRequest.Quantity);
                            
                            if (subAccessoryQuantityToWithdraw > 0)
                            {
                                // Note: We don't reduce subAccessory.Quantity here because it's a per-unit value
                                // The per-unit quantity stays the same; only the parent accessory quantity changes
                                
                                Log.Information("Sub-accessory: {Name}, Per-unit qty remains: {PerUnit}", 
                                    subAccessory.Name, subAccessory.Quantity);
                                
                                // Record the sub-accessory withdrawal
                                withdrawnAccessory.WithdrawnSubAccessories.Add(new Model22ItemSubAccessory
                                {
                                    SubAccessoryId = subAccessory.Id,
                                    Name = subAccessory.Name,
                                    Quantity = subAccessoryQuantityToWithdraw,
                                    UnitPrice = subAccessory.UnitPrice,
                                    Currency = subAccessory.Currency
                                });
                                
                                Log.Information("✅ Successfully withdrew sub-accessory {SubAccessoryName} x{Quantity} (per-unit: {PerUnit}) with accessory {AccessoryName}",
                                    subAccessory.Name, subAccessoryQuantityToWithdraw, subAccessory.Quantity, accessory.Name);
                            }
                            else
                            {
                                Log.Warning("⚠️ Sub-accessory {Name} calculated withdrawal is 0 or negative - skipping", subAccessory.Name);
                            }
                        }
                    }
                    else
                    {
                        Log.Information("No sub-accessories found for accessory {AccessoryName}", accessory.Name);
                    }

                    model22Item.WithdrawnAccessories.Add(withdrawnAccessory);
                }
            }

            // Handle serial numbers BEFORE reducing quantity
            // Skip serial number handling if this is an accessory-only withdrawal
            if (!itemRequest.IsAccessoryOnly && itemRequest.SerialNumbers != null && itemRequest.SerialNumbers.Any())
            {
                foreach (var serial in itemRequest.SerialNumbers)
                {
                    var serialNumber = item.SerialNumbers.FirstOrDefault(s => s.SerialNumber == serial);
                    if (serialNumber != null)
                    {
                        // Handle serial number removal based on role
                        if (model22.Role == "SPAREPART")
                        {
                            // For SPAREPART: Only remove serial number if quantity will be 0 after withdrawal
                            var newQuantity = item.Quantity - itemRequest.Quantity;
                            if (newQuantity == 0)
                            {
                                _context.ItemSerialNumbers.Remove(serialNumber);
                            }
                            // For SPAREPART with remaining quantity, keep the serial number
                        }
                        else
                        {
                            // For non-SPAREPART: Remove serial number immediately
                            _context.ItemSerialNumbers.Remove(serialNumber);
                        }
                    }
                }
            }

            // Process main item withdrawal (reduce quantity after serial number handling)
            // Skip quantity decrease if this is an accessory-only withdrawal
            if (!itemRequest.IsAccessoryOnly)
            {
                item.Quantity -= itemRequest.Quantity;
                Log.Information("Decreased parent item {Description} quantity by {Quantity}. New quantity: {NewQuantity}", 
                    itemRequest.Description, itemRequest.Quantity, item.Quantity);
            }
            else
            {
                Log.Information("Accessory-only mode: Skipping parent item {Description} quantity decrease", itemRequest.Description);
            }

            // Create transaction entry
            var transactionEntry = new TransactionEntry
            {
                ItemId = item.ItemId,
                Action = itemRequest.IsAccessoryOnly ? "Accessory Withdrawn" : "Withdrawn",
                Quantity = itemRequest.IsAccessoryOnly ? 0 : itemRequest.Quantity,
                VoucherNumber = model22.VoucherNumber,
                History = string.Empty,
                Details = $"Issued To: {model22.RecipientName}, Registered By: {model22.RegisteredBy}" +
                         (itemRequest.IsAccessoryOnly ? " (Accessory-Only Withdrawal)" : "") +
                         (model22Item.WithdrawnAccessories.Any() ? 
                             $", Accessories: {string.Join(", ", model22Item.WithdrawnAccessories.Select(a => $"{a.Name}({a.Quantity})"))}" : ""),
                Date = model22.EthiopianDate,
                GregorianDate = DateTime.UtcNow.AddHours(3),
                Model22Id = model22.Model22Id
            };

            _context.TransactionEntries.Add(transactionEntry);
            model22.Items.Add(model22Item);
        }

        _context.Model22s.Add(model22);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return CreatedAtAction(nameof(GetModel22), new { id = model22.Model22Id }, new
        {
            success = true,
            message = "Model22 with accessories created successfully.",
            data = model22
        });
    }
    catch (Exception ex)
    {
        var innerMsg = ex.InnerException?.InnerException?.Message 
                    ?? ex.InnerException?.Message 
                    ?? ex.Message;
        Log.Error(ex, "Error creating Model22 with accessories. Inner: {Inner}", innerMsg);
        return StatusCode(500, new { success = false, message = innerMsg, outerMessage = ex.Message });
    }
}

        [HttpGet("date")]
        public IActionResult GetCurrentEthiopianDate()
        {
            try
            {
                var currentDate = DateTime.UtcNow.AddHours(3);
                var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate) ?? "ነሐሴ 1, 2017";
                Log.Information("Fetched Ethiopian date: {EthiopianDate}", ethiopianDate);
                return Content(ethiopianDate, "text/plain");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error generating Ethiopian date");
                return StatusCode(500, new
                {
                    success = false,
                    message = $"Error generating Ethiopian date: {ex.Message}",
                    detailedMessage = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        private bool Model22Exists(int id)
        {
            return _context.Model22s.Any(e => e.Model22Id == id);
        }
    }
}