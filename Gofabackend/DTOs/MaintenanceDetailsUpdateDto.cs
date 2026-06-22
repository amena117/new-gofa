using System;

namespace Gofabackend.DTO
{
	public class MaintenanceDetailsUpdateDto
	{
		public DateTime? RepairFinishDate { get; set; }
		public string Status { get; set; }
		public double? ManHours { get; set; }
		public decimal? PartsCost { get; set; } // ✅ spare parts cost entered by technician
		public string Remark { get; set; }
		public string? MaintainedBy { get; set; } // ✅ from frontend
	}
}