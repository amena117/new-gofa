namespace Gofabackend.Models
{
    public class AddAccessoriesRequest
    {
        public int ItemId { get; set; }
        public string? VoucherNumber { get; set; }
        public string ReceivedFrom { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string RegisteredBy { get; set; } = string.Empty;
        public string TransactionDate { get; set; } = string.Empty;
        public List<AccessoryRequest> Accessories { get; set; } = new List<AccessoryRequest>();
    }
}
