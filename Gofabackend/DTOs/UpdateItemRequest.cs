namespace Gofabackend.Dtos
{
    public class UpdateItemRequest
    {
        public string? Description { get; set; }
        public string? Category { get; set; }
        public string? Model { get; set; }
        public string? Shelf { get; set; }
        public string? ItemColumn { get; set; }
        public string? ItemRow { get; set; }
        public string? Condition { get; set; }
        public int? NumOfBox { get; set; }
        public string? VoucherNumber { get; set; }
        public string? ReceivedFrom { get; set; }
        public decimal UnitPrice { get; set; } // >0 means update
        public string? Currency { get; set; }
        public string? Source { get; set; }
        public string? WarehouseId { get; set; }
        public string? Role { get; set; }

        public string EditedBy { get; set; } = string.Empty; // ⚠️ Replace with User.Identity later
    }
}