using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;

namespace Gofabackend.Services
{
    public interface ITokenStorageService
    {
        Task StoreTokenAsync(int userId, string token, DateTime expiry);
        Task<bool> ValidateTokenAsync(int userId, string token);
        Task RevokeTokenAsync(int userId, string token);
        Task RevokeAllUserTokensAsync(int userId);
        Task<string> GenerateRefreshTokenAsync(int userId);
        Task<bool> ValidateRefreshTokenAsync(int userId, string refreshToken);
    }

    public class TokenStorageService : ITokenStorageService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly byte[] _encryptionKey;
        private readonly byte[] _iv;

        public TokenStorageService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
            
            // Generate a proper 32-byte key for AES encryption
            var keyString = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
            using var sha256 = SHA256.Create();
            _encryptionKey = sha256.ComputeHash(Encoding.UTF8.GetBytes(keyString));
            
            // Generate a fixed IV (16 bytes for AES)
            _iv = SHA256.HashData(Encoding.UTF8.GetBytes(_configuration["Jwt:Issuer"] ?? "gofa-app"))[..16];
        }

        public async Task StoreTokenAsync(int userId, string token, DateTime expiry)
        {
            try
            {
                var tokenHash = HashToken(token);
                var encryptedToken = EncryptToken(token);
                
                var storedToken = new StoredToken
                {
                    UserId = userId,
                    TokenHash = tokenHash,
                    EncryptedToken = encryptedToken,
                    ExpiryDate = expiry,
                    IsRevoked = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StoredTokens.Add(storedToken);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to store token", ex);
            }
        }

        public async Task<bool> ValidateTokenAsync(int userId, string token)
        {
            try
            {
                var tokenHash = HashToken(token);
                var storedToken = await _context.StoredTokens
                    .FirstOrDefaultAsync(t => t.UserId == userId && 
                                            t.TokenHash == tokenHash && 
                                            !t.IsRevoked && 
                                            t.ExpiryDate > DateTime.UtcNow);

                if (storedToken == null) return false;

                // Verify the token hasn't been tampered with
                var decryptedToken = DecryptToken(storedToken.EncryptedToken);
                return decryptedToken == token;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to validate token", ex);
            }
        }

        public async Task RevokeTokenAsync(int userId, string token)
        {
            try
            {
                var tokenHash = HashToken(token);
                var storedToken = await _context.StoredTokens
                    .FirstOrDefaultAsync(t => t.UserId == userId && t.TokenHash == tokenHash);

                if (storedToken != null)
                {
                    storedToken.IsRevoked = true;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to revoke token", ex);
            }
        }

        public async Task RevokeAllUserTokensAsync(int userId)
        {
            try
            {
                var userTokens = await _context.StoredTokens
                    .Where(t => t.UserId == userId && !t.IsRevoked)
                    .ToListAsync();

                foreach (var token in userTokens)
                {
                    token.IsRevoked = true;
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to revoke all user tokens", ex);
            }
        }

        public async Task<string> GenerateRefreshTokenAsync(int userId)
        {
            var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            var expiry = DateTime.UtcNow.AddDays(7); // Refresh tokens valid for 7 days

            await StoreTokenAsync(userId, refreshToken, expiry);
            return refreshToken;
        }

        public async Task<bool> ValidateRefreshTokenAsync(int userId, string refreshToken)
        {
            return await ValidateTokenAsync(userId, refreshToken);
        }

        private string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
            return Convert.ToBase64String(hashBytes);
        }

        private string EncryptToken(string token)
        {
            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            aes.IV = _iv;

            using var encryptor = aes.CreateEncryptor();
            var tokenBytes = Encoding.UTF8.GetBytes(token);
            var encryptedBytes = encryptor.TransformFinalBlock(tokenBytes, 0, tokenBytes.Length);
            
            return Convert.ToBase64String(encryptedBytes);
        }

        private string DecryptToken(string encryptedToken)
        {
            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            aes.IV = _iv;

            using var decryptor = aes.CreateDecryptor();
            var encryptedBytes = Convert.FromBase64String(encryptedToken);
            var decryptedBytes = decryptor.TransformFinalBlock(encryptedBytes, 0, encryptedBytes.Length);
            
            return Encoding.UTF8.GetString(decryptedBytes);
        }
    }
} 