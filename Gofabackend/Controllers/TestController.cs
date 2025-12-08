using Microsoft.AspNetCore.Mvc;

namespace Gofabackend.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class TestController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { Message = "API is working!" });
        }
    }
}