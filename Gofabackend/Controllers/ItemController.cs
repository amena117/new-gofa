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
using Gofabackend.Dtos;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ItemsController(ApplicationDbContext context)
        {
            _context = context;
            _context.Database.SetCommandTimeout(120); // Set timeout to 2 minutes
        }

        // GET: api/items?search=xyz
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ItemListingDto>>> GetItems([FromQuery] string? search)
        {
            IQueryable<Item> query = _context.Items.AsQueryable();
            
            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(i => i.Description.ToLower().Contains(search) ||
                                        i.Category.ToLower().Contains(search) ||
                                        i.Model.ToLower().Contains(search));
            }
            
            // ✅ OPTIMIZED: Use projection instead of includes
            var items = await query
                .Select(i => new ItemListingDto
                {
                    ItemId = i.ItemId,
                    Description = i.Description,
                    Category = i.Category,
                    Model = i.Model,
                    Quantity = i.Quantity,
                    WarehouseId = i.WarehouseId,
                    Role = i.Role,
                    RegistrationDate = i.RegistrationDate,
                    RegisteredBy = i.RegisteredBy,
                    UnitPrice = i.UnitPrice,
                    Currency = i.Currency,
                    Source = i.Source,
                    Shelf = i.Shelf,
                    ItemColumn = i.ItemColumn,
                    ItemRow = i.ItemRow,
                    Condition = i.Condition,
                    VoucherNumber = i.VoucherNumber,
                    HasAccessories = i.Accessories.Any(),
                    HasSerialNumbers = i.SerialNumbers.Any(),
                    SerialNumbers = new List<ItemSerialNumber>(), // Don't load in listing - load on demand
                    SerialNumbersCount = i.SerialNumbers.Count,
                    // Populate full accessories list WITH serial numbers for withdrawal form
                    // Exclude standalone accessories from parent item's accessories list
                    Accessories = i.Accessories.Where(a => !a.IsStandalone).Select(a => new Accessory
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Model = a.Model,
                        Quantity = a.Quantity,
                        UnitPrice = a.UnitPrice,
                        Currency = a.Currency,
                        RequiresSerialNumbers = a.RequiresSerialNumbers,
                        ItemId = a.ItemId,
                        SerialNumbers = a.SerialNumbers.ToList()
                    }).ToList(),
                    LatestTransactionDate = i.TransactionHistory
                        .OrderByDescending(th => th.GregorianDate)
                        .Select(th => th.GregorianDate)
                        .FirstOrDefault()
                })
                .OrderByDescending(i => i.LatestTransactionDate)
                .ToListAsync();

            // Get standalone accessories and add them to the list
            var standaloneAccessories = await _context.Accessories
                .Where(a => a.IsStandalone)
                .Include(a => a.Item)
                .Select(a => new ItemListingDto
                {
                    ItemId = a.Id, // Use accessory ID as item ID
                    Description = a.Name,
                    Category = a.Item.Category,
                    Model = a.Model,
                    Quantity = a.Quantity,
                    WarehouseId = "ACCESSORY",
                    Role = "ACCESSORY",
                    RegistrationDate = a.Item.RegistrationDate,
                    RegisteredBy = a.Item.RegisteredBy,
                    UnitPrice = a.UnitPrice ?? 0,
                    Currency = a.Currency ?? "ETB",
                    Source = a.Item.Source,
                    Shelf = "ACC-SHELF",
                    ItemColumn = "A",
                    ItemRow = "1",
                    Condition = "N/A",
                    VoucherNumber = a.Item.VoucherNumber,
                    HasAccessories = false,
                    HasSerialNumbers = a.SerialNumbers.Any(),
                    SerialNumbers = new List<ItemSerialNumber>(), // Standalone accessories don't use item serial numbers
                    SerialNumbersCount = 0,
                    Accessories = new List<Accessory>(),
                    LatestTransactionDate = a.Item.TransactionHistory
                        .OrderByDescending(th => th.GregorianDate)
                        .Select(th => th.GregorianDate)
                        .FirstOrDefault(),
                    IsStandaloneAccessory = true, // Flag to identify standalone accessories
                    ParentItemId = a.ItemId, // Reference to parent item
                    ParentItemName = a.Item.Description != "STANDALONE_ACCESSORIES_PARENT" ? a.Item.Description : null
                })
                .ToListAsync();

            // Combine items and standalone accessories
            var combinedList = items.Concat(standaloneAccessories)
                .OrderByDescending(i => i.LatestTransactionDate)
                .ToList();
                
            Log.Information("Optimized fetch: {ItemCount} items + {AccessoryCount} standalone accessories with search '{Search}'", 
                items.Count(), standaloneAccessories.Count(), search ?? "none");
            return Ok(combinedList);
        }

        [HttpGet("receive-history/filter")]
        public async Task<ActionResult<object>> FilterReceiveHistory(
            [FromQuery] string? search,
            [FromQuery] string? period,
            [FromQuery] string[]? roles,
            [FromQuery] string[]? categories,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                IQueryable<TransactionEntry> query = _context.TransactionEntries
                    .Include(t => t.Item)
                        .ThenInclude(i => i.Accessories)
                            .ThenInclude(a => a.SerialNumbers)
                    .Include(t => t.Item)
                        .ThenInclude(i => i.Accessories)
                            .ThenInclude(a => a.SubAccessories)
                    .Where(t => t.Action == "receive");

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
                    query = query.Where(t => roles.Select(r => r.ToUpper()).Contains(t.Item.Role.ToUpper()));
                }

                if (categories != null && categories.Any())
                {
                    query = query.Where(t => categories.Select(c => c.ToUpper()).Contains(t.Item.Category.ToUpper()));
                }

                if (!string.IsNullOrEmpty(search))
                {
                    var searchLower = search.ToLower();
                    query = query.Where(t =>
                        t.Item.Description.ToLower().Contains(searchLower) ||
                        t.Item.Category.ToLower().Contains(searchLower) ||
                        t.Item.ReceivedFrom.ToLower().Contains(searchLower) ||
                        t.Item.RegisteredBy.ToLower().Contains(searchLower) ||
                        t.VoucherNumber.ToLower().Contains(searchLower) ||
                        t.Date.ToLower().Contains(searchLower)
                    );
                }

                int totalCount = await query.CountAsync();

                // Load records with accessories
                var allRecords = await query.ToListAsync();
                
                var receiveHistoryDtos = allRecords.Select(t => new ReceiveHistoryDto
                {
                    TransactionId = t.Id,
                    Category = t.Item.Category,
                    Description = t.Item.Description,
                    Model = t.Item.Model,
                    Quantity = t.Quantity,
                    VoucherNumber = t.VoucherNumber,
                    ReceivedFrom = t.Item.ReceivedFrom,
                    RegisteredBy = t.Item.RegisteredBy,
                    Date = t.Date,
                    Source = t.Item.Source,
                    UnitPrice = t.UnitPrice,
                    Currency = t.Currency,
                    // Include accessories that were added with this item
                    // Note: This shows current accessories, not historical snapshot
                    Accessories = t.Item.Accessories.Select(acc => new ReceivedAccessoryDto
                    {
                        Name = acc.Name,
                        Model = acc.Model,
                        Quantity = acc.Quantity,
                        UnitPrice = acc.UnitPrice ?? 0m,
                        Currency = acc.Currency ?? "ETB",
                        SerialNumbers = acc.SerialNumbers.Select(s => s.SerialNumber).ToList(),
                        SubAccessories = acc.SubAccessories.Select(subAcc => new ReceivedSubAccessoryDto
                        {
                            Name = subAcc.Name,
                            Quantity = subAcc.Quantity,
                            UnitPrice = subAcc.UnitPrice,
                            Currency = subAcc.Currency
                        }).ToList()
                    }).ToList()
                }).ToList();

                var filteredRecords = receiveHistoryDtos.AsEnumerable();

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
                    filteredRecords = filteredRecords
                        .Where(r => EthiopianCalendarConverter.TryParseEthiopianDate(r.Date, out DateTime gregorianDate)
                                    && gregorianDate >= lowerBound
                                    && gregorianDate <= now);
                }

                filteredRecords = filteredRecords
                    .OrderByDescending(r => EthiopianCalendarConverter.TryParseEthiopianDate(r.Date, out DateTime gd) ? gd : DateTime.MinValue)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                Log.Information("Filtered ReceiveHistory: Search='{Search}', Period='{Period}', Roles={Roles}, Categories={Categories}, Page={Page}, PageSize={PageSize}, Count={Count}, Total={Total}",
                    search ?? "(none)", period, roles?.Length ?? 0, categories?.Length ?? 0, page, pageSize, filteredRecords.Count(), totalCount);

                return Ok(new
                {
                    data = filteredRecords,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error filtering ReceiveHistory: Search={Search}, Period={Period}, Roles={Roles}, Categories={Categories}, Page={Page}, PageSize={PageSize}",
                    search, period, roles?.Length ?? 0, categories?.Length ?? 0, page, pageSize);
                return StatusCode(500, new
                {
                    success = false,
                    message = "Internal server error during filtering.",
                    detailedMessage = ex.Message
                });
            }
        }

        // GET: api/items/by-warehouse/{warehouseId}
        // DEBUG: Specific debug for by-warehouse endpoint
[HttpGet("by-warehouse-debug/{warehouseId}")]
public async Task<ActionResult> DebugByWarehouse(string warehouseId, [FromQuery] string? role = null)
{
    Console.WriteLine($"🔍 DEBUG by-warehouse: warehouseId={warehouseId}, role={role}");
    
    try
    {
        // Test 1: Basic query without navigation properties
        Console.WriteLine($"🔍 Test 1: Basic filtering...");
        var baseQuery = _context.Items
            .Where(i => i.WarehouseId == warehouseId);
            
        if (!string.IsNullOrEmpty(role))
        {
            baseQuery = baseQuery.Where(i => i.Role == role);
        }
        
        var basicResult = await baseQuery
            .Select(i => new { i.ItemId, i.Description, i.Quantity })
            .Take(3)
            .ToListAsync();
            
        Console.WriteLine($"🔍 Basic query: {basicResult.Count} items found");
        
        // Test 2: Try with Accessories navigation - SIMPLIFIED (no GroupJoin)
        Console.WriteLine($"🔍 Test 2: Testing Accessories navigation...");
        try
        {
            var withAccessories = await (from item in _context.Items
                                        where item.WarehouseId == warehouseId 
                                           && (role == null || item.Role == role)
                                        select new 
                                        {
                                            item.ItemId,
                                            AccessoryCount = _context.Accessories
                                                .Where(a => a.ItemId == item.ItemId)
                                                .Count()
                                        })
                                        .Take(3)
                                        .ToListAsync();
            Console.WriteLine($"🔍 Accessories navigation: SUCCESS");
        }
        catch (Exception ex1)
        {
            Console.WriteLine($"❌ Accessories navigation FAILED: {ex1.Message}");
        }
        
        // Test 5: SIMPLIFIED working query (no GroupJoin)
        Console.WriteLine($"🔍 Test 5: Simple working query...");
        try
        {
            var fullResult = await (from item in _context.Items
                                   where item.WarehouseId == warehouseId 
                                      && (role == null || item.Role == role)
                                   select new
                                   {
                                       item.ItemId,
                                       item.Description,
                                       HasAccessories = _context.Accessories
                                           .Any(a => a.ItemId == item.ItemId),
                                       HasSerialNumbers = _context.ItemSerialNumbers
                                           .Any(s => s.ItemId == item.ItemId),
                                       SerialCount = _context.ItemSerialNumbers
                                           .Count(s => s.ItemId == item.ItemId),
                                       LatestTransactionDate = _context.TransactionEntries
                                           .Where(t => t.ItemId == item.ItemId)
                                           .OrderByDescending(t => t.GregorianDate)
                                           .Select(t => (DateTime?)t.GregorianDate)
                                           .FirstOrDefault()
                                   })
                                   .Take(5)
                                   .ToListAsync();
            
            Console.WriteLine($"🔍 Simple query: SUCCESS - {fullResult.Count} items");
            
            return Ok(new 
            { 
                success = true,
                message = "All tests passed!",
                data = fullResult,
                diagnostics = new
                {
                    basicItemsCount = basicResult.Count,
                    warehouseId,
                    role,
                    timestamp = DateTime.UtcNow
                }
            });
        }
        catch (Exception ex4)
        {
            Console.WriteLine($"❌ Simple query FAILED: {ex4.Message}");
            throw;
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌❌❌ CRITICAL ERROR in DebugByWarehouse ❌❌❌");
        Console.WriteLine($"Message: {ex.Message}");
        
        return StatusCode(500, new 
        { 
            success = false,
            error = ex.Message,
            hint = "Replace GroupJoin with simple subqueries"
        });
    }
}





// GET: api/items/by-warehouse/{warehouseId}
[HttpGet("by-warehouse/{warehouseId}")]
public async Task<ActionResult<IEnumerable<ItemListingDto>>> GetItemsByWarehouse(string warehouseId, [FromQuery] string? role = null)
{
    try
    {
        IQueryable<Item> query = _context.Items
            .Where(i => i.WarehouseId == warehouseId);
            
        if (!string.IsNullOrEmpty(role))
        {
            query = query.Where(i => i.Role == role);
        }
        
        // ✅ Use simple subqueries instead of navigation properties
        var items = await query
            .Select(i => new ItemListingDto
            {
                ItemId = i.ItemId,
                Description = i.Description ?? string.Empty,
                Category = i.Category ?? string.Empty,
                Model = i.Model ?? string.Empty,
                Quantity = i.Quantity,
                WarehouseId = i.WarehouseId ?? string.Empty,
                Role = i.Role ?? string.Empty,
                RegistrationDate = i.RegistrationDate ?? string.Empty,
                RegisteredBy = i.RegisteredBy ?? string.Empty,
                UnitPrice = i.UnitPrice,
                Currency = i.Currency ?? "ETB",
                Source = i.Source ?? string.Empty,
                Shelf = i.Shelf ?? string.Empty,
                ItemColumn = i.ItemColumn ?? string.Empty,
                ItemRow = i.ItemRow ?? string.Empty,
                Condition = i.Condition ?? string.Empty,
                // Use direct subqueries instead of navigation properties
                HasAccessories = _context.Accessories.Any(a => a.ItemId == i.ItemId),
                HasSerialNumbers = _context.ItemSerialNumbers.Any(s => s.ItemId == i.ItemId),
                SerialNumbersCount = _context.ItemSerialNumbers.Count(s => s.ItemId == i.ItemId),
                SerialNumbers = _context.ItemSerialNumbers.Where(s => s.ItemId == i.ItemId).ToList(), // Populate for withdrawal form
                // Populate full accessories list for withdrawal form
                Accessories = _context.Accessories
                    .Where(a => a.ItemId == i.ItemId)
                    .Select(a => new Accessory
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Model = a.Model,
                        Quantity = a.Quantity,
                        UnitPrice = a.UnitPrice,
                        Currency = a.Currency,
                        RequiresSerialNumbers = a.RequiresSerialNumbers,
                        ItemId = a.ItemId,
                        SerialNumbers = _context.AccessorySerialNumbers
                            .Where(asn => asn.AccessoryId == a.Id)
                            .ToList()
                    })
                    .ToList(),
                LatestTransactionDate = _context.TransactionEntries
                    .Where(t => t.ItemId == i.ItemId)
                    .OrderByDescending(t => t.GregorianDate)
                    .Select(t => (DateTime?)t.GregorianDate)
                    .FirstOrDefault()
            })
            .OrderByDescending(i => i.LatestTransactionDate)
            .ToListAsync();
            
        Log.Information("Fetched {Count} items for warehouse {WarehouseId}", items.Count, warehouseId);
        return Ok(items);
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error in GetItemsByWarehouse for {WarehouseId}", warehouseId);
        return StatusCode(500, new { success = false, message = ex.Message });
    }
}






        // GET: api/items/by-roles?roles=VHF,HF,ELECTRONICS,SPAREPART
        [HttpGet("by-roles")]
        public async Task<ActionResult<IEnumerable<ItemListingDto>>> GetItemsByRoles([FromQuery] string[] roles)
        {
            try
            {
                Log.Information("GetItemsByRoles called with roles: {Roles}", string.Join(", ", roles ?? new string[0]));
                
                if (roles == null || !roles.Any())
                {
                    Log.Warning("No roles provided for GetItemsByRoles");
                    return BadRequest(new { success = false, message = "At least one role must be provided." });
                }
                
                var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART", "SUPPLY_AND_DISTRIBUTION_TEAMLEADER" }, StringComparer.OrdinalIgnoreCase);
                var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();
                if (invalidRoles.Any())
                {
                    Log.Warning("Invalid roles provided: {InvalidRoles}", string.Join(", ", invalidRoles));
                    return BadRequest(new { success = false, message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART, SUPPLY_AND_DISTRIBUTION_TEAMLEADER." });
                }

                // ✅ HIGHLY OPTIMIZED: Minimal data for listing, load details on demand
                // Convert roles to uppercase once for better performance
                var upperRoles = roles.Select(r => r.ToUpper()).ToList();
                
                Log.Information("Querying items with uppercase roles: {UpperRoles}", string.Join(", ", upperRoles));
                
                var items = await _context.Items
                    .Where(i => upperRoles.Contains(i.Role.ToUpper()))
                    .Select(i => new ItemListingDto
                    {
                        ItemId = i.ItemId,
                        Description = i.Description,
                        Category = i.Category,
                        Model = i.Model,
                        Quantity = i.Quantity,
                        WarehouseId = i.WarehouseId,
                        Role = i.Role,
                        RegistrationDate = i.RegistrationDate,
                        RegisteredBy = i.RegisteredBy,
                        UnitPrice = i.UnitPrice,
                        Currency = i.Currency,
                        Source = i.Source,
                        Shelf = i.Shelf,
                        ItemColumn = i.ItemColumn,
                        ItemRow = i.ItemRow,
                        Condition = i.Condition,
                        VoucherNumber = i.VoucherNumber,
                        // Load accessories and serial numbers for withdrawal form
                        HasAccessories = i.Accessories.Any(),
                        HasSerialNumbers = i.SerialNumbers.Any(),
                        SerialNumbersCount = i.SerialNumbers.Count,
                        SerialNumbers = _context.ItemSerialNumbers
                            .Where(s => s.ItemId == i.ItemId)
                            .ToList(),
                        Accessories = _context.Accessories
                            .Where(a => a.ItemId == i.ItemId && !a.IsStandalone)
                            .Select(a => new Accessory
                            {
                                Id = a.Id,
                                Name = a.Name,
                                Model = a.Model,
                                Quantity = a.Quantity,
                                UnitPrice = a.UnitPrice,
                                Currency = a.Currency,
                                RequiresSerialNumbers = a.RequiresSerialNumbers,
                                ItemId = a.ItemId,
                                SerialNumbers = _context.AccessorySerialNumbers
                                    .Where(asn => asn.AccessoryId == a.Id)
                                    .ToList(),
                                SubAccessories = _context.AccessorySubAccessories
                                    .Where(sa => sa.AccessoryId == a.Id)
                                    .ToList()
                            })
                            .ToList(),
                        // Get latest transaction date for sorting
                        LatestTransactionDate = i.TransactionHistory
                            .OrderByDescending(th => th.GregorianDate)
                            .Select(th => th.GregorianDate)
                            .FirstOrDefault()
                    })
                    .OrderByDescending(i => i.LatestTransactionDate) // ✅ Sort on database
                    .AsNoTracking() // Don't track changes for read-only query
                    .ToListAsync();

                // Get standalone accessories for the requested roles
                var standaloneAccessories = await _context.Accessories
                    .Where(a => a.IsStandalone)
                    .Include(a => a.Item)
                    .Where(a => upperRoles.Contains(a.Item.Role.ToUpper()))
                    .Select(a => new ItemListingDto
                    {
                        ItemId = a.Id, // Use accessory ID as item ID
                        Description = a.Name,
                        Category = a.Item.Category,
                        Model = a.Model,
                        Quantity = a.Quantity,
                        WarehouseId = "ACCESSORY",
                        Role = a.Item.Role,
                        RegistrationDate = a.Item.RegistrationDate,
                        RegisteredBy = a.Item.RegisteredBy,
                        UnitPrice = a.UnitPrice ?? 0,
                        Currency = a.Currency ?? "ETB",
                        Source = a.Item.Source,
                        Shelf = "ACC-SHELF",
                        ItemColumn = "A",
                        ItemRow = "1",
                        Condition = "N/A",
                        VoucherNumber = a.Item.VoucherNumber,
                        HasAccessories = false,
                        HasSerialNumbers = a.SerialNumbers.Any(),
                        SerialNumbers = new List<ItemSerialNumber>(),
                        SerialNumbersCount = 0,
                        Accessories = new List<Accessory>(),
                        LatestTransactionDate = a.Item.TransactionHistory
                            .OrderByDescending(th => th.GregorianDate)
                            .Select(th => th.GregorianDate)
                            .FirstOrDefault(),
                        IsStandaloneAccessory = true,
                        ParentItemId = a.ItemId,
                        ParentItemName = a.Item.Description != "STANDALONE_ACCESSORIES_PARENT" ? a.Item.Description : null
                    })
                    .AsNoTracking()
                    .ToListAsync();

                // Combine items and standalone accessories
                var combinedList = items.Concat(standaloneAccessories)
                    .OrderByDescending(i => i.LatestTransactionDate)
                    .ToList();
                    
                Log.Information("Optimized fetch: {Count} items + {AccessoryCount} standalone accessories for roles: {Roles}", 
                    items.Count, standaloneAccessories.Count, string.Join(", ", roles ?? new string[0]));
                return Ok(combinedList);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching items for roles: {Roles}", string.Join(", ", roles));
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }

        // GET: api/items/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Item>> GetItem(int id)
        {
            var item = await _context.Items
                .Include(i => i.SerialNumbers)
                .Include(i => i.TransactionHistory)
                .Include(i => i.Units)
                .Include(i => i.Accessories)
                    .ThenInclude(a => a.SerialNumbers)
                .Include(i => i.Accessories) // ✅ Include sub-accessories
                    .ThenInclude(a => a.SubAccessories)
                .AsSplitQuery()
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.ItemId == id);

            if (item == null)
            {
                Log.Error("Item not found for ID {ItemId}", id);
                return NotFound(new { success = false, message = "Item not found." });
            }

            // 🛑 PREVENT CIRCULAR REFERENCE & REDUCE PAYLOAD SIZE
            // Manually break the cycle: Item -> Transaction -> Item
            foreach (var t in item.TransactionHistory)
            {
                t.Item = null!; 
            }
            foreach (var u in item.Units)
            {
                u.Item = null!;
            }
            foreach (var a in item.Accessories)
            {
                // Break circular reference for accessories
                a.Item = null!;
            }

            return Ok(item);
        }

        // GET: api/items/{id}/serial-numbers - Fetch serial numbers on-demand
        [HttpGet("{id:int}/serial-numbers")]
        public async Task<ActionResult<IEnumerable<ItemSerialNumber>>> GetItemSerialNumbers(int id)
        {
            try
            {
                var serialNumbers = await _context.ItemSerialNumbers
                    .Where(s => s.ItemId == id)
                    .Select(s => new ItemSerialNumber
                    {
                        Id = s.Id,
                        ItemId = s.ItemId,
                        SerialNumber = s.SerialNumber,
                        AddedDate = s.AddedDate
                    })
                    .AsNoTracking()
                    .ToListAsync();

                Log.Information("Fetched {Count} serial numbers for item {ItemId}", serialNumbers.Count, id);
                return Ok(serialNumbers);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching serial numbers for item {ItemId}", id);
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }

        // GET: api/items/currencies
        [HttpGet("currencies")]
        public ActionResult<IEnumerable<string>> GetCurrencies()
        {
            try
            {
                var currencies = new List<string> { "ETB", "USD", "EURO", "POUND", "FOC" };
                Log.Information("Fetched {Count} currencies", currencies.Count);
                return Ok(currencies);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching currencies");
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }

        // POST: api/items/receive
        [HttpPost("receive")]
        public async Task<IActionResult> ReceiveItem([FromBody] ItemReceiveRequest request)
        {
            HttpContext.Request.EnableBuffering();
            string body = string.Empty;
            try
            {
                using (var reader = new StreamReader(HttpContext.Request.Body, encoding: System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: false, bufferSize: 1024, leaveOpen: true))
                {
                    body = await reader.ReadToEndAsync();
                    Log.Information("Raw request body: {Body}", body);
                }
            }
            catch (Exception ex)
            {
                Log.Warning("Failed to read request body: {Message}", ex.Message);
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                Log.Warning("Invalid ModelState for ReceiveItem: {@Errors}", errors);
                return BadRequest(new { success = false, message = "Invalid request.", errors });
            }

            // Check if this is a standalone accessory registration
            var isStandaloneAccessory = request.Role == "ACCESSORY" || request.WarehouseId == "ACCESSORY";
            
            if (isStandaloneAccessory)
            {
                return await HandleStandaloneAccessory(request);
            }

            if (string.IsNullOrEmpty(request.Category) || string.IsNullOrEmpty(request.Description) ||
                string.IsNullOrEmpty(request.Model) || string.IsNullOrEmpty(request.WarehouseId))
            {
                Log.Warning("Missing required fields: Category={Category}, Description={Description}, Model={Model}, WarehouseId={WarehouseId}",
                    request.Category, request.Description, request.Model, request.WarehouseId);
                return BadRequest(new { success = false, message = "Category, Description, Model, and WarehouseId are required." });
            }

            var allowedSources = new List<string> { "Purchase", "Return", "Donation", "Transfer" };
            if (!string.IsNullOrEmpty(request.Source) && !allowedSources.Contains(request.Source, StringComparer.OrdinalIgnoreCase))
            {
                Log.Warning("Invalid Source value: {Source}. Allowed values: {AllowedSources}", request.Source, string.Join(", ", allowedSources));
                return BadRequest(new { success = false, message = $"Invalid Source value: {request.Source}. Allowed values: {string.Join(", ", allowedSources)}." });
            }

            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var currentDate = DateTime.UtcNow.AddHours(3);
                var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
                    ?? throw new InvalidOperationException("Ethiopian date conversion failed");

                Log.Information("Processing item receive: Description={Description}, Model={Model}, WarehouseId={WarehouseId}, Category={Category}, Quantity={Quantity}, Source={Source}",
                    request.Description, request.Model, request.WarehouseId, request.Category, request.Quantity, request.Source);

                // Debug incoming accessories
                if (request.Accessories != null)
                {
                    foreach (var accessory in request.Accessories)
                    {
                        Log.Information("📦 INCOMING ACCESSORY - Name: {Name}, Model: {Model}, Quantity: {Quantity}, UnitPrice: {UnitPrice}, Currency: {Currency}",
                            accessory.Name, accessory.Model, accessory.Quantity, accessory.UnitPrice, accessory.Currency);
                    }
                }

                var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseId == request.WarehouseId);
                if (warehouse == null)
                {
                    Log.Warning("Warehouse with ID {WarehouseId} not found.", request.WarehouseId);
                    await transaction.RollbackAsync();
                    return BadRequest(new { success = false, message = $"Warehouse with ID {request.WarehouseId} not found." });
                }

                if (request.SerialNumbers != null && request.SerialNumbers.Any())
                {
                    // For SPAREPART, check if we're adding to an existing item first
                    Item? potentialExistingItem = null;
                    if (request.Role == "SPAREPART")
                    {
                        potentialExistingItem = await _context.Items
                            .Include(i => i.SerialNumbers)
                            .FirstOrDefaultAsync(i => i.Description == request.Description &&
                                                     i.Model == request.Model &&
                                                     i.WarehouseId == request.WarehouseId &&
                                                     i.Category == request.Category);
                    }

                    // Check for duplicate serial numbers
                    // For SPAREPART, allow reusing serial numbers that belong to the same item
                    var existingSerials = await _context.ItemSerialNumbers
                        .Where(s => request.SerialNumbers.Contains(s.SerialNumber))
                        .Select(s => new { s.SerialNumber, s.ItemId })
                        .ToListAsync();
                    
                    // Filter out serials that belong to the same item (for SPAREPART reuse)
                    var duplicateSerials = existingSerials;
                    if (request.Role == "SPAREPART" && potentialExistingItem != null)
                    {
                        duplicateSerials = existingSerials
                            .Where(s => s.ItemId != potentialExistingItem.ItemId)
                            .ToList();
                    }
                    
                    if (duplicateSerials.Any())
                    {
                        Log.Warning("Duplicate serial numbers for item {Description}: {SerialNumbers}",
                            request.Description, string.Join(", ", duplicateSerials.Select(s => s.SerialNumber)));
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Serial numbers {string.Join(", ", duplicateSerials.Select(s => s.SerialNumber))} already exist for another item."
                        });
                    }
                    if (request.Role != "SPAREPART" && request.Role != "ELECTRONICS" && request.Quantity != request.SerialNumbers.Count)
                    {
                        Log.Warning("For non-SPAREPART item {Description}, serial numbers count ({SerialCount}) does not match quantity ({Quantity}).",
                            request.Description, request.SerialNumbers.Count, request.Quantity);
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = "For non-SPAREPART and non-ELECTRONICS items, the number of serial numbers must match the quantity."
                        });
                    }
                }

                var existingItem = await _context.Items
                    .Include(i => i.SerialNumbers)
                    .Include(i => i.TransactionHistory)
                    .Include(i => i.Units)
                    .Include(i => i.Accessories)
                    .FirstOrDefaultAsync(i => i.Description == request.Description &&
                                             i.Model == request.Model &&
                                             i.WarehouseId == request.WarehouseId &&
                                             i.Category == request.Category);

                int itemId;
                if (existingItem != null)
                {
                    Log.Information("Found existing item: ItemId={ItemId}, Description={Description}, Current Quantity={Quantity}",
                        existingItem.ItemId, existingItem.Description, existingItem.Quantity);

                    existingItem.SerialNumbers ??= new List<ItemSerialNumber>();
                    existingItem.Units ??= new List<ItemUnit>();
                    existingItem.Accessories ??= new List<Accessory>();
                    existingItem.TransactionHistory ??= new List<TransactionEntry>();

                    existingItem.Quantity += request.Quantity;
                    existingItem.Shelf = request.Shelf ?? existingItem.Shelf;
                    existingItem.ItemColumn = request.ItemColumn ?? existingItem.ItemColumn;
                    existingItem.ItemRow = request.ItemRow ?? existingItem.ItemRow;
                    existingItem.Condition = request.Condition ?? existingItem.Condition;
                    existingItem.NumOfBox = request.NumOfBox ?? existingItem.NumOfBox;
                    existingItem.VoucherNumber = request.VoucherNumber ?? existingItem.VoucherNumber;
                    existingItem.ReceivedFrom = request.ReceivedFrom ?? existingItem.ReceivedFrom;
                    existingItem.RegisteredBy = request.RegisteredBy ?? existingItem.RegisteredBy;
                    existingItem.WarehouseId = request.WarehouseId;
                    existingItem.Category = request.Category;
                    existingItem.UnitPrice = request.UnitPrice > 0 ? request.UnitPrice : existingItem.UnitPrice;
                    existingItem.Currency = request.Currency ?? existingItem.Currency;
                    existingItem.Source = request.Source;
                    
                    // Append to history instead of replacing
                    if (!string.IsNullOrEmpty(request.History))
                    {
                        var newHistoryEntry = $"[{ethiopianDate}] Added {request.Quantity} units. {request.History}";
                        existingItem.History = string.IsNullOrEmpty(existingItem.History) 
                            ? newHistoryEntry 
                            : $"{existingItem.History}\n{newHistoryEntry}";
                    }
                    else
                    {
                        var newHistoryEntry = $"[{ethiopianDate}] Added {request.Quantity} units by {request.RegisteredBy}";
                        existingItem.History = string.IsNullOrEmpty(existingItem.History) 
                            ? newHistoryEntry 
                            : $"{existingItem.History}\n{newHistoryEntry}";
                    }

                    foreach (var serial in request.SerialNumbers ?? new List<string>())
                    {
                        if (!string.IsNullOrEmpty(serial))
                        {
                            // For SPAREPART, check if serial number already exists for this item
                            var existingSerial = existingItem.SerialNumbers
                                .FirstOrDefault(s => s.SerialNumber == serial);
                            
                            if (existingSerial == null)
                            {
                                // Serial number doesn't exist, add it
                                existingItem.SerialNumbers.Add(new ItemSerialNumber
                                {
                                    SerialNumber = serial,
                                    AddedDate = ethiopianDate,
                                    ItemId = existingItem.ItemId
                                });
                            }
                            else
                            {
                                Log.Information("Serial number {SerialNumber} already exists for item {ItemId}, reusing it", serial, existingItem.ItemId);
                            }
                            
                            // Check if ItemUnit already exists
                            var existingUnit = existingItem.Units
                                .FirstOrDefault(u => u.SerialNumber == serial);
                            
                            if (existingUnit == null)
                            {
                                // Unit doesn't exist, add it
                                existingItem.Units.Add(new ItemUnit
                                {
                                    SerialNumber = serial,
                                    ItemId = existingItem.ItemId
                                });
                            }
                            else
                            {
                                Log.Information("ItemUnit with serial {SerialNumber} already exists for item {ItemId}, reusing it", serial, existingItem.ItemId);
                            }
                        }
                    }

                    foreach (var accessory in request.Accessories ?? new List<AccessoryRequest>())
                    {
                        if (string.IsNullOrEmpty(accessory.Name) || string.IsNullOrEmpty(accessory.Model))
                        {
                            Log.Warning("Invalid accessory: Name={Name}, Model={Model}", accessory.Name, accessory.Model);
                            await transaction.RollbackAsync();
                            return BadRequest(new { success = false, message = "Accessory name and model cannot be empty." });
                        }

                        // Validate serial numbers for accessories that require them
                        if (accessory.RequiresSerialNumbers)
                        {
                            if (accessory.SerialNumbers == null || !accessory.SerialNumbers.Any())
                            {
                                Log.Warning("Accessory {Name} requires serial numbers but none provided", accessory.Name);
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Accessory {accessory.Name} requires serial numbers." });
                            }

                            if (accessory.Quantity != accessory.SerialNumbers.Count)
                            {
                                Log.Warning("Accessory {Name} quantity ({Quantity}) does not match serial numbers count ({SerialCount})",
                                    accessory.Name, accessory.Quantity, accessory.SerialNumbers.Count);
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Accessory {accessory.Name}: quantity ({accessory.Quantity}) must match serial numbers count ({accessory.SerialNumbers.Count})." });
                            }

                            // Check for duplicate serial numbers
                            var duplicateSerials = accessory.SerialNumbers.GroupBy(s => s).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
                            if (duplicateSerials.Any())
                            {
                                Log.Warning("Duplicate serial numbers found for accessory {Name}: {Duplicates}", accessory.Name, string.Join(", ", duplicateSerials));
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Duplicate serial numbers found for accessory {accessory.Name}: {string.Join(", ", duplicateSerials)}" });
                            }

                            // Check if serial numbers already exist in database
                            var existingAccessorySerials = await _context.AccessorySerialNumbers
                                .Where(s => accessory.SerialNumbers.Contains(s.SerialNumber))
                                .Select(s => s.SerialNumber)
                                .ToListAsync();
                            if (existingAccessorySerials.Any())
                            {
                                Log.Warning("Serial numbers already exist for accessory {Name}: {ExistingSerials}", accessory.Name, string.Join(", ", existingAccessorySerials));
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Serial numbers already exist for accessory {accessory.Name}: {string.Join(", ", existingAccessorySerials)}" });
                            }
                        }
                        
                        Log.Information("📦 ADDING ACCESSORY TO EXISTING ITEM - Name: {Name}, Model: {Model}, Quantity: {Quantity}, UnitPrice: {UnitPrice}, Currency: {Currency}, RequiresSerialNumbers: {RequiresSerialNumbers}",
                            accessory.Name, accessory.Model, accessory.Quantity, accessory.UnitPrice, accessory.Currency, accessory.RequiresSerialNumbers);

                        // Check if accessory with same name+model already exists — merge instead of duplicate
                        var existingAccessory = existingItem.Accessories
                            .FirstOrDefault(a => a.Name == accessory.Name && a.Model == accessory.Model);

                        if (existingAccessory != null)
                        {
                            Log.Information("📦 Accessory {Name} ({Model}) already exists. Merging quantity {Old}+{Add}", 
                                accessory.Name, accessory.Model, existingAccessory.Quantity, accessory.Quantity);
                            existingAccessory.Quantity += accessory.Quantity;

                            if (accessory.RequiresSerialNumbers && accessory.SerialNumbers != null)
                            {
                                foreach (var serial in accessory.SerialNumbers)
                                {
                                    if (!string.IsNullOrEmpty(serial))
                                    {
                                        existingAccessory.SerialNumbers.Add(new AccessorySerialNumber
                                        {
                                            SerialNumber = serial,
                                            AccessoryId = existingAccessory.Id
                                        });
                                    }
                                }
                            }
                        }
                        else
                        {
                            var newAccessory = new Accessory
                            {
                                Name = accessory.Name,
                                Model = accessory.Model,
                                Quantity = accessory.Quantity,
                                UnitPrice = accessory.UnitPrice ?? 0,
                                Currency = accessory.Currency ?? "ETB",
                                RequiresSerialNumbers = accessory.RequiresSerialNumbers,
                                ItemId = existingItem.ItemId,
                                SerialNumbers = new List<AccessorySerialNumber>(),
                                SubAccessories = new List<AccessorySubAccessory>()
                            };

                            if (accessory.RequiresSerialNumbers && accessory.SerialNumbers != null)
                            {
                                foreach (var serial in accessory.SerialNumbers)
                                {
                                    if (!string.IsNullOrEmpty(serial))
                                    {
                                        newAccessory.SerialNumbers.Add(new AccessorySerialNumber
                                        {
                                            SerialNumber = serial,
                                            AccessoryId = newAccessory.Id
                                        });
                                    }
                                }
                            }

                            if (accessory.SubAccessories != null && accessory.SubAccessories.Any())
                            {
                                Log.Information("📦 Adding {Count} sub-accessories to accessory {Name}", accessory.SubAccessories.Count, accessory.Name);
                                foreach (var subAcc in accessory.SubAccessories)
                                {
                                    if (!string.IsNullOrEmpty(subAcc.Name))
                                    {
                                        int perUnitQuantity = accessory.Quantity > 0 ? (int)Math.Round((decimal)subAcc.Quantity / accessory.Quantity) : subAcc.Quantity;
                                        newAccessory.SubAccessories.Add(new AccessorySubAccessory
                                        {
                                            Name = subAcc.Name,
                                            Quantity = perUnitQuantity,
                                            UnitPrice = subAcc.UnitPrice,
                                            Currency = subAcc.Currency ?? "ETB",
                                            AccessoryId = newAccessory.Id
                                        });
                                        Log.Information("  ✅ Sub-accessory added: {Name}, Per-Unit: {PerUnitQty}", subAcc.Name, perUnitQuantity);
                                    }
                                }
                            }

                            existingItem.Accessories.Add(newAccessory);
                        }
                    }

                    var transactionEntry = new TransactionEntry
                    {
                        Date = ethiopianDate,
                        GregorianDate = currentDate,
                        Action = "receive",
                        Quantity = request.Quantity,
                        UnitPrice = request.UnitPrice,
                        Currency = request.Currency ?? "ETB",
                        VoucherNumber = request.VoucherNumber ?? string.Empty,
                        Details = $"Received From: {request.ReceivedFrom ?? "unknown"}, Registered By: {request.RegisteredBy ?? "unknown"}, Source: {request.Source}, Date: {ethiopianDate}",
                        History = request.History ?? string.Empty,
                        ItemId = existingItem.ItemId
                    };

                    existingItem.TransactionHistory.Add(transactionEntry);
                    _context.TransactionEntries.Add(transactionEntry);
                    _context.Entry(existingItem).State = EntityState.Modified;
                    itemId = existingItem.ItemId;
                }
                else
                {
                    Log.Information("No existing item found. Creating new item: Description={Description}, Model={Model}, WarehouseId={WarehouseId}, Category={Category}",
                        request.Description, request.Model, request.WarehouseId, request.Category);

                    var newItem = new Item
                    {
                        Category = request.Category,
                        Description = request.Description,
                        Shelf = request.Shelf ?? string.Empty,
                        ItemColumn = request.ItemColumn ?? string.Empty,
                        ItemRow = request.ItemRow ?? string.Empty,
                        VoucherNumber = request.VoucherNumber,
                        ReceivedFrom = request.ReceivedFrom ?? string.Empty,
                        Condition = request.Condition ?? string.Empty,
                        Quantity = request.Quantity,
                        NumOfBox = request.NumOfBox,
                        RegisteredBy = request.RegisteredBy ?? string.Empty,
                        Role = request.Role ?? string.Empty,
                        Model = request.Model,
                        WarehouseId = request.WarehouseId,
                        RegistrationDate = ethiopianDate,
                        UnitPrice = request.UnitPrice,
                        Currency = request.Currency ?? "ETB",
                        Source = request.Source,
                        History = request.History ?? string.Empty,
                        SerialNumbers = new List<ItemSerialNumber>(),
                        Units = new List<ItemUnit>(),
                        Accessories = new List<Accessory>(),
                        TransactionHistory = new List<TransactionEntry>()
                    };

                    _context.Items.Add(newItem);
                    await _context.SaveChangesAsync();

                    foreach (var serial in request.SerialNumbers ?? new List<string>())
                    {
                        if (!string.IsNullOrEmpty(serial))
                        {
                            newItem.SerialNumbers.Add(new ItemSerialNumber
                            {
                                SerialNumber = serial,
                                AddedDate = ethiopianDate,
                                ItemId = newItem.ItemId
                            });
                            newItem.Units.Add(new ItemUnit
                            {
                                SerialNumber = serial,
                                ItemId = newItem.ItemId
                            });
                        }
                    }

                    foreach (var accessory in request.Accessories ?? new List<AccessoryRequest>())
                    {
                        if (string.IsNullOrEmpty(accessory.Name) || string.IsNullOrEmpty(accessory.Model))
                        {
                            Log.Warning("Invalid accessory: Name={Name}, Model={Model}", accessory.Name, accessory.Model);
                            await transaction.RollbackAsync();
                            return BadRequest(new { success = false, message = "Accessory name and model cannot be empty." });
                        }

                        // Validate serial numbers for accessories that require them
                        if (accessory.RequiresSerialNumbers)
                        {
                            if (accessory.SerialNumbers == null || !accessory.SerialNumbers.Any())
                            {
                                Log.Warning("Accessory {Name} requires serial numbers but none provided", accessory.Name);
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Accessory {accessory.Name} requires serial numbers." });
                            }

                            if (accessory.Quantity != accessory.SerialNumbers.Count)
                            {
                                Log.Warning("Accessory {Name} quantity ({Quantity}) does not match serial numbers count ({SerialCount})",
                                    accessory.Name, accessory.Quantity, accessory.SerialNumbers.Count);
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Accessory {accessory.Name}: quantity ({accessory.Quantity}) must match serial numbers count ({accessory.SerialNumbers.Count})." });
                            }

                            // Check for duplicate serial numbers
                            var duplicateSerials = accessory.SerialNumbers.GroupBy(s => s).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
                            if (duplicateSerials.Any())
                            {
                                Log.Warning("Duplicate serial numbers found for accessory {Name}: {Duplicates}", accessory.Name, string.Join(", ", duplicateSerials));
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Duplicate serial numbers found for accessory {accessory.Name}: {string.Join(", ", duplicateSerials)}" });
                            }

                            // Check if serial numbers already exist in database
                            var existingAccessorySerials = await _context.AccessorySerialNumbers
                                .Where(s => accessory.SerialNumbers.Contains(s.SerialNumber))
                                .Select(s => s.SerialNumber)
                                .ToListAsync();
                            if (existingAccessorySerials.Any())
                            {
                                Log.Warning("Serial numbers already exist for accessory {Name}: {ExistingSerials}", accessory.Name, string.Join(", ", existingAccessorySerials));
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = $"Serial numbers already exist for accessory {accessory.Name}: {string.Join(", ", existingAccessorySerials)}" });
                            }
                        }
                        
                        Log.Information("📦 ADDING ACCESSORY TO NEW ITEM - Name: {Name}, Model: {Model}, Quantity: {Quantity}, UnitPrice: {UnitPrice}, Currency: {Currency}, RequiresSerialNumbers: {RequiresSerialNumbers}",
                            accessory.Name, accessory.Model, accessory.Quantity, accessory.UnitPrice, accessory.Currency, accessory.RequiresSerialNumbers);
                        
                        var newAccessory = new Accessory
                        {
                            Name = accessory.Name,
                            Model = accessory.Model,
                            Quantity = accessory.Quantity,
                            UnitPrice = accessory.UnitPrice ?? 0,
                            Currency = accessory.Currency ?? "ETB",
                            RequiresSerialNumbers = accessory.RequiresSerialNumbers,
                            ItemId = newItem.ItemId,
                            SerialNumbers = new List<AccessorySerialNumber>(),
                            SubAccessories = new List<AccessorySubAccessory>()
                        };

                        // Add serial numbers if required
                        if (accessory.RequiresSerialNumbers && accessory.SerialNumbers != null)
                        {
                            foreach (var serial in accessory.SerialNumbers)
                            {
                                if (!string.IsNullOrEmpty(serial))
                                {
                                    newAccessory.SerialNumbers.Add(new AccessorySerialNumber
                                    {
                                        SerialNumber = serial,
                                        AccessoryId = newAccessory.Id
                                    });
                                }
                            }
                        }

                        // Add sub-accessories
                        if (accessory.SubAccessories != null && accessory.SubAccessories.Any())
                        {
                            Log.Information("📦 Adding {Count} sub-accessories to accessory {Name}", accessory.SubAccessories.Count, accessory.Name);
                            foreach (var subAcc in accessory.SubAccessories)
                            {
                                if (!string.IsNullOrEmpty(subAcc.Name))
                                {
                                    // Calculate per-unit quantity: total sub-accessory qty ÷ accessory qty
                                    int perUnitQuantity = accessory.Quantity > 0 ? (int)Math.Round((decimal)subAcc.Quantity / accessory.Quantity) : subAcc.Quantity;
                                    
                                    newAccessory.SubAccessories.Add(new AccessorySubAccessory
                                    {
                                        Name = subAcc.Name,
                                        Quantity = perUnitQuantity, // Store per-unit quantity
                                        UnitPrice = subAcc.UnitPrice,
                                        Currency = subAcc.Currency ?? "ETB",
                                        AccessoryId = newAccessory.Id
                                    });
                                    Log.Information("  ✅ Sub-accessory added: {Name}, Total: {TotalQty}, Per-Unit: {PerUnitQty}, Price: {Price} {Currency}",
                                        subAcc.Name, subAcc.Quantity, perUnitQuantity, subAcc.UnitPrice, subAcc.Currency);
                                }
                            }
                        }

                        newItem.Accessories.Add(newAccessory);
                    }

                    var transactionEntry = new TransactionEntry
                    {
                        Date = ethiopianDate,
                        GregorianDate = currentDate,
                        Action = "receive",
                        Quantity = request.Quantity,
                        UnitPrice = request.UnitPrice,
                        Currency = request.Currency ?? "ETB",
                        VoucherNumber = request.VoucherNumber ?? string.Empty,
                        Details = $"Received From: {request.ReceivedFrom ?? "unknown"}, Registered By: {request.RegisteredBy ?? "unknown"}, Source: {request.Source}, Date: {ethiopianDate}",
                        History = request.History ?? string.Empty,
                        ItemId = newItem.ItemId
                    };

                    newItem.TransactionHistory.Add(transactionEntry);
                    _context.TransactionEntries.Add(transactionEntry);
                    itemId = newItem.ItemId;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                Log.Information("Transaction committed for ItemId={ItemId}, Quantity={Quantity}, Source={Source}", itemId, request.Quantity, request.Source);
                return Ok(new { success = true, message = "Item received successfully.", itemId });
            }
            catch (DbUpdateException dbEx)
            {
                Log.Error(dbEx, "Database error during receive: Description={Description}, InnerException={InnerException}",
                    request.Description, dbEx.InnerException?.Message);
                await _context.Database.CurrentTransaction?.RollbackAsync();
                return StatusCode(500, new
                {
                    success = false,
                    message = "Database error occurred while saving the item.",
                    detailedMessage = dbEx.InnerException?.Message ?? dbEx.Message
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error receiving item: Description={Description}, Message={Message}", request.Description, ex.Message);
                await _context.Database.CurrentTransaction?.RollbackAsync();
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while saving the item.",
                    detailedMessage = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        // Helper method to handle standalone accessory registration
        private async Task<IActionResult> HandleStandaloneAccessory(ItemReceiveRequest request)
        {
            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var currentDate = DateTime.UtcNow.AddHours(3);
                var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
                    ?? throw new InvalidOperationException("Ethiopian date conversion failed");

                Log.Information("Processing standalone accessory: Name={Description}, Model={Model}, Quantity={Quantity}",
                    request.Description, request.Model, request.Quantity);

                // Find or create a dummy parent item for standalone accessories
                // This allows us to reuse the existing Accessory structure
                var parentItem = await _context.Items
                    .Include(i => i.Accessories)
                    .FirstOrDefaultAsync(i => i.Description == "STANDALONE_ACCESSORIES_PARENT" && 
                                             i.WarehouseId == "ACCESSORY");

                if (parentItem == null)
                {
                    // Create a special parent item for all standalone accessories
                    parentItem = new Item
                    {
                        Category = request.Category,
                        Description = "STANDALONE_ACCESSORIES_PARENT",
                        Shelf = "ACC-SHELF",
                        ItemColumn = "A",
                        ItemRow = "1",
                        VoucherNumber = null,
                        ReceivedFrom = "System",
                        Condition = "N/A",
                        Quantity = 0, // Parent has no quantity
                        NumOfBox = null,
                        RegisteredBy = "System",
                        Role = "ACCESSORY",
                        Model = "PARENT",
                        WarehouseId = "ACCESSORY",
                        RegistrationDate = ethiopianDate,
                        UnitPrice = 0,
                        Currency = "ETB",
                        Source = "System",
                        History = "Parent item for standalone accessories",
                        SerialNumbers = new List<ItemSerialNumber>(),
                        Units = new List<ItemUnit>(),
                        Accessories = new List<Accessory>(),
                        TransactionHistory = new List<TransactionEntry>()
                    };

                    _context.Items.Add(parentItem);
                    await _context.SaveChangesAsync();
                    Log.Information("Created parent item for standalone accessories: ItemId={ItemId}", parentItem.ItemId);
                }

                // Create the standalone accessory
                var standaloneAccessory = new Accessory
                {
                    Name = request.Description,
                    Model = request.Model,
                    Quantity = request.Quantity,
                    UnitPrice = request.UnitPrice,
                    Currency = request.Currency ?? "ETB",
                    RequiresSerialNumbers = false, // Standalone accessories don't require serial numbers for now
                    IsStandalone = true, // Mark as standalone
                    ItemId = parentItem.ItemId,
                    SerialNumbers = new List<AccessorySerialNumber>()
                };

                parentItem.Accessories.Add(standaloneAccessory);
                await _context.SaveChangesAsync();

                // Create transaction entry for the parent item
                var transactionEntry = new TransactionEntry
                {
                    Date = ethiopianDate,
                    GregorianDate = currentDate,
                    Action = "receive",
                    Quantity = request.Quantity,
                    UnitPrice = request.UnitPrice,
                    Currency = request.Currency ?? "ETB",
                    VoucherNumber = request.VoucherNumber ?? string.Empty,
                    Details = $"Standalone Accessory: {request.Description}, Received From: {request.ReceivedFrom ?? "unknown"}, Registered By: {request.RegisteredBy ?? "unknown"}, Source: {request.Source}, Date: {ethiopianDate}",
                    History = request.History ?? string.Empty,
                    ItemId = parentItem.ItemId
                };

                _context.TransactionEntries.Add(transactionEntry);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                Log.Information("Standalone accessory registered successfully: AccessoryId={AccessoryId}, Name={Name}",
                    standaloneAccessory.Id, standaloneAccessory.Name);

                return Ok(new
                {
                    success = true,
                    message = "Standalone accessory registered successfully.",
                    accessoryId = standaloneAccessory.Id,
                    itemId = parentItem.ItemId
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error registering standalone accessory: Name={Description}, Message={Message}",
                    request.Description, ex.Message);
                await _context.Database.CurrentTransaction?.RollbackAsync();
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while registering the standalone accessory.",
                    detailedMessage = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        // POST: api/items/bulk-receive
        [HttpPost("bulk-receive")]
        public async Task<IActionResult> BulkReceiveItems([FromBody] BulkReceiveRequest request)
        {
            HttpContext.Request.EnableBuffering();
            string body = string.Empty;
            try
            {
                using (var reader = new StreamReader(HttpContext.Request.Body, encoding: System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: false, bufferSize: 1024, leaveOpen: true))
                {
                    body = await reader.ReadToEndAsync();
                    Log.Information("Raw request body: {Body}", body);
                }
            }
            catch (Exception ex)
            {
                Log.Warning("Failed to read request body: {Message}", ex.Message);
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                Log.Warning("Invalid ModelState for BulkReceiveItems: {@Errors}", errors);
                return BadRequest(new { success = false, message = "Invalid request.", errors });
            }

            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var currentDate = DateTime.UtcNow.AddHours(3);
                var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
                    ?? throw new InvalidOperationException("Ethiopian date conversion failed");

                var itemIds = new List<int>();
                var allowedSources = new List<string> { "Purchase", "Return", "Donation", "Transfer" };

                foreach (var itemRequest in request.Items ?? new List<ItemReceiveRequest>())
                {
                    var effectiveReceivedFrom = !string.IsNullOrEmpty(itemRequest.ReceivedFrom)
                        ? itemRequest.ReceivedFrom
                        : request.ReceivedFrom;

                    if (string.IsNullOrEmpty(effectiveReceivedFrom))
                    {
                        Log.Warning("ReceivedFrom is required for item {Description}", itemRequest.Description);
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = $"ReceivedFrom is required for item {itemRequest.Description}."
                        });
                    }

                    if (!string.IsNullOrEmpty(itemRequest.Source) && !allowedSources.Contains(itemRequest.Source, StringComparer.OrdinalIgnoreCase))
                    {
                        Log.Warning("Invalid Source value for item {Description}: {Source}. Allowed values: {AllowedSources}",
                            itemRequest.Description, itemRequest.Source, string.Join(", ", allowedSources));
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Invalid Source value for item {itemRequest.Description}: {itemRequest.Source}. Allowed values: {string.Join(", ", allowedSources)}."
                        });
                    }

                    var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseId == itemRequest.WarehouseId);
                    if (warehouse == null)
                    {
                        Log.Warning("Warehouse with ID {WarehouseId} not found for item {Description}", itemRequest.WarehouseId, itemRequest.Description);
                        await transaction.RollbackAsync();
                        return BadRequest(new { success = false, message = $"Warehouse with ID {itemRequest.WarehouseId} not found." });
                    }

                    if (itemRequest.SerialNumbers != null && itemRequest.SerialNumbers.Any())
                    {
                        // For SPAREPART, check if we're adding to an existing item first
                        Item? potentialExistingItem = null;
                        if (itemRequest.Role == "SPAREPART")
                        {
                            potentialExistingItem = await _context.Items
                                .Include(i => i.SerialNumbers)
                                .FirstOrDefaultAsync(i => i.Description == itemRequest.Description &&
                                                         i.Model == itemRequest.Model &&
                                                         i.WarehouseId == itemRequest.WarehouseId &&
                                                         i.Category == itemRequest.Category);
                        }

                        // Check for duplicate serial numbers
                        // For SPAREPART, allow reusing serial numbers that belong to the same item
                        var existingSerials = await _context.ItemSerialNumbers
                            .Where(s => itemRequest.SerialNumbers.Contains(s.SerialNumber))
                            .Select(s => new { s.SerialNumber, s.ItemId })
                            .ToListAsync();
                        
                        // Filter out serials that belong to the same item (for SPAREPART reuse)
                        var duplicateSerials = existingSerials;
                        if (itemRequest.Role == "SPAREPART" && potentialExistingItem != null)
                        {
                            duplicateSerials = existingSerials
                                .Where(s => s.ItemId != potentialExistingItem.ItemId)
                                .ToList();
                        }
                        
                        if (duplicateSerials.Any())
                        {
                            Log.Warning("Duplicate serial numbers for item {Description}: {SerialNumbers}",
                                itemRequest.Description, string.Join(", ", duplicateSerials.Select(s => s.SerialNumber)));
                            await transaction.RollbackAsync();
                            return BadRequest(new
                            {
                                success = false,
                                message = $"Serial numbers {string.Join(", ", duplicateSerials.Select(s => s.SerialNumber))} already exist for another item."
                            });
                        }
                        if (itemRequest.Role != "SPAREPART" && itemRequest.Role != "ELECTRONICS" && itemRequest.Quantity != itemRequest.SerialNumbers.Count)
                        {
                            Log.Warning("For non-SPAREPART item {Description}, serial numbers count ({SerialCount}) does not match quantity ({Quantity}).",
                                itemRequest.Description, itemRequest.SerialNumbers.Count, itemRequest.Quantity);
                            await transaction.RollbackAsync();
                            return BadRequest(new
                            {
                                success = false,
                                message = "For non-SPAREPART and non-ELECTRONICS items, the number of serial numbers must match the quantity."
                            });
                        }
                    }

                    var existingItem = await _context.Items
                        .Include(i => i.SerialNumbers)
                        .Include(i => i.TransactionHistory)
                        .Include(i => i.Units)
                        .Include(i => i.Accessories)
                        .FirstOrDefaultAsync(i => i.Description == itemRequest.Description &&
                                                 i.Model == itemRequest.Model &&
                                                 i.WarehouseId == itemRequest.WarehouseId &&
                                                 i.Category == itemRequest.Category);

                    if (existingItem != null)
                    {
                        existingItem.SerialNumbers ??= new List<ItemSerialNumber>();
                        existingItem.Units ??= new List<ItemUnit>();
                        existingItem.Accessories ??= new List<Accessory>();
                        existingItem.TransactionHistory ??= new List<TransactionEntry>();

                        existingItem.Quantity += itemRequest.Quantity;
                        existingItem.Shelf = itemRequest.Shelf ?? existingItem.Shelf;
                        existingItem.ItemColumn = itemRequest.ItemColumn ?? existingItem.ItemColumn;
                        existingItem.ItemRow = itemRequest.ItemRow ?? existingItem.ItemRow;
                        existingItem.Condition = itemRequest.Condition ?? existingItem.Condition;
                        existingItem.NumOfBox = itemRequest.NumOfBox ?? existingItem.NumOfBox;
                        existingItem.VoucherNumber = request.VoucherNumber ?? existingItem.VoucherNumber;
                        existingItem.ReceivedFrom = effectiveReceivedFrom;
                        existingItem.RegisteredBy = request.RegisteredBy ?? existingItem.RegisteredBy;
                        existingItem.WarehouseId = itemRequest.WarehouseId;
                        existingItem.Category = itemRequest.Category;
                        existingItem.UnitPrice = itemRequest.UnitPrice > 0 ? itemRequest.UnitPrice : existingItem.UnitPrice;
                        existingItem.Currency = itemRequest.Currency ?? existingItem.Currency;
                        existingItem.Source = itemRequest.Source;
                        
                        // Append to history instead of replacing
                        if (!string.IsNullOrEmpty(itemRequest.History))
                        {
                            var newHistoryEntry = $"[{ethiopianDate}] Added {itemRequest.Quantity} units. {itemRequest.History}";
                            existingItem.History = string.IsNullOrEmpty(existingItem.History) 
                                ? newHistoryEntry 
                                : $"{existingItem.History}\n{newHistoryEntry}";
                        }
                        else
                        {
                            var newHistoryEntry = $"[{ethiopianDate}] Added {itemRequest.Quantity} units by {itemRequest.RegisteredBy}";
                            existingItem.History = string.IsNullOrEmpty(existingItem.History) 
                                ? newHistoryEntry 
                                : $"{existingItem.History}\n{newHistoryEntry}";
                        }

                        foreach (var serial in itemRequest.SerialNumbers ?? new List<string>())
                        {
                            if (!string.IsNullOrEmpty(serial))
                            {
                                existingItem.SerialNumbers.Add(new ItemSerialNumber
                                {
                                    SerialNumber = serial,
                                    AddedDate = ethiopianDate,
                                    ItemId = existingItem.ItemId
                                });
                                existingItem.Units.Add(new ItemUnit
                                {
                                    SerialNumber = serial,
                                    ItemId = existingItem.ItemId
                                });
                            }
                        }

                        foreach (var accessory in itemRequest.Accessories ?? new List<AccessoryRequest>())
                        {
                            if (string.IsNullOrEmpty(accessory.Name) || string.IsNullOrEmpty(accessory.Model))
                            {
                                Log.Warning("Invalid accessory for item {Description}: Name={Name}, Model={Model}", 
                                    itemRequest.Description, accessory.Name, accessory.Model);
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = "Accessory name and model cannot be empty." });
                            }

                            // Check if accessory with same name+model already exists — merge instead of duplicate
                            var existingAccessory = existingItem.Accessories
                                .FirstOrDefault(a => a.Name == accessory.Name && a.Model == accessory.Model);

                            if (existingAccessory != null)
                            {
                                existingAccessory.Quantity += accessory.Quantity;
                            }
                            else
                            {
                                existingItem.Accessories.Add(new Accessory
                                {
                                    Name = accessory.Name,
                                    Model = accessory.Model,
                                    Quantity = accessory.Quantity,
                                    UnitPrice = accessory.UnitPrice ?? 0,
                                    Currency = accessory.Currency ?? "ETB",
                                    ItemId = existingItem.ItemId
                                });
                            }
                        }

                        var transactionEntry = new TransactionEntry
                        {
                            Date = ethiopianDate,
                            GregorianDate = currentDate,
                            Action = "receive",
                            Quantity = itemRequest.Quantity,
                            UnitPrice = itemRequest.UnitPrice,
                            Currency = itemRequest.Currency ?? "ETB",
                            VoucherNumber = request.VoucherNumber ?? string.Empty,
                            Details = $"Received From: {effectiveReceivedFrom}, Registered By: {request.RegisteredBy}, Source: {itemRequest.Source}, Date: {ethiopianDate}",
                            History = itemRequest.History ?? string.Empty,
                            ItemId = existingItem.ItemId
                        };

                        existingItem.TransactionHistory.Add(transactionEntry);
                        _context.TransactionEntries.Add(transactionEntry);
                        itemIds.Add(existingItem.ItemId);
                        _context.Entry(existingItem).State = EntityState.Modified;
                    }
                    else
                    {
                        var newItem = new Item
                        {
                            Category = itemRequest.Category,
                            Description = itemRequest.Description,
                            Shelf = itemRequest.Shelf,
                            ItemColumn = itemRequest.ItemColumn,
                            ItemRow = itemRequest.ItemRow,
                            VoucherNumber = request.VoucherNumber,
                            ReceivedFrom = effectiveReceivedFrom,
                            Condition = itemRequest.Condition,
                            Quantity = itemRequest.Quantity,
                            NumOfBox = itemRequest.NumOfBox,
                            RegisteredBy = request.RegisteredBy,
                            Role = itemRequest.Role,
                            Model = itemRequest.Model,
                            WarehouseId = itemRequest.WarehouseId,
                            RegistrationDate = ethiopianDate,
                            UnitPrice = itemRequest.UnitPrice,
                            Currency = itemRequest.Currency ?? "ETB",
                            Source = itemRequest.Source,
                            History = itemRequest.History ?? string.Empty,
                            SerialNumbers = new List<ItemSerialNumber>(),
                            Units = new List<ItemUnit>(),
                            Accessories = new List<Accessory>(),
                            TransactionHistory = new List<TransactionEntry>()
                        };

                        _context.Items.Add(newItem);
                        await _context.SaveChangesAsync();

                        foreach (var serial in itemRequest.SerialNumbers ?? new List<string>())
                        {
                            if (!string.IsNullOrEmpty(serial))
                            {
                                newItem.SerialNumbers.Add(new ItemSerialNumber
                                {
                                    SerialNumber = serial,
                                    AddedDate = ethiopianDate,
                                    ItemId = newItem.ItemId
                                });
                                newItem.Units.Add(new ItemUnit
                                {
                                    SerialNumber = serial,
                                    ItemId = newItem.ItemId
                                });
                            }
                        }

                        foreach (var accessory in itemRequest.Accessories ?? new List<AccessoryRequest>())
                        {
                            if (string.IsNullOrEmpty(accessory.Name) || string.IsNullOrEmpty(accessory.Model))
                            {
                                Log.Warning("Invalid accessory for item {Description}: Name={Name}, Model={Model}", 
                                    itemRequest.Description, accessory.Name, accessory.Model);
                                await transaction.RollbackAsync();
                                return BadRequest(new { success = false, message = "Accessory name and model cannot be empty." });
                            }
                            
                            newItem.Accessories.Add(new Accessory
                            {
                                Name = accessory.Name,
                                Model = accessory.Model,
                                Quantity = accessory.Quantity,
                                UnitPrice = accessory.UnitPrice ?? 0,
                                Currency = accessory.Currency ?? "ETB",
                                ItemId = newItem.ItemId
                            });
                        }

                        var transactionEntry = new TransactionEntry
                        {
                            Date = ethiopianDate,
                            GregorianDate = currentDate,
                            Action = "receive",
                            Quantity = itemRequest.Quantity,
                            UnitPrice = itemRequest.UnitPrice,
                            Currency = itemRequest.Currency ?? "ETB",
                            VoucherNumber = request.VoucherNumber ?? string.Empty,
                            Details = $"Received From: {effectiveReceivedFrom}, Registered By: {request.RegisteredBy}, Source: {itemRequest.Source}, Date: {ethiopianDate}",
                            History = itemRequest.History ?? string.Empty,
                            ItemId = newItem.ItemId
                        };

                        newItem.TransactionHistory.Add(transactionEntry);
                        _context.TransactionEntries.Add(transactionEntry);
                        itemIds.Add(newItem.ItemId);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                Log.Information("Bulk transaction committed. ItemIds: {ItemIds}", string.Join(", ", itemIds));
                return Ok(new { success = true, message = "Items received successfully.", itemIds });
            }
            catch (DbUpdateException dbEx)
            {
                Log.Error(dbEx, "Database error during bulk receive: InnerException={InnerException}", dbEx.InnerException?.Message);
                await _context.Database.CurrentTransaction?.RollbackAsync();
                return StatusCode(500, new
                {
                    success = false,
                    message = "Database error occurred while saving the items.",
                    detailedMessage = dbEx.InnerException?.Message ?? dbEx.Message
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error receiving bulk items: {Message}", ex.Message);
                await _context.Database.CurrentTransaction?.RollbackAsync();
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while saving the items.",
                    detailedMessage = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateItemRequest request)
        {
            if (!ModelState.IsValid || string.IsNullOrEmpty(request.EditedBy))
            {
                return BadRequest(new { success = false, message = "Invalid request or missing editor identity." });
            }

            // Get original state (unchanged)
            var originalItem = await _context.Items
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.ItemId == id);

            if (originalItem == null)
                return NotFound(new { success = false, message = "Item not found." });

            // Get the item to update (with related data if needed)
            var itemToUpdate = await _context.Items
                .Include(i => i.SerialNumbers)
                .Include(i => i.Units)
                .Include(i => i.Accessories)
                .FirstOrDefaultAsync(i => i.ItemId == id);

            if (itemToUpdate == null)
                return NotFound();

            // Apply updates only to specified fields
            if (request.Description != null) itemToUpdate.Description = request.Description;
            if (request.Category != null) itemToUpdate.Category = request.Category;
            if (request.Model != null) itemToUpdate.Model = request.Model;
            if (request.Shelf != null) itemToUpdate.Shelf = request.Shelf;
            if (request.ItemColumn != null) itemToUpdate.ItemColumn = request.ItemColumn;
            if (request.ItemRow != null) itemToUpdate.ItemRow = request.ItemRow;
            if (request.Condition != null) itemToUpdate.Condition = request.Condition;
            if (request.NumOfBox.HasValue) itemToUpdate.NumOfBox = request.NumOfBox.Value;
            if (request.VoucherNumber != null) itemToUpdate.VoucherNumber = request.VoucherNumber;
            if (request.ReceivedFrom != null) itemToUpdate.ReceivedFrom = request.ReceivedFrom;
            if (request.UnitPrice > 0) itemToUpdate.UnitPrice = request.UnitPrice;
            if (request.Currency != null) itemToUpdate.Currency = request.Currency;
            if (request.Source != null) itemToUpdate.Source = request.Source;
            if (request.WarehouseId != null) itemToUpdate.WarehouseId = request.WarehouseId;
            if (request.Role != null) itemToUpdate.Role = request.Role;

            // Generate change log
            var changeLog = ItemEditTracker.GenerateChangeLog(originalItem, itemToUpdate);

            var hasChanges = changeLog != "{}";

            if (hasChanges)
            {
                var currentDate = DateTime.UtcNow.AddHours(3); // Ethiopia time
                var ethiopianEditDate = EthiopianCalendarConverter.ToEthiopianString(currentDate) ?? "Unknown";

                var editHistory = new ItemEditHistory
                {
                    ItemId = id,
                    EditedBy = request.EditedBy,
                    EditDate = ethiopianEditDate,
                    EditGregorianDate = currentDate,
                    Changes = changeLog
                };

                _context.ItemEditHistories.Add(editHistory);
            }

            try
            {
                _context.Entry(itemToUpdate).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                Log.Information("Item {ItemId} updated by {Editor}. Changes: {Changes}", id, request.EditedBy, changeLog);
                return Ok(new { success = true, message = "Item updated successfully." });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to update item {ItemId}", id);
                return StatusCode(500, new { success = false, message = "Update failed due to an internal error.", detailedMessage = ex.Message });
            }
        }

        // POST: api/items/{id}/add-accessories
        [HttpPost("{id:int}/add-accessories")]
        public async Task<IActionResult> AddAccessoriesToItem(int id, [FromBody] AddAccessoriesRequest request)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                Log.Warning("Invalid ModelState for AddAccessoriesToItem: {@Errors}", errors);
                return BadRequest(new { success = false, message = "Invalid request.", errors });
            }

            try
            {
                // Find the existing item
                var item = await _context.Items
                    .Include(i => i.Accessories)
                        .ThenInclude(a => a.SerialNumbers)
                    .Include(i => i.Accessories)
                        .ThenInclude(a => a.SubAccessories)
                    .Include(i => i.TransactionHistory)
                    .FirstOrDefaultAsync(i => i.ItemId == id);

                if (item == null)
                {
                    Log.Warning("Item not found for ID {ItemId}", id);
                    return NotFound(new { success = false, message = "Item not found." });
                }

                var currentDate = DateTime.UtcNow.AddHours(3); // Ethiopia time
                var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate) ?? "Unknown";

                // Add accessories to the item
                foreach (var accessoryRequest in request.Accessories ?? new List<AccessoryRequest>())
                {
                    if (string.IsNullOrEmpty(accessoryRequest.Name) || string.IsNullOrEmpty(accessoryRequest.Model))
                    {
                        Log.Warning("Invalid accessory: Name={Name}, Model={Model}", accessoryRequest.Name, accessoryRequest.Model);
                        return BadRequest(new { success = false, message = "Accessory name and model cannot be empty." });
                    }

                    // Check if accessory with same name and model already exists
                    var existingAccessory = item.Accessories
                        .FirstOrDefault(a => a.Name == accessoryRequest.Name && a.Model == accessoryRequest.Model);

                    if (existingAccessory != null)
                    {
                        // Accessory exists - add to quantity and optionally update unit price
                        Log.Information("📦 Accessory {Name} ({Model}) already exists. Adding {Quantity} to existing quantity {ExistingQuantity}",
                            accessoryRequest.Name, accessoryRequest.Model, accessoryRequest.Quantity, existingAccessory.Quantity);
                        
                        int oldQuantity = existingAccessory.Quantity;
                        int newQuantity = oldQuantity + accessoryRequest.Quantity;
                        
                        existingAccessory.Quantity = newQuantity;
                        
                        // Update unit price if provided and different from existing
                        if (accessoryRequest.UnitPrice.HasValue && accessoryRequest.UnitPrice.Value != existingAccessory.UnitPrice)
                        {
                            Log.Information("📦 Updating unit price for accessory {Name} from {OldPrice} to {NewPrice}",
                                accessoryRequest.Name, existingAccessory.UnitPrice, accessoryRequest.UnitPrice.Value);
                            existingAccessory.UnitPrice = accessoryRequest.UnitPrice.Value;
                        }
                        
                        // Update currency if provided and different from existing
                        if (!string.IsNullOrEmpty(accessoryRequest.Currency) && accessoryRequest.Currency != existingAccessory.Currency)
                        {
                            Log.Information("📦 Updating currency for accessory {Name} from {OldCurrency} to {NewCurrency}",
                                accessoryRequest.Name, existingAccessory.Currency, accessoryRequest.Currency);
                            existingAccessory.Currency = accessoryRequest.Currency;
                        }
                        
                        // Add serial numbers if required
                        if (accessoryRequest.RequiresSerialNumbers && accessoryRequest.SerialNumbers != null)
                        {
                            foreach (var serialNumber in accessoryRequest.SerialNumbers)
                            {
                                if (!string.IsNullOrEmpty(serialNumber))
                                {
                                    existingAccessory.SerialNumbers.Add(new AccessorySerialNumber
                                    {
                                        SerialNumber = serialNumber,
                                        AccessoryId = existingAccessory.Id
                                    });
                                }
                            }
                        }

                        // ✅ Simple approach: Add sub-accessories to existing ones (assumes same per-unit ratio)
                        if (accessoryRequest.SubAccessories != null && accessoryRequest.SubAccessories.Any())
                        {
                            Log.Information("📦 Processing {Count} sub-accessories for existing accessory {Name}", 
                                accessoryRequest.SubAccessories.Count, accessoryRequest.Name);
                            
                            foreach (var newSubAcc in accessoryRequest.SubAccessories)
                            {
                                if (string.IsNullOrEmpty(newSubAcc.Name)) continue;
                                
                                // Calculate per-unit quantity from the NEW batch
                                int newPerUnitQuantity = accessoryRequest.Quantity > 0 ? 
                                    (int)Math.Round((decimal)newSubAcc.Quantity / accessoryRequest.Quantity) : 
                                    newSubAcc.Quantity;
                                
                                // Find existing sub-accessory with same name
                                var existingSubAcc = existingAccessory.SubAccessories
                                    .FirstOrDefault(s => s.Name.Equals(newSubAcc.Name, StringComparison.OrdinalIgnoreCase));
                                
                                if (existingSubAcc != null)
                                {
                                    // Sub-accessory exists - just keep the existing per-unit quantity
                                    // The total will automatically adjust when displayed (per-unit × accessory quantity)
                                    Log.Information("  ✅ Sub-accessory {Name} already exists with per-unit quantity {PerUnit}. Keeping existing ratio.",
                                        newSubAcc.Name, existingSubAcc.Quantity);
                                    
                                    // Optionally update price if provided
                                    if (newSubAcc.UnitPrice > 0 && newSubAcc.UnitPrice != existingSubAcc.UnitPrice)
                                    {
                                        Log.Information("  💰 Updating price for sub-accessory {Name} from {OldPrice} to {NewPrice}",
                                            newSubAcc.Name, existingSubAcc.UnitPrice, newSubAcc.UnitPrice);
                                        existingSubAcc.UnitPrice = newSubAcc.UnitPrice;
                                        existingSubAcc.Currency = newSubAcc.Currency ?? existingSubAcc.Currency;
                                    }
                                }
                                else
                                {
                                    // Sub-accessory doesn't exist - add it with the new per-unit quantity
                                    existingAccessory.SubAccessories.Add(new AccessorySubAccessory
                                    {
                                        Name = newSubAcc.Name,
                                        Quantity = newPerUnitQuantity,
                                        UnitPrice = newSubAcc.UnitPrice,
                                        Currency = newSubAcc.Currency ?? "ETB",
                                        AccessoryId = existingAccessory.Id
                                    });
                                    
                                    Log.Information("  ➕ Added new sub-accessory {Name} with per-unit quantity {PerUnit}",
                                        newSubAcc.Name, newPerUnitQuantity);
                                }
                            }
                        }
                    }
                    else
                    {
                        // Accessory doesn't exist - create new
                        Log.Information("📦 Creating new accessory {Name} ({Model}) with quantity {Quantity}",
                            accessoryRequest.Name, accessoryRequest.Model, accessoryRequest.Quantity);

                        var accessory = new Accessory
                        {
                            Name = accessoryRequest.Name,
                            Model = accessoryRequest.Model,
                            Quantity = accessoryRequest.Quantity,
                            UnitPrice = accessoryRequest.UnitPrice ?? 0,
                            Currency = accessoryRequest.Currency ?? "ETB",
                            RequiresSerialNumbers = accessoryRequest.RequiresSerialNumbers,
                            ItemId = item.ItemId,
                            SerialNumbers = new List<AccessorySerialNumber>(),
                            SubAccessories = new List<AccessorySubAccessory>()
                        };

                        // Add serial numbers if required
                        if (accessory.RequiresSerialNumbers && accessoryRequest.SerialNumbers != null)
                        {
                            foreach (var serialNumber in accessoryRequest.SerialNumbers)
                            {
                                if (!string.IsNullOrEmpty(serialNumber))
                                {
                                    accessory.SerialNumbers.Add(new AccessorySerialNumber
                                    {
                                        SerialNumber = serialNumber,
                                        AccessoryId = accessory.Id
                                    });
                                }
                            }
                        }

                        // Add sub-accessories
                        if (accessoryRequest.SubAccessories != null && accessoryRequest.SubAccessories.Any())
                        {
                            Log.Information("📦 Adding {Count} sub-accessories to accessory {Name}", accessoryRequest.SubAccessories.Count, accessoryRequest.Name);
                            foreach (var subAcc in accessoryRequest.SubAccessories)
                            {
                                if (!string.IsNullOrEmpty(subAcc.Name))
                                {
                                    // Calculate per-unit quantity: total sub-accessory qty ÷ accessory qty
                                    int perUnitQuantity = accessoryRequest.Quantity > 0 ? (int)Math.Round((decimal)subAcc.Quantity / accessoryRequest.Quantity) : subAcc.Quantity;
                                    
                                    accessory.SubAccessories.Add(new AccessorySubAccessory
                                    {
                                        Name = subAcc.Name,
                                        Quantity = perUnitQuantity, // Store per-unit quantity
                                        UnitPrice = subAcc.UnitPrice,
                                        Currency = subAcc.Currency ?? "ETB",
                                        AccessoryId = accessory.Id
                                    });
                                    Log.Information("  ✅ Sub-accessory added: {Name}, Total: {TotalQty}, Per-Unit: {PerUnitQty}, Price: {Price} {Currency}",
                                        subAcc.Name, subAcc.Quantity, perUnitQuantity, subAcc.UnitPrice, subAcc.Currency);
                                }
                            }
                        }

                        item.Accessories.Add(accessory);
                    }
                }

                // Create a transaction entry for the accessories addition
                var transactionEntry = new TransactionEntry
                {
                    Date = ethiopianDate,
                    GregorianDate = currentDate,
                    Action = "receive",
                    Quantity = 0, // Accessories don't change main item quantity
                    UnitPrice = 0,
                    Currency = "ETB",
                    VoucherNumber = request.VoucherNumber ?? string.Empty,
                    Details = $"Added accessories. Received From: {request.ReceivedFrom}, Registered By: {request.RegisteredBy}, Source: {request.Source}, Date: {ethiopianDate}",
                    History = $"Accessories added: {string.Join(", ", request.Accessories.Select(a => $"{a.Name} ({a.Model}) x{a.Quantity}"))}",
                    ItemId = item.ItemId
                };

                item.TransactionHistory.Add(transactionEntry);
                _context.TransactionEntries.Add(transactionEntry);

                await _context.SaveChangesAsync();

                Log.Information("Added {Count} accessories to item {ItemId}", request.Accessories.Count, id);
                return Ok(new { success = true, message = "Accessories added successfully." });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error adding accessories to item {ItemId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while adding accessories.",
                    detailedMessage = ex.Message
                });
            }
        }

        [HttpGet("{id:int}/edit-history")]
        public async Task<ActionResult<IEnumerable<ItemEditHistory>>> GetItemEditHistory(int id)
        {
            var history = await _context.ItemEditHistories
                .Where(h => h.ItemId == id)
                .OrderByDescending(h => h.EditGregorianDate)
                .ToListAsync();

            return Ok(history);
        }

        // GET: api/items/transactions
        [HttpGet("transactions")]
        public async Task<ActionResult<IEnumerable<TransactionEntryDto>>> GetAllTransactionHistories()
        {
            try
            {
                var transactions = await _context.TransactionEntries
                    .Include(t => t.Item)
                    .Select(t => new TransactionEntryDto
                    {
                        Id = t.Id,
                        ItemId = t.ItemId,
                        Category = t.Item != null ? t.Item.Category : "Unknown",
                        Description = t.Item != null ? t.Item.Description : "Unknown",
                        Action = t.Action,
                        Quantity = t.Quantity,
                        UnitPrice = t.UnitPrice,        // ✅ FIXED: Include unit price
                        Currency = t.Currency,           // ✅ FIXED: Include currency
                        VoucherNumber = t.VoucherNumber,
                        Details = t.Details,
                        Date = t.Date,
                        Model22Id = t.Model22Id
                    })
                    .ToListAsync();
                Log.Information("Fetched {Count} transaction entries", transactions.Count);
                return Ok(transactions);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching transactions");
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }

        // GET: api/items/receive-history
        [HttpGet("receive-history")]
        public async Task<ActionResult<IEnumerable<ReceiveHistoryDto>>> GetReceiveHistory()
        {
            try
            {
                var receiveEntries = await _context.TransactionEntries
                    .Where(te => te.Action == "receive")
                    .Include(te => te.Item)
                    .OrderByDescending(te => te.GregorianDate)
                    .Select(te => new ReceiveHistoryDto
                    {
                        TransactionId = te.Id,
                        Category = te.Item != null ? te.Item.Category : "Unknown",
                        Description = te.Item != null ? te.Item.Description : "Unknown",
                        Model = te.Item != null ? te.Item.Model : "Unknown",
                        Quantity = te.Quantity,
                        VoucherNumber = te.VoucherNumber,
                        ReceivedFrom = ExtractDetailValue(te.Details, "Received From: "),
                        RegisteredBy = ExtractDetailValue(te.Details, "Registered By: "),
                        Date = te.Date,
                        Source = te.Item != null ? te.Item.Source : "Purchase",
                        UnitPrice = te.UnitPrice,        // ✅ FIXED
                        Currency = te.Currency           // ✅ FIXED
                    })
                    .ToListAsync();
                Log.Information("Fetched {Count} receive history entries", receiveEntries.Count);
                return Ok(receiveEntries);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching receive history");
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }

        // GET: api/items/withdraw-history
        [HttpGet("withdraw-history")]
        public async Task<ActionResult<IEnumerable<WithdrawHistoryDto>>> GetWithdrawHistory()
        {
            try
            {
                var withdrawEntries = await _context.TransactionEntries
                    .Where(te => te.Action == "Withdrawn")
                    .Include(te => te.Item)
                    .OrderByDescending(te => te.GregorianDate)
                    .Select(te => new WithdrawHistoryDto
                    {
                        TransactionId = te.Id,
                        Category = te.Item != null ? te.Item.Category : "Unknown",
                        Description = te.Item != null ? te.Item.Description : "Unknown",
                        Model = te.Item != null ? te.Item.Model : "Unknown",
                        Quantity = te.Quantity,
                        VoucherNumber = te.VoucherNumber,
                        IssuedTo = ExtractDetailValue(te.Details, "Issued To: "),
                        PerformedBy = ExtractDetailValue(te.Details, "Registered By: "),
                        Date = te.Date
                    })
                    .ToListAsync();
                Log.Information("Fetched {Count} withdraw history entries", withdrawEntries.Count);
                return Ok(withdrawEntries);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching withdraw history");
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }

        private static string ExtractDetailValue(string details, string key)
        {
            if (string.IsNullOrEmpty(details) || !details.Contains(key))
            {
                return "Unknown";
            }
            try
            {
                return details.Split(new[] { key }, StringSplitOptions.None)[1]
                              .Split(new[] { ",", "Source:", "Date:" }, StringSplitOptions.None)[0]
                              .Trim();
            }
            catch
            {
                return "Unknown";
            }
        }

        // GET: api/items/warehouse-summary
        [HttpGet("warehouse-summary")]
        public async Task<ActionResult<IEnumerable<WarehouseSummaryDto>>> GetWarehouseSummary([FromQuery] string[]? roles)
        {
            try
            {
                var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART", "SUPPLY_AND_DISTRIBUTION_TEAMLEADER" }, StringComparer.OrdinalIgnoreCase);
                if (roles != null && roles.Any())
                {
                    var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();
                    if (invalidRoles.Any())
                    {
                        Log.Warning("Invalid roles provided: {InvalidRoles}", string.Join(", ", invalidRoles));
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART, SUPPLY_AND_DISTRIBUTION_TEAMLEADER."
                        });
                    }
                }

                var query = _context.Items
                    .Include(i => i.TransactionHistory)
                    .AsQueryable();

                if (roles != null && roles.Any())
                {
                    query = query.Where(i => roles.Select(r => r.ToUpper()).Contains(i.Role.ToUpper()));
                }

                var warehouseSummaries = await query
                    .GroupBy(i => i.WarehouseId)
                    .Select(g => new WarehouseSummaryDto
                    {
                        WarehouseId = g.Key,
                        WarehouseName = _context.Warehouses
                            .Where(w => w.WarehouseId == g.Key)
                            .Select(w => w.Name)
                            .FirstOrDefault() ?? "Unknown",
                        TotalItems = g.Count(),
                        TotalQuantity = g.Sum(i => i.Quantity),
                        LowStockItems = g.Count(i => i.Quantity < 10),
                        MostRecentRegistration = g
                            .SelectMany(i => i.TransactionHistory)
                            .Where(th => th.Action == "receive")
                            .OrderByDescending(th => th.GregorianDate)
                            .Select(th => th.Date)
                            .FirstOrDefault() ?? "Unknown Date"
                    })
                    .ToListAsync();

                Log.Information("Fetched {Count} warehouse summaries for roles: {Roles}", warehouseSummaries.Count, roles?.Length > 0 ? string.Join(", ", roles) : "none");
                return Ok(warehouseSummaries);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching warehouse summaries for roles: {Roles}", roles?.Length > 0 ? string.Join(", ", roles) : "none");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Internal server error",
                    detailedMessage = ex.Message
                });
            }
        }

        // GET: api/items/dashboard-summary?roles=VHF,HF
        [HttpGet("dashboard-summary")]
        public async Task<ActionResult<IEnumerable<DashboardItemDto>>> GetDashboardItemsByRoles([FromQuery] string[]? roles)
        {
            try
            {
                Log.Information("📊 Dashboard summary API called with roles: {Roles}", roles != null ? string.Join(", ", roles) : "null");
                
                var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART" }, StringComparer.OrdinalIgnoreCase);
                if (roles != null && roles.Any())
                {
                    var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();
                    if (invalidRoles.Any())
                    {
                        Log.Warning("Invalid roles for dashboard summary: {Roles}", string.Join(", ", invalidRoles));
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed: VHF, HF, ELECTRONICS, SPAREPART."
                        });
                    }
                }

                IQueryable<Item> query = _context.Items;
                
                Log.Information("📊 Total items in database: {Count}", await _context.Items.CountAsync());

                if (roles != null && roles.Any())
                {
                    var upperRoles = roles.Select(r => r.ToUpper()).ToArray();
                    query = query.Where(i => upperRoles.Contains(i.Role.ToUpper()));
                    Log.Information("📊 Filtering for roles: {Roles}", string.Join(", ", upperRoles));
                }
                else
                {
                    Log.Information("📊 No roles filter applied - returning all items");
                }

                var itemCount = await query.CountAsync();
                Log.Information("📊 Items after role filter: {Count}", itemCount);

                if (itemCount == 0)
                {
                    Log.Warning("📊 No items found for the specified roles");
                    return Ok(new List<DashboardItemDto>()); // Return empty list instead of error
                }

                // ✅ Lean projection
                var dashboardItems = await query
                    .Select(i => new DashboardItemDto
                    {
                        ItemId = i.ItemId,
                        Description = i.Description ?? "Unknown",
                        Category = i.Category ?? "Unknown",
                        Model = i.Model ?? "Unknown",
                        Quantity = i.Quantity,
                        WarehouseId = i.WarehouseId ?? "Unknown",
                        Role = i.Role ?? "Unknown",
                        LatestTransactionDate = i.TransactionHistory
                            .Where(th => th.Action == "receive")
                            .OrderByDescending(th => th.GregorianDate)
                            .Select(th => th.GregorianDate)
                            .FirstOrDefault()
                    })
                    .OrderByDescending(i => i.LatestTransactionDate)
                    .Take(1000)
                    .ToListAsync();

                Log.Information("📊 Dashboard summary: {Count} items for roles: {Roles}",
                    dashboardItems.Count, roles?.Length > 0 ? string.Join(", ", roles) : "(all)");
                    
                if (dashboardItems.Count > 0)
                {
                    Log.Information("📊 Sample first item: ID={ItemId}, Desc={Description}, Qty={Quantity}",
                        dashboardItems[0].ItemId, dashboardItems[0].Description, dashboardItems[0].Quantity);
                }

                return Ok(dashboardItems);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "❌ Error in GetDashboardItemsByRoles – roles: {Roles}", roles);
                return StatusCode(500, new
                {
                    success = false,
                    message = "Failed to load dashboard summary.",
                    detailedMessage = ex.Message
                });
            }
        }

        // POST: api/items/withdraw
        [HttpPost("withdraw")]
        public async Task<ActionResult> WithdrawItem([FromBody] WithdrawItemQuantityRequest request)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                Log.Warning("Invalid ModelState for WithdrawItem: {@Errors}", errors);
                return BadRequest(new { success = false, message = "Invalid request.", errors });
            }

            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                var item = await _context.Items
                    .Include(i => i.SerialNumbers)
                    .Include(i => i.TransactionHistory)
                    .FirstOrDefaultAsync(i => i.ItemId == request.ItemId);

                if (item == null)
                {
                    Log.Error("Item not found for ID {ItemId}", request.ItemId);
                    return NotFound(new { success = false, message = "Item not found." });
                }

                if (item.Quantity < request.Quantity)
                {
                    Log.Warning("Insufficient quantity for item {Description}. Requested: {Requested}, Available: {Available}",
                        item.Description, request.Quantity, item.Quantity);
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Insufficient quantity for item {item.Description}. Available: {item.Quantity}"
                    });
                }

                if (request.SerialNumbers != null && request.SerialNumbers.Any())
                {
                    if (item.Role != "SPAREPART" && request.Quantity != request.SerialNumbers.Count)
                    {
                        Log.Warning("For non-SPAREPART item {Description}, serial numbers count ({SerialCount}) does not match quantity ({Quantity}).",
                            item.Description, request.SerialNumbers.Count, request.Quantity);
                        return BadRequest(new
                        {
                            success = false,
                            message = "For non-SPAREPART items, the number of serial numbers must match the quantity."
                        });
                    }

                    foreach (var serial in request.SerialNumbers)
                    {
                        var serialNumber = item.SerialNumbers?.FirstOrDefault(s => s.SerialNumber == serial);
                        if (serialNumber == null)
                        {
                            Log.Warning("Serial number {Serial} not found for item {Description}", serial, item.Description);
                            await transaction.RollbackAsync();
                            return BadRequest(new
                            {
                                success = false,
                                message = $"Serial number {serial} not found for item {item.Description}."
                            });
                        }

                        // Handle serial number removal based on item role
                        if (item.Role == "SPAREPART")
                        {
                            // For SPAREPART: NEVER remove serial numbers - they are reused
                            // Serial numbers represent the item type, not individual units
                            var newQuantity = item.Quantity - request.Quantity;
                            Log.Information("Keeping serial number {Serial} for SPAREPART item {Description} - new quantity: {NewQuantity} (serial numbers are reused)", 
                                serial, item.Description, newQuantity);
                        }
                        else
                        {
                            // For non-SPAREPART: Remove serial number immediately
                            Log.Information("Removing serial number {Serial} for item {Description}", serial, item.Description);
                            _context.ItemSerialNumbers.Remove(serialNumber);
                        }
                    }
                }

                item.Quantity -= request.Quantity;
                item.VoucherNumber = request.VoucherNumber ?? item.VoucherNumber;
                item.ReceivedFrom = request.IssuedTo ?? item.ReceivedFrom;
                item.RegisteredBy = request.PerformedBy ?? item.RegisteredBy;

                var currentDate = DateTime.UtcNow.AddHours(3);
                var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
                    ?? throw new InvalidOperationException("Ethiopian date conversion failed");

                var transactionEntry = new TransactionEntry
                {
                    ItemId = request.ItemId,
                    Action = "Withdrawn",
                    Quantity = request.Quantity,
                    VoucherNumber = request.VoucherNumber ?? string.Empty,
                    History = string.Empty,
                    Details = $"Issued To: {request.IssuedTo}, Registered By: {request.PerformedBy}, Date: {ethiopianDate}",
                    Date = ethiopianDate,
                    GregorianDate = currentDate
                };

                item.TransactionHistory ??= new List<TransactionEntry>();
                item.TransactionHistory.Add(transactionEntry);
                _context.TransactionEntries.Add(transactionEntry);
                _context.Entry(item).State = EntityState.Modified;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                Log.Information("Withdrawn {Quantity} units of item {ItemId}. New quantity: {NewQuantity}", request.Quantity, item.ItemId, item.Quantity);
                return Ok(new { success = true, message = "Item quantity withdrawn successfully", date = ethiopianDate });
            }
            catch (DbUpdateException dbEx)
            {
                Log.Error(dbEx, "Database error during withdraw: ItemId={ItemId}, InnerException={InnerException}",
                    request.ItemId, dbEx.InnerException?.Message);
                await _context.Database.CurrentTransaction?.RollbackAsync();
                return StatusCode(500, new
                {
                    success = false,
                    message = "Database error occurred while withdrawing the item.",
                    detailedMessage = dbEx.InnerException?.Message ?? dbEx.Message
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error withdrawing item: ItemId={ItemId}, Message={Message}", request.ItemId, ex.Message);
                await _context.Database.CurrentTransaction?.RollbackAsync();
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while withdrawing the item.",
                    detailedMessage = ex.Message
                });
            }
        }

        // POST: api/items/{id}/accessories
        [HttpPost("{id:int}/accessories")]
        public async Task<IActionResult> AddAccessories(int id, [FromBody] List<AccessoryRequest> accessoryRequests)
        {
            if (!ModelState.IsValid || !accessoryRequests.Any())
            {
                Log.Warning("Invalid request for adding accessories to ItemId={ItemId}. Accessories count: {Count}", id, accessoryRequests?.Count ?? 0);
                return BadRequest(new { success = false, message = "Invalid request. Provide at least one accessory." });
            }

            try
            {
                var item = await _context.Items
                    .Include(i => i.Accessories)
                    .FirstOrDefaultAsync(i => i.ItemId == id);

                if (item == null)
                {
                    Log.Error("Item not found for ID {ItemId}", id);
                    return NotFound(new { success = false, message = "Item not found." });
                }

                item.Accessories ??= new List<Accessory>();

                foreach (var accessoryRequest in accessoryRequests)
                {
                    if (string.IsNullOrEmpty(accessoryRequest.Name) || string.IsNullOrEmpty(accessoryRequest.Model))
                    {
                        Log.Warning("Invalid accessory for ItemId={ItemId}: Name={Name}, Model={Model}", 
                            id, accessoryRequest.Name, accessoryRequest.Model);
                        return BadRequest(new { success = false, message = "Accessory name and model cannot be empty." });
                    }

                    item.Accessories.Add(new Accessory
                    {
                        Name = accessoryRequest.Name,
                        Model = accessoryRequest.Model,
                        Quantity = accessoryRequest.Quantity,
                        UnitPrice = accessoryRequest.UnitPrice ?? 0,
                        Currency = accessoryRequest.Currency ?? "ETB",
                        ItemId = item.ItemId
                    });
                }

                _context.Entry(item).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                Log.Information("Added {Count} accessories to ItemId={ItemId}", accessoryRequests.Count, id);
                return Ok(new { success = true, message = "Accessories added successfully." });
            }
            catch (DbUpdateException dbEx)
            {
                Log.Error(dbEx, "Database error adding accessories to ItemId={ItemId}, InnerException={InnerException}",
                    id, dbEx.InnerException?.Message);
                return StatusCode(500, new
                {
                    success = false,
                    message = "Database error occurred while adding accessories.",
                    detailedMessage = dbEx.InnerException?.Message ?? dbEx.Message
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error adding accessories to ItemId={ItemId}, Message={Message}", id, ex.Message);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while adding accessories.",
                    detailedMessage = ex.Message
                });
            }
        }

        // Test endpoint for debugging
        [HttpGet("test-dashboard")]
        public async Task<IActionResult> TestDashboard()
        {
            try
            {
                var roles = new[] { "VHF" };
                var upperRoles = roles.Select(r => r.ToUpper()).ToArray();
                
                var items = await _context.Items
                    .Where(i => upperRoles.Contains(i.Role.ToUpper()))
                    .Select(i => new {
                        i.ItemId,
                        i.Description,
                        i.Role,
                        i.Quantity
                    })
                    .Take(5)
                    .ToListAsync();
                    
                return Ok(new {
                    success = true,
                    message = $"Found {items.Count} items for VHF",
                    items = items
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // GET: api/items/total-value-by-role?role=VHF
        [HttpGet("total-value-by-role")]
        public async Task<ActionResult<object>> GetTotalValueByRole([FromQuery] string role)
        {
            try
            {
                if (string.IsNullOrEmpty(role))
                {
                    return BadRequest(new { success = false, message = "Role parameter is required." });
                }

                var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART" }, StringComparer.OrdinalIgnoreCase);
                if (!allowedRoles.Contains(role))
                {
                    return BadRequest(new { success = false, message = $"Invalid role: {role}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART." });
                }

                var items = await _context.Items
                    .Where(i => i.Role.ToUpper() == role.ToUpper())
                    .Select(i => new
                    {
                        i.ItemId,
                        i.Description,
                        i.Model,
                        i.Quantity,
                        i.UnitPrice,
                        i.Currency
                    })
                    .ToListAsync();

                // Calculate total value by currency, excluding FOC
                var totalValueByCurrency = items
                    .Where(i => !string.Equals(i.Currency, "FOC", StringComparison.OrdinalIgnoreCase))
                    .GroupBy(i => i.Currency)
                    .Select(g => new
                    {
                        Currency = g.Key,
                        TotalValue = g.Sum(i => i.UnitPrice * i.Quantity),
                        ItemCount = g.Count(),
                        TotalQuantity = g.Sum(i => i.Quantity)
                    })
                    .OrderByDescending(x => x.TotalValue)
                    .ToList();

                var focItems = items.Where(i => string.Equals(i.Currency, "FOC", StringComparison.OrdinalIgnoreCase)).ToList();

                Log.Information("Total value calculation for role {Role}: {CurrencyCount} currencies, {TotalItems} items", 
                    role, totalValueByCurrency.Count, items.Count);

                return Ok(new
                {
                    success = true,
                    role = role.ToUpper(),
                    totalItems = items.Count,
                    totalQuantity = items.Sum(i => i.Quantity),
                    valuesByCurrency = totalValueByCurrency,
                    focItems = new
                    {
                        count = focItems.Count,
                        totalQuantity = focItems.Sum(i => i.Quantity)
                    },
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error calculating total value for role {Role}", role);
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }

        // GET: api/items/accessories/by-roles?roles=VHF,HF,ELECTRONICS,SPAREPART
        [HttpGet("accessories/by-roles")]
        public async Task<ActionResult<IEnumerable<AccessoryListingDto>>> GetAccessoriesByRoles([FromQuery] string[] roles)
        {
            try
            {
                Log.Information("GetAccessoriesByRoles called with roles: {Roles}", string.Join(", ", roles ?? new string[0]));
                
                if (roles == null || !roles.Any())
                {
                    Log.Warning("No roles provided for GetAccessoriesByRoles");
                    return BadRequest(new { success = false, message = "At least one role must be provided." });
                }
                
                var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART", "SUPPLY_AND_DISTRIBUTION_TEAMLEADER" }, StringComparer.OrdinalIgnoreCase);
                var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();
                if (invalidRoles.Any())
                {
                    Log.Warning("Invalid roles provided: {InvalidRoles}", string.Join(", ", invalidRoles));
                    return BadRequest(new { success = false, message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART, SUPPLY_AND_DISTRIBUTION_TEAMLEADER." });
                }

                var upperRoles = roles.Select(r => r.ToUpper()).ToList();
                
                Log.Information("Querying accessories with uppercase roles: {UpperRoles}", string.Join(", ", upperRoles));
                
                // Group accessories by Name, Model, ParentItem and sum quantities
                var accessoryGroups = await _context.Accessories
                    .Include(a => a.Item)
                    .Include(a => a.SerialNumbers)
                    .Where(a => upperRoles.Contains(a.Item.Role.ToUpper()))
                    .GroupBy(a => new { a.Name, AccessoryModel = a.Model, a.ItemId, ItemDescription = a.Item.Description, ItemModel = a.Item.Model, a.Item.Category, a.Item.Role, a.Item.GregorianDate })
                    .Select(g => new
                    {
                        g.Key.Name,
                        AccessoryModel = g.Key.AccessoryModel,
                        g.Key.ItemId,
                        ParentItemDescription = g.Key.ItemDescription,
                        ParentItemModel = g.Key.ItemModel,
                        ParentItemCategory = g.Key.Category,
                        ParentItemRole = g.Key.Role,
                        ParentItemDate = g.Key.GregorianDate,
                        TotalQuantity = g.Sum(a => a.Quantity),
                        // Take the first non-null/non-zero price
                        UnitPrice = g.Where(a => a.UnitPrice != null && a.UnitPrice > 0).Select(a => a.UnitPrice).FirstOrDefault() ?? 0,
                        Currency = g.Where(a => !string.IsNullOrEmpty(a.Currency)).Select(a => a.Currency).FirstOrDefault() ?? "ETB",
                        RequiresSerialNumbers = g.Any(a => a.RequiresSerialNumbers),
                        IsStandalone = g.Any(a => a.IsStandalone),
                        AccessoryIds = g.Select(a => a.Id).ToList(),
                        SerialNumbers = g.SelectMany(a => a.SerialNumbers).ToList()
                    })
                    .Where(g => g.TotalQuantity > 0) // ✅ Only show accessories with stock
                    .ToListAsync();
                
                var accessories = accessoryGroups.Select(g => new AccessoryListingDto
                {
                    AccessoryId = g.AccessoryIds.First(), // Use first ID for reference
                    Name = g.Name,
                    Model = g.AccessoryModel,
                    Quantity = g.TotalQuantity,
                    UnitPrice = g.UnitPrice,
                    Currency = g.Currency,
                    RequiresSerialNumbers = g.RequiresSerialNumbers,
                    IsStandalone = g.IsStandalone,
                    ParentItemId = g.ItemId,
                    ParentItemDescription = g.ParentItemDescription,
                    ParentItemModel = g.ParentItemModel,
                    ParentItemCategory = g.ParentItemCategory,
                    ParentItemRole = g.ParentItemRole,
                    ParentItemDate = g.ParentItemDate,
                    SerialNumbersCount = g.SerialNumbers.Count,
                    SerialNumbers = g.SerialNumbers.Select(sn => new AccessorySerialNumberDto
                    {
                        Id = sn.Id,
                        SerialNumber = sn.SerialNumber
                    }).ToList()
                })
                .OrderByDescending(a => a.ParentItemDate ?? DateTime.MinValue)
                .ThenBy(a => a.Name)
                .ToList();
                    
                Log.Information("Fetched {Count} accessories for roles: {Roles}", accessories.Count, string.Join(", ", roles ?? new string[0]));
                return Ok(accessories);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching accessories for roles: {Roles}", string.Join(", ", roles));
                return StatusCode(500, new { success = false, message = "Internal server error", detailedMessage = ex.Message });
            }
        }
    }

    // DTO classes
    public class ItemListingDto
    {
        public int ItemId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string WarehouseId { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string RegistrationDate { get; set; } = string.Empty;
        public string RegisteredBy { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Shelf { get; set; } = string.Empty;
        public string ItemColumn { get; set; } = string.Empty;
        public string ItemRow { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string? VoucherNumber { get; set; }
        public List<Accessory> Accessories { get; set; } = new List<Accessory>(); // Added for frontend withdrawal logic
        public List<ItemSerialNumber> SerialNumbers { get; set; } = new List<ItemSerialNumber>(); // Added for frontend withdrawal logic
        public bool HasAccessories { get; set; }
        public bool HasSerialNumbers { get; set; }
        public int SerialNumbersCount { get; set; }
        public DateTime? LatestTransactionDate { get; set; }
        
        // Properties for standalone accessories
        public bool IsStandaloneAccessory { get; set; } = false;
        public int? ParentItemId { get; set; }
        public string? ParentItemName { get; set; }
    }

    public class AccessoryListingDto
    {
        public int AccessoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string Currency { get; set; } = string.Empty;
        public bool RequiresSerialNumbers { get; set; }
        public bool IsStandalone { get; set; }
        public int ParentItemId { get; set; }
        public string ParentItemDescription { get; set; } = string.Empty;
        public string ParentItemModel { get; set; } = string.Empty;
        public string ParentItemCategory { get; set; } = string.Empty;
        public string ParentItemRole { get; set; } = string.Empty;
        public DateTime? ParentItemDate { get; set; }
        public int SerialNumbersCount { get; set; }
        public List<AccessorySerialNumberDto> SerialNumbers { get; set; } = new List<AccessorySerialNumberDto>();
    }

    public class AccessorySerialNumberDto
    {
        public int Id { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
    }

    public class DashboardItemDto
    {
        public int ItemId { get; set; }
        public string Description { get; set; } = "Unknown";
        public string Category { get; set; } = "Unknown";
        public string Model { get; set; } = "Unknown";
        public int Quantity { get; set; }
        public string WarehouseId { get; set; } = "Unknown";
        public string Role { get; set; } = "Unknown";
        public DateTime? LatestTransactionDate { get; set; }
    }
}
