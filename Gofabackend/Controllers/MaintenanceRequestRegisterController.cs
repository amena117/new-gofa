using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Gofabackend.Data;
using Microsoft.Extensions.Logging;
using Gofabackend.DTO;
using System.Globalization;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MaintenanceRequestRegisterController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MaintenanceRequestRegisterController> _logger;

        public MaintenanceRequestRegisterController(ApplicationDbContext context, ILogger<MaintenanceRequestRegisterController> logger)
        {
            _context = context;
            _logger = logger;
        }


        private int GetIso8601WeekOfYear(DateTime time)
        {
            DayOfWeek day = CultureInfo.InvariantCulture.Calendar.GetDayOfWeek(time);
            if (day >= DayOfWeek.Monday && day <= DayOfWeek.Wednesday)
            {
                time = time.AddDays(3);
            }

            return CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(
                time, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        }

        #region GET Endpoints

        // GET: api/MaintenanceRequestRegister
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MaintenanceRequestRegister>>> GetMaintenanceRequestRegisters()
        {
            try
            {
                _logger.LogInformation("Fetching all maintenance request registers");

                // Fetch and sort the data by CreatedAt in descending order (newest first)
                // Include EquipmentType and LetterRegistration
                var requests = await _context.MaintenanceRequestRegisters
                    .Include(r => r.EquipmentType)
                    .Include(r => r.LetterRegistration)
                    .OrderByDescending(r => r.DateWorkOrderReceived)
                    .Select(r => new
                    {
                        r.Id, r.WorksOrderNumber, r.Nomenclature, r.Quantity,
                        r.RequestedBy, r.SerialNoOfEquip, r.BriefDescriptionOfWork,
                        r.DateWorkOrderReceived, r.MaintenanceType, r.Model,
                        r.RequestedTo, r.RepairStartDate, r.RepairFinishDate,
                        r.Status, r.Recommendation, r.ManHours, r.PartsCost,
                        r.LaborCost, r.TotalCost, r.Remark,
                        r.GivenTo, r.Approval, r.RecieverRemark, r.RecievedDate,
                        r.EquipmentTypeId, r.LetterId, r.CurrentHandler, r.StatusStage,
                        r.RegisteredBy, r.RejectReason, r.UpdatedAt, r.Quality,
                        r.MaintainedBy, r.MaintainedByUserId, r.TechnicianRole,
                        letterFrom = r.LetterRegistration != null ? r.LetterRegistration.From : null,
                        letterRecommendBy = r.LetterRegistration != null ? r.LetterRegistration.RecommendBy : null,
                        equipmentTypeName = r.EquipmentType != null ? r.EquipmentType.EquipmentTypeName : null
                    })
                    .ToListAsync();

                return Ok(requests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching maintenance request registers");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
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

        [HttpGet("active-work-orders")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActiveWorkOrders()
        {
            try
            {
                // Fetch all work orders regardless of status, newest first
                var workOrders = await _context.MaintenanceRequestRegisters
                    .OrderByDescending(r => r.DateWorkOrderReceived)
                    .Select(r => new
                    {
                        worksOrderNumber = r.WorksOrderNumber,
                        nomenclature = r.Nomenclature,
                        serialNumber = r.SerialNoOfEquip,
                        model = r.Model,
                        status = r.Status
                    })
                    .Take(1000) 
                    .ToListAsync();

                Console.WriteLine($"[Debug] Fetched {workOrders.Count} work orders from DB.");

                var result = workOrders.Select(r => new {
                    worksOrderNumber = r.worksOrderNumber.ToString(),
                    nomenclature = r.nomenclature ?? "Unknown",
                    serialNumber = r.serialNumber ?? "N/A",
                    model = r.model ?? "N/A",
                    status = r.status ?? "No Status"
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error] GetActiveWorkOrders failed: {ex.Message}");
                _logger.LogError(ex, "Error fetching work orders");
                return StatusCode(500, new { message = "Internal Server Error", error = ex.Message });
            }
        }

        // GET: api/MaintenanceRequestRegister/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MaintenanceRequestRegister>> GetMaintenanceRequestRegister(int id)
        {
            try
            {
                _logger.LogInformation($"Fetching maintenance request register with ID {id}");
                var maintenanceRequestRegister = await _context.MaintenanceRequestRegisters
                    .Include(r => r.EquipmentType)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (maintenanceRequestRegister == null)
                {
                    _logger.LogWarning($"Maintenance request register with ID {id} not found");
                    return NotFound();
                }

                return maintenanceRequestRegister;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching maintenance request register with ID {id}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }

        // GET: api/MaintenanceRequestRegister/filtered
        [HttpGet("filtered")]
        public async Task<ActionResult<IEnumerable<MaintenanceRequestRegister>>> GetFilteredMaintenanceRequests(
    [FromQuery] string? requestedTo = null,
    [FromQuery] string? maintenanceType = null)
        {
            try
            {
                _logger.LogInformation($"Fetching filtered maintenance request registers with MaintenanceType: {maintenanceType} and RequestedTo: {requestedTo}");

                if (string.IsNullOrEmpty(requestedTo) && string.IsNullOrEmpty(maintenanceType))
                {
                    _logger.LogWarning("At least one of requestedTo or maintenanceType is required.");
                    return BadRequest("At least one of requestedTo or maintenanceType is required.");
                }

                var query = _context.MaintenanceRequestRegisters
                    .Include(r => r.EquipmentType)
                    .AsQueryable();

                // Filter by requestedTo when provided
                if (!string.IsNullOrEmpty(requestedTo))
                {
                    query = query.Where(m => m.RequestedTo != null &&
                        m.RequestedTo.ToUpper().Trim() == requestedTo.ToUpper().Trim());
                }

                // Filter by maintenanceType when provided
                if (!string.IsNullOrEmpty(maintenanceType))
                {
                    query = query.Where(m => m.MaintenanceType != null &&
                        m.MaintenanceType.ToUpper().Trim() == maintenanceType.ToUpper().Trim());
                }

                var filteredRequests = await query.ToListAsync();

                if (!filteredRequests.Any())
                {
                    return NotFound("No matching records found.");
                }

                return Ok(filteredRequests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching filtered maintenance request registers");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }


        // GET: api/MaintenanceRequestRegister/finished
        [HttpGet("finished")]
        public async Task<ActionResult<IEnumerable<MaintenanceRequestRegister>>> GetFinishedMaintenanceRequests()
        {
            try
            {
                _logger.LogInformation("Fetching maintenance requests with Status = 'Maintenance Finished'");

                var finishedRequests = await _context.MaintenanceRequestRegisters
                    .Include(r => r.EquipmentType)
                    .Where(m => m.Status == "Maintenance Finished")
                    .ToListAsync();

                if (!finishedRequests.Any())
                {
                    _logger.LogWarning("No maintenance requests found with Status = 'Maintenance Finished'");
                    return NotFound("No maintenance requests found with Status = 'Maintenance Finished'.");
                }

                return Ok(finishedRequests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching maintenance requests with Status = 'Maintenance Finished'");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }

        [HttpGet("by-worksorder/{worksOrderNumber}")]
        public async Task<IActionResult> GetByWorksOrder(int worksOrderNumber)
        {
            var r = await _context.MaintenanceRequestRegisters
                .Include(r => r.EquipmentType)
                .Include(r => r.LetterRegistration)
                .FirstOrDefaultAsync(r => r.WorksOrderNumber == worksOrderNumber);

            if (r == null)
                return NotFound($"Maintenance request with WorksOrderNumber {worksOrderNumber} not found.");

            var response = new
            {
                r.Id, r.WorksOrderNumber, r.Nomenclature, r.Quantity,
                r.RequestedBy, r.SerialNoOfEquip, r.BriefDescriptionOfWork,
                r.DateWorkOrderReceived, r.MaintenanceType, r.Model,
                r.RequestedTo, r.RepairStartDate, r.RepairFinishDate,
                r.Status, r.Recommendation, r.ManHours, r.PartsCost,
                r.LaborCost, r.TotalCost, r.Remark,
                r.GivenTo, r.Approval, r.RecieverRemark, r.RecievedDate,
                r.EquipmentTypeId, r.LetterId, r.CurrentHandler, r.StatusStage,
                r.RegisteredBy, r.RejectReason, r.UpdatedAt, r.Quality,
                r.MaintainedBy, r.MaintainedByUserId, r.TechnicianRole,
                letterFrom = r.LetterRegistration != null ? r.LetterRegistration.From : null,
                letterRecommendBy = r.LetterRegistration != null ? r.LetterRegistration.RecommendBy : null,
                equipmentTypeName = r.EquipmentType != null ? r.EquipmentType.EquipmentTypeName : null
            };

            return Ok(response);
        }


        [HttpGet("status/do-out")]
public async Task<IActionResult> GetDoOutRequests()
{
    var requests = await _context.MaintenanceRequestRegisters
        .Where(r => r.Status == "Do Out")
        .Select(r => new
        {
            r.Id,
            r.WorksOrderNumber,
            // Accessing navigation property directly in Select ensures EF handles the join correctly
            nomenclature = (r.Nomenclature != null && r.Nomenclature != "") 
                ? r.Nomenclature 
                : (r.EquipmentType != null ? r.EquipmentType.EquipmentTypeName : "N/A"),
            r.SerialNoOfEquip,
            r.Model,
            r.MaintenanceType,
            r.StatusStage,
            r.RequestedBy,
            r.RequestedTo,
            r.Status,
            r.MaintainedBy,
            r.DateWorkOrderReceived, // Requested Date
            r.RepairFinishDate,      // Do Out / Maintained Date
            r.UpdatedAt              // Tracking last update date
        })
        .OrderByDescending(r => r.DateWorkOrderReceived)
        .ToListAsync();

    return Ok(requests);
}

        [HttpGet("pending-delivery")]
        public async Task<IActionResult> GetPendingDeliveries()
        {
            try
            {
                var pendingDeliveries = await _context.MaintenanceRequestRegisters
                    .Where(r => r.Status == "Maintenance Finished" || r.Status == "Quality Check")
                    .OrderByDescending(r => r.DateWorkOrderReceived)
                    .ToListAsync();

                return Ok(pendingDeliveries);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching pending deliveries");
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HttpGet("by-status/{status}")]
        public async Task<IActionResult> GetByStatus(string status)
        {
            try
            {
                var requests = await _context.MaintenanceRequestRegisters
                    .Include(r => r.EquipmentType)
                    .Where(r => r.Status == status)
                    .OrderByDescending(r => r.DateWorkOrderReceived)
                    .ToListAsync();

                return Ok(requests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching requests by status");
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }


        [HttpPut("by-worksorder/{worksOrderNumber}/update-serial-model")]
        public async Task<IActionResult> UpdateSerialAndModelByWorksOrder(int worksOrderNumber, [FromBody] UpdateSerialModelDto dto)
        {
            var request = await _context.MaintenanceRequestRegisters
                .FirstOrDefaultAsync(r => r.WorksOrderNumber == worksOrderNumber);

            if (request == null)
            {
                return NotFound($"Maintenance request with WorksOrderNumber {worksOrderNumber} not found.");
            }

            request.SerialNoOfEquip = dto.SerialNoOfEquip;
            request.Model = dto.Model;

            if (!string.IsNullOrEmpty(dto.Status))
            {
                request.Status = dto.Status;
            }
            else
            {
                request.Status = "On Maintenance";
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }


        // GET: Return only Quality Check records
        [HttpGet("Qualify")]
        public IActionResult GetQualityCheckRequests()
        {
            var requests = _context.MaintenanceRequestRegisters
                .Include(r => r.LetterRegistration)
                .Where(r => r.Status == "Quality Check")
                .Select(r => new
                {
                    r.Id, r.WorksOrderNumber, r.Nomenclature, r.Quantity,
                    r.RequestedBy, r.SerialNoOfEquip, r.BriefDescriptionOfWork,
                    r.DateWorkOrderReceived, r.MaintenanceType, r.Model,
                    r.RequestedTo, r.RepairStartDate, r.RepairFinishDate,
                    r.Status, r.Recommendation, r.ManHours, r.PartsCost,
                    r.LaborCost, r.TotalCost, r.Remark,
                    r.GivenTo, r.Approval, r.RecieverRemark, r.RecievedDate,
                    r.EquipmentTypeId, r.LetterId, r.CurrentHandler, r.StatusStage,
                    r.RegisteredBy, r.RejectReason, r.UpdatedAt, r.Quality,
                    r.MaintainedBy, r.MaintainedByUserId, r.TechnicianRole,
                    letterFrom = r.LetterRegistration != null ? r.LetterRegistration.From : null,
                    letterRecommendBy = r.LetterRegistration != null ? r.LetterRegistration.RecommendBy : null
                })
                .ToList();
            return Ok(requests);
        }

// PUT: Qualify one item (change its status)
[HttpPut("qualify/{worksOrderNumber:int}")]
public IActionResult QualifyRequest(int worksOrderNumber)
{
    // Look up the maintenance request by works order number
    var request = _context.MaintenanceRequestRegisters
        .FirstOrDefault(r => r.WorksOrderNumber == worksOrderNumber);

    if (request == null)
    {
        return NotFound($"No maintenance request found with WorksOrderNumber '{worksOrderNumber}'.");
    }

    // Only allow qualification if current status is "Quality Check"
    if (request.Status != "Quality Check")
    {
        return BadRequest("Only requests in 'Quality Check' status can be qualified.");
    }

    // Update the status to "Maintenance Finished"
    request.Status = "Maintenance Finished";

    // Save the changes to the database
    _context.SaveChanges();

    return Ok("Maintenance request status updated to 'Maintenance Finished'.");
}





        [HttpGet("report")]
        public async Task<ActionResult<IEnumerable<object>>> GetReport(
    [FromQuery] string startDate,
    [FromQuery] string endDate,
    [FromQuery] string interval = "daily",
    [FromQuery] string role = null)
        {
            try
            {
                // Parse dates
                if (!DateTime.TryParseExact(startDate, "MM/dd/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedStartDate) ||
                    !DateTime.TryParseExact(endDate, "MM/dd/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedEndDate))
                {
                    return BadRequest("Invalid date format. Please use MM/dd/yyyy.");
                }

                Console.WriteLine($"Received role: {role}");

                // Base query
                var query = _context.MaintenanceRequestRegisters
                    .Where(r => r.DateWorkOrderReceived >= parsedStartDate &&
                                r.DateWorkOrderReceived <= parsedEndDate);

                // Apply role filter
                if (!string.IsNullOrWhiteSpace(role))
                {
                    var normalizedRole = role.Trim().ToUpper();

                    switch (normalizedRole)
                    {
                        case "PPC":
                        case "MAINTENANCE_LEADER":
                            // No filter
                            break;

                        case "OTEAM_LEADER":
                        case "OFFICE_MACHINE":
                            query = query.Where(r => EF.Functions.Like((r.MaintenanceType ?? "").Trim().ToLower(), "office_machine"));
                            break;

                        case "PTEAM_LEADER":
                        case "POWER":
                            query = query.Where(r => EF.Functions.Like((r.MaintenanceType ?? "").Trim().ToLower(), "power"));
                            break;

                        case "RTEAM_LEADER":
                        case "RADIO_MAINTENANCE":
                            query = query.Where(r => EF.Functions.Like((r.MaintenanceType ?? "").Trim().ToLower(), "RADIO_MAINTENANCE"));
                            break;

                        case "VTEAM_LEADER":
                        case "VHF_RADIO":
                            query = query.Where(r => EF.Functions.Like((r.MaintenanceType ?? "").Trim().ToLower(), "vhf_radio"));
                            break;

                        default:
                            return Ok(Enumerable.Empty<object>());
                    }
                }

                var records = await query.ToListAsync();

                Console.WriteLine($"Filtered record count: {records.Count}");

                // Grouping logic
                IEnumerable<object> grouped = interval.ToLower() switch
                {
                    "weekly" => records.GroupBy(r => new
                    {
                        Year = r.DateWorkOrderReceived.Year,
                        Week = GetIso8601WeekOfYear(r.DateWorkOrderReceived)
                    }).Select(g => new { Period = $"Week {g.Key.Week}, {g.Key.Year}", Requests = g.ToList() }),

                    "monthly" => records.GroupBy(r => new
                    {
                        Year = r.DateWorkOrderReceived.Year,
                        Month = r.DateWorkOrderReceived.Month
                    }).Select(g => new
                    {
                        Period = $"{CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(g.Key.Month)} {g.Key.Year}",
                        Requests = g.ToList()
                    }),

                    _ => records.GroupBy(r => r.DateWorkOrderReceived.Date)
                                .Select(g => new
                                {
                                    Period = g.Key.ToString("MM/dd/yyyy"),
                                    Requests = g.ToList()
                                })
                };

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating report: {ex.Message}");
                return StatusCode(500, "An error occurred while generating the report.");
            }
        }


        #endregion

        #region POST Endpoints

        // POST: api/MaintenanceRequestRegister
        [HttpPost]
        public async Task<ActionResult<MaintenanceRequestRegister>> PostMaintenanceRequestRegister(MaintenanceRequestCreateDto createDto)
        {
            try
            {
                _logger.LogInformation("Creating new maintenance request register");

                // Auto-generate WorksOrderNumber from LetterId if not provided
                int worksOrderNumber = createDto.WorksOrderNumber ?? createDto.LetterId ?? 0;
                
                // Check if a maintenance request with the same WorksOrderNumber already exists
                if (worksOrderNumber > 0)
                {
                    var existingRequest = await _context.MaintenanceRequestRegisters
                        .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                    if (existingRequest != null)
                    {
                        _logger.LogWarning($"Maintenance request with Works Order Number {worksOrderNumber} already exists");
                        return Conflict(new { message = $"A maintenance request with Works Order Number {worksOrderNumber} already exists." });
                    }
                }

                var maintenanceRequest = new MaintenanceRequestRegister
                {
                    WorksOrderNumber = worksOrderNumber,
                    Nomenclature = createDto.Nomenclature ?? string.Empty,
                    Quantity = createDto.Quantity,
                    RequestedBy = createDto.RequestedBy,
                    SerialNoOfEquip = createDto.SerialNoOfEquip,
                    BriefDescriptionOfWork = createDto.BriefDescriptionOfWork,
                    DateWorkOrderReceived = createDto.DateWorkOrderReceived,
                    EquipmentTypeId = createDto.EquipmentTypeId,
                    CurrentHandler = createDto.CurrentHandler,
                    StatusStage = createDto.StatusStage,
                    LetterId = createDto.LetterId,
                    RegisteredBy = createDto.RegisteredBy, // ✅ Save who registered this request

                    // Optional fields set to default values
                    MaintenanceType = null,
                    Model = createDto.Model,
                    RequestedTo = null,
                    RepairStartDate = null,
                    RepairFinishDate = null,
                    Status = "Pending",
                    ManHours = 0,
                    PartsCost = 0,
                    Remark = null
                };

                _context.MaintenanceRequestRegisters.Add(maintenanceRequest);
                await _context.SaveChangesAsync();

                // If LetterId was provided, update the letter's status to "Approved"
                if (createDto.LetterId.HasValue)
                {
                    var letter = await _context.Letters
                        .FirstOrDefaultAsync(l => l.LetterId == createDto.LetterId.Value);

                    if (letter != null)
                    {
                        letter.Status = "Approved";
                        _context.Letters.Update(letter);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"Letter ID {letter.LetterId} status updated to 'Approved'");
                    }
                    else
                    {
                        _logger.LogWarning($"Letter with ID {createDto.LetterId} not found. Skipping status update.");
                    }
                }

                _logger.LogInformation($"Maintenance request register created with Works Order Number {maintenanceRequest.WorksOrderNumber}");
                return CreatedAtAction(nameof(GetMaintenanceRequestRegister), new { id = maintenanceRequest.Id }, maintenanceRequest);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating maintenance request register");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<MaintenanceRequestRegister>> UpdateMaintenanceRequestRegister(int id, MaintenanceRequestInserUpdateDto updateDto)
        {
            try
            {
                _logger.LogInformation($"Updating maintenance request register with ID {id}");

                // Find the existing maintenance request by ID
                var maintenanceRequest = await _context.MaintenanceRequestRegisters.FindAsync(id);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request register with ID {id} not found");
                    return NotFound($"Maintenance request register with ID {id} not found");
                }

                // Update the fields — RequestedBy is intentionally excluded to preserve the original requester
                maintenanceRequest.Nomenclature = updateDto.Nomenclature;
                maintenanceRequest.Quantity = updateDto.Quantity;
                maintenanceRequest.SerialNoOfEquip = updateDto.SerialNoOfEquip;
                maintenanceRequest.BriefDescriptionOfWork = updateDto.BriefDescriptionOfWork;
                maintenanceRequest.DateWorkOrderReceived = updateDto.DateWorkOrderReceived;
                maintenanceRequest.EquipmentTypeId = updateDto.EquipmentTypeId;


                // Save changes to the database
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance request register with ID {id} updated successfully");
                return Ok(maintenanceRequest);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating maintenance request register with ID {id}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }

        #endregion

        #region PUT Endpoints

        // PUT: api/MaintenanceRequestRegister/update/{worksOrderNumber}
        [HttpPut("update/{worksOrderNumber}")]
        public async Task<IActionResult> UpdateMaintenanceRequest(int worksOrderNumber, [FromBody] MaintenanceRequestUpdateDto updateDto)
        {
            try
            {
                _logger.LogInformation($"Updating maintenance request register with Works Order Number {worksOrderNumber}");

                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request register with Works Order Number {worksOrderNumber} not found");
                    return NotFound();
                }

                // Update fields
                maintenanceRequest.MaintenanceType = updateDto.MaintenanceType;
                // Do NOT overwrite Model — it was set during registration
                maintenanceRequest.RequestedTo = updateDto.RequestedTo;
                // Status moves to "Waiting for Approval" — team leader must approve before work starts
                maintenanceRequest.Status = "Waiting for Approval";
                // Keep StatusStage in sync so the details page reflects the current department
                if (!string.IsNullOrEmpty(updateDto.StatusStage))
                {
                    maintenanceRequest.StatusStage = updateDto.StatusStage;
                }

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance request register updated successfully for Works Order Number {worksOrderNumber}");
                return Ok(new { message = "Maintenance request updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating maintenance request register with Works Order Number {worksOrderNumber}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }


        [HttpPut("update-full/{worksOrderNumber}")]
        public async Task<IActionResult> UpdateFullMaintenanceRequest(int worksOrderNumber, [FromBody] MaintenanceRequestFullUpdateDto dto)
        {
            var request = await _context.MaintenanceRequestRegisters
                .FirstOrDefaultAsync(r => r.WorksOrderNumber == worksOrderNumber);

            if (request == null)
                return NotFound($"Maintenance request with WorksOrderNumber {worksOrderNumber} not found.");

            // Update fields
            request.SerialNoOfEquip = dto.SerialNoOfEquip;
            request.EquipmentTypeId = dto.EquipmentTypeId;
            request.Model = dto.Model;
            request.RequestedBy = dto.RequestedBy;
            request.BriefDescriptionOfWork = dto.BriefDescriptionOfWork;
            request.DateWorkOrderReceived = dto.DateWorkOrderReceived;
            request.StatusStage = dto.StatusStage;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Maintenance request updated successfully." });
        }


        // PUT: api/MaintenanceRequestRegister/accept/{worksOrderNumber}
        [HttpPut("accept/{worksOrderNumber}")]
        public async Task<IActionResult> AcceptMaintenanceRequest(int worksOrderNumber)
        {
            try
            {
                _logger.LogInformation($"Accepting maintenance request with Works Order Number {worksOrderNumber}");

                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request with Works Order Number {worksOrderNumber} not found");
                    return NotFound();
                }

                maintenanceRequest.Status = "Accepted";
                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance request accepted successfully for Works Order Number {worksOrderNumber}");
                return Ok(new { message = "Maintenance request accepted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error accepting maintenance request with Works Order Number {worksOrderNumber}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }

        // PUT: api/MaintenanceRequestRegister/maintain/{worksOrderNumber}
        [HttpPut("maintain/{worksOrderNumber}")]
        public async Task<IActionResult> MaintainMaintenanceRequest(int worksOrderNumber)
        {
            try
            {
                _logger.LogInformation($"Marking maintenance request as 'On Maintaining' with Works Order Number {worksOrderNumber}");

                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request with Works Order Number {worksOrderNumber} not found");
                    return NotFound();
                }

                maintenanceRequest.Status = "On Maintaining";
                maintenanceRequest.RepairStartDate = DateTime.UtcNow;

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance request marked as 'On Maintaining' successfully for Works Order Number {worksOrderNumber}");
                return Ok(new { message = "Maintenance request marked as 'On Maintaining' successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error marking maintenance request as 'On Maintaining' with Works Order Number {worksOrderNumber}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }

        // PUT: api/MaintenanceRequestRegister/update-maintenance/{worksOrderNumber}
        [HttpPut("update-maintenance/{worksOrderNumber}")]
        public async Task<IActionResult> UpdateMaintenanceDetails(int worksOrderNumber, [FromBody] MaintenanceDetailsUpdateDto updateDto)
        {
            try
            {
                _logger.LogInformation($"Updating maintenance details for Works Order Number {worksOrderNumber}");

                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request with Works Order Number {worksOrderNumber} not found");
                    return NotFound("Maintenance request not found.");
                }

                // Update maintenance request details
                maintenanceRequest.RepairFinishDate = updateDto.RepairFinishDate;
                maintenanceRequest.Status = updateDto.Status;
                maintenanceRequest.ManHours = updateDto.ManHours;
                maintenanceRequest.Remark = updateDto.Remark;
                maintenanceRequest.MaintainedBy = updateDto.MaintainedBy;

                // Update PartsCost if provided
                if (updateDto.PartsCost.HasValue)
                {
                    maintenanceRequest.PartsCost = updateDto.PartsCost.Value;
                }

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);

                // Calculate labor cost (250 per hour)
                decimal laborCost = (decimal)(updateDto.ManHours ?? 0) * 250;
                decimal partsCost = maintenanceRequest.PartsCost ?? 0;

                // Update SparePartsRequests for this WorksOrderNumber
                var sparePartsRequests = await _context.SparePartsRequests
                    .Where(s => s.WorksOrderNumber == worksOrderNumber)
                    .ToListAsync();

                foreach (var request in sparePartsRequests)
                {
                    request.LabourCost = laborCost;
                    request.TotalCost = partsCost + laborCost;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance details and SparePartsRequest costs updated successfully for Works Order Number {worksOrderNumber}");
                return Ok(new { message = "Maintenance details and spare parts costs updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating maintenance details for Works Order Number {worksOrderNumber}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }


        [HttpPut("update-status/{worksOrderNumber}")]
        public async Task<IActionResult> UpdateMaintenanceStatus(int worksOrderNumber, [FromBody] UpdateMaintenanceStatusDto dto)
        {
            try
            {
                var request = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (request == null)
                    return NotFound("Maintenance request not found.");

                // Validate status
                var validStatuses = new[]
                {
                    "Pending", "On Maintenance", "Quality Check", "Maintenance Finished", 
                    "Client Received", "Rejected", "Waiting for Spare Part", "Approved - Waiting for Parts",
                    "Waiting for Maintenance Leader Approval", "Waiting for Ministore"
                };

                if (!validStatuses.Contains(dto.Status))
                    return BadRequest($"Invalid status. Valid statuses are: {string.Join(", ", validStatuses)}");

                request.Status = dto.Status;
                request.UpdatedAt = DateTime.UtcNow;

                // If status is "Waiting for Spare Part", update related spare parts requests
                if (dto.Status == "Waiting for Spare Part")
                {
                    var spareRequests = await _context.SparePartsRequests
                        .Where(s => s.WorksOrderNumber == worksOrderNumber)
                        .ToListAsync();

                    foreach (var spare in spareRequests)
                    {
                        spare.Status = "Pending Delivery";
                        spare.CurrentStage = "MINISTORE";
                    }

                    if (spareRequests.Any())
                    {
                        _context.SparePartsRequests.UpdateRange(spareRequests);
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Status updated successfully.", status = request.Status });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating maintenance status");
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }



        // PUT: api/MaintenanceRequestRegister/give/{worksOrderNumber}
        [HttpPut("give/{worksOrderNumber}")]
        public async Task<IActionResult> GiveMaintenanceRequestToClient(int worksOrderNumber)
        {
            try
            {
                _logger.LogInformation($"Marking maintenance request as 'Given to Client' with Works Order Number {worksOrderNumber}");

                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request with Works Order Number {worksOrderNumber} not found");
                    return NotFound();
                }

                maintenanceRequest.Status = "Given to Client";

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance request marked as 'Given to Client' successfully for Works Order Number {worksOrderNumber}");
                return Ok(new { message = "Maintenance request marked as 'Given to Client' successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error marking maintenance request as 'Given to Client' with Works Order Number {worksOrderNumber}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }

        [HttpPut("{id}/serial-model")]
public async Task<IActionResult> UpdateSerialModel(int id, UpdateSerialModelDto dto)
{
    var request = await _context.MaintenanceRequestRegisters
        .FirstOrDefaultAsync(r => r.Id == id); // or WorksOrderNumber if that's your key

    if (request == null)
        return NotFound($"Maintenance request with ID {id} not found.");

    request.SerialNoOfEquip = dto.SerialNoOfEquip;
    request.Model = dto.Model;

    await _context.SaveChangesAsync();
    return NoContent();
}

        // PUT: api/MaintenanceRequestRegister/assign/{worksOrderNumber}
        [HttpPut("assign/{worksOrderNumber}")]
public async Task<IActionResult> AssignMaintenanceRequest(int worksOrderNumber, [FromBody] AssignRequestDto dto)
{
    try
    {
        _logger.LogInformation($"Assigning maintenance request {worksOrderNumber} to {dto.RequestedTo}");

        var maintenanceRequest = await _context.MaintenanceRequestRegisters
            .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

        if (maintenanceRequest == null)
        {
            return NotFound($"Maintenance request with WorksOrderNumber {worksOrderNumber} not found.");
        }

        // Update the RequestedTo field
        maintenanceRequest.RequestedTo = dto.RequestedTo;

        // Team leader approval: move status to "On Maintaining" and record start time
        maintenanceRequest.Status = "On Maintaining";
        maintenanceRequest.RepairStartDate = DateTime.UtcNow;

        // NOTE: MaintenanceType is intentionally NOT changed here.
        // It stays as set by PPC (e.g. RADIO_MAINTENANCE) so the team leader
        // can always see all requests under their department.
        // RequestedTo is what routes to VHF/HF sub-units.

        // Optional: update a recommendation column if needed
        if (!string.IsNullOrWhiteSpace(dto.Recommendation))
        {
            maintenanceRequest.Recommendation = dto.Recommendation;
        }

        _context.MaintenanceRequestRegisters.Update(maintenanceRequest);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Assignment updated successfully",
            worksOrderNumber = maintenanceRequest.WorksOrderNumber,
            requestedTo = maintenanceRequest.RequestedTo
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, $"Error updating assignment for WorksOrderNumber {worksOrderNumber}");
        return StatusCode(500, $"Internal Server Error: {ex.Message}");
    }

    }
    // DTO for assignment
    public class AssignRequestDto
    {
        public string RequestedTo { get; set; } = string.Empty;
        public string? Recommendation { get; set; }
    }


       



        [HttpPatch("reject/{worksOrderNumber}")]
        public async Task<IActionResult> RejectRequest(int worksOrderNumber, [FromBody] RejectDto dto)
        {
            // Find the maintenance request by WorksOrderNumber
            var request = await _context.MaintenanceRequestRegisters
                .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

            if (request == null)
                return NotFound(new { message = "Request not found" });

            // ✅ Update maintenance request
            request.Status = "Rejected";
            request.RejectReason = dto.Reason;
            request.UpdatedAt = DateTime.Now;

            // ✅ Delete related SparePartsRequests
            var spareParts = _context.SparePartsRequests
                .Where(s => s.WorksOrderNumber == request.WorksOrderNumber)
                .ToList();

            if (spareParts.Any())
            {
                _context.SparePartsRequests.RemoveRange(spareParts);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Request rejected successfully",
                worksOrderNumber = request.WorksOrderNumber,
                status = request.Status,
                reason = request.RejectReason,
                updatedAt = request.UpdatedAt
            });
        }

        // DTO remains the same
        public class RejectDto
        {
            public string Reason { get; set; } = string.Empty;
        }



        [HttpPut("deliver/{worksOrderNumber}")]
        public async Task<IActionResult> DeliverForClients(int worksOrderNumber, [FromBody] DeliveryRequest deliveryRequest)
        {
            try
            {
                _logger.LogInformation($"Delivering maintenance request for Works Order Number {worksOrderNumber}");

                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request with Works Order Number {worksOrderNumber} not found");
                    return NotFound($"Maintenance request with WorksOrderNumber {worksOrderNumber} not found.");
                }

                // Update delivery-related fields
                maintenanceRequest.GivenTo = deliveryRequest.GivenTo;
                maintenanceRequest.Approval = deliveryRequest.Approval;
                maintenanceRequest.RecieverRemark = deliveryRequest.RecieverRemark;
                maintenanceRequest.RecievedDate = deliveryRequest.RecievedDate;

                // Update status to "Client Received"
                maintenanceRequest.Status = "Client Received";
                maintenanceRequest.UpdatedAt = DateTime.UtcNow;

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);
                await _context.SaveChangesAsync();

                // ✅ NEW: Update related spare parts requests status
                var sparePartsRequests = await _context.SparePartsRequests
                    .Where(s => s.WorksOrderNumber == worksOrderNumber)
                    .ToListAsync();

                foreach (var spareRequest in sparePartsRequests)
                {
                    spareRequest.Status = "Delivered to Client";
                    spareRequest.CurrentStage = "COMPLETED";
                }

                if (sparePartsRequests.Any())
                {
                    _context.SparePartsRequests.UpdateRange(sparePartsRequests);
                    await _context.SaveChangesAsync();
                }

                _logger.LogInformation($"Maintenance request delivered successfully for Works Order Number {worksOrderNumber}");
                return Ok(new { message = "Maintenance request delivered successfully.", worksOrderNumber = worksOrderNumber });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error delivering maintenance request for Works Order Number {worksOrderNumber}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
            }
        }
        #endregion

        #region DELETE Endpoint

        // DELETE: api/MaintenanceRequestRegister/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMaintenanceRequest(int id)
        {
            try
            {
                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.Id == id);

                if (maintenanceRequest == null)
                {
                    return NotFound($"Maintenance request with ID {id} not found.");
                }

                _context.MaintenanceRequestRegisters.Remove(maintenanceRequest);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Maintenance request deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting maintenance request with ID {id}");
                return StatusCode(500, $"Internal Server Error: {ex.Message}");
            }
        }

        #endregion

        #region Helper Methods

        // Helper method to check if a maintenance request exists
        private bool MaintenanceRequestRegisterExists(int id)
        {
            try
            {
                _logger.LogInformation($"Checking if maintenance request register with ID {id} exists");
                return _context.MaintenanceRequestRegisters.Any(e => e.Id == id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking if maintenance request register with ID {id} exists");
                return false;
            }
        }

        #endregion

        // DTO for the delivery request
        public class DeliveryRequest
        {
            public string? GivenTo { get; set; }
            public string? Approval { get; set; }
            public string? RecieverRemark { get; set; }
            public DateTime? RecievedDate { get; set; }
        }
    }
}