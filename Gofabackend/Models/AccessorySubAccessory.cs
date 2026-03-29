namespace Gofabackend.Models
{
    public class AccessorySubAccessory
    {
        public int Id { get; set; }
        public int AccessoryId { get; set; } // Foreign key to parent accessory
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; } = 0; // Can be 0 for free items
        public string Currency { get; set; } = "ETB";
        
        // Navigation property
        public Accessory Accessory { get; set; } = null!;
    }
}
