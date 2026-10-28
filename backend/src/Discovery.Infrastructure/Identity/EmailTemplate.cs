using System.Net;
using System.Text;

namespace Discovery.Infrastructure.Identity;

/// <summary>A transactional e-mail: HTML for mail clients plus a plain-text alternative.</summary>
public sealed record EmailContent(string Subject, string Html, string Text);

/// <summary>
/// Branded layout for account e-mails. Table-based with inline styles so it renders the same in Gmail, Outlook and
/// Apple Mail; the button is a padded link (no images needed) and the raw link is repeated for clients that block it.
/// </summary>
public static class EmailTemplate
{
    private const string Accent = "#4f5be0";
    private const string Ink = "#171922";
    private const string Muted = "#626775";
    private const string Line = "#e7e9ef";
    private const string Page = "#f4f5f9";
    private const string Font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    public static EmailContent Confirmation(string siteUrl, string link) => Build(siteUrl,
        subject: "Confirm your e-mail address for Alternivo",
        preheader: "One click to confirm your account and start submitting products.",
        heading: "Confirm your e-mail address",
        paragraphs:
        [
            "Welcome to Alternivo, the place where people discover software and AI tools and compare their alternatives.",
            "Confirm your address to submit products, write reviews and suggest alternatives.",
        ],
        button: "Confirm e-mail address",
        link: link,
        note: "If you did not create an Alternivo account, you can safely ignore this e-mail; nothing will happen.");

    public static EmailContent PasswordReset(string siteUrl, string link) => Build(siteUrl,
        subject: "Reset your Alternivo password",
        preheader: "Use this link to choose a new password.",
        heading: "Reset your password",
        paragraphs: ["We received a request to reset the password for your Alternivo account. Choose a new one with the button below."],
        button: "Choose a new password",
        link: link,
        note: "If you did not ask for this, ignore this e-mail; your password stays the same.");

    public static EmailContent BadgeMissing(string siteUrl, string product, string home, string link) => Build(siteUrl,
        subject: $"Action needed: the Alternivo badge is missing from {product}",
        preheader: $"Add the badge back within {Discovery.Application.Community.ShareProof.BadgeGraceDays} days to keep your free listing.",
        heading: "We could not find your Alternivo badge",
        paragraphs:
        [
            $"Free listings on Alternivo stay published while the Alternivo badge links to us from your homepage. Our latest check of {home} did not find it, or the page could not be loaded.",
            $"Please add the badge back within {Discovery.Application.Community.ShareProof.BadgeGraceDays} days. If it is still missing after that, the listing for {product} will be hidden until the badge is back.",
        ],
        button: "Get the badge code",
        link: link,
        note: "If the badge is already on your homepage, make sure the page loads without a login and that the link points to alternivo.com.");

    public static EmailContent BadgeHidden(string siteUrl, string product, string link) => Build(siteUrl,
        subject: $"Your free listing for {product} is hidden",
        preheader: "Add the Alternivo badge back and the listing is published again automatically.",
        heading: "Your listing is hidden for now",
        paragraphs:
        [
            $"The Alternivo badge has been missing from the homepage of {product} for {Discovery.Application.Community.ShareProof.BadgeGraceDays} days, so its free listing is no longer shown.",
            "Add the badge back and the listing is published again at our next check. Paid plans do not need the badge.",
        ],
        button: "Get the badge code",
        link: link,
        note: "You received this because you submitted this product to Alternivo for a free listing.");

    public static EmailContent PasswordResetCode(string siteUrl, string code)
    {
        var c = WebUtility.HtmlEncode(code);
        var codeBlock =
            $"<p style=\"margin:24px 0;padding:16px;border-radius:10px;background:{Page};font-family:Menlo,Consolas,monospace;font-size:22px;" +
            $"letter-spacing:2px;text-align:center;color:{Ink};\">{c}</p>";
        return Build(siteUrl,
            subject: "Your Alternivo password reset code",
            preheader: "Your password reset code is inside.",
            heading: "Your password reset code",
            paragraphs: ["Enter this code to reset the password for your Alternivo account."],
            button: null, link: null,
            note: "If you did not ask for this, ignore this e-mail; your password stays the same.",
            extraHtml: codeBlock, extraText: code);
    }

    private static EmailContent Build(string siteUrl, string subject, string preheader, string heading, string[] paragraphs,
        string? button, string? link, string note, string? extraHtml = null, string? extraText = null)
    {
        var site = siteUrl.TrimEnd('/');
        Func<string, string> e = s => WebUtility.HtmlEncode(s);
        var html = new StringBuilder();
        html.Append($"""
            <!doctype html>
            <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>{e(subject)}</title></head>
            <body style="margin:0;padding:0;background:{Page};">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{e(preheader)}</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{Page};">
            <tr><td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr><td style="padding:0 4px 20px;">
              <a href="{e(site)}" style="text-decoration:none;"><img src="{e(site)}/brand/logo-on-light.png" width="140" height="33" alt="Alternivo" style="display:block;border:0;width:140px;height:auto;"></a>
            </td></tr>
            <tr><td style="background:#ffffff;border:1px solid {Line};border-radius:14px;overflow:hidden;">
              <div style="height:4px;background:{Accent};line-height:4px;font-size:0;">&nbsp;</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 28px 28px;font-family:{Font};color:{Ink};">
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:{Ink};">{e(heading)}</h1>
            """);
        foreach (var p in paragraphs)
        {
            html.Append($"<p style=\"margin:0 0 14px;font-size:16px;line-height:1.6;color:#3a3e4a;\">{e(p)}</p>");
        }

        if (extraHtml is not null) html.Append(extraHtml);
        if (button is not null && link is not null)
        {
            html.Append($"""
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr>
                  <td style="border-radius:10px;background:{Accent};">
                    <a href="{e(link)}" style="display:inline-block;padding:14px 28px;font-family:{Font};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">{e(button)}</a>
                  </td></tr></table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:{Muted};">Button not working? Copy this link into your browser:<br>
                  <a href="{e(link)}" style="color:{Accent};word-break:break-all;">{e(link)}</a></p>
                """);
        }

        html.Append($"""
                <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid {Line};font-size:13px;line-height:1.6;color:{Muted};">{e(note)}</p>
              </td></tr></table>
            </td></tr>
            <tr><td style="padding:20px 4px 0;font-family:{Font};font-size:12px;line-height:1.6;color:{Muted};text-align:center;">
              Alternivo · Discover better software alternatives<br>
              <a href="{e(site)}" style="color:{Muted};">alternivo.com</a> · <a href="{e(site)}/help" style="color:{Muted};">Help center</a> · <a href="{e(site)}/privacy" style="color:{Muted};">Privacy</a>
              <br>You received this e-mail because of an action on your Alternivo account.
            </td></tr>
            </table>
            </td></tr></table>
            </body></html>
            """);

        var text = new StringBuilder();
        text.AppendLine(heading).AppendLine();
        foreach (var p in paragraphs) text.AppendLine(p).AppendLine();
        if (extraText is not null) text.AppendLine(extraText).AppendLine();
        if (link is not null) text.AppendLine($"{button}: {link}").AppendLine();
        text.AppendLine(note).AppendLine().AppendLine("Alternivo · " + site);
        return new EmailContent(subject, html.ToString(), text.ToString());
    }
}
