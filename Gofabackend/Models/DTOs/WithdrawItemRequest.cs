namespace Gofabackend.Models
{
    public class WithdrawItemRequest
    {
        public int ItemId { get; set; }
        public int Quantity { get; set; }
        public string? VoucherNumber { get; set; }
        public string IssuedTo { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public List<string>? SerialNumbers { get; set; }
    }
}