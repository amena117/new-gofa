namespace Gofabackend.Models
{
    public class WithdrawHistoryDto
    {
        public int TransactionId { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty; // Renamed from ItemName
        public string Model { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string VoucherNumber { get; set; } = string.Empty;
        public string IssuedTo { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty; // EC format
    }
}