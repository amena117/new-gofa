using System.ComponentModel.DataAnnotations;

namespace Gofabackend.DTO
{
    public class MaintenanceRequestCreateDto
    {
        [Required]
        public int WorksOrderNumber { get; set; }

        [Required]
        public string Nomenclature { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0.")]
        public int Quantity { get; set; }

        [Required]
        public string RequestedBy { get; set; }

        [Required]
        public string SerialNoOfEquip { get; set; }

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
    }
}