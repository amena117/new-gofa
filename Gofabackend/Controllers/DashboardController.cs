using Microsoft.AspNetCore.Mvc;
using Gofabackend.Data; // Update to your actual namespace
using Microsoft.EntityFrameworkCore;

namespace Gofabackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/dashboard/summary
        [HttpGet("summary")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            try
            {
                // 1. Maintenance Requests by Status
                var maintenanceSummary = await _context.MaintenanceRequestRegisters
                    .GroupBy(m => m.Status)
                    .Select(g => new
                    {
                        status = g.Key,
                        count = g.Count(),
                        totalCost = g.Sum(r => r.PartsCost + ((decimal?)r.ManHours * 250m))
                    }).ToListAsync();

                // 2. Spare Parts Requests by Status
                var sparePartsSummary = await _context.SparePartsRequests
                    .GroupBy(r => r.Status)
                    .Select(g => new
                    {
                        status = g.Key,
                        count = g.Count(),
                        totalCost = g.Sum(r => r.PartCost + r.LabourCost)
                    }).ToListAsync();

                // 3. MiniStore Bincard Summary
                var miniStoreSummary = await _context.MiniStoreBinCards
                    .Select(card => new
                    {
                        stockNumber = card.StockNumber,
                        balance = card.Balance,
                        totalSerials = card.SerialNumbers.Count,
                        available = card.SerialNumbers.Count(s => s.Status == "Available in stock"),
                        given = card.SerialNumbers.Count(s => s.Status == "Given")
                    }).ToListAsync();

                return Ok(new
                {
                    maintenanceStatus = maintenanceSummary,
                    sparePartsStatus = sparePartsSummary,
                    miniStoreSummary = miniStoreSummary
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/dashboard/bincard
        [HttpGet("bincard")]
        public async Task<IActionResult> GetAllBincards()
        {
            try
            {
                var bincards = await _context.MiniStoreBinCards
                    .Select(card => new
                    {
                        stockNumber = card.StockNumber,
                        serialNumbers = card.SerialNumbers.Select(s => new
                        {
                            s.SerialNumber,
                            s.Status
                        })
                    }).ToListAsync();

                return Ok(bincards);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/dashboard/bincard/{stockNumber}
        [HttpGet("bincard/{stockNumber}")]
        public async Task<IActionResult> GetSerialsByStockNumber(string stockNumber)
        {
            if (string.IsNullOrWhiteSpace(stockNumber))
                return BadRequest("Stock number is required.");

            try
            {
                var serials = await _context.MiniStoreBinCards
                    .Where(b => b.StockNumber == stockNumber)
                    .SelectMany(b => b.SerialNumbers)
                    .Select(s => new
                    {
                        s.SerialNumber,
                        s.Status
                    }).ToListAsync();

                if (!serials.Any())
                    return NotFound($"No serial numbers found for stock number '{stockNumber}'.");

                return Ok(serials);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/dashboard/maintenance-details?status={status}
        [HttpGet("maintenance-details")]
        public async Task<IActionResult> GetMaintenanceDetails([FromQuery] string status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return BadRequest("Status parameter is required.");

            try
            {
                var results = await _context.MaintenanceRequestRegisters
                    .Where(r => r.Status == status)
                    .Select(r => new
                    {
                        r.SerialNoOfEquip,
                        r.Model,
                        r.Status,
                        r.MaintenanceType,
                        r.ManHours,
                        r.PartsCost,
                        totalCost = r.PartsCost + ((decimal?)r.ManHours * 250m)
                    }).ToListAsync();

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
