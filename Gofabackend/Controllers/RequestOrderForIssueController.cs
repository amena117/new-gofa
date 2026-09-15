using Gofabackend.Data;
using Gofabackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RequestOrderForIssueController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<RequestOrderForIssueController> _logger;

        public RequestOrderForIssueController(ApplicationDbContext context, ILogger<RequestOrderForIssueController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/RequestOrderForIssue
        // GET: api/RequestOrderForIssue
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetRequestOrders()
        {
            try 
            {
                _logger.LogInformation("Fetching all RequestOrdersForIssue");
                var orders = await _context.RequestOrdersForIssue
                    .AsNoTracking()
                    .OrderByDescending(r => r.Date)
                    .Take(50) // DIAGNOSTIC: Limit to 50 to prevent timeouts
                    .Select(r => new 
                    {
                        r.Id,
                        r.Date,
                        r.IssueVoucherNo,
                        r.VoucherNo,
                        r.IsIssue,
                        r.RequestingUnit,
                        r.IssuingStore,
                        r.MakeAndModel,
                        r.IsServiceable,
                        r.Category,
                        r.Currency,
                        r.Status,
                        r.AcceptedBy,
                        r.AcceptedAt,
                        r.RejectedBy,
                        r.RejectedAt,
                        PreparedBy = new { r.PreparedBy.Name, r.PreparedBy.Title, r.PreparedBy.JobResponsibility, r.PreparedBy.Date },
                        VerifiedBy = new { r.VerifiedBy.Name, r.VerifiedBy.Title, r.VerifiedBy.JobResponsibility, r.VerifiedBy.Date },
                        ApprovedBy = new { r.ApprovedBy.Name, r.ApprovedBy.Title, r.ApprovedBy.JobResponsibility, r.ApprovedBy.Date },
                        IssuedItems = r.IssuedItems.Select(i => new 
                        {
                            i.Id,
                            i.ItemNo,
                            i.StockNumber,
                            i.Description,
                            i.Issued,
                            i.UnitPrice,
                            i.TotalPrice
                        }).ToList()
                    })
                    .ToListAsync();
                    
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching RequestOrdersForIssue");
                return StatusCode(500, new { message = "An error occurred while fetching orders.", detailedMessage = ex.Message });
            }
        }

        // GET: api/RequestOrderForIssue/5
        [HttpGet("{id}")]
        public async Task<ActionResult<RequestOrderForIssue>> GetRequestOrder(int id)
        {
            _logger.LogInformation("Fetching RequestOrderForIssue with ID {Id}", id);
            var requestOrder = await _context.RequestOrdersForIssue
                .Include(r => r.IssuedItems)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (requestOrder == null)
            {
                _logger.LogWarning("RequestOrderForIssue with ID {Id} not found", id);
                return NotFound();
            }

            return requestOrder;
        }

        // POST: api/RequestOrderForIssue
        [HttpPost]
        public async Task<ActionResult<RequestOrderForIssue>> CreateRequestOrder(RequestOrderForIssue requestOrder)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for CreateRequestOrder");
                return BadRequest(ModelState);
            }

            // Convert DateTimes to UTC
            requestOrder.Date = requestOrder.Date.ToUniversalTime();
            if (requestOrder.PreparedBy != null)
                requestOrder.PreparedBy.Date = requestOrder.PreparedBy.Date.ToUniversalTime();
            if (requestOrder.VerifiedBy != null)
                requestOrder.VerifiedBy.Date = requestOrder.VerifiedBy.Date.ToUniversalTime();
            if (requestOrder.ApprovedBy != null)
                requestOrder.ApprovedBy.Date = requestOrder.ApprovedBy.Date.ToUniversalTime();

            // Ensure IssuedItems have the correct foreign key
            foreach (var item in requestOrder.IssuedItems)
            {
                item.RequestOrderForIssueId = requestOrder.Id;
            }

            _context.RequestOrdersForIssue.Add(requestOrder);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created RequestOrderForIssue with ID {Id}", requestOrder.Id);
            return CreatedAtAction(nameof(GetRequestOrder), new { id = requestOrder.Id }, requestOrder);
        }

        // PUT: api/RequestOrderForIssue/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRequestOrder(int id, RequestOrderForIssue requestOrder)
        {
            // 1. Validate input
            if (id != requestOrder.Id)
            {
                _logger.LogWarning("ID mismatch for RequestOrderForIssue ID {Id}", id);
                return BadRequest("ID mismatch between URL and request body.");
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for UpdateRequestOrder ID {Id}", id);
                return BadRequest(ModelState);
            }

            // 2. Check if the entity exists
            var existingOrder = await _context.RequestOrdersForIssue
                .Include(o => o.IssuedItems)
                .FirstOrDefaultAsync(o => o.Id == id);
            if (existingOrder == null)
            {
                _logger.LogWarning("RequestOrderForIssue with ID {Id} not found", id);
                return NotFound($"RequestOrderForIssue with ID {id} not found.");
            }

            // 3. Update properties
            existingOrder.Date = requestOrder.Date.ToUniversalTime();
            existingOrder.IssueVoucherNo = requestOrder.IssueVoucherNo;
            existingOrder.VoucherNo = requestOrder.VoucherNo;
            existingOrder.RequestingUnit = requestOrder.RequestingUnit;
            existingOrder.IssuingStore = requestOrder.IssuingStore;
            existingOrder.MakeAndModel = requestOrder.MakeAndModel;
            existingOrder.Category = requestOrder.Category;
            existingOrder.Currency = requestOrder.Currency;
            existingOrder.IsIssue = requestOrder.IsIssue;
            existingOrder.IsServiceable = requestOrder.IsServiceable;

            // Update owned entities
            existingOrder.PreparedBy = requestOrder.PreparedBy;
            existingOrder.VerifiedBy = requestOrder.VerifiedBy;
            existingOrder.ApprovedBy = requestOrder.ApprovedBy;

            // 4. Handle IssuedItems update
            _logger.LogInformation("Removing {Count} existing IssuedItems for RequestOrderForIssue ID {Id}",
                existingOrder.IssuedItems?.Count ?? 0, id);
            if (existingOrder.IssuedItems != null && existingOrder.IssuedItems.Any())
            {
                _context.IssuedItems.RemoveRange(existingOrder.IssuedItems);
            }
            existingOrder.IssuedItems.Clear();

            _logger.LogInformation("Adding {Count} new IssuedItems for RequestOrderForIssue ID {Id}",
                requestOrder.IssuedItems.Count, id);
            foreach (var item in requestOrder.IssuedItems)
            {
                var newItem = new IssuedItem
                {
                    RequestOrderForIssueId = id,
                    ItemNo = item.ItemNo,
                    StockNumber = item.StockNumber,
                    Description = item.Description,
                    Issued = item.Issued,
                    UnitPrice = item.UnitPrice
                    // TotalPrice is handled by getter or database
                };
                _context.IssuedItems.Add(newItem);
                existingOrder.IssuedItems.Add(newItem);
            }

            // 5. Save changes
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Concurrency error updating RequestOrderForIssue with ID {Id}", id);
                if (!RequestOrderForIssueExists(id))
                {
                    return NotFound();
                }
                throw;
            }
            catch (DbUpdateException ex)
            {
                if (ex.InnerException?.Message.Contains("IDENTITY_INSERT") == true)
                {
                    _logger.LogError(ex, "Identity insert error for IssuedItems with RequestOrderForIssue ID {Id}", id);
                    return BadRequest("Cannot insert explicit value for identity column in table 'IssuedItems'.");
                }
                _logger.LogError(ex, "Database update error for RequestOrderForIssue ID {Id}", id);
                return StatusCode(500, $"An error occurred while updating the order: {ex.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error updating RequestOrderForIssue with ID {Id}", id);
                return StatusCode(500, $"An unexpected error occurred: {ex.Message}");
            }

            // 6. Return the updated entity
            _logger.LogInformation("Successfully updated RequestOrderForIssue with ID {Id}", id);
            return Ok(existingOrder);
        }

        private bool RequestOrderForIssueExists(int id)
        {
            return _context.RequestOrdersForIssue.Any(e => e.Id == id);
        }
        
 [HttpGet("report")]
public async Task<IActionResult> GetRequestOrdersReport([FromQuery] RequestOrderReportFilter filter)
{
    try
    {
        DateTime? startDate = string.IsNullOrEmpty(filter.StartDate) ? null : DateTime.TryParse(filter.StartDate, out var sd) ? sd : null;
        DateTime? endDate = string.IsNullOrEmpty(filter.EndDate) ? null : DateTime.TryParse(filter.EndDate, out var ed) ? ed : null;

        if (filter.StartDate != null && startDate == null)
        {
            _logger.LogWarning("Invalid startDate format: {StartDate}", filter.StartDate);
            return BadRequest("Invalid startDate format. Use YYYY-MM-DD.");
        }
        if (filter.EndDate != null && endDate == null)
        {
            _logger.LogWarning("Invalid endDate format: {EndDate}", filter.EndDate);
            return BadRequest("Invalid endDate format. Use YYYY-MM-DD.");
        }
        if (startDate.HasValue && endDate.HasValue && startDate > endDate)
        {
            _logger.LogWarning("startDate {StartDate} is later than endDate {EndDate}", filter.StartDate, filter.EndDate);
            return BadRequest("startDate cannot be later than endDate.");
        }

        var query = _context.RequestOrdersForIssue
            .Include(r => r.IssuedItems)
            .Include(r => r.PreparedBy)
            .Include(r => r.VerifiedBy)
            .Include(r => r.ApprovedBy)
            .AsQueryable();

        if (startDate.HasValue)
        {
            query = query.Where(r => r.Date >= startDate.Value);
        }
        if (endDate.HasValue)
        {
            query = query.Where(r => r.Date <= endDate.Value);
        }
        if (!string.IsNullOrWhiteSpace(filter.RequestingUnit))
        {
            var reqUnitLower = filter.RequestingUnit.ToLower();
            query = query.Where(r => r.RequestingUnit != null && r.RequestingUnit.ToLower().Contains(reqUnitLower));
        }
        if (!string.IsNullOrWhiteSpace(filter.IssuingStore))
        {
            var issuingStoreLower = filter.IssuingStore.ToLower();
            query = query.Where(r => r.IssuingStore != null && r.IssuingStore.ToLower().Contains(issuingStoreLower));
        }
        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            var categoryLower = filter.Category.ToLower();
            query = query.Where(r => r.Category != null && r.Category.ToLower().Contains(categoryLower));
        }
        if (!string.IsNullOrWhiteSpace(filter.MakeAndModel))
        {
            var makeModelLower = filter.MakeAndModel.ToLower();
            query = query.Where(r => r.MakeAndModel != null && r.MakeAndModel.ToLower().Contains(makeModelLower));
        }

        var orders = await query.ToListAsync();

        var filteredOrders = orders.Select(order =>
        {
            var filteredIssuedItems = order.IssuedItems.AsQueryable();
            if (!string.IsNullOrWhiteSpace(filter.StockNumber))
            {
                filteredIssuedItems = filteredIssuedItems.Where(i => i.StockNumber != null && i.StockNumber.Contains(filter.StockNumber, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(filter.Description))
            {
                filteredIssuedItems = filteredIssuedItems.Where(i => i.Description != null && i.Description.Contains(filter.Description, StringComparison.OrdinalIgnoreCase));
            }

            return new
            {
                Order = new
                {
                    order.Id,
                    order.Date,
                    order.IssueVoucherNo,
                    order.VoucherNo,
                    order.RequestingUnit,
                    order.IssuingStore,
                    order.MakeAndModel,
                    order.Category,
                    order.Currency,
                    order.IsIssue,
                    order.IsServiceable,
                    PreparedBy = order.PreparedBy != null ? new
                    {
                        order.PreparedBy.Name,
                        order.PreparedBy.Date
                    } : null,
                    VerifiedBy = order.VerifiedBy != null ? new
                    {
                        order.VerifiedBy.Name,
                        order.VerifiedBy.Date
                    } : null,
                    ApprovedBy = order.ApprovedBy != null ? new
                    {
                        order.ApprovedBy.Name,
                        order.ApprovedBy.Date
                    } : null
                },
                IssuedItems = filteredIssuedItems.Select(i => new
                {
                    i.Id,
                    i.RequestOrderForIssueId,
                    i.ItemNo,
                    i.StockNumber,
                    i.Description,
                    i.Issued,
                    i.UnitPrice,
                    i.TotalPrice
                }).ToList(),
                Totals = new
                {
                    TotalItems = filteredIssuedItems.Count(),
                    TotalQuantityIssued = filteredIssuedItems.Sum(i => i.Issued),
                    TotalPrice = filteredIssuedItems.Sum(i => i.TotalPrice)
                }
            };
        }).ToList();

        if (!string.IsNullOrWhiteSpace(filter.StockNumber) || !string.IsNullOrWhiteSpace(filter.Description))
        {
            filteredOrders = filteredOrders.Where(o => o.IssuedItems.Any()).ToList();
        }

        if (startDate.HasValue || endDate.HasValue || !string.IsNullOrWhiteSpace(filter.RequestingUnit) || !string.IsNullOrWhiteSpace(filter.IssuingStore) || !string.IsNullOrWhiteSpace(filter.Category) || !string.IsNullOrWhiteSpace(filter.MakeAndModel))
        {
            filteredOrders = filteredOrders.Where(o => o.IssuedItems.Any()).ToList();
        }

        _logger.LogInformation("Generated report with {Count} orders", filteredOrders.Count);
        return Ok(new
        {
            Orders = filteredOrders,
            Summary = new
            {
                TotalOrders = filteredOrders.Count,
                TotalItems = filteredOrders.Sum(o => o.Totals.TotalItems),
                TotalQuantityIssued = filteredOrders.Sum(o => o.Totals.TotalQuantityIssued),
                TotalPrice = filteredOrders.Sum(o => o.Totals.TotalPrice)
            }
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error generating report for RequestOrdersForIssue");
        return StatusCode(500, new { error = $"An error occurred while generating the report: {ex.Message}" });
    }
}

        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptRequestOrder(int id)
        {
            var order = await _context.RequestOrdersForIssue.FindAsync(id);
            if (order == null)
                return NotFound($"Request order with ID {id} not found.");

            if (order.Status != "Pending")
                return BadRequest("Only pending orders can be accepted.");

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole != "VHF" && userRole != "HF" && userRole != "SPAREPART" && userRole != "ELECTRONICS")
                return Forbid("Only store personnel can accept orders.");

            // 👇 Get user from DB using NameIdentifier claim
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Forbid();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return Forbid();

            var fullName = $"{user.FirstName} {user.LastName}".Trim();

            order.Status = "Accepted";
            order.AcceptedBy = fullName;
            order.AcceptedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Order {Id} accepted by {FullName}", id, fullName);
            return Ok(order);
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectRequestOrder(int id)
        {
            var order = await _context.RequestOrdersForIssue.FindAsync(id);
            if (order == null)
                return NotFound($"Request order with ID {id} not found.");

            if (order.Status != "Pending")
                return BadRequest("Only pending orders can be rejected.");

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole != "VHF" && userRole != "HF" && userRole != "SPAREPART" && userRole != "ELECTRONICS")
                return Forbid("Only store personnel can reject orders.");

            // 👇 Get user from DB using the authenticated user ID
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Forbid();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return Forbid();

            var fullName = $"{user.FirstName} {user.LastName}".Trim();

            order.Status = "Rejected";
            order.RejectedBy = fullName; // e.g., "Amen B"
            order.RejectedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Order {Id} rejected by {FullName}", id, fullName);
            return Ok(order);
        }

[HttpGet("categories")]
public async Task<IActionResult> GetCategories()
{
    try
    {
        var categories = await _context.RequestOrdersForIssue
            .Select(r => r.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
        return Ok(categories);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error fetching categories");
        return BadRequest($"Error fetching categories: {ex.Message}");
    }
}

[HttpGet("makeAndModels")]
public async Task<IActionResult> GetMakeAndModels()
{
    try
    {
        var makeAndModels = await _context.RequestOrdersForIssue
            .Select(r => r.MakeAndModel)
            .Distinct()
            .OrderBy(m => m)
            .ToListAsync();
        return Ok(makeAndModels);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error fetching make and models");
        return BadRequest($"Error fetching make and models: {ex.Message}");
    }
}
    }
}