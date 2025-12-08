using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;

namespace Gofabackend.Middleware
{
    public class AntiForgeryMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IAntiforgery _antiforgery;

        public AntiForgeryMiddleware(RequestDelegate next, IAntiforgery antiforgery)
        {
            _next = next;
            _antiforgery = antiforgery;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Skip CSRF validation for GET, HEAD, OPTIONS, and TRACE requests
            if (IsSafeMethod(context.Request.Method))
            {
                await _next(context);
                return;
            }

            // Skip CSRF validation for API endpoints that use token-based authentication
            if (IsApiEndpoint(context.Request.Path))
            {
                await _next(context);
                return;
            }

            try
            {
                await _antiforgery.ValidateRequestAsync(context);
                await _next(context);
            }
            catch (AntiforgeryValidationException)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new
                {
                    Status = 403,
                    Message = "Invalid CSRF token. Please refresh the page and try again."
                });
            }
        }

        private bool IsSafeMethod(string method)
        {
            return method.Equals("GET", StringComparison.OrdinalIgnoreCase) ||
                   method.Equals("HEAD", StringComparison.OrdinalIgnoreCase) ||
                   method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase) ||
                   method.Equals("TRACE", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsApiEndpoint(PathString path)
        {
            return path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);
        }
    }
} 