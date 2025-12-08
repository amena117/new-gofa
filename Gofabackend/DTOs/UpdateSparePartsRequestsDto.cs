using System;

namespace Gofabackend.DTO
{
public class UpdateSparePartsRequestsDto
{
    public string RequestedBy { get; set; }
    public string Reason { get; set; }
    public string StockNumber { get; set; }
    public string CurrentStage { get; set; }
    public string SerialNumber { get; set; }
}
}