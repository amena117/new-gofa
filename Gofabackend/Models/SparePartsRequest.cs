using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gofabackend.Models
{
    public class SparePartsRequest
    {
        [Key]
        public int Id { get; set; }

        // Fields filled by the user when requesting spare parts
        //[Required(ErrorMessage = "Part name is required.")]
        //public string?s PartName { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
        public int QuantityAsked { get; set; }

        [Required(ErrorMessage = "Requested by is required.")]
        public string RequestedBy { get; set; } = string.Empty;

        [Required(ErrorMessage = "Reason is required.")]
        public string Reason { get; set; } = string.Empty;

        // Add StockNumber field
        [Required(ErrorMessage = "Stock number is required.")]
        public string StockNumber { get; set; } = string.Empty;

        // Newly added field
        [Required(ErrorMessage = "Request type is required.")]
        public string RequestType { get; set; } = string.Empty;

        // Fields filled by the store when approving/delivering spare parts
        public int? QuantityApproved { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovalDate { get; set; }
        public string? Remark { get; set; }

        [Required(ErrorMessage = "Status is required.")]


        public string Status { get; set; } = "Pending"; // default value can be Pending

        [Required(ErrorMessage = "Current stage is required.")]
        public string CurrentStage { get; set; } = "";


        // Foreign key to MaintenanceRequestRegister
        [ForeignKey("MaintenanceRequestRegister")]
        public int WorksOrderNumber { get; set; }
        public string? SerialNumber { get; set; }


        public decimal PartCost { get; set; } = 0;
        public decimal LabourCost { get; set; } = 0;
        public decimal TotalCost { get; set; } = 0;

        public bool IsUrgent { get; set; } = false;

    }
}