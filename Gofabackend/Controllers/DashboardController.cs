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

        // GET: api/dashboard/maintenance-stats
        [HttpGet("maintenance-stats")]
        public async Task<IActionResult> GetMaintenanceStats()
        {
            try
            {
                var all = await _context.MaintenanceRequestRegisters
                    .Include(r => r.EquipmentType)
                    .ToListAsync();

                // ── Top-level counts ──────────────────────────────────────────
                var totalMaintained = all.Count(r => r.Status == "Maintenance Finished" || r.Status == "Client Received");
                var totalDoOut      = all.Count(r => r.Status == "Do Out");
                var totalOnMaint    = all.Count(r => r.Status == "On Maintaining" || r.Status == "On Maintenance");
                var totalPending    = all.Count(r => r.Status == "Pending");
                var totalAll        = all.Count;

                // Total cost of maintained items
                var totalMaintainedCost = all
                    .Where(r => r.Status == "Maintenance Finished" || r.Status == "Client Received")
                    .Sum(r => (r.PartsCost ?? 0) + ((decimal?)(r.ManHours ?? 0) * 250m ?? 0));

                // ── Per-team breakdown ────────────────────────────────────────
                var teams = new[] { "POWER", "RADIO_MAINTENANCE", "OFFICE_MACHINE", "HF_RADIO" };
                var teamStats = teams.Select(team => new
                {
                    team,
                    maintained  = all.Count(r => (r.MaintenanceType ?? "").ToUpper().Contains(team.ToUpper())
                                              && (r.Status == "Maintenance Finished" || r.Status == "Client Received")),
                    onMaintenance = all.Count(r => (r.MaintenanceType ?? "").ToUpper().Contains(team.ToUpper())
                                              && (r.Status == "On Maintaining" || r.Status == "On Maintenance")),
                    total       = all.Count(r => (r.MaintenanceType ?? "").ToUpper().Contains(team.ToUpper()))
                }).ToList();

                // ── Per-equipment-type breakdown ──────────────────────────────
                var byEquipmentType = all
                    .GroupBy(r => r.EquipmentType != null ? r.EquipmentType.EquipmentTypeName : "Unknown")
                    .Select(g => new
                    {
                        equipmentType = g.Key,
                        total         = g.Count(),
                        maintained    = g.Count(r => r.Status == "Maintenance Finished" || r.Status == "Client Received"),
                        onMaintenance = g.Count(r => r.Status == "On Maintaining" || r.Status == "On Maintenance")
                    })
                    .OrderByDescending(x => x.total)
                    .ToList();

                // ── Frequently maintained items (by serial number) ────────────
                var frequentItems = all
                    .Where(r => !string.IsNullOrEmpty(r.SerialNoOfEquip))
                    .GroupBy(r => r.SerialNoOfEquip)
                    .Select(g => new
                    {
                        serialNo      = g.Key,
                        count         = g.Count(),
                        model         = g.First().Model ?? "N/A",
                        equipmentType = g.First().EquipmentType != null ? g.First().EquipmentType.EquipmentTypeName : "N/A",
                        lastSeen      = g.Max(r => r.DateWorkOrderReceived),
                        statuses      = g.Select(r => r.Status).Distinct().ToList()
                    })
                    .Where(x => x.count > 1)
                    .OrderByDescending(x => x.count)
                    .Take(10)
                    .ToList();

                // ── Status breakdown (all statuses) ──────────────────────────
                var statusBreakdown = all
                    .GroupBy(r => r.Status ?? "Unknown")
                    .Select(g => new { status = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .ToList();

                return Ok(new
                {
                    totalAll,
                    totalMaintained,
                    totalMaintainedCost,
                    totalDoOut,
                    totalOnMaintenance = totalOnMaint,
                    totalPending,
                    teamStats,
                    byEquipmentType,
                    frequentItems,
                    statusBreakdown
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/dashboard/leader-stats
        // Extended stats for MAINTENANCE_LEADER dashboard
        [HttpGet("leader-stats")]
        public async Task<IActionResult> GetLeaderStats()
        {
            try
            {
                var allRequests = await _context.MaintenanceRequestRegisters
                    .Include(r => r.EquipmentType)
                    .ToListAsync();

                var allSpare = await _context.SparePartsRequests.ToListAsync();
                var allBinCards = await _context.MiniStoreBinCards
                    .Include(b => b.SerialNumbers)
                    .ToListAsync();

                var now = DateTime.UtcNow;

                // ── Top-level KPIs ────────────────────────────────────────────
                var totalActive      = allRequests.Count(r => r.Status == "On Maintaining" || r.Status == "On Maintenance");
                var totalWaitingPart = allRequests.Count(r => r.Status == "Waiting for Spare Part");
                var totalFinished    = allRequests.Count(r => r.Status == "Maintenance Finished" || r.Status == "Client Received");
                var totalDoOut       = allRequests.Count(r => r.Status == "Do Out");
                var totalAll         = allRequests.Count;

                var spareAwaitingLeader = allSpare.Count(s => s.CurrentStage == "MAINTENANCE_LEADER");
                var spareAtMinistore    = allSpare.Count(s => s.CurrentStage == "MINISTORE");

                // ── Spare parts approval queue (waiting for MAINTENANCE_LEADER) ─
                var spareQueue = allSpare
                    .Where(s => s.CurrentStage == "MAINTENANCE_LEADER")
                    .Select(s => new
                    {
                        s.Id,
                        s.WorksOrderNumber,
                        s.StockNumber,
                        s.RequestType,
                        s.QuantityAsked,
                        s.RequestedBy,
                        s.Reason,
                        s.IsUrgent,
                        s.Status
                    })
                    .OrderByDescending(s => s.IsUrgent)
                    .ToList();

                // ── Stalled requests (stuck > 5 days in blocking statuses) ────
                var stalledStatuses = new[] { "Waiting for Spare Part", "On Maintaining", "On Maintenance", "Approved - Waiting for Parts" };
                var stalledRequests = allRequests
                    .Where(r => stalledStatuses.Contains(r.Status)
                             && (now - r.DateWorkOrderReceived.ToUniversalTime()).TotalDays > 5)
                    .Select(r => new
                    {
                        r.WorksOrderNumber,
                        r.SerialNoOfEquip,
                        r.Model,
                        r.Status,
                        r.MaintenanceType,
                        DaysStuck = (int)(now - r.DateWorkOrderReceived.ToUniversalTime()).TotalDays
                    })
                    .OrderByDescending(r => r.DaysStuck)
                    .Take(10)
                    .ToList();

                // ── Per-unit breakdown ────────────────────────────────────────
                var unitMap = new Dictionary<string, string[]>
                {
                    { "Power",        new[] { "POWER" } },
                    { "Office / IT",  new[] { "OFFICE_MACHINE" } },
                    { "Radio",        new[] { "RADIO_MAINTENANCE" } },
                    { "VHF Radio",    new[] { "VHF_RADIO" } },
                    { "HF Radio",     new[] { "HF_RADIO" } },
                };

                var unitBreakdown = unitMap.Select(kv => new
                {
                    unit         = kv.Key,
                    active       = allRequests.Count(r => kv.Value.Any(t => (r.MaintenanceType ?? "").ToUpper().Contains(t))
                                                       && (r.Status == "On Maintaining" || r.Status == "On Maintenance")),
                    waitingPart  = allRequests.Count(r => kv.Value.Any(t => (r.MaintenanceType ?? "").ToUpper().Contains(t))
                                                       && r.Status == "Waiting for Spare Part"),
                    finished     = allRequests.Count(r => kv.Value.Any(t => (r.MaintenanceType ?? "").ToUpper().Contains(t))
                                                       && (r.Status == "Maintenance Finished" || r.Status == "Client Received")),
                    total        = allRequests.Count(r => kv.Value.Any(t => (r.MaintenanceType ?? "").ToUpper().Contains(t))),
                    pendingSpare = allSpare.Count(s => kv.Value.Any(t => (s.RequestType ?? "").ToUpper().Contains(t))
                                                    && s.CurrentStage == "MAINTENANCE_LEADER")
                }).ToList();

                // ── Ministore health ──────────────────────────────────────────
                var lowStockItems = allBinCards
                    .Where(b => (b.Balance ?? 0) < 10)
                    .Select(b => new
                    {
                        b.StockNumber,
                        b.Description,
                        b.Balance
                    })
                    .OrderBy(b => b.Balance)
                    .ToList();

                var ministoreHealth = new
                {
                    totalBinCards   = allBinCards.Count,
                    lowStockCount   = lowStockItems.Count,
                    lowStockItems,
                    pendingAtStore  = spareAtMinistore
                };

                // ── Status breakdown ──────────────────────────────────────────
                var statusBreakdown = allRequests
                    .GroupBy(r => r.Status ?? "Unknown")
                    .Select(g => new { status = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .ToList();

                // ── Recent activity (last 15 events) ─────────────────────────
                var recentActivity = allRequests
                    .OrderByDescending(r => r.DateWorkOrderReceived)
                    .Take(15)
                    .Select(r => new
                    {
                        r.WorksOrderNumber,
                        r.SerialNoOfEquip,
                        r.Model,
                        r.Status,
                        r.MaintenanceType,
                        Date = r.DateWorkOrderReceived
                    })
                    .ToList();

                // ── Frequently maintained items (by serial number) ────────────
                var frequentItems = allRequests
                    .Where(r => !string.IsNullOrEmpty(r.SerialNoOfEquip))
                    .GroupBy(r => r.SerialNoOfEquip)
                    .Select(g => new
                    {
                        serialNo      = g.Key,
                        count         = g.Count(),
                        model         = g.First().Model ?? "N/A",
                        equipmentType = g.First().EquipmentType != null ? g.First().EquipmentType.EquipmentTypeName : "N/A",
                        lastSeen      = g.Max(r => r.DateWorkOrderReceived),
                        maintenanceType = g.First().MaintenanceType ?? "N/A"
                    })
                    .Where(x => x.count > 1)
                    .OrderByDescending(x => x.count)
                    .Take(10)
                    .ToList();

                return Ok(new
                {
                    // KPIs
                    totalAll,
                    totalActive,
                    totalWaitingPart,
                    totalFinished,
                    totalDoOut,
                    spareAwaitingLeader,
                    spareAtMinistore,
                    // Sections
                    spareQueue,
                    stalledRequests,
                    unitBreakdown,
                    ministoreHealth,
                    statusBreakdown,
                    recentActivity,
                    frequentItems
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
