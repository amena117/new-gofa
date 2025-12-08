// Add to Gofabackend.Models namespace
using System.ComponentModel.DataAnnotations;

public class WithdrawItemQuantityRequest
{
    public int ItemId { get; set; }
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than 0.")]
    public int Quantity { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string IssuedTo { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public List<string>? SerialNumbers { get; set; }
    [Required]
    [RegularExpression("^(ETB|POUND|USD|EURO)$", ErrorMessage = "Currency must be one of: ETB, POUND, USD, EURO.")]
    public string Currency { get; set; } = "ETB";
    
    // NEW: Add accessory selection
    public List<WithdrawAccessoryRequest>? SelectedAccessories { get; set; }
}

public class WithdrawAccessoryRequest
{
    public int AccessoryId { get; set; }
    public int Quantity { get; set; }
}