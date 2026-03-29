using Gofabackend.Models;

public class Model1
{
    public int Model1Id { get; set; }
    public string Supplier { get; set; }
    public string Category { get; set; }
    public string PRNO { get; set; }
    public string Date { get; set; }
    public string InvoiceNo { get; set; }
    public string ItemType { get; set; }
    public string ContactNumber { get; set; }
    public string Number { get; set; }
    public string RegisteredBy { get; set; }
    public string SerialNumber { get; set; }
    public string Description { get; set; }
    public string UnitOfMeasurment { get; set; }
    public int Ordered { get; set; }
    public int Received { get; set; }
    public float UnitOfPrice { get; set; }
    public float Amount { get; set; }
    public string Currency { get; set; }
    public string Location { get; set; }
    public string Remark { get; set; }
    public string CheckedByName { get; set; }
    public string CTitle { get; set; }
    public string RecivedByName { get; set; }
    public string RTitle { get; set; }
    public string AuthorizedByName { get; set; }
    public string ATitle { get; set; }
    public string Model19Ref { get; set; }
    public string Status { get; set; }
    public string StoreType { get; set; }
    public bool HasAccessories { get; set; }
    public bool HasExtraItems { get; set; }
    public List<Accessories> Accessories { get; set; }
    public List<ExtraItem> ExtraItems { get; set; }
    public float Vat { get; set; }
    public float GrandTotal { get; set; }

    
}