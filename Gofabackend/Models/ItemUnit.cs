namespace Gofabackend.Models
{
    public class ItemUnit
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string SerialNumber { get; set; } = string.Empty; // Optional, for unit-specific serial numbers
        public Item Item { get; set; } = null!; // Navigation property
        public List<TransactionEntry> TransactionHistory { get; set; } = new List<TransactionEntry>();
    }
}