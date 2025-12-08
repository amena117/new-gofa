using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema; // 👈 Add this line
using System.Text.Json.Serialization;

namespace Gofabackend.Models
{
    public class MasterCardItemReceived
    {
        public int Id { get; set; }
        public int MasterCardItemId { get; set; }
        public DateTime Date { get; set; }
        public string VoucherNo { get; set; }
        public int Received { get; set; }
        public string Organization { get; set; }
        public string PostedBy { get; set; }
        public int InStock { get; set; }       // Added: Current stock level after receiving
        public decimal UnitPrice { get; set; } // Added: Price per unit     
                                               // Computed property: TotalPrice = Received * UnitPrice
        public decimal TotalPrice => Received * UnitPrice;
        public string Location { get; set; }

        public string CurrencyCode { get; set; } = "USD"; // New property, default to USD
        public int Quantity { get; internal set; }


        // --- New: Accessories ---

        
        public bool HasAccessories { get; set; }

        public virtual List<ReceivedAccessory> ReceivedAccessories { get; set; } = new List<ReceivedAccessory>();
    }
    // Note: Use nullable if optional. Or initialize in constructor.

    // Separate class for accessory details
  public class ReceivedAccessory
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; }

    public int Quantity { get; set; }

    public int MasterCardItemReceivedId { get; set; }

   [ForeignKey("MasterCardItemReceivedId")]
   [JsonIgnore]  // ← This prevents the cycle during JSON serialization
   public virtual MasterCardItemReceived? MasterCardItemReceived { get; set; }
}
}

