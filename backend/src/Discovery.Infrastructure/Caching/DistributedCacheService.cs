using System.Text.Json;
using Discovery.Application.Abstractions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Caching;

/// <summary>
/// JSON cache on top of IDistributedCache (Redis in production). Cache failures degrade to
/// a direct database read instead of failing the request.
/// </summary>
public sealed class DistributedCacheService(IDistributedCache cache, ILogger<DistributedCacheService> logger) : ICacheService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<T> GetOrCreateAsync<T>(string key, TimeSpan ttl, Func<CancellationToken, Task<T>> factory, CancellationToken ct)
    {
        try
        {
            var cached = await cache.GetStringAsync(key, ct);
            if (cached is not null)
            {
                var value = JsonSerializer.Deserialize<T>(cached, Json);
                if (value is not null)
                {
                    return value;
                }
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Cache read failed for {Key}", key);
        }

        var created = await factory(ct);
        try
        {
            await cache.SetStringAsync(
                key,
                JsonSerializer.Serialize(created, Json),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
                ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Cache write failed for {Key}", key);
        }

        return created;
    }

    public async Task RemoveAsync(string key, CancellationToken ct)
    {
        try
        {
            await cache.RemoveAsync(key, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Cache remove failed for {Key}", key);
        }
    }
}
