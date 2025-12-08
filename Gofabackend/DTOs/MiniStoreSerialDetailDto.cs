// DTO/MiniStoreSerialDetailDto.cs
using System;
using System.Collections.Generic;

namespace Gofabackend.DTO
{
    public class MiniStoreSerialDetailDto
    {
        public string StockNumber { get; set; }
        public string Model { get; set; } = string.Empty;
        public List<SerialDetailDto> Serials { get; set; } = new();
    }

    public class SerialDetailDto
    {
        public string SerialNumber { get; set; } = string.Empty;
        public DateTime InDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
