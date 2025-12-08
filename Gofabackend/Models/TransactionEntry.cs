namespace Gofabackend.Models
{
    public class TransactionEntry
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public int? ItemUnitId { get; set; }
        public string Date { get; set; } = string.Empty; // EC format
        public DateTime? GregorianDate { get; set; } // For sorting
        public string Action { get; set; } = string.Empty; // "receive" or "Withdrawn"
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string Currency { get; set; } = "ETB"; // Default to ETB
        public string VoucherNumber { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public Item Item { get; set; } = null!;
        public ItemUnit? ItemUnit { get; set; }
        public int? Model22Id { get; set; } // Nullable for linking to Model22 withdrawals
    }
}