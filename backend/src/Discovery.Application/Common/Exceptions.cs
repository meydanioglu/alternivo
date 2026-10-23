namespace Discovery.Application.Common;

/// <summary>Base for expected business failures. Mapped to RFC 7807 ProblemDetails by the API.</summary>
public abstract class AppException(string message) : Exception(message)
{
    public abstract int StatusCode { get; }
    public abstract string Title { get; }
}

public sealed class NotFoundException(string resource, string key)
    : AppException($"{resource} '{key}' was not found.")
{
    public override int StatusCode => 404;
    public override string Title => "Not found";
}

public sealed class ConflictException(string message) : AppException(message)
{
    public override int StatusCode => 409;
    public override string Title => "Conflict";
}

public sealed class BadRequestException(string message) : AppException(message)
{
    public override int StatusCode => 400;
    public override string Title => "Bad request";
}

public sealed class ForbiddenException(string message) : AppException(message)
{
    public override int StatusCode => 403;
    public override string Title => "Forbidden";
}
