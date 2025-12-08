namespace Gofabackend.Models
{
   public class MasterCardItemsReportFilter
{
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Organization { get; set; }
    public string? Location { get; set; }
    public string? Model { get; set; }
    public string? PartNumber { get; set; }
    public string? Status { get; set; }
    public bool IncludeAccessories { get; set; }
}
}