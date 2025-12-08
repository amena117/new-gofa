  using System;
using System.ComponentModel.DataAnnotations;

namespace Gofabackend.Models
{
    public class LetterRegistration
    {
        [Key]
        public int LetterId { get; set; }

        public string From { get; set; }
        public string RecommendBy { get; set; }
        public string Status { get; set; }

        [DataType(DataType.Date)]
        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}
