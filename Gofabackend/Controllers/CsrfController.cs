// using Microsoft.AspNetCore.Antiforgery;
// using Microsoft.AspNetCore.Mvc;

// namespace Gofabackend.Controllers
// {
//     [ApiController]
//     [Route("[controller]")]
//     public class CsrfController : ControllerBase
//     {
//         private readonly IAntiforgery _antiforgery;

//         public CsrfController(IAntiforgery antiforgery)
//         {
//             _antiforgery = antiforgery;
//         }

//         [HttpGet("token")]
//         public IActionResult GetCsrfToken()
//         {
//             var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
//             Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
//             {
//                 HttpOnly = false,
//                 Secure = true,
//                 SameSite = SameSiteMode.Lax,
//                 Path = "/"
//             });

//             return Ok(new { token = tokens.RequestToken });
//         }
//     }
// }