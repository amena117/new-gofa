namespace Gofabackend.Models
{
    public class MasterCardItemDetails
    {
        public int Id { get; set; }
        public int MasterCardItemId { get; set; }
        public DateTime Date { get; set; }
        public string OrderNo { get; set; }
        public string Suppliers { get; set; }
        public int QuantityOrdered { get; set; }
        public int Received { get; set; }
        public string Organization { get; set; }
        public decimal UnitPrice { get; set; }
        public string PostedBy { get; set; }
        public int Balance => QuantityOrdered - Received;
        public bool IsFulfilled => Balance == 0;
    // ... existing properties ...
      public int Issued { get; set; }
        // ... rest of existing properties ...
}
}