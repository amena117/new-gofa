namespace Gofabackend
{
    public class JwtSettings
    {
        public string Key { get; set; }
        public string Issuer { get; set; }
        public string Audience { get; set; }  // Added since it's in your JSON
        public int Lifetime { get; set; } = 15; // Default to 15 minutes if not present
    }
}