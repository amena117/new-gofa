namespace Gofabackend.DTO
{
    public class ItemDto
    {
        public int ItemId { get; set; } // Unique identifier for the item
        public string Name { get; set; } // Name of the item
        public string SerialNumber { get; set; } // Serial number of the item
        public string Description { get; set; } // Description of the item
        public string Location { get; set; } // Location of the item
        public string VoucherNumber { get; set; } // Voucher number associated with the item
        public string ReceivedFrom { get; set; } // Who the item was received from
        public string Condition { get; set; } // Condition of the item
        public int Quantity { get; set; } // Quantity of the item
        public int NumOfBox { get; set; } // Number of boxes
        public string RegisteredBy { get; set; } // User who registered the item

        // Foreign key relationships
        public string ItemType { get; set; } // Type of the item
        public string Model1Id { get; set; } // Foreign key for Model1
        public string ShelfId { get; set; } // Foreign key for Shelf
    }
}