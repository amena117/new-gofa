using System.ComponentModel.DataAnnotations;

namespace Gofabackend.Models
{
    public class SparePartHandoverLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string StockNumber { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string SerialNumber { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; } = 1;

        [Required]
        public string TechnicianName { get; set; } = string.Empty;

        public bool IsConfirmedByTechnician { get; set; } = false;

        public DateTime? ConfirmedAt { get; set; }

        public string? WorksOrderNumber { get; set; }

        public string? IssuedBy { get; set; }

        public string? Remark { get; set; }

        [Required]
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
