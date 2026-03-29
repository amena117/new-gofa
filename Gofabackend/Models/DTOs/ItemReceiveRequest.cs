namespace Gofabackend.Models
{
    public class ItemReceiveRequest
    {
        public string Category { get; set; } = string.Empty; // Renamed from ItemType (e.g., "3700")
        public string Description { get; set; } = string.Empty; // e.g., "Air Cleaner Element"
        public string Shelf { get; set; } = string.Empty;
        public string ItemColumn { get; set; } = string.Empty;
        public string ItemRow { get; set; } = string.Empty;
        public string? VoucherNumber { get; set; } = null; // Optional
        public bool HasVoucherNumber { get; set; } = false; // Checkbox control
        public string ReceivedFrom { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int? NumOfBox { get; set; } = null; // Optional
        public string RegisteredBy { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // e.g., "SPAREPART"
        public string Model { get; set; } = string.Empty; // e.g., "YDG3700"
        public string WarehouseId { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; } // Mandatory
        public string Currency { get; set; } = "ETB"; // Default to ETB
        public string Source { get; set; } = "Purchase";
        public string History { get; set; } = string.Empty; // Item history/notes
        public List<string> SerialNumbers { get; set; } = new List<string>();
        public List<AccessoryRequest> Accessories { get; set; } = new List<AccessoryRequest>();
    }

    public class AccessoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal? UnitPrice { get; set; } // Optional
        public string? Currency { get; set; } // Optional
        public bool RequiresSerialNumbers { get; set; } = false; // Whether this accessory requires serial numbers
        public List<string> SerialNumbers { get; set; } = new List<string>(); // Serial numbers for this accessory
        public List<SubAccessoryRequest> SubAccessories { get; set; } = new List<SubAccessoryRequest>(); // Sub-accessories
    }

    public class SubAccessoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string Currency { get; set; } = "ETB";
    }
}