namespace Gofabackend.DTO
{
    public class RegisterDto
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string Role { get; set; } // Role can be "VHF", "HF", "Transit", "Sparepart", "Electronics", or "Manager"
    }
}