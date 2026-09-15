using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using Gofabackend.Data;
using Gofabackend.Services;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MasterCardItemsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly StockService _stockService;

        public MasterCardItemsController(ApplicationDbContext context, StockService stockService)
        {
            _context = context;
            _stockService = stockService;
        }

        // POST: api/MasterCardItems
        [HttpPost]
        public async Task<IActionResult> CreateMasterCardItem([FromBody] MasterCardItem item)
        {
            _context.MasterCardItems.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        // PUT: api/MasterCardItems/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMasterCardItem(int id, MasterCardItem updatedItem)
        {
            if (id != updatedItem.Id)
            {
                return BadRequest("ID mismatch");
            }

            var existingItem = await _context.MasterCardItems.FindAsync(id);
            if (existingItem == null)
            {
                return NotFound($"MasterCardItem with ID {id} not found.");
            }

            existingItem.CardNo = updatedItem.CardNo;
            existingItem.Model = updatedItem.Model;
            existingItem.PartNumber = updatedItem.PartNumber;
            existingItem.Description = updatedItem.Description;
            existingItem.UnitOfMeasure = updatedItem.UnitOfMeasure;
            existingItem.InChAb = updatedItem.InChAb;
            existingItem.UnitPack = updatedItem.UnitPack;
            existingItem.Status = updatedItem.Status;

            _context.Entry(existingItem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MasterCardItemExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return Ok(existingItem);
        }

        private bool MasterCardItemExists(int id)
        {
            return _context.MasterCardItems.Any(e => e.Id == id);
        }

        // GET: api/MasterCardItems
        [HttpGet]
        public async Task<IActionResult> GetMasterCardItems()
        {
            var items = await _context.MasterCardItems
                .Include(i => i.ReceivedRecords)
                .Include(i => i.IssuedRecords)
                .ToListAsync();

            return Ok(items);
        }

        // GET: api/MasterCardItems/{id}/issued
        [HttpGet("{id}/issued")]
        public async Task<ActionResult<IEnumerable<MasterCardItemIssued>>> GetIssuedRecordsForMasterCardItem(int id)
        {
            var item = await _context.MasterCardItems
                .AsNoTracking()
                .Include(i => i.IssuedRecords)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
            {
                return NotFound($"MasterCardItem with ID {id} not found.");
            }

            return Ok(item.IssuedRecords);
        }

        [HttpGet("current")]
        public IActionResult GetCurrentDate()
        {
            try
            {
                var currentDate = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"); // UTC ISO 8601 string
                return Ok(new { date = currentDate });
            }
            catch (Exception ex)
            {
                // Log the error (use ILogger in production)
                Console.WriteLine($"Error generating current date: {ex.Message}");
                return StatusCode(500, new { error = "Failed to retrieve current date" });
            }
        }

        // GET: api/MasterCardItems/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMasterCardItem(int id)
        {
            var item = await _context.MasterCardItems
                .Include(i => i.ReceivedRecords)
                    .ThenInclude(r => r.ReceivedAccessories)
                .Include(i => i.IssuedRecords)
                    .ThenInclude(ir => ir.IssuedAccessories) // Fixed: Changed Accessories to IssuedAccessories
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null) return NotFound();

            _stockService.CalculateInStock(item.ReceivedRecords, item.IssuedRecords);
            return Ok(item);
        }

        // PATCH: api/MasterCardItems/{itemId}/details/{detailId}/receive
        [HttpPatch("{itemId}/details/{detailId}/receive")]
        public async Task<IActionResult> UpdateMasterCardItemDetailsReceived(int itemId, int detailId, [FromBody] int additionalReceived)
        {
            var detail = await _context.MasterCardItemDetails
                .FirstOrDefaultAsync(d => d.MasterCardItemId == itemId && d.Id == detailId);

            if (detail == null) return NotFound();

            detail.Received += additionalReceived;
            if (detail.Received > detail.QuantityOrdered)
            {
                return BadRequest("Received quantity cannot exceed QuantityOrdered.");
            }

            await _context.SaveChangesAsync();
            return Ok(detail);
        }

        // PATCH: api/MasterCardItems/{itemId}/details/{detailId}/issue
        [HttpPatch("{itemId}/details/{detailId}/issue")]
        public async Task<IActionResult> UpdateMasterCardItemDetailsIssued(int itemId, int detailId, [FromBody] int additionalIssued)
        {
            var detail = await _context.MasterCardItemDetails
                .FirstOrDefaultAsync(d => d.MasterCardItemId == itemId && d.Id == detailId);

            if (detail == null)
                return NotFound("MasterCardItemDetails not found.");

            if (detail.Issued + additionalIssued > detail.QuantityOrdered)
            {
                return BadRequest("Issued quantity cannot exceed QuantityOrdered.");
            }

            detail.Issued += additionalIssued;
            await _context.SaveChangesAsync();

            return Ok(detail);
        }

        // POST: api/MasterCardItems/{itemId}/received
        [HttpPost("{itemId}/received")]
        public async Task<IActionResult> AddMasterCardItemReceived(int itemId, [FromBody] MasterCardItemReceived received)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                Console.WriteLine($"ModelState Errors for VoucherNo {received.VoucherNo}: {string.Join("; ", errors)}");
                return BadRequest(new { error = $"Validation failed for VoucherNo {received.VoucherNo}: {string.Join("; ", errors)}" });
            }

            Console.WriteLine($"Received payload: VoucherNo={received.VoucherNo}, HasAccessories={received.HasAccessories}, AccessoriesCount={(received.ReceivedAccessories != null ? received.ReceivedAccessories.Count : 0)}");

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var item = await _context.MasterCardItems
                        .Include(i => i.ReceivedRecords)
                        .Include(i => i.IssuedRecords)
                        .FirstOrDefaultAsync(i => i.Id == itemId);

                    if (item == null)
                    {
                        Console.WriteLine($"MasterCardItem with ID {itemId} not found.");
                        return NotFound("MasterCardItem not found.");
                    }

                    received.MasterCardItemId = itemId;
                    received.Date = DateTime.UtcNow;
                    if (received.TransactionDate == default)
                    {
                        received.TransactionDate = DateTime.UtcNow;
                    }

                    if (received.HasAccessories && received.ReceivedAccessories == null)
                    {
                        Console.WriteLine("HasAccessories is true but ReceivedAccessories is null. Initializing empty list.");
                        received.ReceivedAccessories = new List<ReceivedAccessory>();
                    }
                    else if (!received.HasAccessories)
                    {
                        Console.WriteLine("HasAccessories is false. Setting ReceivedAccessories to null.");
                        received.ReceivedAccessories = null;
                    }

                    if (received.HasAccessories && received.ReceivedAccessories != null)
                    {
                        Console.WriteLine($"Validating {received.ReceivedAccessories.Count} accessories.");
                        foreach (var accessory in received.ReceivedAccessories)
                        {
                            if (string.IsNullOrWhiteSpace(accessory.Name))
                            {
                                ModelState.AddModelError($"ReceivedAccessories[{received.ReceivedAccessories.IndexOf(accessory)}].Name", "Accessory name cannot be empty.");
                            }
                            if (accessory.Quantity <= 0)
                            {
                                ModelState.AddModelError($"ReceivedAccessories[{received.ReceivedAccessories.IndexOf(accessory)}].Quantity", "Accessory quantity must be greater than 0.");
                            }
                            accessory.MasterCardItemReceived = null;
                            accessory.MasterCardItemReceivedId = 0;
                        }
                    }

                    if (!ModelState.IsValid)
                    {
                        var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                        Console.WriteLine($"ModelState Errors: {string.Join("; ", errors)}");
                        return BadRequest(new { error = $"Validation failed: {string.Join("; ", errors)}" });
                    }

                    _context.MasterCardItemReceived.Add(received);
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"MasterCardItemReceived saved with ID {received.Id}");

                    if (received.HasAccessories && received.ReceivedAccessories != null && received.ReceivedAccessories.Any())
                    {
                        Console.WriteLine($"Saving {received.ReceivedAccessories.Count} accessories for MasterCardItemReceivedId {received.Id}");
                        foreach (var accessory in received.ReceivedAccessories)
                        {
                            accessory.MasterCardItemReceivedId = received.Id;
                            accessory.MasterCardItemReceived = null;
                        }
                        _context.ReceivedAccessories.AddRange(received.ReceivedAccessories);
                        await _context.SaveChangesAsync();
                        Console.WriteLine("ReceivedAccessories saved successfully.");
                    }

                    int newQuantity = _stockService.CalculateInStock(item.ReceivedRecords, item.IssuedRecords);
                    item.Quantity = newQuantity;
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"Stock quantity updated: {newQuantity}");

                    await transaction.CommitAsync();

                    var response = new
                    {
                        received.Id,
                        received.MasterCardItemId,
                        received.Date,
                        received.TransactionDate,
                        received.VoucherNo,
                        received.Received,
                        received.Organization,
                        received.PostedBy,
                        received.Location,
                        received.InStock,
                        received.UnitPrice,
                        received.TotalPrice,
                        received.CurrencyCode,
                        received.HasAccessories,
                        ReceivedAccessories = received.ReceivedAccessories?.Select(a => new
                        {
                            a.Id,
                            a.Name,
                            a.Quantity,
                            a.MasterCardItemReceivedId
                        }).ToList()
                    };

                    Console.WriteLine($"Response prepared: VoucherNo={received.VoucherNo}, AccessoriesCount={(response.ReceivedAccessories != null ? response.ReceivedAccessories.Count : 0)}");
                    return Ok(response);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    Console.WriteLine($"Error saving MasterCardItemReceived: {ex.Message}\nStackTrace: {ex.StackTrace}");
                    return StatusCode(500, new { error = "An error occurred while saving the record." });
                }
            }
        }

        // POST: api/MasterCardItems/{itemId}/issued
        [HttpPost("{itemId}/issued")]
        public async Task<IActionResult> AddMasterCardItemIssued(int itemId, [FromBody] MasterCardItemIssued issued)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                Console.WriteLine("ModelState Errors: " + string.Join("; ", errors));
                return BadRequest(new { error = $"Validation failed: {string.Join("; ", errors)}" });
            }

            var item = await _context.MasterCardItems
                .Include(i => i.ReceivedRecords)
                .Include(i => i.IssuedRecords)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null)
            {
                Console.WriteLine($"MasterCardItem with ID {itemId} not found.");
                return NotFound("MasterCardItem not found.");
            }

            issued.MasterCardItemId = itemId;
            issued.Date = DateTime.UtcNow;
            if (issued.TransactionDate == default)
            {
                issued.TransactionDate = DateTime.UtcNow;
            }

            if (issued.HasAccessories && issued.IssuedAccessories == null) // Fixed: Changed Accessories to IssuedAccessories
            {
                issued.IssuedAccessories = new List<IssuedAccessory>(); // Fixed: Changed Accessories to IssuedAccessories
            }
            else if (!issued.HasAccessories)
            {
                issued.IssuedAccessories = null; // Fixed: Changed Accessories to IssuedAccessories
            }

            if (issued.HasAccessories && issued.IssuedAccessories != null) // Fixed: Changed Accessories to IssuedAccessories
            {
                foreach (var accessory in issued.IssuedAccessories) // Fixed: Changed Accessories to IssuedAccessories
                {
                    if (string.IsNullOrWhiteSpace(accessory.Name))
                    {
                        ModelState.AddModelError($"IssuedAccessories[{issued.IssuedAccessories.IndexOf(accessory)}].Name", "Accessory name cannot be empty."); // Fixed: Changed Accessories to IssuedAccessories
                    }
                    if (accessory.Quantity <= 0)
                    {
                        ModelState.AddModelError($"IssuedAccessories[{issued.IssuedAccessories.IndexOf(accessory)}].Quantity", "Accessory quantity must be greater than 0."); // Fixed: Changed Accessories to IssuedAccessories
                    }
                    accessory.MasterCardItemIssued = null;
                    accessory.MasterCardItemIssuedId = 0;
                }
            }

            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(new { Message = "Validation failed.", Errors = errors });
            }

            try
            {
                _context.MasterCardItemIssued.Add(issued);
                await _context.SaveChangesAsync();
                Console.WriteLine($"MasterCardItemIssued saved with ID {issued.Id}");

                if (issued.HasAccessories && issued.IssuedAccessories != null && issued.IssuedAccessories.Any()) // Fixed: Changed Accessories to IssuedAccessories
                {
                    foreach (var accessory in issued.IssuedAccessories) // Fixed: Changed Accessories to IssuedAccessories
                    {
                        accessory.MasterCardItemIssuedId = issued.Id;
                        accessory.MasterCardItemIssued = null;
                    }
                    _context.IssuedAccessories.AddRange(issued.IssuedAccessories); // Fixed: Changed Accessories to IssuedAccessories
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"Saved {issued.IssuedAccessories.Count} accessories for issued item {issued.Id}"); // Fixed: Changed Accessories to IssuedAccessories
                }

                int newQuantity = _stockService.CalculateInStock(item.ReceivedRecords, item.IssuedRecords);
                item.Quantity = newQuantity;
                await _context.SaveChangesAsync();
                Console.WriteLine($"Stock updated: {newQuantity}");

                var response = new
                {
                    issued.Id,
                    issued.MasterCardItemId,
                    issued.Date,
                    issued.TransactionDate,
                    issued.VoucherNo,
                    issued.Issued,
                    issued.Organization,
                    issued.PostedBy,
                    issued.Location,
                    issued.InStock,
                    issued.UnitPrice,
                    issued.TotalPrice,
                    issued.CurrencyCode,
                    issued.HasAccessories,
                    IssuedAccessories = issued.IssuedAccessories?.Select(a => new // Fixed: Changed Accessories to IssuedAccessories
                    {
                        a.Id,
                        a.Name,
                        a.Quantity,
                        a.MasterCardItemIssuedId
                    }).ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving issued record: {ex.Message}\nStackTrace: {ex.StackTrace}");
                return StatusCode(500, "An error occurred while saving the issued record.");
            }
        }

        // GET: api/MasterCardItems/organizations
        [HttpGet("organizations")]
        public async Task<ActionResult<List<Organization>>> GetOrganizations()
        {
            var organizations = await _context.Organizations.ToListAsync();
            return Ok(organizations);
        }

        // POST: api/MasterCardItems/organizations
        [HttpPost("organizations")]
        public async Task<ActionResult<List<Organization>>> AddOrganization([FromBody] Organization organization)
        {
            if (string.IsNullOrEmpty(organization.Name))
                return BadRequest("Organization name is required.");

            if (await _context.Organizations.AnyAsync(o => o.Name == organization.Name))
                return BadRequest("Organization already exists.");

            _context.Organizations.Add(organization);
            await _context.SaveChangesAsync();

            var organizations = await _context.Organizations.ToListAsync();
            return Ok(organizations);
        }

        // GET: api/MasterCardItems/locations
        [HttpGet("locations")]
        public async Task<ActionResult<List<Location>>> GetLocations()
        {
            var locations = await _context.Locations.ToListAsync();
            return Ok(locations);
        }

        // POST: api/MasterCardItems/locations
        [HttpPost("locations")]
        public async Task<ActionResult<List<Location>>> AddLocation([FromBody] Location location)
        {
            if (string.IsNullOrEmpty(location.Name))
                return BadRequest("Location name is required.");

            if (await _context.Locations.AnyAsync(l => l.Name == location.Name))
                return BadRequest("Location already exists.");

            _context.Locations.Add(location);
            await _context.SaveChangesAsync();

            var locations = await _context.Locations.ToListAsync();
            return Ok(locations);
        }

        // PUT: api/MasterCardItems/received/{id}
        [HttpPut("received/{id}")]
        public async Task<IActionResult> UpdateMasterCardItemReceived(int id, MasterCardItemReceived receivedRecord)
        {
            if (id != receivedRecord.Id)
            {
                return BadRequest("ID mismatch");
            }

            var existingRecord = await _context.MasterCardItemReceived
                .Include(r => r.ReceivedAccessories)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (existingRecord == null)
            {
                return NotFound($"Received record with ID {id} not found.");
            }

            Console.WriteLine($"Received record: {JsonSerializer.Serialize(receivedRecord)}");

            if (receivedRecord.TransactionDate != default)
            {
                existingRecord.TransactionDate = receivedRecord.TransactionDate;
            }
            existingRecord.VoucherNo = receivedRecord.VoucherNo;
            existingRecord.Received = receivedRecord.Received;
            existingRecord.Organization = receivedRecord.Organization;
            existingRecord.PostedBy = receivedRecord.PostedBy;
            existingRecord.Location = receivedRecord.Location;
            existingRecord.UnitPrice = receivedRecord.UnitPrice;
            existingRecord.CurrencyCode = receivedRecord.CurrencyCode;
            existingRecord.HasAccessories = receivedRecord.HasAccessories;

            if (receivedRecord.HasAccessories && receivedRecord.ReceivedAccessories != null)
            {
                var existingAccessoryIds = existingRecord.ReceivedAccessories?.Select(a => a.Id).ToList() ?? new List<int>();
                var updatedAccessoryIds = receivedRecord.ReceivedAccessories?.Select(a => a.Id).ToList() ?? new List<int>();

                var accessoriesToRemove = existingAccessoryIds.Except(updatedAccessoryIds).ToList();
                foreach (var accessoryId in accessoriesToRemove)
                {
                    var accessoryToRemove = existingRecord.ReceivedAccessories?.FirstOrDefault(a => a.Id == accessoryId);
                    if (accessoryToRemove != null)
                    {
                        _context.ReceivedAccessories.Remove(accessoryToRemove);
                    }
                }

                existingRecord.ReceivedAccessories = existingRecord.ReceivedAccessories ?? new List<ReceivedAccessory>();
                foreach (var updatedAccessory in receivedRecord.ReceivedAccessories ?? new List<ReceivedAccessory>())
                {
                    if (updatedAccessory.Id == 0)
                    {
                        var newAccessory = new ReceivedAccessory
                        {
                            Name = updatedAccessory.Name,
                            Quantity = updatedAccessory.Quantity,
                            MasterCardItemReceivedId = existingRecord.Id
                        };
                        existingRecord.ReceivedAccessories.Add(newAccessory);
                    }
                    else
                    {
                        var existingAccessory = existingRecord.ReceivedAccessories.FirstOrDefault(a => a.Id == updatedAccessory.Id);
                        if (existingAccessory != null)
                        {
                            existingAccessory.Name = updatedAccessory.Name;
                            existingAccessory.Quantity = updatedAccessory.Quantity;
                        }
                    }
                }
            }
            else
            {
                if (existingRecord.ReceivedAccessories != null)
                {
                    _context.ReceivedAccessories.RemoveRange(existingRecord.ReceivedAccessories);
                    existingRecord.ReceivedAccessories.Clear();
                }
                existingRecord.HasAccessories = false;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MasterCardItemReceivedExists(id))
                {
                    return NotFound();
                }
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating received record: {ex.Message}");
                return StatusCode(500, "Internal server error while updating received record.");
            }

            var parentItem = await _context.MasterCardItems
                .Include(i => i.ReceivedRecords)
                .Include(i => i.IssuedRecords)
                .FirstOrDefaultAsync(i => i.Id == existingRecord.MasterCardItemId);

            if (parentItem != null)
            {
                int newQuantity = _stockService.CalculateInStock(parentItem.ReceivedRecords, parentItem.IssuedRecords);
                if (parentItem.Quantity != newQuantity)
                {
                    parentItem.Quantity = newQuantity;
                    await _context.SaveChangesAsync();
                }
            }

            var updatedRecord = await _context.MasterCardItemReceived
                .Include(r => r.ReceivedAccessories)
                .FirstOrDefaultAsync(r => r.Id == id);

            return Ok(updatedRecord);
        }

        // PUT: api/MasterCardItems/issued/{id}
        [HttpPut("issued/{id}")]
        public async Task<IActionResult> UpdateMasterCardItemIssued(int id, MasterCardItemIssued issuedRecord)
        {
            if (id != issuedRecord.Id)
            {
                return BadRequest("ID mismatch");
            }

            var existingRecord = await _context.MasterCardItemIssued
                .Include(r => r.IssuedAccessories) // Fixed: Changed Accessories to IssuedAccessories
                .FirstOrDefaultAsync(r => r.Id == id);

            if (existingRecord == null)
            {
                return NotFound($"Issued record with ID {id} not found.");
            }

            Console.WriteLine($"Issued record: {JsonSerializer.Serialize(issuedRecord)}");

            if (issuedRecord.TransactionDate != default)
            {
                existingRecord.TransactionDate = issuedRecord.TransactionDate;
            }
            existingRecord.VoucherNo = issuedRecord.VoucherNo;
            existingRecord.Issued = issuedRecord.Issued;
            existingRecord.Organization = issuedRecord.Organization;
            existingRecord.PostedBy = issuedRecord.PostedBy;
            existingRecord.Location = issuedRecord.Location;
            existingRecord.UnitPrice = issuedRecord.UnitPrice;
            existingRecord.CurrencyCode = issuedRecord.CurrencyCode;
            existingRecord.HasAccessories = issuedRecord.HasAccessories;

            if (issuedRecord.HasAccessories && issuedRecord.IssuedAccessories != null) // Fixed: Changed Accessories to IssuedAccessories
            {
                var existingAccessoryIds = existingRecord.IssuedAccessories?.Select(a => a.Id).ToList() ?? new List<int>(); // Fixed: Changed Accessories to IssuedAccessories
                var updatedAccessoryIds = issuedRecord.IssuedAccessories?.Select(a => a.Id).ToList() ?? new List<int>(); // Fixed: Changed Accessories to IssuedAccessories

                var accessoriesToRemove = existingAccessoryIds.Except(updatedAccessoryIds).ToList();
                foreach (var accessoryId in accessoriesToRemove)
                {
                    var accessoryToRemove = existingRecord.IssuedAccessories?.FirstOrDefault(a => a.Id == accessoryId); // Fixed: Changed Accessories to IssuedAccessories
                    if (accessoryToRemove != null)
                    {
                        _context.IssuedAccessories.Remove(accessoryToRemove);
                    }
                }

                existingRecord.IssuedAccessories = existingRecord.IssuedAccessories ?? new List<IssuedAccessory>(); // Fixed: Changed Accessories to IssuedAccessories
                foreach (var updatedAccessory in issuedRecord.IssuedAccessories ?? new List<IssuedAccessory>()) // Fixed: Changed Accessories to IssuedAccessories
                {
                    if (updatedAccessory.Id == 0)
                    {
                        var newAccessory = new IssuedAccessory
                        {
                            Name = updatedAccessory.Name,
                            Quantity = updatedAccessory.Quantity,
                            MasterCardItemIssuedId = existingRecord.Id
                        };
                        existingRecord.IssuedAccessories.Add(newAccessory); // Fixed: Changed Accessories to IssuedAccessories
                    }
                    else
                    {
                        var existingAccessory = existingRecord.IssuedAccessories.FirstOrDefault(a => a.Id == updatedAccessory.Id); // Fixed: Changed Accessories to IssuedAccessories
                        if (existingAccessory != null)
                        {
                            existingAccessory.Name = updatedAccessory.Name;
                            existingAccessory.Quantity = updatedAccessory.Quantity;
                        }
                    }
                }
            }
            else
            {
                if (existingRecord.IssuedAccessories != null) // Fixed: Changed Accessories to IssuedAccessories
                {
                    _context.IssuedAccessories.RemoveRange(existingRecord.IssuedAccessories); // Fixed: Changed Accessories to IssuedAccessories
                    existingRecord.IssuedAccessories.Clear(); // Fixed: Changed Accessories to IssuedAccessories
                }
                existingRecord.HasAccessories = false;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MasterCardItemIssuedExists(id))
                {
                    return NotFound();
                }
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating issued record: {ex.Message}");
                return StatusCode(500, "Internal server error while updating issued record.");
            }

            var parentItem = await _context.MasterCardItems
                .Include(i => i.ReceivedRecords)
                .Include(i => i.IssuedRecords)
                .FirstOrDefaultAsync(i => i.Id == existingRecord.MasterCardItemId);

            if (parentItem != null)
            {
                int newQuantity = _stockService.CalculateInStock(parentItem.ReceivedRecords, parentItem.IssuedRecords);
                if (parentItem.Quantity != newQuantity)
                {
                    parentItem.Quantity = newQuantity;
                    await _context.SaveChangesAsync();
                }
            }

            var updatedRecord = await _context.MasterCardItemIssued
                .Include(r => r.IssuedAccessories) // Fixed: Changed Accessories to IssuedAccessories
                .FirstOrDefaultAsync(r => r.Id == id);

            return Ok(updatedRecord);
        }

        private bool MasterCardItemReceivedExists(int id)
        {
            return _context.MasterCardItemReceived.Any(e => e.Id == id);
        }

        private bool MasterCardItemIssuedExists(int id)
        {
            return _context.MasterCardItemIssued.Any(e => e.Id == id);
        }

        // GET: api/MasterCardItems/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = new
            {
                RegisteredItems = await _context.MasterCardItems.CountAsync(),
                TotalReceived = await _context.MasterCardItemReceived.SumAsync(r => r.Received),
                TotalIssued = await _context.MasterCardItemIssued.SumAsync(i => i.Issued),
                TotalInStock = await _context.MasterCardItems.SumAsync(m => m.Quantity),
                RequestOrdersCount = await _context.RequestOrdersForIssue.CountAsync()
            };

            return Ok(stats);
        }

        // GET: api/MasterCardItems/topIssuedItems?limit=5
        [HttpGet("topIssuedItems")]
        public async Task<IActionResult> GetTopIssuedItems([FromQuery] int limit = 5)
        {
            var topItems = await _context.MasterCardItems
                .Select(item => new
                {
                    Item = item,
                    TotalIssued = item.IssuedRecords.Sum(ir => (int?)ir.Issued) ?? 0
                })
                .OrderByDescending(x => x.TotalIssued)
                .Take(limit)
                .Select(x => new
                {
                    x.Item.Id,
                    x.Item.Model,
                    x.TotalIssued
                })
                .ToListAsync();

            return Ok(topItems);
        }

        // GET: api/MasterCardItems/monthlyTrends?months=12
        [HttpGet("monthlyTrends")]
        public async Task<IActionResult> GetMonthlyTrends([FromQuery] int months = 12)
        {
            var endDate = DateTime.UtcNow;
            var startDate = endDate.AddMonths(-months);

            var receivedMonthly = await _context.MasterCardItemReceived
                .Where(r => r.Date >= startDate && r.Date <= endDate)
                .GroupBy(r => new { Year = r.Date.Year, Month = r.Date.Month })
                .Select(g => new
                {
                    YearMonth = $"{g.Key.Year}-{g.Key.Month:D2}",
                    TotalReceived = g.Sum(r => r.Received)
                })
                .ToListAsync();

            var issuedMonthly = await _context.MasterCardItemIssued
                .Where(i => i.Date >= startDate && i.Date <= endDate)
                .GroupBy(i => new { Year = i.Date.Year, Month = i.Date.Month })
                .Select(g => new
                {
                    YearMonth = $"{g.Key.Year}-{g.Key.Month:D2}",
                    TotalIssued = g.Sum(i => i.Issued)
                })
                .ToListAsync();

            var allMonths = Enumerable.Range(0, months)
                .Select(m => endDate.AddMonths(-m))
                .Select(d => $"{d.Year}-{d.Month:D2}")
                .Reverse()
                .ToList();

            var trends = allMonths.Select(m => new
            {
                Month = m,
                Received = receivedMonthly.FirstOrDefault(rm => rm.YearMonth == m)?.TotalReceived ?? 0,
                Issued = issuedMonthly.FirstOrDefault(im => im.YearMonth == m)?.TotalIssued ?? 0
            }).ToList();

            return Ok(trends);
        }
               // Updated /report endpoint to handle string dates and case-insensitive filtering
[HttpGet("report")]
public async Task<IActionResult> GetMasterCardItemsReport([FromQuery] MasterCardItemsReportFilter filter)
{
    try
    {
        // Parse and validate date filters (from string to DateTime?)
        DateTime? startDate = null;
        DateTime? endDate = null;

        if (!string.IsNullOrEmpty(filter.StartDate))
        {
            if (!DateTime.TryParse(filter.StartDate, out var sd))
                return BadRequest("Invalid startDate format. Use YYYY-MM-DD or ISO date format.");
            startDate = sd.Date;
        }

        if (!string.IsNullOrEmpty(filter.EndDate))
        {
            if (!DateTime.TryParse(filter.EndDate, out var ed))
                return BadRequest("Invalid endDate format. Use YYYY-MM-DD or ISO date format.");
            endDate = ed.Date;
        }

        if (startDate.HasValue && endDate.HasValue && startDate > endDate)
        {
            return BadRequest("startDate cannot be later than endDate.");
        }

        // Build base query with includes
        var query = _context.MasterCardItems
            .Include(i => i.ReceivedRecords)
                .ThenInclude(r => r.ReceivedAccessories)
            .Include(i => i.IssuedRecords)
                .ThenInclude(ir => ir.IssuedAccessories)
            .AsQueryable();

        // Apply top-level filters
        if (!string.IsNullOrWhiteSpace(filter.Model))
        {
            var modelLower = filter.Model.ToLower();
            query = query.Where(i => i.Model != null && i.Model.ToLower().Contains(modelLower));
        }

        if (!string.IsNullOrWhiteSpace(filter.PartNumber))
        {
            var partNumLower = filter.PartNumber.ToLower();
            query = query.Where(i => i.PartNumber != null && i.PartNumber.ToLower().Contains(partNumLower));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(i => i.Status != null && i.Status == filter.Status);
        }

        // Fetch all items
        var items = await query.ToListAsync();

        // Process each item and filter child records
        var filteredItems = items.Select(item =>
        {
            // Filter ReceivedRecords by TransactionDate (or Date)
            IQueryable<MasterCardItemReceived> filteredReceived = item.ReceivedRecords.AsQueryable();

            if (startDate.HasValue)
            {
                filteredReceived = filteredReceived.Where(r => (r.TransactionDate != default ? r.TransactionDate.Date : r.Date.Date) >= startDate.Value.Date);
            }

            if (endDate.HasValue)
            {
                filteredReceived = filteredReceived.Where(r => (r.TransactionDate != default ? r.TransactionDate.Date : r.Date.Date) <= endDate.Value.Date);
            }

            if (!string.IsNullOrWhiteSpace(filter.Organization))
            {
                filteredReceived = filteredReceived.Where(r =>
                    r.Organization != null && r.Organization.Contains(filter.Organization, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(filter.Location))
            {
                filteredReceived = filteredReceived.Where(r =>
                    r.Location != null && r.Location.Contains(filter.Location, StringComparison.OrdinalIgnoreCase));
            }

            // Filter IssuedRecords by TransactionDate (or Date)
            IQueryable<MasterCardItemIssued> filteredIssued = item.IssuedRecords.AsQueryable();

            if (startDate.HasValue)
            {
                filteredIssued = filteredIssued.Where(ir => (ir.TransactionDate != default ? ir.TransactionDate.Date : ir.Date.Date) >= startDate.Value.Date);
            }

            if (endDate.HasValue)
            {
                filteredIssued = filteredIssued.Where(ir => (ir.TransactionDate != default ? ir.TransactionDate.Date : ir.Date.Date) <= endDate.Value.Date);
            }

            if (!string.IsNullOrWhiteSpace(filter.Organization))
            {
                filteredIssued = filteredIssued.Where(ir =>
                    ir.Organization != null && ir.Organization.Contains(filter.Organization, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(filter.Location))
            {
                filteredIssued = filteredIssued.Where(ir =>
                    ir.Location != null && ir.Location.Contains(filter.Location, StringComparison.OrdinalIgnoreCase));
            }

            // ✅ Call the service method and store result
            var inStock = _stockService.CalculateInStock(item.ReceivedRecords, item.IssuedRecords);

            return new
            {
                Item = new
                {
                    item.Id,
                    item.CardNo,
                    item.Model,
                    item.PartNumber,
                    item.Description,
                    item.UnitOfMeasure,
                    item.InChAb,
                    item.UnitPack,
                    item.Status,
                    Quantity = inStock
                },
                ReceivedRecords = filteredReceived.Select(r => new
                {
                    r.Id,
                    r.MasterCardItemId,
                    r.Date,
                    r.TransactionDate,
                    r.VoucherNo,
                    r.Received,
                    r.Organization,
                    r.PostedBy,
                    r.Location,
                    r.InStock,
                    r.UnitPrice,
                    r.TotalPrice,
                    r.CurrencyCode,
                    r.HasAccessories,
                    ReceivedAccessories = filter.IncludeAccessories && r.ReceivedAccessories != null
                        ? r.ReceivedAccessories.Select(a => new
                        {
                            a.Id,
                            a.Name,
                            a.Quantity,
                            a.MasterCardItemReceivedId
                        }).ToList()
                        : null
                }).ToList(),
                IssuedRecords = filteredIssued.Select(ir => new
                {
                    ir.Id,
                    ir.MasterCardItemId,
                    ir.Date,
                    ir.TransactionDate,
                    ir.VoucherNo,
                    ir.Issued,
                    ir.Organization,
                    ir.PostedBy,
                    ir.Location,
                    ir.InStock,
                    ir.UnitPrice,
                    ir.TotalPrice,
                    ir.CurrencyCode,
                    ir.HasAccessories,
                    IssuedAccessories = filter.IncludeAccessories && ir.IssuedAccessories != null
                        ? ir.IssuedAccessories.Select(a => new
                        {
                            a.Id,
                            a.Name,
                            a.Quantity,
                            a.MasterCardItemIssuedId
                        }).ToList()
                        : null
                }).ToList(),
                Totals = new
                {
                    TotalReceived = filteredReceived.Sum(r => r.Received),
                    TotalIssued = filteredIssued.Sum(ir => ir.Issued),
                    InStock = inStock
                }
            };
        }).ToList();

        // Optional: Remove items with no relevant records if filters were applied
        if (startDate.HasValue || endDate.HasValue || 
            !string.IsNullOrWhiteSpace(filter.Organization) || 
            !string.IsNullOrWhiteSpace(filter.Location))
        {
            filteredItems = filteredItems
                .Where(i => i.ReceivedRecords.Any() || i.IssuedRecords.Any())
                .ToList();
        }

        return Ok(new
        {
            Items = filteredItems,
            Summary = new
            {
                TotalItems = filteredItems.Count,
                TotalReceived = filteredItems.Sum(i => i.Totals.TotalReceived),
                TotalIssued = filteredItems.Sum(i => i.Totals.TotalIssued),
                TotalInStock = filteredItems.Sum(i => i.Totals.InStock)
            }
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error generating report: {ex.Message}\nStackTrace: {ex.StackTrace}");
        return StatusCode(500, new
        {
            error = $"An error occurred while generating the report: {ex.Message}"
        });
    }
}      [HttpGet("models")]
        public async Task<IActionResult> GetModels()
        {
            try
            {
                var models = await _context.MasterCardItems
                    .Select(i => i.Model)
                    .Distinct()
                    .OrderBy(m => m)
                    .ToListAsync();
                return Ok(models);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error fetching models: {ex.Message}");
            }
        }

        [HttpGet("partNumbers")]
        public async Task<IActionResult> GetPartNumbers()
        {
            try
            {
                var partNumbers = await _context.MasterCardItems
                    .Select(i => i.PartNumber)
                    .Distinct()
                    .OrderBy(p => p)
                    .ToListAsync();
                return Ok(partNumbers);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error fetching part numbers: {ex.Message}");
            }
        }


   }
}

