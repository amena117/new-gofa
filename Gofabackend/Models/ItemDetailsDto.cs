// namespace Gofabackend.Models
// {
//     // 1. ItemDetailsDto
//     public class ItemDetailsDto
//     {
//         public int ItemId { get; set; }
//         public string Category { get; set; } = string.Empty;
//         public string Description { get; set; } = string.Empty;
//         public string Shelf { get; set; } = string.Empty;
//         public string ItemColumn { get; set; } = string.Empty;
//         public string ItemRow { get; set; } = string.Empty;
//         public string? VoucherNumber { get; set; }
//         public string ReceivedFrom { get; set; } = string.Empty;
//         public string Condition { get; set; } = string.Empty;
//         public int Quantity { get; set; }
//         public int? NumOfBox { get; set; }
//         public string RegisteredBy { get; set; } = string.Empty;
//         public string Role { get; set; } = string.Empty;
//         public string Model { get; set; } = string.Empty;
//         public string WarehouseId { get; set; } = string.Empty;
//         public string RegistrationDate { get; set; } = string.Empty;
//         public decimal UnitPrice { get; set; }
//         public string Currency { get; set; } = "ETB";
//         public string Source { get; set; } = "Purchase";
//         public string History { get; set; } = string.Empty;
        
//         public List<ItemSerialNumberDto> SerialNumbers { get; set; } = new();
//         public List<TransactionEntryDto> TransactionHistory { get; set; } = new();
//         public List<AccessoryDto> Accessories { get; set; } = new();
//         public List<ItemUnitDto> Units { get; set; } = new();
//     }

//     // 2. ItemSerialNumberDto
//     public class ItemSerialNumberDto
//     {
//         public int Id { get; set; }
//         public string SerialNumber { get; set; } = string.Empty;
//         public string AddedDate { get; set; } = string.Empty;
//     }

//     // 3. AccessoryDto (COMPLETE VERSION)
//     public class AccessoryDto
//     {
//         public int Id { get; set; }
//         public string Name { get; set; } = string.Empty;
//         public string Model { get; set; } = string.Empty;
//         public int Quantity { get; set; }
//         public decimal? UnitPrice { get; set; } // ✅ Add this
//         public string? Currency { get; set; } // ✅ Add this
//         public bool RequiresSerialNumbers { get; set; } // ✅ Add this
//         public List<AccessorySerialNumberDto> SerialNumbers { get; set; } = new();
//     }

//     // 4. AccessorySerialNumberDto
//     public class AccessorySerialNumberDto
//     {
//         public int Id { get; set; }
//         public string SerialNumber { get; set; } = string.Empty;
//     }

//     // 5. ItemUnitDto
//     public class ItemUnitDto
//     {
//         public int Id { get; set; }
//         public string SerialNumber { get; set; } = string.Empty;
//     }
    
//     // 6. TransactionEntryDto (you already have this)
//     // public class TransactionEntryDto
//     // {
//     //     public int Id { get; set; }
//     //     public int ItemId { get; set; }
//     //     public string Category { get; set; } = string.Empty;
//     //     public string Description { get; set; } = string.Empty;
//     //     public string Action { get; set; } = string.Empty;
//     //     public int Quantity { get; set; }
//     //     public string VoucherNumber { get; set; } = string.Empty;
//     //     public string Details { get; set; } = string.Empty;
//     //     public string Date { get; set; } = string.Empty;
//     //     public int? Model22Id { get; set; }
//     // }
// }