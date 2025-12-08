namespace Gofabackend.Models
{
    public class Shelf
    {
        public int ShelfId { get; set; } // Keep as int (auto-incremented PK)
        public string Name { get; set; }
        public string Column { get; set; }
        public string Row { get; set; }
        public string WarehouseId { get; set; } // Changed to string to match Warehouse

        public Warehouse Warehouse { get; set; }
    }
}