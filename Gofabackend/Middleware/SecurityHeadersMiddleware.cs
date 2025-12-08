using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using System.Collections.Generic;

namespace Gofabackend.Middleware
{
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IWebHostEnvironment _environment;

        public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
        {
            _next = next;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Add security headers
            context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Add("X-Frame-Options", "DENY");
            context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
            context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
            
            // Comprehensive Content Security Policy
            var csp = new List<string>
            {
                // Default restrictions for all content types
                "default-src 'self'",
                
                // JavaScript sources
                "script-src 'self' 'nonce-{nonce}'",
                
                // CSS sources
                "style-src 'self' 'unsafe-inline'",
                
                // Image sources
                "img-src 'self' data: https:",
                
                // Font sources
                "font-src 'self'",
                
                // Media sources
                "media-src 'self'",
                
                // Object sources
                "object-src 'none'",
                
                // Form actions
                "form-action 'self'",
                
                // Frame ancestors
                "frame-ancestors 'none'",
                
                // Base URI
                "base-uri 'self'",
                
                // Connect sources (for API calls)
                "connect-src 'self'",
                
                // Worker sources
                "worker-src 'self'",
                
                // Manifest sources
                "manifest-src 'self'",
                
                // Upgrade insecure requests
                "upgrade-insecure-requests"
            };

            // Add report-uri in production
            if (!_environment.IsDevelopment())
            {
                csp.Add("report-uri /api/csp-report");
            }

            context.Response.Headers.Add("Content-Security-Policy", string.Join("; ", csp));
            
            // Add report-only header in development
            if (_environment.IsDevelopment())
            {
                context.Response.Headers.Add("Content-Security-Policy-Report-Only", string.Join("; ", csp));
            }

            context.Response.Headers.Add("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
            context.Response.Headers.Add("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

            await _next(context);
        }
    }
} 