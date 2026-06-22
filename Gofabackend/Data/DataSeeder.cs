using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.Utilities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;

namespace Gofabackend.Data
{
    public static class DataSeeder
    {
        public static void Seed(ApplicationDbContext context)
        {
            SeedUsers(context);
            SeedWarehouses(context);
            SeedSpareParts(context);
        }

        private static void SeedUsers(ApplicationDbContext context)
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

        private static void SeedWarehouses(ApplicationDbContext context)
        {
            if (!context.Warehouses.Any())
            {
                context.Warehouses.Add(new Warehouse
                {
                    WarehouseId = "VHF",
                    Name = "VHF Warehouse",
                    Location = "Main Office"
                });
                context.SaveChanges();
            }
        }

        private static void SeedSpareParts(ApplicationDbContext context)
        {
            if (context.Items.Any(i => i.Role == "SPAREPART"))
            {
                return;
            }

            var warehouseId = context.Warehouses.First().WarehouseId;
            var registrationDate = EthiopianCalendarConverter.ToEthiopianString(System.DateTime.UtcNow.AddHours(3));
            var spareParts = new List<Item>();

            string[] names = {
                "Oil Filter", "Air Filter", "Fuel Filter", "Brake Pad", "Spark Plug",
                "Timing Belt", "Alternator Belt", "Water Pump", "Radiator Cap", "Thermostat",
                "Headlight Bulb", "Wiper Blade", "Battery Terminal", "Ignition Coil", "Clutch Plate",
                "Shock Absorber", "Wheel Bearing", "Tie Rod End", "Ball Joint", "Control Arm Bushing",
                "CV Joint", "Drive Shaft", "Exhaust Gasket", "Muffler", "Oxygen Sensor",
                "Fuel Pump", "Fuel Injector", "Starter Motor", "Alternator", "Voltage Regulator",
                "Brake Rotor", "Brake Caliper", "Wheel Cylinder", "Master Cylinder", "Brake Hose",
                "Power Steering Pump", "Rack and Pinion", "Steering Column", "Universal Joint", "Differential Gasket",
                "Transmission Filter", "Oil Pan Gasket", "Valve Cover Gasket", "Cylinder Head Gasket", "Intake Manifold Gasket",
                "Piston Ring Set", "Main Bearing Set", "Connecting Rod Bearing", "Camshaft", "Crankshaft Sensor"
            };

            for (int i = 0; i < 50; i++)
            {
                // First 30 items with low stock (< 3)
                int quantity = i < 30 ? (i % 3) : (5 + (i * 2));
                
                spareParts.Add(new Item
                {
                    Category = "Spare Part",
                    Description = names[i],
                    Model = $"SP-{1000 + i}",
                    WarehouseId = warehouseId,
                    Role = "SPAREPART",
                    Quantity = quantity,
                    UnitPrice = 500 + (i * 100),
                    Currency = "ETB",
                    Condition = "New",
                    ReceivedFrom = "Supplier A",
                    RegisteredBy = "System",
                    RegistrationDate = registrationDate,
                    Source = "Purchase",
                    History = "Initial stock seeding",
                    Shelf = "Shelf A",
                    ItemColumn = "1",
                    ItemRow = (i + 1).ToString()
                });
            }

            context.Items.AddRange(spareParts);
            context.SaveChanges();
        }
    }
}