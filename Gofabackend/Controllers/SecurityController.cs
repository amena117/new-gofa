using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Gofabackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SecurityController : ControllerBase
    {
        private readonly ILogger<SecurityController> _logger;

        public SecurityController(ILogger<SecurityController> logger)
        {
            _logger = logger;
        }

        [HttpPost("csp-report")]
        public IActionResult CspReport([FromBody] JsonElement report)
        {
            try
            {
                // Log the CSP violation report
                _logger.LogWarning("CSP Violation: {Report}", report.ToString());
                
                // You might want to store this in a database or send it to a monitoring service
                // For now, we'll just log it
                
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing CSP violation report");
                return StatusCode(500);
            }
        }
    }
} 