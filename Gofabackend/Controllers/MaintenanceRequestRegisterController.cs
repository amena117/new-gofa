using System;
using Microsoft.AspNetCore.Mvc;
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
                var requests = await _context.MaintenanceRequestRegisters
                    .OrderByDescending(r => r.DateWorkOrderReceived) // Sort by the CreatedAt field
                    .ToListAsync();

                return Ok(requests); // Return the sorted list
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

        // GET: api/MaintenanceRequestRegister/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MaintenanceRequestRegister>> GetMaintenanceRequestRegister(int id)
        {
            try
            {
                _logger.LogInformation($"Fetching maintenance request register with ID {id}");
                var maintenanceRequestRegister = await _context.MaintenanceRequestRegisters.FindAsync(id);

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
    [FromQuery] string maintenanceType,
    [FromQuery] string requestedTo)
        {
            try
            {
                _logger.LogInformation($"Fetching filtered maintenance request registers with MaintenanceType: {maintenanceType} and RequestedTo: {requestedTo}");

                if (string.IsNullOrEmpty(maintenanceType) || string.IsNullOrEmpty(requestedTo))
                {
                    _logger.LogWarning("Invalid or missing query parameters.");
                    return BadRequest("Both maintenanceType and requestedTo are required.");
                }

                var filteredRequests = await _context.MaintenanceRequestRegisters
                    .Where(m =>
                        m.MaintenanceType.ToUpper().Trim() == maintenanceType.ToUpper().Trim() &&
                        m.RequestedTo.ToUpper().Trim() == requestedTo.ToUpper().Trim())
                    .ToListAsync();

                if (!filteredRequests.Any())
                {
                    _logger.LogWarning($"No maintenance request registers found with MaintenanceType: {maintenanceType} and RequestedTo: {requestedTo}");
                    return NotFound("No matching records found.");
                }

                return Ok(filteredRequests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching filtered maintenance request registers with MaintenanceType: {maintenanceType} and RequestedTo: {requestedTo}");
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
            var request = await _context.MaintenanceRequestRegisters
                .FirstOrDefaultAsync(r => r.WorksOrderNumber == worksOrderNumber);

            if (request == null)
            {
                return NotFound($"Maintenance request with WorksOrderNumber {worksOrderNumber} not found.");
            }

            // Shape the response to always include these fields
            var response = new
            {
                id = request.Id,
                worksOrderNumber = request.WorksOrderNumber,
                serialNoOfEquip = request.SerialNoOfEquip ?? string.Empty,
                model = request.Model ?? string.Empty
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
            r.SerialNoOfEquip,
            r.Model,
            r.Status,
            r.DateWorkOrderReceived
        })
        .ToListAsync();

    if (!requests.Any())
    {
        return NotFound("No maintenance requests found with status 'do out'.");
    }

    return Ok(requests);
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

            request.Status = "On Maintenance";

            await _context.SaveChangesAsync();
            return NoContent();
        }


        // GET: Return only Quality Check records
        [HttpGet("Qualify")]
public IActionResult GetQualityCheckRequests()
{
    var requests = _context.MaintenanceRequestRegisters
        .Where(r => r.Status == "Quality Check")
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

                var maintenanceRequest = new MaintenanceRequestRegister
                {
                    WorksOrderNumber = createDto.WorksOrderNumber,
                    Nomenclature = createDto.Nomenclature,
                    Quantity = createDto.Quantity,
                    RequestedBy = createDto.RequestedBy,
                    SerialNoOfEquip = createDto.SerialNoOfEquip,
                    BriefDescriptionOfWork = createDto.BriefDescriptionOfWork,
                    DateWorkOrderReceived = createDto.DateWorkOrderReceived,
                    EquipmentTypeId = createDto.EquipmentTypeId,
                    CurrentHandler = createDto.CurrentHandler,
                    StatusStage = createDto.StatusStage,
                    LetterId = createDto.LetterId,

                    // Optional fields set to default values
                    MaintenanceType = null,
                    Model = null,
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

                // Update the fields
                maintenanceRequest.Nomenclature = updateDto.Nomenclature;
                maintenanceRequest.Quantity = updateDto.Quantity;
                maintenanceRequest.RequestedBy = updateDto.RequestedBy;
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
                maintenanceRequest.Model = updateDto.Model;
                maintenanceRequest.RequestedTo = updateDto.RequestedTo;
                maintenanceRequest.Status = "On Maintaining";
                maintenanceRequest.RepairStartDate = DateTime.UtcNow;

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

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);

                // Calculate labor cost (for example: 250 per hour)
                decimal laborCost = (decimal)(updateDto.ManHours * 250);

                // Update SparePartsRequests for this WorksOrderNumber
                var sparePartsRequests = await _context.SparePartsRequests
                    .Where(s => s.WorksOrderNumber == worksOrderNumber)
                    .ToListAsync();

                foreach (var request in sparePartsRequests)
                {
                    request.LabourCost = laborCost;
                    request.TotalCost = request.PartCost + laborCost;
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


        [HttpPut("update-maintenance-only/{worksOrderNumber}")]
        public async Task<IActionResult> UpdateMaintenanceOnly(int worksOrderNumber, [FromBody] MaintenanceDetailsUpdateDto updateDto)
        {
            try
            {
                _logger.LogInformation($"Updating maintenance details for Works Order Number {worksOrderNumber}");

                // Find the maintenance request
                var maintenanceRequest = await _context.MaintenanceRequestRegisters
                    .FirstOrDefaultAsync(m => m.WorksOrderNumber == worksOrderNumber);

                if (maintenanceRequest == null)
                {
                    _logger.LogWarning($"Maintenance request with Works Order Number {worksOrderNumber} not found");
                    return NotFound("Maintenance request not found.");
                }

                // Update only the MaintenanceRequestRegister fields
                maintenanceRequest.RepairFinishDate = updateDto.RepairFinishDate;
                maintenanceRequest.Status = updateDto.Status;
                maintenanceRequest.ManHours = updateDto.ManHours;
                maintenanceRequest.Remark = updateDto.Remark;
                maintenanceRequest.MaintainedBy = updateDto.MaintainedBy;

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);

                // Save changes to database
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance details updated successfully for Works Order Number {worksOrderNumber}");
                return Ok(new { message = "Maintenance details updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating maintenance details for Works Order Number {worksOrderNumber}");
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Internal Server Error: {ex.Message}. Inner Exception: {innerException}");
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



        // PUT: api/MaintenanceRequestRegister/deliver/{worksOrderNumber}
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
                maintenanceRequest.Status = "Client Received"; // Ensure this line is present

                _context.MaintenanceRequestRegisters.Update(maintenanceRequest);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Maintenance request delivered successfully for Works Order Number {worksOrderNumber}");
                return Ok(maintenanceRequest);
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