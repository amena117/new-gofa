namespace Gofabackend.Models
{
    public class ReportGroup
    {
        public string GroupName { get; set; }
        public List<MaintenanceRequestRegister> Items { get; set; }
    }
}