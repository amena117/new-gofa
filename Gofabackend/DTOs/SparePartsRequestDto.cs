using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace Gofabackend.DTO
{
    public class SparePartsRequestDto
    {
        public string ApprovedBy { get; set; }
        public int QuantityApproved { get; set; }
        public DateTime ApprovalDate { get; set; }
        public string Remark { get; set; } // optional
    }
}
