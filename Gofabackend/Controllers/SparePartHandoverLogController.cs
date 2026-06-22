using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.DTOs;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SparePartHandoverLogController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SparePartHandoverLogController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/SparePartHandoverLog
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var logs = await _context.SparePartHandoverLogs
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
            return Ok(logs);
        }

        // POST: api/SparePartHandoverLog
        // Records a handover — does NOT touch inventory balances or serial statuses
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SparePartHandoverLog log)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            log.CreatedAt = DateTime.UtcNow;

            _context.SparePartHandoverLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Handover recorded successfully.", id = log.Id });
        }

        // POST: api/SparePartHandoverLog/batch
        // Records multiple items in a single handover batch
        [HttpPost("batch")]
        public async Task<IActionResult> CreateBatch([FromBody] SparePartHandoverBatchDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "At least one item must be included in the handover." });

            var logs = new List<SparePartHandoverLog>();
            var createdAt = DateTime.UtcNow;

            foreach (var item in dto.Items)
            {
                var log = new SparePartHandoverLog
                {
                    StockNumber = item.StockNumber.Trim(),
                    Description = item.Description.Trim(),
                    SerialNumber = item.SerialNumber.Trim(),
                    Quantity = item.Quantity,
                    TechnicianName = dto.TechnicianName.Trim(),
                    WorksOrderNumber = dto.WorksOrderNumber?.Trim(),
                    IssuedBy = dto.IssuedBy?.Trim(),
                    Remark = item.Remark?.Trim(),
                    IssueDate = dto.IssueDate,
                    IsConfirmedByTechnician = false,
                    CreatedAt = createdAt
                };

                logs.Add(log);
            }

            _context.SparePartHandoverLogs.AddRange(logs);
            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                message = $"Batch handover recorded successfully. {logs.Count} item(s) added.",
                count = logs.Count,
                ids = logs.Select(l => l.Id).ToList()
            });
        }

        // GET: api/SparePartHandoverLog/by-technician/{name}
        [HttpGet("by-technician/{name}")]
        public async Task<IActionResult> GetByTechnician(string name)
        {
            var logs = await _context.SparePartHandoverLogs
                .Where(l => l.TechnicianName.ToLower() == name.ToLower())
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
            return Ok(logs);
        }

        // PUT: api/SparePartHandoverLog/confirm/{id}
        [HttpPut("confirm/{id}")]
        public async Task<IActionResult> ConfirmHandover(int id)
        {
            var log = await _context.SparePartHandoverLogs.FindAsync(id);
            if (log == null)
                return NotFound(new { message = "Handover record not found." });

            if (log.IsConfirmedByTechnician)
                return BadRequest(new { message = "Handover already confirmed." });

            log.IsConfirmedByTechnician = true;
            log.ConfirmedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Handover confirmed successfully." });
        }
    }
}
