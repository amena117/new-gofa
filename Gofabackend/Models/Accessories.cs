namespace Gofabackend.Models
{ 
    public class Accessories
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }

        // Foreign key to parent item
        public int Model1Id { get; set; }
        public Model1? Model1 { get; set; }
    }
}
