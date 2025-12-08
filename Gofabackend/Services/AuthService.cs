using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using Gofabackend.Models;
using Gofabackend.Data;
using Microsoft.Extensions.Logging;

namespace Gofabackend.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AuthService> _logger;

        public AuthService(ApplicationDbContext context, ILogger<AuthService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<(bool success, string message)> LoginAsync(string username, string password)
        {
            _logger.LogInformation("Attempting login for user: {Username}", username);

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
            {
                _logger.LogWarning("Login failed: User not found - {Username}", username);
                return (false, "Invalid username or password");
            }

            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                _logger.LogWarning("Login failed: Invalid password for user - {Username}", username);
                return (false, "Invalid username or password");
            }

            _logger.LogInformation("Login successful for user: {Username}", username);
            return (true, "Login successful");
        }

        public async Task<(bool success, string message)> RegisterAsync(RegisterRequest model)
        {
            _logger.LogInformation("Attempting registration for user: {Username}", model.Username);

            if (model.Password != model.ConfirmPassword)
            {
                _logger.LogWarning("Registration failed: Passwords do not match for user - {Username}", model.Username);
                return (false, "Passwords do not match");
            }

            if (await _context.Users.AnyAsync(u => u.Username == model.Username))
            {
                _logger.LogWarning("Registration failed: Username already exists - {Username}", model.Username);
                return (false, "Username already exists");
            }

            var user = new User
            {
                FirstName = model.FirstName,
                LastName = model.LastName,
                Username = model.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = model.Role
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Registration successful for user: {Username}", model.Username);
            return (true, "Registration successful");
        }

        public async Task LogoutAsync(HttpContext context)
        {
            _logger.LogInformation("Removing token cookie");
        }
    }
}