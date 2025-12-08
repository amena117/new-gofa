namespace Gofabackend.Models
{
    public class LoginLog
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public bool Success { get; set; }
        public string IpAddress { get; set; }
        public DateTime Timestamp { get; set; }
    }
}