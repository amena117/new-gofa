namespace Gofabackend.Models
{
    public class Accessory
    {
        public int Id { get; set; }
        public int ItemId { get; set; } // Foreign key to Item
        public string Name { get; set; } = string.Empty; // e.g., "Charger"
        public string Model { get; set; } = string.Empty; // e.g., "USB-C"
        public int Quantity { get; set; } // Quantity of this accessory
        public decimal? UnitPrice { get; set; } // Optional unit price
        public string? Currency { get; set; } // Optional currency (default to "ETB")
        public Item Item { get; set; } = null!; // Navigation property
    }
}