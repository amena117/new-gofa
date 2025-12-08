using Gofabackend.Data; // Adjust namespace as needed
using Gofabackend.Models; // Adjust namespace as needed
using Microsoft.EntityFrameworkCore;

namespace Gofabackend.Data
{
    public static class DataSeeder
    {
        public static void Seed(ApplicationDbContext context)
        {
            if (!context.Users.Any(u => u.Role == "SUPER_ADMIN"))
            {
                var superAdmin = new User
                {
                    FirstName = "Super",
                    LastName = "Admin",
                    Username = "superadmin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("superadmin123"),
                    Role = "SUPER_ADMIN"
                };

                context.Users.Add(superAdmin);
                context.SaveChanges();
            }
        }
    }
}