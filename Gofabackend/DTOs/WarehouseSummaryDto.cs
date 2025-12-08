public class WarehouseSummaryDto
{
    public string WarehouseId { get; set; }
    public string WarehouseName { get; set; }
    public int TotalItems { get; set; }
    public int TotalQuantity { get; set; }
    public int LowStockItems { get; set; }
    public string MostRecentRegistration { get; set; }
}