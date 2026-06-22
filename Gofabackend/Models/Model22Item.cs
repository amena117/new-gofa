using System.ComponentModel.DataAnnotations;

namespace Gofabackend.Models
{
    // Update your Model22Item class in Gofabackend.Models
// Gofabackend.Models/Model22Item.cs
public class Model22Item
{
    public int Model22ItemId { get; set; }
    public int Model22Id { get; set; }
    
    public string Description { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Add category field
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "ETB";
    public List<string> SerialNumbers { get; set; } = new List<string>();
    public string? SerialNumber { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    
    // Flag to indicate if this is an accessory-only withdrawal (no parent item quantity change)
    public bool IsAccessoryOnly { get; set; } = false;
    public int? ParentItemId { get; set; } // Reference to parent item for accessory-only withdrawals

    // Navigation properties
    public Model22? Model22 { get; set; }
    
    // This property stores the withdrawn accessories
    public List<Model22ItemAccessory> WithdrawnAccessories { get; set; } = new List<Model22ItemAccessory>();
}

// Gofabackend.Models/Model22ItemAccessory.cs
public class Model22ItemAccessory
{
    public int Model22ItemAccessoryId { get; set; }
    public int Model22ItemId { get; set; }
    public int AccessoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Currency { get; set; }
    public List<string> WithdrawnSerialNumbers { get; set; } = new List<string>(); // Serial numbers that were withdrawn
    
    // ✅ NEW: Sub-accessories that were withdrawn with this accessory
    public List<Model22ItemSubAccessory> WithdrawnSubAccessories { get; set; } = new List<Model22ItemSubAccessory>();
    
    // Navigation property
    public Model22Item Model22Item { get; set; } = null!;
}

// ✅ NEW: Track withdrawn sub-accessories in Model22
public class Model22ItemSubAccessory
{
    public int Model22ItemSubAccessoryId { get; set; }
    public int Model22ItemAccessoryId { get; set; } // Foreign key to parent accessory
    public int SubAccessoryId { get; set; } // Reference to original sub-accessory
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; } = 0;
    public string Currency { get; set; } = "ETB";
    
    // Navigation property
    public Model22ItemAccessory Model22ItemAccessory { get; set; } = null!;
}

// Gofabackend.Models/Model22WithAccessoriesRequest.cs
public class Model22WithAccessoriesRequest
{
    public string VoucherNumber { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientOrganization { get; set; } = string.Empty;
    public string EthiopianDate { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string RegisteredBy { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public List<Model22ItemWithAccessoriesRequest> Items { get; set; } = new List<Model22ItemWithAccessoriesRequest>();
}

// Gofabackend.Models/Model22ItemWithAccessoriesRequest.cs
public class Model22ItemWithAccessoriesRequest
{
    public string Description { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "ETB";
    public List<string> SerialNumbers { get; set; } = new List<string>();
    public string VoucherNumber { get; set; } = string.Empty;
    
    // Flag to indicate if this is an accessory-only withdrawal
    public bool IsAccessoryOnly { get; set; } = false;
    public int? ParentItemId { get; set; } // ID of parent item for accessory-only withdrawals
    
    // Selected accessories for this item
    public List<AccessorySelectionRequest> SelectedAccessories { get; set; } = new List<AccessorySelectionRequest>();
}

// Gofabackend.Models/AccessorySelectionRequest.cs
public class AccessorySelectionRequest
{
    public int AccessoryId { get; set; }
    public int Quantity { get; set; }
    public List<string> SerialNumbers { get; set; } = new List<string>(); // Serial numbers to withdraw
    public decimal? UnitPrice { get; set; } // Unit price at time of withdrawal
    public string? Currency { get; set; } // Currency at time of withdrawal
}

}