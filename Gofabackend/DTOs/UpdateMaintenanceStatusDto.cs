// DTO/UpdateMaintenanceStatusDto.cs
namespace Gofabackend.DTO
{
    public class UpdateMaintenanceStatusDto
    {
        public int RequestId { get; set; }
        public string NewStatus { get; set; } = null!;
        public string? UpdatedBy { get; set; }
        public string? Remark { get; set; }
        public string Status { get; set; } = string.Empty; // For new endpoint
    }
}
