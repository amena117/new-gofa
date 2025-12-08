namespace Gofabackend.Models
{
    public class ItemEditHistory
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string EditedBy { get; set; } = string.Empty;
        public string EditDate { get; set; } = string.Empty; // Ethiopian Calendar
        public DateTime EditGregorianDate { get; set; }
        public string Changes { get; set; } = "{}"; // JSON diff
    }
}