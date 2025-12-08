// Add your service logic here

using System.Collections.Generic;
using Gofabackend.Models;

namespace Gofabackend.Services
{
    public class StockService
    {
        // Calculates the in-stock quantity based on received and issued records
        public int CalculateInStock(IEnumerable<MasterCardItemReceived> receivedRecords, IEnumerable<MasterCardItemIssued> issuedRecords)
        {
            int totalReceived = 0;
            int totalIssued = 0;

            if (receivedRecords != null)
            {
                foreach (var rec in receivedRecords)
                {
                    totalReceived += rec.Quantity;
                }
            }

            if (issuedRecords != null)
            {
                foreach (var iss in issuedRecords)
                {
                    totalIssued += iss.Quantity;
                }
            }

            return totalReceived - totalIssued;
        }
    }
}