// DTOs/RegisterItemUnitsDto.cs
using System.ComponentModel.DataAnnotations;

namespace Gofabackend.DTOs
{
    public class RegisterItemUnitsDto
    {
        [Required]
        public int ItemId { get; set; }

        [MinLength(1)]
        public List<ItemUnitDto> Units { get; set; } = new List<ItemUnitDto>();
    }

    public class ItemUnitDto
    {
        [Required]
        public string SerialNumber { get; set; } = string.Empty;

        public string Shelf { get; set; } = string.Empty;
        public string ItemColumn { get; set; } = string.Empty;
        public string ItemRow { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string VoucherNumber { get; set; } = string.Empty;
        public string ReceivedFrom { get; set; } = string.Empty;
        public string RegisteredBy { get; set; } = string.Empty;

        public List<AccessoryDto> Accessories { get; set; } = new List<AccessoryDto>();
    }

    public class AccessoryDto
    {
        [Required]
        public string Type { get; set; } = string.Empty;

        public string SerialNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}