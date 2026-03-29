using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gofabackend.Models
{
    public class Model2
    {
        public int Model2Id { get; set; }
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
        public string pTitle { get; set; }
        public string CheckedBy { get; set; }
        public string cTitle { get; set; }
        public string ApprovedBy { get; set; }
        public string aTitle { get; set; }
        public string IssuedTurnBy { get; set; }
        public string iTitle { get; set; }
        public string IssBy { get; set; }
        public string isTitle { get; set; }
        public string ReceivedBy { get; set; }
        public string rTitle { get; set; }

        // ✅ Added fields for Accessories and Extra Items
        public bool HasAccessories { get; set; }
        public bool HasExtraItems { get; set; }

        public List<Model2Accessory> Accessories { get; set; } = new List<Model2Accessory>();
        public List<Model2ExtraItem> ExtraItems { get; set; } = new List<Model2ExtraItem>();
        public double Vat { get; set; }
        public double GrandTotal { get; set; }
    }

    // ✅ Accessory Model for Model2
    public class Model2Accessory
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }

        // Foreign Key
        public int Model2Id { get; set; }

        [ForeignKey("Model2Id")]
        public Model2? Model2 { get; set; }
    }

    // ✅ Extra Item Model for Model2
    public class Model2ExtraItem
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }
        public string Store { get; set; }
        public string ExtraStatus { get; set; }
        public string ExtraIssuedByName { get; set; }

        // Foreign Key
        public int Model2Id { get; set; }

        [ForeignKey("Model2Id")]
        public Model2? Model2 { get; set; }
    }
}