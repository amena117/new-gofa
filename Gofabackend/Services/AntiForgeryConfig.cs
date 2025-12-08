using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;

namespace Gofabackend.Services
{
    public static class AntiForgeryConfig
    {
        public static void ConfigureAntiforgery(AntiforgeryOptions options)
        {
            options.Cookie.Name = "XSRF-TOKEN";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.HeaderName = "X-XSRF-TOKEN";
            options.SuppressXFrameOptionsHeader = false;
        }
    }
} 