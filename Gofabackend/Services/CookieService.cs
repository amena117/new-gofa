using Microsoft.AspNetCore.Http;
using System;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;

namespace Gofabackend.Services
{
    public interface ICookieService
    {
        void SetTokenCookie(HttpContext context, string token, DateTime expiry);
        string GetTokenCookie(HttpContext context);
        void RemoveTokenCookie(HttpContext context);
    }

    public class CookieService : ICookieService
    {
        private const string TokenCookieName = "auth_token";
        private readonly IConfiguration _configuration;
        private readonly ILogger<CookieService> _logger;
        private readonly bool _isDevelopment;

        public CookieService(IConfiguration configuration, ILogger<CookieService> logger, IWebHostEnvironment env)
        {
            _configuration = configuration;
            _logger = logger;
            _isDevelopment = env.IsDevelopment();
        }

        public void SetTokenCookie(HttpContext context, string token, DateTime expiry)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !_isDevelopment, // Only allow HTTP in development
                SameSite = _isDevelopment ? SameSiteMode.Lax : SameSiteMode.Strict,
                Expires = expiry,
                Path = "/",
                MaxAge = expiry - DateTime.UtcNow
            };

            // Add additional security headers
            context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Append("X-Frame-Options", "DENY");
            context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");

            if (!_isDevelopment)
            {
                context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            }

            _logger.LogInformation("Setting token cookie with options: HttpOnly={HttpOnly}, Secure={Secure}, SameSite={SameSite}, Path={Path}, Expires={Expires}",
                cookieOptions.HttpOnly,
                cookieOptions.Secure,
                cookieOptions.SameSite,
                cookieOptions.Path,
                cookieOptions.Expires);

            context.Response.Cookies.Append(TokenCookieName, token, cookieOptions);
            _logger.LogInformation("Token cookie set successfully. Cookie name: {CookieName}", TokenCookieName);
        }

        public string GetTokenCookie(HttpContext context)
        {
            return context.Request.Cookies[TokenCookieName] ?? string.Empty;
        }

        public void RemoveTokenCookie(HttpContext context)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !_isDevelopment,
                SameSite = _isDevelopment ? SameSiteMode.Lax : SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(-1),
                Path = "/"
            };

            context.Response.Cookies.Delete(TokenCookieName, cookieOptions);
            _logger.LogInformation("Token cookie removed successfully. Cookie name: {CookieName}", TokenCookieName);
        }
    }
} 