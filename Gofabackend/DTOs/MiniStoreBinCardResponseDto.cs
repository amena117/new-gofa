public class MiniStoreBinCardResponseDto
{
    public int Id { get; set; }
    public string StockNumber { get; set; }
    public string Description { get; set; }
    public string Model { get; set; }        // ✅ Add this
    public string RecievedFrom { get; set; }
    public int QuantityRecieved { get; set; }
    public int Balance { get; set; }
    public string Date { get; set; }         // ✅ Add this
    public List<string> SerialNumbers { get; set; } = new();
}
