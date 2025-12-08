namespace Gofabackend.Models
{
    public class CategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Role { get; set; } = "Unknown"; // 👈 Add this
    }
}