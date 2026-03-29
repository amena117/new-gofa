using System.Text.Json.Serialization; // Add this at the top

namespace Gofabackend.Models
{
    public class RequestOrderForIssue
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string IssueVoucherNo { get; set; }
        public string VoucherNo { get; set; }  
        public bool IsIssue { get; set; }      
        public string RequestingUnit { get; set; }   
        public string IssuingStore { get; set; }
        public string MakeAndModel { get; set; }
        public bool IsServiceable { get; set; }
        public string Category { get; set; }
        public string Currency { get; set; } // Added Currency property            
        public List<IssuedItem> IssuedItems { get; set; } = new List<IssuedItem>();
        public Person PreparedBy { get; set; }
        public Person VerifiedBy { get; set; }
        public Person ApprovedBy { get; set; }

        public string Status { get; set; } = "Pending"; // "Pending", "Accepted", "Rejected"   
        public string? AcceptedBy { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public string? RejectedBy { get; set; }
        public DateTime? RejectedAt { get; set; }
    }
    
  public class Person
    {
        public string Name { get; set; }
        public string Title { get; set; }
        public string JobResponsibility { get; set; }
        public DateTime Date { get; set; }
    }
   
}