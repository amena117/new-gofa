using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Gofabackend.DTO
{
    public class SerialNumberDto
    {
        [Required(ErrorMessage = "SerialNumber is required.")]
        public string SerialNumber { get; set; } = string.Empty;

        public string Status { get; set; } = "Available in stock";

        public DateTime InDate { get; set; } = DateTime.Now;
    }

    public class RecieveSpareFormDto
    {
        [Required(ErrorMessage = "StockNumber is required.")]
        public string StockNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "Model is required.")]
        public string Model { get; set; } = string.Empty;

        [Required(ErrorMessage = "Date is required.")]
        public DateTime Date { get; set; }

        [Required(ErrorMessage = "RecievedFrom is required.")]
        public string RecievedFrom { get; set; } = string.Empty;

        [Required(ErrorMessage = "QuantityRecieved is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "QuantityRecieved must be greater than zero.")]
        public int QuantityRecieved { get; set; }

        [Required(ErrorMessage = "SerialNumbers list is required.")]
        public List<SerialNumberDto> SerialNumbers { get; set; } = new();
    }
}
