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
        public bool RequiresSerialNumbers { get; set; } = false; // Whether this accessory requires serial numbers
        public bool IsStandalone { get; set; } = false; // Whether this accessory is registered independently (shows in item lists)
        public Item Item { get; set; } = null!; // Navigation property
        
        // Navigation property for serial numbers
        public List<AccessorySerialNumber> SerialNumbers { get; set; } = new List<AccessorySerialNumber>();
        
        // ✅ NEW: Navigation property for sub-accessories
        public List<AccessorySubAccessory> SubAccessories { get; set; } = new List<AccessorySubAccessory>();
    }

    public class AccessorySerialNumber
    {
        public int Id { get; set; }
        public int AccessoryId { get; set; } // Foreign key to Accessory
        public string SerialNumber { get; set; } = string.Empty;
        public Accessory Accessory { get; set; } = null!; // Navigation property
    }
}