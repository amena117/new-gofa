using Gofabackend.Models;
using Microsoft.AspNetCore.Http;

namespace Gofabackend.Services
{
    public interface IAuthService
    {
        Task<(bool success, string message)> LoginAsync(string username, string password);
        Task<(bool success, string message)> RegisterAsync(RegisterRequest model);
        Task LogoutAsync(HttpContext context);
    }
}