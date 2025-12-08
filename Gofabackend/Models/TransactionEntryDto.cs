namespace Gofabackend.Models
{
    public class TransactionEntryDto
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string Category { get; set; } = string.Empty; // Added for category (e.g., "3700")
        public string Description { get; set; } = string.Empty; // Renamed from ItemName
        public string Action { get; set; } = string.Empty; // "receive" or "Withdrawn"
        public int Quantity { get; set; }
        public string VoucherNumber { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public int? Model22Id { get; set; } // Nullable for linking to Model22 withdrawals
    }
}