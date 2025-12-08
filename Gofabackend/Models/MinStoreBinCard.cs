using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Gofabackend.Models
{
    [Index(nameof(StockNumber), IsUnique = true)]
    public class MiniStoreBinCard
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string StockNumber { get; set; }
        [Required]
        [MaxLength(255)]
        public string Description { get; set; }

        [Required]
        [MaxLength(100)]
        public string Location { get; set; }

        [MaxLength(100)]
        public string Model { get; set; }

        [Required]
        [MaxLength(100)]
        public string Category { get; set; }

        [Required]
        [MaxLength(50)]
        public string UnitMeasurement { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [MaxLength(255)]
        public string? RecievedFrom { get; set; }

        [MaxLength(255)]
        public string? IssuedTo { get; set; }

        public DateTime? LotNumber { get; set; }

        public int? QuantityRecieved { get; set; }

        public int? QuantityIssued { get; set; }

        public int? Balance { get; set; } = 0;

        [Required]
        [MaxLength(100)]
        public string PostedBy { get; set; }

        // 🆕 Navigation Property
        public List<MiniStoreBinCardSerialNumber> SerialNumbers { get; set; } = new();
    }
}
