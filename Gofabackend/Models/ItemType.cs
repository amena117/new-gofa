namespace Gofabackend.Models
{
    public class ItemType
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = string.Empty; // Changed to string for EC
        public string CreatedBy { get; set; } = string.Empty;
    }
}