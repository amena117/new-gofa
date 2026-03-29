using Gofabackend.Models;

public class ReceiveHistoryDto
{
    public int TransactionId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string ReceivedFrom { get; set; } = string.Empty;
    public string RegisteredBy { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty; // EC format
    public string Source { get; set; } = "Purchase";
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "ETB";
    public List<ReceivedAccessoryDto> Accessories { get; set; } = new List<ReceivedAccessoryDto>();
}

public class ReceivedAccessoryDto
{
    public string Name { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "ETB";
    public List<string> SerialNumbers { get; set; } = new List<string>();
    public List<ReceivedSubAccessoryDto> SubAccessories { get; set; } = new List<ReceivedSubAccessoryDto>();
}

public class ReceivedSubAccessoryDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "ETB";
}