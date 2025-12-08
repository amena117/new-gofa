using System.ComponentModel.DataAnnotations;

namespace Gofabackend.Models
{
    public class StoredToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public string TokenHash { get; set; }

        [Required]
        public string EncryptedToken { get; set; }

        [Required]
        public DateTime ExpiryDate { get; set; }

        [Required]
        public bool IsRevoked { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
} 