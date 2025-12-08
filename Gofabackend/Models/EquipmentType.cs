namespace Gofabackend.Models
{
    public class EquipmentType
    {

        public int EquipmentTypeId { get; set; }  // Primary Key
        public string EquipmentTypeName { get; set; }
        public string EquipmentModel { get; set; }  // ✅ Add this
        //public string Model { get; set; }
        // Other properties relevant to an item
    }
}