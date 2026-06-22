namespace Gofabackend.Models
{
    public class Model22
{
    public int Model22Id { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientOrganization { get; set; } = string.Empty;
    public string EthiopianDate { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string RegisteredBy { get; set; } = string.Empty;
    public string? Comment { get; set; }
    
    // Navigation property
    public virtual ICollection<Model22Item> Items { get; set; } = new List<Model22Item>();
}
}