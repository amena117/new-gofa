using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Gofabackend.Data;
using Gofabackend.Models;
using System.ComponentModel.DataAnnotations;
using Gofabackend.DTO;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SparePartsRequestController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SparePartsRequestController> _logger;

        public SparePartsRequestController(ApplicationDbContext context, ILogger<SparePartsRequestController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/SparePartsRequest (with pagination

        [HttpGet("all")] public async Task<ActionResult<IEnumerable<SparePartsRequest>>> GetAllSparePartsRequests() 
        { 
            var spareParts = await _context.SparePartsRequests.ToListAsync();
            return Ok(spareParts);
        }



        // GET: api/SparePartsRequest/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SparePartsRequest>> GetSparePartsRequest(int id)
        {
            var sparePartsRequest = await _context.SparePartsRequests.FindAsync(id);

            if (sparePartsRequest == null)
            {
                _logger.LogWarning($"Spare parts request with ID {id} not found.");
                return NotFound("Spare parts request not found.");
            }

            return sparePartsRequest;
        }

        [HttpGet("accept/{id}")]
        public async Task<ActionResult<SparePartsRequest>> GetRequestForAcceptance(int id)
        {
            try
            {
                var request = await _context.SparePartsRequests.FirstOrDefaultAsync(r => r.Id == id);

                if (request == null)
                {
                    return NotFound($"Request with ID {id} not found.");
                }

                return Ok(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching request for acceptance.");
                return StatusCode(500, "An error occurred while fetching the request.");
            }
        }


        // POST: api/SparePartsRequest/add-cost
        [HttpPut("update-part-cost/{worksOrderNumber}")]
        public async Task<IActionResult> UpdatePartCost(int worksOrderNumber, [FromBody] decimal partCost)
        {
            try
            {
                _logger.LogInformation($"Updating part cost for Works Order Number {worksOrderNumber}");

                // ✅ Update MaintenanceRequestRegister (only PartsCost, not LaborCost)
                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    return NotFound("Maintenance request not found.");
                }

                maintenanceRequest.PartsCost = partCost;
                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);

                // ✅ Update SparePartsRequests (PartCost + recalc TotalCost)
                var sparePartsRequests = await _context.SparePartsRequests
                    .Where(s => s.WorksOrderNumber == worksOrderNumber)
                    .ToListAsync();

                foreach (var request in sparePartsRequests)
                {
                    request.PartCost = partCost;
                    request.TotalCost = partCost + request.LabourCost; // use LabourCost that’s already stored
                }

                await _context.SaveChangesAsync();
                return Ok(new { message = "✅ Part cost updated in both tables successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating part cost");
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }


        // POST: api/SparePartsRequest
        [HttpPost]
        public async Task<ActionResult<SparePartsRequest>> PostSparePartsRequest(SparePartsRequest sparePartsRequest)
        {
            if (sparePartsRequest.WorksOrderNumber <= 0)
            {
                _logger.LogWarning("WorksOrderNumber must be a positive integer.");
                return BadRequest("WorksOrderNumber must be a positive integer.");
            }

            if (string.IsNullOrEmpty(sparePartsRequest.StockNumber))
            {
                _logger.LogWarning("StockNumber is required.");
                return BadRequest("StockNumber is required.");
            }

            _logger.LogInformation($"Validating WorksOrderNumber: {sparePartsRequest.WorksOrderNumber}");

            // Ensure the associated WorksOrderNumber exists in MaintenanceRequestRegisters
            var maintenanceRequestExists = await _context.MaintenanceRequestRegisters
                .AnyAsync(m => m.WorksOrderNumber == sparePartsRequest.WorksOrderNumber);

            if (!maintenanceRequestExists)
            {
                _logger.LogWarning($"WorksOrderNumber {sparePartsRequest.WorksOrderNumber} not found.");
                return NotFound("Maintenance request not found.");
            }

            try
            {
                _context.SparePartsRequests.Add(sparePartsRequest);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Spare parts request created with ID {sparePartsRequest.Id}");
                return CreatedAtAction(nameof(GetSparePartsRequest), new { id = sparePartsRequest.Id }, sparePartsRequest);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError($"Database error: {ex.InnerException?.Message}");
                return StatusCode(500, $"A database error occurred: {ex.InnerException?.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"General error: {ex.Message}");
                return StatusCode(500, $"An unexpected error occurred: {ex.Message}");
            }
        }

        [HttpGet("by-worksorder/{worksOrderNumber}")]
public async Task<IActionResult> GetByWorksOrder(int worksOrderNumber)
{
    var request = await _context.SparePartsRequests
        .FirstOrDefaultAsync(r => r.WorksOrderNumber == worksOrderNumber);

    if (request == null)
        return NotFound();

    return Ok(request);
}
[HttpPut("by-worksorder/{worksOrderNumber}")]
public async Task<IActionResult> UpdateByWorksOrder(
    int worksOrderNumber, 
    [FromBody] UpdateSparePartsRequestsDto dto)
{
    if (!ModelState.IsValid)
        return BadRequest(ModelState);

    var request = await _context.SparePartsRequests
        .FirstOrDefaultAsync(r => r.WorksOrderNumber == worksOrderNumber);

    if (request == null)
        return NotFound($"No spare parts request found for Works Order Number {worksOrderNumber}.");

    // Update only the specified fields
    request.RequestedBy = dto.RequestedBy;
    request.Reason = dto.Reason;
    request.StockNumber = dto.StockNumber;
    request.CurrentStage = dto.CurrentStage;

    await _context.SaveChangesAsync();

    return NoContent();
}

        [HttpPost("bulk")]
        public async Task<IActionResult> PostSparePartsRequestsBulk([FromBody] List<SparePartsRequest> sparePartsRequests)
        {
            if (sparePartsRequests == null || !sparePartsRequests.Any())
                return BadRequest("No spare parts requests provided.");

            var validRequests = new List<SparePartsRequest>();
            var skippedRequests = new List<int>();

            foreach (var request in sparePartsRequests)
            {
                // Reset Id so EF generates it
                request.Id = 0;

                // Validate foreign key exists
                var maintenanceExists = await _context.MaintenanceRequestRegisters
                    .AnyAsync(m => m.WorksOrderNumber == request.WorksOrderNumber);

                if (!maintenanceExists)
                {
                    skippedRequests.Add(request.WorksOrderNumber);
                    continue;
                }

                // Ensure status is set to Pending if not already set
                if (string.IsNullOrEmpty(request.Status))
                {
                    request.Status = "Pending";
                }

                // Ensure CurrentStage is set to MAINTENANCE_LEADER for proper routing
                if (string.IsNullOrEmpty(request.CurrentStage))
                {
                    request.CurrentStage = "MAINTENANCE_LEADER";
                }

                validRequests.Add(request);
            }

            if (!validRequests.Any())
                return BadRequest("No valid spare parts requests found.");

            try
            {
                _context.SparePartsRequests.AddRange(validRequests);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"{validRequests.Count} requests submitted successfully.",
                    skipped = skippedRequests
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting bulk spare parts requests.");
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }




        // PUT: api/SparePartsRequest/5
        // PUT: api/SparePartsRequest/5
        [HttpPut("{id}")]
        public IActionResult UpdateSparePartsRequest(int id, [FromBody] UpdateSparePartsRequestDto request)
        {
            try
            {
                // Validate required fields
                if (string.IsNullOrEmpty(request.StockNumber))
                {
                    return BadRequest("StockNumber is required.");
                }

                if (string.IsNullOrEmpty(request.ApprovalDate))
                {
                    return BadRequest("ApprovalDate is required.");
                }

                // Parse ApprovalDate
                DateTime approvalDate;
                if (!DateTime.TryParse(request.ApprovalDate, out approvalDate))
                {
                    return BadRequest("Invalid ApprovalDate format.");
                }

                // Check if the stock number exists in MiniStoreBinCard
                var miniStoreRecord = _context.MiniStoreBinCards
                    .FirstOrDefault(m => m.StockNumber == request.StockNumber);

                if (miniStoreRecord == null)
                {
                    return NotFound($"Stock number {request.StockNumber} not found in MiniStoreBinCard.");
                }

                // Validate that quantityAsked >= quantityApproved
                var sparePartsRequest = _context.SparePartsRequests.FirstOrDefault(s => s.Id == id);
                if (sparePartsRequest == null)
                {
                    return NotFound($"Spare parts request with ID {id} not found.");
                }

                if (request.QuantityApproved > sparePartsRequest.QuantityAsked)
                {
                    return BadRequest("Quantity Approved cannot exceed Quantity Asked.");
                }

                // Update the MiniStoreBinCard balance
                if (miniStoreRecord.Balance < request.QuantityApproved)
                {
                    return BadRequest("Insufficient balance in MiniStoreBinCard.");
                }

                miniStoreRecord.Balance -= request.QuantityApproved;

                // Update the SparePartsRequest record
                sparePartsRequest.QuantityApproved = request.QuantityApproved;
                sparePartsRequest.ApprovedBy = request.ApprovedBy;
                sparePartsRequest.ApprovalDate = approvalDate;
                sparePartsRequest.Remark = request.Remark;
                sparePartsRequest.SerialNumber = request.SerialNumber;
                sparePartsRequest.IsUrgent = true;

                // Now, also update the RequestedBy to ApprovedBy (user role)
                sparePartsRequest.RequestedBy = request.ApprovedBy;  // Set RequestedBy to the role of the user

                _context.SaveChanges();

                return Ok(new { message = "Response submitted successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating spare parts request: {ex.Message}");
                return StatusCode(500, "An error occurred while processing the request.");
            }
        }

        [HttpPut("approve/{id}")]
        public IActionResult ApproveRequest(int id, [FromBody] SparePartsRequestDto approvalData)
        {
            var request = _context.SparePartsRequests.FirstOrDefault(r => r.Id == id);
            if (request == null)
            {
                return NotFound(new { message = "Request not found" });
            }

            if (approvalData == null)
            {
                return BadRequest(new { message = "Approval data is null" });
            }

            try
            {
                request.ApprovedBy = approvalData.ApprovedBy;
                request.QuantityApproved = approvalData.QuantityApproved;
                request.ApprovalDate = DateTime.UtcNow;

                if (!string.IsNullOrEmpty(approvalData.Remark))
                {
                    request.Remark = approvalData.Remark;
                }

                _context.SaveChanges();

                return Ok(new { message = "Request approved successfully" }); // <<< THIS is correct
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPut("route-to-team-leader/{id}")]
        public async Task<IActionResult> RouteToTeamLeader(int id, [FromBody] RouteToTeamLeaderDto routeData)
        {
            try
            {
                var request = await _context.SparePartsRequests.FindAsync(id);
                if (request == null)
                    return NotFound("Request not found.");

                // Map request type to appropriate team leader
                var teamLeaderMap = new Dictionary<string, string>
                {
                    { "POWER", "PTEAM_LEADER" },
                    { "OFFICE_MACHINE", "OTEAM_LEADER" },
                    { "VHF_RADIO", "VTEAM_LEADER" },
                    { "HF_RADIO", "HTEAM_LEADER" }
                };

                if (!teamLeaderMap.TryGetValue(request.RequestType, out var teamLeader))
                    return BadRequest("Invalid request type for routing.");

                request.CurrentStage = teamLeader;
                request.Status = "Routed to Team Leader";
                request.ApprovedBy = routeData.ApprovedBy;
                request.ApprovalDate = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { message = $"Request routed to {teamLeader} successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error routing request to team leader.");
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HttpGet("by-current-stage/{stage}")]
        public async Task<IActionResult> GetByCurrentStage(string stage)
        {
            try
            {
                var requests = await _context.SparePartsRequests
                    .Where(r => r.CurrentStage == stage)
                    .ToListAsync();

                return Ok(requests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching requests by stage.");
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }








        // PATCH: api/SparePartsRequest/{id}/update-requested-by
        [HttpPatch("{id}/update-requested-by")]
        public IActionResult UpdateRequestedBy(int id, [FromBody] UpdateRequestedByDto request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.RequestedBy))
                {
                    return BadRequest("RequestedBy is required.");
                }

                var sparePartsRequest = _context.SparePartsRequests.FirstOrDefault(s => s.Id == id);
                if (sparePartsRequest == null)
                {
                    return NotFound($"Spare parts request with ID {id} not found.");
                }

                sparePartsRequest.RequestedBy = request.RequestedBy;

                // ✅ Optionally validate CurrentStage
                var validStages = new[] { "TEAM_LEADER", "MAINTENANCE_LEADER", "MINISTORE", "COMPLETED" };
                if (!string.IsNullOrEmpty(request.CurrentStage))
                {
                    if (!validStages.Contains(request.CurrentStage))
                    {
                        return BadRequest("Invalid CurrentStage value.");
                    }

                    sparePartsRequest.CurrentStage = request.CurrentStage;
                }

                _context.SaveChanges();

                return Ok(new { message = "RequestedBy and CurrentStage updated successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating request: {ex.Message}");
                return StatusCode(500, "An error occurred while processing the request.");
            }
        }



        // DELETE: api/SparePartsRequest/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSparePartsRequest(int id)
        {
            var sparePartsRequest = await _context.SparePartsRequests.FindAsync(id);
            if (sparePartsRequest == null)
            {
                _logger.LogWarning($"Spare parts request with ID {id} not found.");
                return NotFound("Spare parts request not found.");
            }

            _context.SparePartsRequests.Remove(sparePartsRequest);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Spare parts request with ID {id} deleted successfully.");
            return NoContent();
        }

        private bool SparePartsRequestExists(int id)
        {
            return _context.SparePartsRequests.Any(e => e.Id == id);
        }
    }

    // DTO for updating a spare parts request
    public class UpdateSparePartsRequestDto
    {
        [Required(ErrorMessage = "ID is required.")]
        public int Id { get; set; }

        [Required(ErrorMessage = "WorksOrderNumber is required.")]
        public int WorksOrderNumber { get; set; }

        [Required(ErrorMessage = "StockNumber is required.")]
        //[RegularExpression(@"^\d+$", ErrorMessage = "StockNumber must be numeric.")]
        public string StockNumber { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "QuantityApproved must be greater than zero.")]
        public int QuantityApproved { get; set; }

        [Required(ErrorMessage = "ApprovedBy is required.")]
        public string ApprovedBy { get; set; } = string.Empty;

        [Required(ErrorMessage = "ApprovalDate is required.")]
        public string ApprovalDate { get; set; } = string.Empty;

        public string Remark { get; set; } = string.Empty;
        
        public string SerialNumber { get; set; } = string.Empty;
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }

    public class RouteToTeamLeaderDto
    {
        public string ApprovedBy { get; set; } = string.Empty;
    }

}