using System.ComponentModel.DataAnnotations;

namespace Gofabackend.DTO
{
    public class MaintenanceRequestCreateDto
    {
        public int? WorksOrderNumber { get; set; } // Made optional - no longer used

        public string? Nomenclature { get; set; } // Made optional - no longer used

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0.")]
        public int Quantity { get; set; }

        [Required]
        public string RequestedBy { get; set; }

        [Required]
        public string SerialNoOfEquip { get; set; }

        [Required] // Model is now required
        public string? Model { get; set; }

        [Required]
        public string BriefDescriptionOfWork { get; set; }

        [Required]
        public DateTime DateWorkOrderReceived { get; set; }

        [Required]
        public int EquipmentTypeId { get; set; }
        [Required]
        public string CurrentHandler { get; set; }
        [Required]// "PTEAM_LEADER", "MANAGER", etc.
        public string StatusStage { get; set; }
        [Required]
        public int? LetterId { get; set; }
        
        // ✅ NEW: Track who registered this request
        public string? RegisteredBy { get; set; }
    }
}