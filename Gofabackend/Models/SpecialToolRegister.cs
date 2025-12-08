using System;
using System.ComponentModel.DataAnnotations;

namespace Gofabackend.Models
{
    public class SpecialToolRegister
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Tool Name is required.")]
        public string ToolName { get; set; }

        [Required(ErrorMessage = "Received By is required.")]
        public string RecievedBy { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
        public int Quantity { get; set; }

        public string? Description { get; set; }

        [DataType(DataType.Date)]
        public DateTime RecievedDate { get; set; }

        [Required(ErrorMessage = "Given By is required.")]
        public string GivenBy { get; set; }

        // Deadline date (when the tool should be returned)
        [DataType(DataType.Date)]
        public DateTime? ReturnDate { get; set; }

        // Actual date when tool is returned
        [DataType(DataType.Date)]
        public DateTime? ReturnedDate { get; set; }

        public string? Remarks { get; set; }
    }
}
