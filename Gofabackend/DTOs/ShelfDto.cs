namespace Gofabackend.DTO
{
    public class ShelfDto
    {
        public int ShelfId { get; set; }
        public string Name { get; set; }
        public string Column { get; set; }
        public string Row { get; set; }
        public string WarehouseId { get; set; } // Changed to string
    }
}