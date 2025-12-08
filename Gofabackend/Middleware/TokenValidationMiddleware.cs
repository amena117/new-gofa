using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Gofabackend.Services;

public class TokenValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly TokenRevokeService _tokenRevokeService;

    public TokenValidationMiddleware(RequestDelegate next, TokenRevokeService tokenRevokeService)
    {
        _next = next;
        _tokenRevokeService = tokenRevokeService;
    }

    public async Task Invoke(HttpContext context)
    {
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();

        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            var tokenHash = HashToken(token);

            if (_tokenRevokeService.IsTokenRevoked(tokenHash))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("Token is revoked.");
                return;
            }
        }

        await _next(context);
    }

    // SHA256 hash helper
    private string HashToken(string token)
    {
        using (var sha256 = System.Security.Cryptography.SHA256.Create())
        {
            var hashedBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
            return BitConverter.ToString(hashedBytes).Replace("-", "").ToLower();
        }
    }
}