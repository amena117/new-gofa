using System.Reflection;
using System.Text.Json;
using Gofabackend.Models;

namespace Gofabackend.Utilities
{
    public static class ItemEditTracker
    {
        public static string GenerateChangeLog(Item original, Item updated)
        {
            var changes = new Dictionary<string, object>();

            var props = typeof(Item).GetProperties()
                .Where(p => p.CanRead && p.CanWrite)
                .Where(p => !new[] { "ItemId", "SerialNumbers", "Units", "Accessories", "TransactionHistory", "GregorianDate" }
                    .Contains(p.Name));

            foreach (var prop in props)
            {
                var oldValue = prop.GetValue(original);
                var newValue = prop.GetValue(updated);

                var oldStr = oldValue?.ToString() ?? "null";
                var newStr = newValue?.ToString() ?? "null";

                if (oldStr != newStr)
                {
                    changes[prop.Name] = new { old = oldValue, @new = newValue };
                }
            }

            return JsonSerializer.Serialize(changes, new JsonSerializerOptions { WriteIndented = false });
        }
    }
}