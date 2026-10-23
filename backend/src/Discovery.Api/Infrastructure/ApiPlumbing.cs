using System.Security.Claims;
using Discovery.Application.Abstractions;
using Discovery.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Discovery.Api.Infrastructure;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid? UserId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public bool IsInRole(string role) => accessor.HttpContext?.User.IsInRole(role) ?? false;

    public Guid RequireUserId() => UserId ?? throw new ForbiddenException("Authentication is required.");
}

/// <summary>Maps expected failures to RFC 7807 ProblemDetails. Unexpected errors become a generic 500.</summary>
public sealed class ProblemExceptionHandler(IProblemDetailsService problems, ILogger<ProblemExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem;
        switch (exception)
        {
            case AppException app:
                problem = new ProblemDetails { Status = app.StatusCode, Title = app.Title, Detail = app.Message };
                break;
            case ValidationException validation:
                problem = new ValidationProblemDetails(validation.Errors
                    .GroupBy(e => JsonName(e.PropertyName))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Validation failed",
                };
                break;
            case DbUpdateConcurrencyException:
                problem = new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Conflict",
                    Detail = "The record was modified by someone else. Reload and try again.",
                };
                break;
            case OperationCanceledException when context.RequestAborted.IsCancellationRequested:
                return true;
            default:
                logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
                problem = new ProblemDetails { Status = StatusCodes.Status500InternalServerError, Title = "Unexpected error" };
                break;
        }

        context.Response.StatusCode = problem.Status ?? 500;
        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = problem, Exception = exception });
    }

    private static string JsonName(string property) =>
        string.IsNullOrEmpty(property) ? "request" : char.ToLowerInvariant(property[0]) + property[1..];
}

public sealed class CacheHealthCheck(IDistributedCache cache) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            await cache.GetStringAsync("health:probe", ct);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Degraded("Cache unavailable", ex);
        }
    }
}

/// <summary>
/// Resolves the end-user IP for rate limiting. X-Forwarded-For is trusted only when the direct
/// peer is a private/loopback address (the Next.js container or the reverse proxy in the Docker network);
/// a public client cannot spoof its partition by sending the header itself.
/// </summary>
public static class ClientIp
{
    public static string Resolve(HttpContext ctx)
    {
        var remote = ctx.Connection.RemoteIpAddress;
        if (remote is not null && !UrlSafety.IsPublicAddress(remote)
            && ctx.Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded))
        {
            var first = forwarded.ToString().Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (first is not null && System.Net.IPAddress.TryParse(first, out var ip))
            {
                return ip.ToString();
            }
        }

        return remote?.ToString() ?? "unknown";
    }
}

public static class Policies
{
    public const string Staff = "Staff";
    public const string Moderation = "Moderation";
    public const string Editorial = "Editorial";
    public const string Administration = "Administration";
    public const string SuperAdmin = "SuperAdmin";

    public const string WritesRateLimit = "writes";
}
