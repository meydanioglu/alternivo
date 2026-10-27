using System.Net;
using Discovery.Application.Abstractions;
using Discovery.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
/// Sends Identity e-mails (confirmation, password reset). SMTP settings entered in admin take precedence over the
/// Smtp section of the configuration. When neither is set the message is written to the log so local development still works.
/// </summary>
public sealed class EmailSender(IOptions<SmtpOptions> options, Billing.IntegrationSettings settings, IConfiguration config,
    ILogger<EmailSender> logger) : IEmailSender<AppUser>
{
    private string Site => config["Site:Url"] ?? "https://alternivo.com";

    public Task SendConfirmationLinkAsync(AppUser user, string email, string confirmationLink) =>
        SendAsync(email, EmailTemplate.Confirmation(Site, SiteConfirmationLink(Site, confirmationLink)));

    /// <summary>
    /// Identity builds the link against the API's internal host. Users get a link to the public site instead,
    /// whose /confirm-email page passes the same userId and code on to the API.
    /// </summary>
    public static string SiteConfirmationLink(string? siteUrl, string apiLink)
    {
        var site = siteUrl?.TrimEnd('/');
        var q = Uri.TryCreate(apiLink, UriKind.Absolute, out var uri) ? uri.Query : null;
        return string.IsNullOrEmpty(site) || string.IsNullOrEmpty(q) ? apiLink : $"{site}/confirm-email{q}";
    }

    public Task SendPasswordResetLinkAsync(AppUser user, string email, string resetLink) =>
        SendAsync(email, EmailTemplate.PasswordReset(Site, resetLink));

    public Task SendPasswordResetCodeAsync(AppUser user, string email, string resetCode) =>
        SendAsync(email, EmailTemplate.PasswordResetCode(Site, resetCode));

    private async Task SendAsync(string to, EmailContent content)
    {
        var (subject, html) = (content.Subject, content.Html);
        var o = await settings.SmtpAsync(CancellationToken.None) ?? options.Value;
        if (string.IsNullOrWhiteSpace(o.Host))
        {
            logger.LogWarning("SMTP not configured. E-mail to {To} with subject {Subject}: {Body}", to, subject, html);
            return;
        }

        var message = new MimeKit.MimeMessage();
        message.From.Add(new MimeKit.MailboxAddress("Alternivo", MimeKit.MailboxAddress.Parse(o.From).Address));
        message.To.Add(MimeKit.MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new MimeKit.BodyBuilder { HtmlBody = html, TextBody = content.Text }.ToMessageBody();

        try
        {
            using var client = new MailKit.Net.Smtp.SmtpClient();
            // 465 is implicit TLS; other ports (587) upgrade with STARTTLS, which Brevo requires before it accepts AUTH.
            var security = !o.EnableSsl ? MailKit.Security.SecureSocketOptions.None
                : o.Port == 465 ? MailKit.Security.SecureSocketOptions.SslOnConnect
                : MailKit.Security.SecureSocketOptions.StartTls;
            await client.ConnectAsync(o.Host, o.Port, security);
            if (!string.IsNullOrEmpty(o.Username)) await client.AuthenticateAsync(o.Username, o.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch (Exception ex) when (ex is MailKit.ProtocolException or MailKit.Net.Smtp.SmtpCommandException or MailKit.Security.AuthenticationException
            or MailKit.Security.SslHandshakeException or System.Net.Sockets.SocketException or IOException or InvalidOperationException)
        {
            // A mail failure must not fail registration; the user can request a new link from their account page.
            logger.LogError(ex, "Could not send e-mail {Subject} to {To} via {Host}", subject, to, o.Host);
        }
    }
}
