using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // 👈 Add this line
using System.Text.Json.Serialization;

namespace Gofabackend.Models
{
    public class MasterCardItemIssued
    {
        public int Id { get; set; }
        public int MasterCardItemId { get; set; }
        public DateTime Date { get; set; }
        public string VoucherNo { get; set; }
        public int Issued { get; set; }
        public string Organization { get; set; }
        public string PostedBy { get; set; }
        public string Location { get; set; }
        public int InStock { get; set; } // Set by StockService
        public decimal TotalPrice => Issued * UnitPrice; // Computed

        public decimal UnitPrice { get; set; } // Added

        public string CurrencyCode { get; set; } = "USD"; // New property, default to USD
        public int Quantity { get; internal set; }


        // --- Accessories Support ---
        public bool HasAccessories { get; set; }

        public virtual List<IssuedAccessory> IssuedAccessories { get; set; } = new List<IssuedAccessory>();
    }

    public class IssuedAccessory
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        public int Quantity { get; set; }

        public int MasterCardItemIssuedId { get; set; }

        [ForeignKey("MasterCardItemIssuedId")]
        [JsonIgnore]
        public virtual MasterCardItemIssued? MasterCardItemIssued { get; set; }
    }
}