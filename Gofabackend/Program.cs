using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Gofabackend.Data;
using AspNetCoreRateLimit;
using Gofabackend.Middleware;
using Serilog;
using Serilog.Events;
using System.Text.Json.Serialization;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        "logs/myapp-.txt",
        rollingInterval: RollingInterval.Day,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message}{NewLine}{Exception}")
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Logging.ClearProviders();
    builder.Logging.AddSerilog();

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrEmpty(connectionString))
        throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        if (connectionString.Contains(".db", StringComparison.OrdinalIgnoreCase) || connectionString.Contains("Data Source", StringComparison.OrdinalIgnoreCase))
        {
            options.UseSqlite(connectionString);
        }
        else
        {
            options.UseSqlServer(connectionString);
        }
    });

    builder.Services.AddScoped<StockService>();

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        });

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.SetIsOriginAllowed(_ => true) // Allow any origin for development
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
    });

    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
    builder.Services.AddInMemoryRateLimiting();
    builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));

    builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "auth_token";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.None; // Update in production!
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromHours(2); // 👈 CHANGED TO 2 HOURS
        options.SlidingExpiration = true;
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
        };
    });

    builder.Services.AddAntiforgery(options =>
    {
        options.HeaderName = "X-XSRF-TOKEN";
        options.Cookie.Name = "XSRF-TOKEN";
        options.Cookie.HttpOnly = false;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.None
            : CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
    });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("SuperAdminOnly", policy =>
            policy.RequireRole("SUPER_ADMIN"));
    });

    builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000);
    options.ListenLocalhost(2024);
    options.ListenLocalhost(5001, listenOptions => listenOptions.UseHttps());
    options.ListenLocalhost(7112, listenOptions => listenOptions.UseHttps());

    // Bind to first network IP
    var networkIp1 = System.Net.IPAddress.Parse("10.20.38.171");
    var networkIp2 = System.Net.IPAddress.Parse("10.20.38.51");
    
    var localIPs = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
        .SelectMany(n => n.GetIPProperties().UnicastAddresses)
        .Select(a => a.Address)
        .ToList();

    // Check and bind for 10.20.38.171
    if (localIPs.Any(ip => ip.Equals(networkIp1)))
    {
        options.Listen(networkIp1, 2024);
        options.Listen(networkIp1, 2025, listenOptions => listenOptions.UseHttps());
        Log.Information("Network bindings configured for http://10.20.38.171:2024 and https://10.20.38.171:2025");
    }
    else
    {
        Log.Warning("Network IP 10.20.38.171 not available. Only localhost bindings will be active.");
    }

    // Check and bind for 10.20.38.51
    if (localIPs.Any(ip => ip.Equals(networkIp2)))
    {
        options.Listen(networkIp2, 2024);
        options.Listen(networkIp2, 2025, listenOptions => listenOptions.UseHttps());
        Log.Information("Network bindings configured for http://10.20.38.51:2024 and https://10.20.38.51:2025");
    }
    else
    {
        Log.Warning("Network IP 10.20.38.51 not available. Bindings for this IP will not be active.");
    }
});

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }
    else
    {
        app.UseHttpsRedirection();
        app.UseExceptionHandler("/Error");
    }

    app.UseRouting();
    app.UseCors("AllowFrontend");

    // Explicitly handle OPTIONS to ensure preflight succeeds for all routes
    app.Use(async (context, next) =>
    {
        if (context.Request.Method == "OPTIONS")
        {
            context.Response.StatusCode = 200;
            return;
        }
        await next();
    });

    app.UseIpRateLimiting();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapFallbackToFile("index.html");

    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        try
        {
            if (dbContext.Database.IsSqlite())
            {
                dbContext.Database.EnsureCreated();
                try {
                    dbContext.Database.ExecuteSqlRaw("ALTER TABLE RequestOrdersForIssue ADD COLUMN TransactionDate TEXT NOT NULL DEFAULT '0001-01-01 00:00:00';");
                } catch { /* Column might already exist */ }
            }
            else
            {
                dbContext.Database.Migrate();
            }
            DataSeeder.Seed(dbContext);
            Log.Information("Database migrated and seeded successfully.");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "An error occurred while migrating or seeding the database.");
        }
    }

    Log.Information($"Application starting up in {app.Environment.EnvironmentName} mode...");
    Log.Information($"Available endpoints:");
    Log.Information($"- http://localhost:5000");
    Log.Information($"- https://localhost:5001");
    Log.Information($"- https://localhost:7112");
    Log.Information($"- http://10.20.38.171:2024");
    Log.Information($"- http://10.20.38.51:2024");
    Log.Information($"- https://10.20.38.171:2025");

    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "The application failed to start correctly.");
}
finally
{
    Log.CloseAndFlush();
}