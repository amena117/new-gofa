using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gofabackend.DTO
{
    public class MaintenanceRequestInserUpdateDto
    {
        
            public string Nomenclature { get; set; }
            public int Quantity { get; set; }
            public string RequestedBy { get; set; }
            public string SerialNoOfEquip { get; set; }
            public string BriefDescriptionOfWork { get; set; }
            public DateTime DateWorkOrderReceived { get; set; }
            public int EquipmentTypeId { get; set; }

            // Optional fields
           
        }
    }

