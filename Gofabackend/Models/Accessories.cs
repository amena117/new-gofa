namespace Gofabackend.Models
{ 
    public class Accessories
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }
        public decimal? UnitPrice { get; set; } // Optional
        public string? Currency { get; set; } // Optional

        // Foreign key to parent item
        public int Model1Id { get; set; }
        public Model1? Model1 { get; set; }
        
        // Navigation property for sub-accessories
        public List<Model1AccessorySubAccessory> SubAccessories { get; set; } = new List<Model1AccessorySubAccessory>();
    }
    
    // Sub-accessories for Model1 Accessories (Transit items)
    public class Model1AccessorySubAccessory
    {
        public int Id { get; set; }
        public int AccessoriesId { get; set; } // Foreign key to parent Model1 accessory
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal? UnitPrice { get; set; } // Optional
        public string? Currency { get; set; } // Optional
        
        // Navigation property
        public Accessories Accessories { get; set; } = null!;
    }
}
