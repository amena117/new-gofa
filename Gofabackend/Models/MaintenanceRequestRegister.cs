using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gofabackend.Models
{
    public class MaintenanceRequestRegister
    {
        [Key]
        public int Id { get; set; }

        public int WorksOrderNumber { get; set; }
        public string Nomenclature { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string RequestedBy { get; set; } = string.Empty;
        public string? SerialNoOfEquip { get; set; }
        public string BriefDescriptionOfWork { get; set; } = string.Empty;

        public DateTime DateWorkOrderReceived { get; set; }
        public string? MaintenanceType { get; set; }
        public string? Model { get; set; }
        public string? RequestedTo { get; set; }
        public DateTime? RepairStartDate { get; set; }
        public DateTime? RepairFinishDate { get; set; }

        public string? Status { get; set; }

        public string? Recommendation { get; set; }

        public double? ManHours { get; set; }
        public decimal? PartsCost { get; set; }
        public string? Remark { get; set; }

        // Deliver for clients
        public string? GivenTo { get; set; }
        public string? Approval { get; set; }
        public string? RecieverRemark { get; set; }
        public DateTime? RecievedDate { get; set; }

        [ForeignKey("EquipmentType")]
        public int EquipmentTypeId { get; set; }

        [ForeignKey("LetterRegistration")]
        public int? LetterId { get; set; }

        // Navigation properties
        public LetterRegistration? LetterRegistration { get; set; }
        public EquipmentType? EquipmentType { get; set; }

        public string CurrentHandler { get; set; } = "PPC"; // Default
        public string StatusStage { get; set; } = string.Empty;

        // ✅ NEW: Track who registered this maintenance request
        public string? RegisteredBy { get; set; }  // Full name of person who registered

        public string? RejectReason { get; set; }
        public DateTime? UpdatedAt { get; set; }


        // ✅ New: Quality of repair or inspection
        public QualityStatus? Quality { get; set; }

        // ✅ Technician tracking - who maintained this request
        public string? MaintainedBy { get; set; }  // Username of technician
        public int? MaintainedByUserId { get; set; }  // User ID for reference
        public string? TechnicianRole { get; set; }  // Role of technician (VHF_MAINTENANCE, etc.)

        // ✅ New: Computed field for Total Cost (not mapped to DB)
        [NotMapped]
        public decimal LaborCost
        {
            get
            {
                return (decimal?)(ManHours * 250) ?? 0; // Updated hourly rate to 250
            }
        }

        [NotMapped]
        public decimal TotalCost
        {
            get
            {
                decimal parts = PartsCost ?? 0;
                return parts + LaborCost;
            }
        }

    }
}
