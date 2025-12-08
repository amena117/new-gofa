using System;
using System.Globalization;
using Gofabackend.Utilities;
using Microsoft.AspNetCore.Mvc;

namespace EthiopianCalendarApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EthiopianCalendarController : ControllerBase
    {
        [HttpGet("convert")]
        public IActionResult ConvertToEthiopian([FromQuery] string gregorianDate)
        {
            try
            {
                // Validate input
                if (string.IsNullOrWhiteSpace(gregorianDate))
                {
                    return BadRequest(new { Error = "The gregorianDate query parameter is required." });
                }

                // Parse the input date string
                if (!DateTime.TryParse(gregorianDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime parsedDate))
                {
                    return BadRequest(new { Error = "Invalid date format. Use YYYY-MM-DD or ISO 8601 format (e.g., 2025-09-13)." });
                }

                // Convert to Ethiopian date
                var (year, month, day) = EthiopianCalendarConverter.GregorianToEthiopian(parsedDate);
                var ethiopianDateString = EthiopianCalendarConverter.ToEthiopianString(parsedDate);

                return Ok(new
                {
                    Year = year,
                    Month = month,
                    Day = day,
                    FormattedDate = ethiopianDateString
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
            catch (Exception ex)
            {
                // Log the error for debugging (in a real app, use a logging framework)
                Console.WriteLine($"Error: {ex.Message}, Inner: {ex.InnerException?.Message}");
                return StatusCode(500, new { Error = "Internal server error during date conversion." });
            }
        }
    }
}