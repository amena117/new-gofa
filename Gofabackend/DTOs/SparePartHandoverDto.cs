using System.ComponentModel.DataAnnotations;

namespace Gofabackend.DTOs
{
    public class SparePartHandoverItemDto
    {
        [Required]
        public string StockNumber { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string SerialNumber { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
        public int Quantity { get; set; } = 1;

        public string? Remark { get; set; }
    }

    public class SparePartHandoverBatchDto
    {
        [Required]
        [MinLength(1, ErrorMessage = "At least one item must be included")]
        public List<SparePartHandoverItemDto> Items { get; set; } = new();

        [Required]
        public string TechnicianName { get; set; } = string.Empty;

        public string? WorksOrderNumber { get; set; }

        public string? IssuedBy { get; set; }

        [Required]
        public DateTime IssueDate { get; set; }
    }
}
