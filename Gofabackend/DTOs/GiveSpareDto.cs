using System;

namespace Gofabackend.DTO
{
    public class GiveSpareDto
    {
        public string StockNumber { get; set; }
        public List<string> SerialNumbers { get; set; }
        public string GivenTo { get; set; } // Optional
        public DateTime? DateGiven { get; set; }
    }

}
