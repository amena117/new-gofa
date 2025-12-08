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
                    HasAccessories = i.Accessories.Any(),
                    HasSerialNumbers = i.SerialNumbers.Any(),
                    SerialNumbersCount = i.SerialNumbers.Count,
                    LatestTransactionDate = i.TransactionHistory
                        .OrderByDescending(th => th.GregorianDate)
                        .Select(th => th.GregorianDate)
                        .FirstOrDefault()
                })
                .OrderByDescending(i => i.LatestTransactionDate)
                .ToListAsync();
                
            Log.Information("Optimized fetch: {Count} items with search '{Search}'", items.Count, search ?? "none");
            return Ok(items);
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
                    .Where(t => t.Action == "receive");

                if (roles != null && roles.Any())
                {
                    var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART" }, StringComparer.OrdinalIgnoreCase);
                    var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();
                    if (invalidRoles.Any())
                    {
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART."
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

                // ✅ FIXED: Use t.UnitPrice and t.Currency (from transaction)
                var allRecords = await query
                    .Select(t => new ReceiveHistoryDto
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
                        UnitPrice = t.UnitPrice,        // ✅ CORRECT
                        Currency = t.Currency           // ✅ CORRECT
                    })
                    .ToListAsync();

                var filteredRecords = allRecords.AsEnumerable();

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
        [HttpGet("by-warehouse/{warehouseId}")]
        public async Task<ActionResult<IEnumerable<Item>>> GetItemsByWarehouse(string warehouseId)
        {
            var items = await _context.Items
                .Include(i => i.SerialNumbers)
                .Include(i => i.TransactionHistory)
                .Include(i => i.Units)
                .Include(i => i.Accessories)
                .Where(i => i.WarehouseId == warehouseId)
                .ToListAsync();
            Log.Information("Fetched {Count} items for warehouse '{WarehouseId}'", items.Count, warehouseId);
            return Ok(items);
        }

        // GET: api/items/by-roles?roles=VHF,HF,Electronics,Sparepart
        [HttpGet("by-roles")]
        public async Task<ActionResult<IEnumerable<ItemListingDto>>> GetItemsByRoles([FromQuery] string[] roles)
        {
            try
            {
                if (roles == null || !roles.Any())
                {
                    Log.Warning("No roles provided for GetItemsByRoles");
                    return BadRequest(new { success = false, message = "At least one role must be provided." });
                }
                
                var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "Electronics", "Sparepart" }, StringComparer.OrdinalIgnoreCase);
                var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();
                if (invalidRoles.Any())
                {
                    Log.Warning("Invalid roles provided: {InvalidRoles}", string.Join(", ", invalidRoles));
                    return BadRequest(new { success = false, message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, Electronics, Sparepart." });
                }

                // ✅ OPTIMIZED: Only fetch essential fields for listing
                var items = await _context.Items
                    .Where(i => roles.Select(r => r.ToUpper()).Contains(i.Role.ToUpper()))
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
                        // Exclude heavy collections for listing
                        HasAccessories = i.Accessories.Any(),
                        HasSerialNumbers = i.SerialNumbers.Any(),
                        SerialNumbersCount = i.SerialNumbers.Count,
                        // Get latest transaction date for sorting
                        LatestTransactionDate = i.TransactionHistory
                            .OrderByDescending(th => th.GregorianDate)
                            .Select(th => th.GregorianDate)
                            .FirstOrDefault()
                    })
                    .OrderByDescending(i => i.LatestTransactionDate) // ✅ Sort on database
                    .ToListAsync();
                    
                Log.Information("Optimized fetch: {Count} items for roles: {Roles}", items.Count, string.Join(", ", roles));
                return Ok(items);
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
                .FirstOrDefaultAsync(i => i.ItemId == id);
            if (item == null)
            {
                Log.Error("Item not found for ID {ItemId}", id);
                return NotFound(new { success = false, message = "Item not found." });
            }
            return Ok(item);
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
                    var existingSerials = await _context.ItemSerialNumbers
                        .Where(s => request.SerialNumbers.Contains(s.SerialNumber))
                        .Select(s => s.SerialNumber)
                        .ToListAsync();
                    if (existingSerials.Any())
                    {
                        Log.Warning("Duplicate serial numbers for item {Description}: {SerialNumbers}",
                            request.Description, string.Join(", ", existingSerials));
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Serial numbers {string.Join(", ", existingSerials)} already exist for item {request.Description}."
                        });
                    }
                    if (request.Role != "SPAREPART" && request.Quantity != request.SerialNumbers.Count)
                    {
                        Log.Warning("For non-SPAREPART item {Description}, serial numbers count ({SerialCount}) does not match quantity ({Quantity}).",
                            request.Description, request.SerialNumbers.Count, request.Quantity);
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            success = false,
                            message = "For non-SPAREPART items, the number of serial numbers must match the quantity."
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

                    foreach (var serial in request.SerialNumbers ?? new List<string>())
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

                    foreach (var accessory in request.Accessories ?? new List<AccessoryRequest>())
                    {
                        if (string.IsNullOrEmpty(accessory.Name) || string.IsNullOrEmpty(accessory.Model))
                        {
                            Log.Warning("Invalid accessory: Name={Name}, Model={Model}", accessory.Name, accessory.Model);
                            await transaction.RollbackAsync();
                            return BadRequest(new { success = false, message = "Accessory name and model cannot be empty." });
                        }
                        
                        Log.Information("📦 ADDING ACCESSORY TO EXISTING ITEM - Name: {Name}, Model: {Model}, Quantity: {Quantity}, UnitPrice: {UnitPrice}, Currency: {Currency}",
                            accessory.Name, accessory.Model, accessory.Quantity, accessory.UnitPrice, accessory.Currency);
                        
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
                        
                        Log.Information("📦 ADDING ACCESSORY TO NEW ITEM - Name: {Name}, Model: {Model}, Quantity: {Quantity}, UnitPrice: {UnitPrice}, Currency: {Currency}",
                            accessory.Name, accessory.Model, accessory.Quantity, accessory.UnitPrice, accessory.Currency);
                        
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
                        Quantity = request.Quantity,
                        UnitPrice = request.UnitPrice,
                        Currency = request.Currency ?? "ETB",
                        VoucherNumber = request.VoucherNumber ?? string.Empty,
                        Details = $"Received From: {request.ReceivedFrom ?? "unknown"}, Registered By: {request.RegisteredBy ?? "unknown"}, Source: {request.Source}, Date: {ethiopianDate}",
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
                        var existingSerials = await _context.ItemSerialNumbers
                            .Where(s => itemRequest.SerialNumbers.Contains(s.SerialNumber))
                            .Select(s => s.SerialNumber)
                            .ToListAsync();
                        if (existingSerials.Any())
                        {
                            Log.Warning("Duplicate serial numbers for item {Description}: {SerialNumbers}",
                                itemRequest.Description, string.Join(", ", existingSerials));
                            await transaction.RollbackAsync();
                            return BadRequest(new
                            {
                                success = false,
                                message = $"Serial numbers {string.Join(", ", existingSerials)} already exist for item {itemRequest.Description}."
                            });
                        }
                        if (itemRequest.Role != "SPAREPART" && itemRequest.Quantity != itemRequest.SerialNumbers.Count)
                        {
                            Log.Warning("For non-SPAREPART item {Description}, serial numbers count ({SerialCount}) does not match quantity ({Quantity}).",
                                itemRequest.Description, itemRequest.SerialNumbers.Count, itemRequest.Quantity);
                            await transaction.RollbackAsync();
                            return BadRequest(new
                            {
                                success = false,
                                message = "For non-SPAREPART items, the number of serial numbers must match the quantity."
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
                var allowedRoles = new HashSet<string>(new[] { "VHF", "HF", "ELECTRONICS", "SPAREPART" }, StringComparer.OrdinalIgnoreCase);
                if (roles != null && roles.Any())
                {
                    var invalidRoles = roles.Except(allowedRoles, StringComparer.OrdinalIgnoreCase).ToList();
                    if (invalidRoles.Any())
                    {
                        Log.Warning("Invalid roles provided: {InvalidRoles}", string.Join(", ", invalidRoles));
                        return BadRequest(new
                        {
                            success = false,
                            message = $"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed roles are: VHF, HF, ELECTRONICS, SPAREPART."
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
                        _context.ItemSerialNumbers.Remove(serialNumber);
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
        public bool HasAccessories { get; set; }
        public bool HasSerialNumbers { get; set; }
        public int SerialNumbersCount { get; set; }
        public DateTime? LatestTransactionDate { get; set; }
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