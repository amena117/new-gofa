using System.ComponentModel.DataAnnotations;
namespace Gofabackend.DTO
{
    public class MaintenanceRequestFullUpdateDto
    {
        public string SerialNoOfEquip { get; set; } = string.Empty;
        public int EquipmentTypeId { get; set; }
        public string Model { get; set; } = string.Empty;
        public string RequestedBy { get; set; } = string.Empty;
        public string BriefDescriptionOfWork { get; set; } = string.Empty;
        public DateTime DateWorkOrderReceived { get; set; }
        public string StatusStage { get; set; } = string.Empty;
    }
}