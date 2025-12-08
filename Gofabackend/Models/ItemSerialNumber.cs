namespace Gofabackend.Models
{
    public class ItemSerialNumber
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
        public string AddedDate { get; set; } = string.Empty; // Changed to string for EC
        public Item Item { get; set; } = null!;
    }
}