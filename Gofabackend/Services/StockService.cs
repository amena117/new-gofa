using Gofabackend.Models; // For model types
public class StockService
{
    public void CalculateInStockForIssuedRecords(List<MasterCardItemReceived> receivedRecords, List<MasterCardItemIssued> issuedRecords)
    {
        var allReceived = receivedRecords.OrderBy(r => r.Date).ThenBy(r => r.Id).ToList();
        var allIssued = issuedRecords.OrderBy(i => i.Date).ThenBy(i => i.Id).ToList();

        foreach (var issued in allIssued)
        {
            int totalReceived = allReceived
                .Where(r => r.Date <= issued.Date || (r.Date == issued.Date && r.Id < issued.Id))
                .Sum(r => r.Received);

            int totalIssued = allIssued
                .Where(i => i.Date < issued.Date || (i.Date == issued.Date && i.Id <= issued.Id))
                .Sum(i => i.Issued);

            issued.InStock = totalReceived - totalIssued;
        }
    }

    public int CalculateInStock(List<MasterCardItemReceived> receivedRecords, List<MasterCardItemIssued> issuedRecords)
    {
        // Sum all received quantities
        int totalReceived = receivedRecords.Sum(r => r.Received);

        // Sum all issued quantities
        int totalIssued = issuedRecords.Sum(i => i.Issued);

        // Total in stock = received - issued
        return totalReceived - totalIssued;
    }
}