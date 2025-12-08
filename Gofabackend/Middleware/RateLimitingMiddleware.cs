using System.Collections.Concurrent;

namespace Gofabackend.Services
{
    public class RateLimitingService
    {
        private readonly ConcurrentDictionary<string, TokenBucket> _buckets = new();
        private readonly int _maxRequests;
        private readonly int _refillRate;
        private readonly int _refillPeriod;

        public RateLimitingService(int maxRequests = 100, int refillRate = 10, int refillPeriod = 60)
        {
            _maxRequests = maxRequests;
            _refillRate = refillRate;
            _refillPeriod = refillPeriod;
        }

        public bool IsRateLimited(string key)
        {
            var bucket = _buckets.GetOrAdd(key, _ => new TokenBucket(_maxRequests, _refillRate, _refillPeriod));
            return !bucket.TryConsume();
        }

        private class TokenBucket
        {
            private readonly int _capacity;
            private readonly int _refillRate;
            private readonly int _refillPeriod;
            private double _tokens;
            private DateTime _lastRefill;

            public TokenBucket(int capacity, int refillRate, int refillPeriod)
            {
                _capacity = capacity;
                _refillRate = refillRate;
                _refillPeriod = refillPeriod;
                _tokens = capacity;
                _lastRefill = DateTime.UtcNow;
            }

            public bool TryConsume()
            {
                Refill();
                if (_tokens >= 1)
                {
                    _tokens -= 1;
                    return true;
                }
                return false;
            }

            private void Refill()
            {
                var now = DateTime.UtcNow;
                var timePassed = (now - _lastRefill).TotalSeconds;
                var tokensToAdd = timePassed * _refillRate / _refillPeriod;
                _tokens = Math.Min(_capacity, _tokens + tokensToAdd);
                _lastRefill = now;
            }
        }
    }
} 