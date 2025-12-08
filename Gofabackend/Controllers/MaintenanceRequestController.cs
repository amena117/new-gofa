using Gofabackend.DTO;

using Gofabackend.Models;
using Gofabackend.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Gofabackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MaintenanceRequestController : ControllerBase
    {
        private readonly IMaintenanceRequestService _service;

        public MaintenanceRequestController(IMaintenanceRequestService service)
        {
            _service = service;
        }

        // GET: api/MaintenanceRequest
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MaintenanceRequestRegister>>> GetAll()
        {
            var requests = await _service.GetAllAsync();
            return Ok(requests);
        }

        // GET: api/MaintenanceRequest/group/POWER
        [HttpGet("group/{groupName}")]
        public async Task<ActionResult<IEnumerable<MaintenanceRequestRegister>>> GetByGroup(string groupName)
        {
            var requests = await _service.GetByRequestedToAsync(groupName);
            return Ok(requests);
        }

        // PUT: api/MaintenanceRequest/status
        // PUT: api/MaintenanceRequest/status
        [HttpPut("status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateMaintenanceStatusDto dto)
        {
            var result = await _service.UpdateStatusAsync(dto);
            if (result == null) // ✅ Correct null check
            {
                return BadRequest("Could not update status. Request may not exist.");
            }

            return Ok("Status updated successfully.");
        }

    }
}
