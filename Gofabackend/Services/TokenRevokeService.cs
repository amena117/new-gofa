using System;
using System.Collections.Concurrent;

namespace Gofabackend.Services
{
    public class TokenRevokeService
    {
        private readonly ConcurrentDictionary<string, DateTime> _revokedTokens = new();

        public void RevokeToken(string tokenHash, TimeSpan expiration)
        {
            _revokedTokens.TryAdd(tokenHash, DateTime.UtcNow.Add(expiration));
        }

        public bool IsTokenRevoked(string tokenHash)
        {
            if (_revokedTokens.TryGetValue(tokenHash, out var expiry))
            {
                if (DateTime.UtcNow > expiry)
                {
                    _revokedTokens.TryRemove(tokenHash, out _);
                    return false;
                }
                return true;
            }
            return false;
        }

        public void CleanUpExpiredTokens()
        {
            foreach (var token in _revokedTokens)
            {
                if (DateTime.UtcNow > token.Value)
                {
                    _revokedTokens.TryRemove(token.Key, out _);
                }
            }
            GC.Collect(); // Optional cleanup
        }
    }
}