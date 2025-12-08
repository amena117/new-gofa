namespace Gofabackend.Models
{
    public class RequestOrderReportFilter
    {
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public string? RequestingUnit { get; set; } // Maps to organization
        public string? IssuingStore { get; set; }   // Maps to location
        public string? Category { get; set; }
        public string? MakeAndModel { get; set; }
        public string? StockNumber { get; set; }
        public string? Description { get; set; }
    }
}