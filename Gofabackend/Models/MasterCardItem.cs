
namespace Gofabackend.Models
{
    public class MasterCardItem
    {
        public int Id { get; set; }
        public string Model { get; set; }
        public string PartNumber { get; set; }
        public string Description { get; set; }
        public string UnitOfMeasure { get; set; }
        public string InChAb { get; set; }
        public string UnitPack { get; set; }
        public int Quantity { get; set; } // Tracks current stock

        public string CardNo { get; set; }

        public string Status { get; set; }
        public List<MasterCardItemReceived> ReceivedRecords { get; set; } = new List<MasterCardItemReceived>();
        public List<MasterCardItemIssued> IssuedRecords { get; set; } = new List<MasterCardItemIssued>();
    }
}

