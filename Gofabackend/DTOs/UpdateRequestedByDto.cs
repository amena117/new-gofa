using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gofabackend.DTO
{
    public class UpdateRequestedByDto
    {
        public string RequestedBy { get; set; }
        public string CurrentStage { get; set; }
    }

}
