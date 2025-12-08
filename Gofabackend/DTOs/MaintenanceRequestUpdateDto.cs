using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gofabackend.DTO
{
    public class MaintenanceRequestUpdateDto
    {
        [Required(ErrorMessage = "MaintenanceType is required.")]
        public string MaintenanceType { get; set; }

        [Required(ErrorMessage = "Model is required.")]
        public string Model { get; set; }

        [Required(ErrorMessage = "RequestedTo is required.")]
        public string RequestedTo { get; set; }

        public string Status { get; set; } // Optional field
    }
}
