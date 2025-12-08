namespace Gofabackend.Models
{
    public class BulkReceiveRequest
    {
        public string? VoucherNumber { get; set; } = null; // Optional
        public bool HasVoucherNumber { get; set; } = false; // Checkbox control
        public string ReceivedFrom { get; set; } = string.Empty;
        public string RegisteredBy { get; set; } = string.Empty;
        public List<ItemReceiveRequest> Items { get; set; } = new List<ItemReceiveRequest>();
    }
}