using System.Collections.Generic;

namespace Gofabackend.Models
{
    public class Model2Dto
    {
        public int Id { get; set; }
        public string Date { get; set; }
        public string IssueVocNo { get; set; }
        public string VoucherNumber { get; set; }
        public string TransType { get; set; }
        public string RequestingUnit { get; set; }
        public string IssuingStore { get; set; }
        public string Model { get; set; }
        public string RegisteredBy { get; set; }
        public string Status { get; set; }
        public string Category { get; set; }
        public string StockNumber { get; set; }
        public string Description { get; set; }
        public string UnitOfMeasurment { get; set; }
        public float OnHand { get; set; }
        public float Request { get; set; }
        public float Issued { get; set; }
        public float DO { get; set; }
        public float UnitPrice { get; set; }
        public float TotalPrice { get; set; }
        public string Currency { get; set; }
        public string PreparedBy { get; set; }
        public string pRank { get; set; } = string.Empty;
        public string pTitle { get; set; }
        public string CheckedBy { get; set; }
        public string cRank { get; set; } = string.Empty;
        public string cTitle { get; set; }
        public string ApprovedBy { get; set; }
        public string aRank { get; set; } = string.Empty;
        public string aTitle { get; set; }
        public string IssuedTurnBy { get; set; }
        public string iRank { get; set; } = string.Empty;
        public string iTitle { get; set; }
        public string IssBy { get; set; }
        public string isRank { get; set; } = string.Empty;
        public string isTitle { get; set; }
        public string ReceivedBy { get; set; }
        public string rRank { get; set; } = string.Empty;
        public string rTitle { get; set; }
        public bool HasAccessories { get; set; }
        public List<M2AccessoryDto> Accessories { get; set; } = new List<M2AccessoryDto>();
        public bool HasExtraItems { get; set; }
        public List<M2ExtraItemDto> ExtraItems { get; set; } = new List<M2ExtraItemDto>();
        public double Vat { get; set; }
        public double GrandTotal { get; set; }
    }

    public class M2AccessoryDto
    {
        public string Name { get; set; }
        public int Quantity { get; set; }
    }

    public class M2ExtraItemDto
    {
        public string Name { get; set; }
        public int Quantity { get; set; } // Changed to int to match Model2ExtraItem
        public string Store { get; set; }
        public string ExtraStatus { get; set; }
        public string ExtraIssuedByName { get; set; }
    }
}