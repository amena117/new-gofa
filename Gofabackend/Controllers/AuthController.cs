using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using Gofabackend.Models;
using Gofabackend.Data;
using Gofabackend.DTOs;
using BCrypt.Net;
using Serilog;

namespace Gofabackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly JwtSettings _jwtSettings;

        public AuthController(ApplicationDbContext context, IOptions<JwtSettings> jwtSettings)
        {
            _context = context;
            _jwtSettings = jwtSettings.Value;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto loginRequest)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { message = "Invalid request data" });
                }

                var user = _context.Users.SingleOrDefault(u => u.Username == loginRequest.Username);
                if (user == null)
                {
                    return Unauthorized(new { message = "Invalid username or password" });
                }

                bool isPasswordValid = BCrypt.Net.BCrypt.Verify(loginRequest.Password, user.PasswordHash);
                if (!isPasswordValid)
                {
                    return Unauthorized(new { message = "Invalid username or password" });
                }

                if (user.IsDisabled)
                {
                    return Unauthorized(new { message = "This account has been disabled. Please contact an administrator." });
                }

                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Role, user.Role)
                };

                var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                var authProperties = new AuthenticationProperties
                {
                    IsPersistent = false,
                    ExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(10), // CHANGED: 10-second timeout
                    AllowRefresh = false
                };

                Log.Information("Session created for user {Username} at {Time}, expires at {Expires}",
                    user.Username, DateTimeOffset.UtcNow, authProperties.ExpiresUtc);

                await HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(claimsIdentity),
                    authProperties);

                Response.Headers.Append("Cache-Control", "no-store, no-cache, must-revalidate");

                return Ok(new
                {
                    message = "Login successful",
                    user = new
                    {
                        id = user.Id.ToString(),
                        username = user.Username,
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        role = user.Role
                    }
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Login Exception");
                return StatusCode(500, new
                {
                    message = "Server error during login",
                    error = ex.Message
                });
            }
        }

        [HttpGet("me")]
        [AllowAnonymous]
        public IActionResult GetCurrentUser()
        {
            try
            {
                var cookies = Request.Cookies;
                Log.Information("Cookies received in /api/auth/me: {Cookies}",
                    string.Join(", ", cookies.Select(c => $"{c.Key}: {c.Value}")));

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    Log.Warning("No user ID found in claims");
                    return Unauthorized(new { message = "Not authenticated" });
                }

                var user = _context.Users.Find(int.Parse(userId));
                if (user == null)
                {
                    Log.Warning("User not found for ID: {UserId}", userId);
                    return NotFound(new { message = "User not found" });
                }

                if (user.IsDisabled)
                {
                    Log.Information("Blocked access for disabled user ID: {UserId}", userId);
                    return Unauthorized(new { message = "This account has been disabled." });
                }

                Log.Information("Session validated for user {Username} at {Time}", user.Username, DateTimeOffset.UtcNow);

                return Ok(new
                {
                    id = user.Id.ToString(),
                    username = user.Username,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error in GetCurrentUser");
                return StatusCode(500, new { message = "Server error retrieving user", error = ex.Message });
            }
        }

        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<IActionResult> Logout()
        {
            try
            {
                await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                Response.Cookies.Delete("auth_token", new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,
                    SameSite = SameSiteMode.Lax,
                    Path = "/"
                });

                Log.Information("User logged out at {Time}", DateTimeOffset.UtcNow);

                return Ok(new { success = true, message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error during logout");
                return StatusCode(500, new { success = false, message = "Error during logout", error = ex.Message });
            }
        }

        [HttpGet("user/username/{username}")]
        [AllowAnonymous]
        public IActionResult GetUserByUsername(string username)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(username))
                {
                    return BadRequest(new { success = false, message = "Username is required" });
                }

                var user = _context.Users
                    .FirstOrDefault(u => u.Username != null &&
                                   u.Username.ToLower() == username.ToLower());

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                return Ok(new
                {
                    id = user.Id.ToString(),
                    username = user.Username,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error fetching user by username: {Username}", username);
                return StatusCode(500, new
                {
                    success = false,
                    message = "Server error",
                    error = ex.Message
                });
            }
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public IActionResult Register([FromBody] RegisterRequestDto registerRequest)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid request data" });
                }

                if (_context.Users.Any(u => u.Username == registerRequest.Username))
                {
                    return BadRequest(new { success = false, message = "Username already exists" });
                }

                if (registerRequest.Password != registerRequest.ConfirmPassword)
                {
                    return BadRequest(new { success = false, message = "Passwords do not match" });
                }

                var user = new User
                {
                    Username = registerRequest.Username,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerRequest.Password),
                    FirstName = registerRequest.FirstName,
                    LastName = registerRequest.LastName,
                    Role = registerRequest.Role,
                    IsDisabled = false
                };

                _context.Users.Add(user);
                _context.SaveChanges();

                return Ok(new
                {
                    success = true,
                    message = "User registered successfully",
                    user = new
                    {
                        id = user.Id.ToString(),
                        username = user.Username,
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        role = user.Role
                    }
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error registering user");
                return StatusCode(500, new { success = false, message = "Error registering user", error = ex.Message });
            }
        }

        [HttpGet("users")]
        public IActionResult GetAllUsers()
        {
            try
            {
                var users = _context.Users
                    .Select(u => new
                    {
                        id = u.Id.ToString(),
                        username = u.Username,
                        firstName = u.FirstName,
                        lastName = u.LastName,
                        role = u.Role,
                        isDisabled = u.IsDisabled
                    })
                    .ToList();

                return Ok(new { success = true, data = users });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error retrieving users");
                return StatusCode(500, new { success = false, message = "Error retrieving users", error = ex.Message });
            }
        }

        [HttpPut("users/{id}")]
        public IActionResult UpdateUser(int id, [FromBody] UpdateUserDto updateDto)
        {
            try
            {
                var user = _context.Users.Find(id);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                user.FirstName = updateDto.FirstName ?? user.FirstName;
                user.LastName = updateDto.LastName ?? user.LastName;
                user.Role = updateDto.Role ?? user.Role;

                _context.SaveChanges();

                return Ok(new { success = true, message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error updating user");
                return StatusCode(500, new { success = false, message = "Error updating user", error = ex.Message });
            }
        }

        [HttpPut("users/{id}/password")]
        public IActionResult UpdateUserPassword(int id, [FromBody] UpdatePasswordDto passwordDto)
        {
            try
            {
                var user = _context.Users.Find(id);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                if (passwordDto.NewPassword != passwordDto.ConfirmPassword)
                {
                    return BadRequest(new { success = false, message = "Passwords do not match" });
                }

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(passwordDto.NewPassword);
                _context.SaveChanges();

                return Ok(new { success = true, message = "Password updated successfully" });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error updating password");
                return StatusCode(500, new { success = false, message = "Error updating password", error = ex.Message });
            }
        }

        [HttpPut("users/{id}/disable")]
        public IActionResult DisableUser(int id)
        {
            try
            {
                var user = _context.Users.Find(id);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                user.IsDisabled = !user.IsDisabled;
                _context.SaveChanges();

                var status = user.IsDisabled ? "disabled" : "enabled";
                return Ok(new
                {
                    success = true,
                    message = $"User {status} successfully",
                    isDisabled = user.IsDisabled
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error toggling user disable status for ID: {UserId}", id);
                return StatusCode(500, new { success = false, message = "Error toggling user status", error = ex.Message });
            }
        }

        [HttpGet("users/{id}/status")]
        public IActionResult GetUserStatus(int id)
        {
            try
            {
                var user = _context.Users.Find(id);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                return Ok(new
                {
                    id = user.Id,
                    username = user.Username,
                    isDisabled = user.IsDisabled,
                    disabledAt = user.LockoutEnd
                });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error retrieving user status for ID: {UserId}", id);
                return StatusCode(500, new { success = false, message = "Error retrieving user status", error = ex.Message });
            }
        }
    }

    public class UpdateUserDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Role { get; set; }
    }

    public class UpdatePasswordDto
    {
        public string NewPassword { get; set; }
        public string ConfirmPassword { get; set; }
    }

    public class RegisterRequestDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Role { get; set; }
    }

    public class LoginRequestDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
}