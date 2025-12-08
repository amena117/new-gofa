using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gofabackend.Models
{
    public class MiniStoreBinCardSerialNumber
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string SerialNumber { get; set; }

        // Foreign key to BinCard
        [ForeignKey("MiniStoreBinCard")]
        public int MiniStoreBinCardId { get; set; }

        public MiniStoreBinCard MiniStoreBinCard { get; set; }

        // New properties
        public DateTime? InDate { get; set; } // Optional field for the date when the serial number was received
        public DateTime? OutDate { get; set; } // Optional field for the date when the serial number was issued
        public string Status { get; set; } // Status of the serial number (e.g., "Available", "Issued", "Damaged")
    }
}
