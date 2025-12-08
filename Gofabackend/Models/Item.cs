
namespace Gofabackend.Models
{

   
    public class Item
    {
        public int ItemId { get; set; }
        public string Category { get; set; } = string.Empty; // Renamed from ItemType (e.g., "3700")
        public string Description { get; set; } = string.Empty; // Acts as item name (e.g., "Air Cleaner Element")
        public string Shelf { get; set; } = string.Empty;
        public string ItemColumn { get; set; } = string.Empty;
        public string ItemRow { get; set; } = string.Empty;
        public string? VoucherNumber { get; set; } = null; // Optional
        public string ReceivedFrom { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public int Quantity { get; set; }
        
        public int? NumOfBox { get; set; } = null; // Optional
        public string RegisteredBy { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // e.g., "SPAREPART"
        public string Model { get; set; } = string.Empty; // e.g., "YDG3700"
        public string WarehouseId { get; set; } = string.Empty;
        public string RegistrationDate { get; set; } = string.Empty; // EC format
        public decimal UnitPrice { get; set; } // Mandatory
        public string Currency { get; set; } = "ETB"; // Default to ETB
        public string Source { get; set; } = "Purchase";
        public List<TransactionEntry> TransactionHistory { get; set; } = new List<TransactionEntry>();
        public List<ItemSerialNumber> SerialNumbers { get; set; } = new List<ItemSerialNumber>();
        public List<ItemUnit> Units { get; set; } = new List<ItemUnit>();
        public List<Accessory> Accessories { get; set; } = new List<Accessory>();
        public DateTime? GregorianDate { get; internal set; }
    }
}