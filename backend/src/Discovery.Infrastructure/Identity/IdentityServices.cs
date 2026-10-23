using System.Net;
using System.Net.Mail;
using Discovery.Application.Abstractions;
using Discovery.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Discovery.Infrastructure.Identity;

public sealed class UserDirectory(AppDbContext db) : IUserDirectory
{
    public async Task<IReadOnlyDictionary<Guid, string>> GetDisplayNamesAsync(IEnumerable<Guid> userIds, CancellationToken ct)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        // Never expose e-mail addresses: fall back to a neutral label.
        return await db.Users
            .Where(u => ids.Contains(u.Id))
            .Select(u => new { u.Id, Name = u.DisplayName ?? "Community member" })
            .ToDictionaryAsync(u => u.Id, u => u.Name, ct);
    }
}

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool EnableSsl { get; set; } = true;
    public string From { get; set; } = "no-reply@alternivo.com";
}

/// <summary>
/// Sends Identity e-mails (confirmation, password reset). When SMTP is not configured the
/// message is written to the log so local development still works.
/// </summary>
public sealed class EmailSender(IOptions<SmtpOptions> options, ILogger<EmailSender> logger) : IEmailSender<AppUser>
{
    public Task SendConfirmationLinkAsync(AppUser user, string email, string confirmationLink) =>
        SendAsync(email, "Confirm your e-mail address",
            $"<p>Confirm your account by <a href=\"{WebUtility.HtmlEncode(confirmationLink)}\">clicking here</a>.</p>");

    public Task SendPasswordResetLinkAsync(AppUser user, string email, string resetLink) =>
        SendAsync(email, "Reset your password",
            $"<p>Reset your password by <a href=\"{WebUtility.HtmlEncode(resetLink)}\">clicking here</a>.</p>");

    public Task SendPasswordResetCodeAsync(AppUser user, string email, string resetCode) =>
        SendAsync(email, "Your password reset code",
            $"<p>Your password reset code is: <strong>{WebUtility.HtmlEncode(resetCode)}</strong></p>");

    private async Task SendAsync(string to, string subject, string html)
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.Host))
        {
            logger.LogWarning("SMTP not configured. E-mail to {To} with subject {Subject}: {Body}", to, subject, html);
            return;
        }

        using var message = new MailMessage(o.From, to, subject, html) { IsBodyHtml = true };
        using var client = new SmtpClient(o.Host, o.Port) { EnableSsl = o.EnableSsl };
        if (!string.IsNullOrEmpty(o.Username))
        {
            client.Credentials = new NetworkCredential(o.Username, o.Password);
        }

        await client.SendMailAsync(message);
    }
}
