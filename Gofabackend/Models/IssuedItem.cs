 namespace Gofabackend.Models
{
 public class IssuedItem
    {
     
        public int Id { get; set; }
        public int RequestOrderForIssueId { get; set; }
        public string ItemNo { get; set; }
        public string StockNumber { get; set; }
        public string Description {get ; set ;}
        public int Issued { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice => UnitPrice * Issued;
         
       
    }
}