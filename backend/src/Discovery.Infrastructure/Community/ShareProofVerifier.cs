using Discovery.Application.Common;
using Discovery.Application.Community;
using Discovery.Domain.Community;
using Discovery.Infrastructure.Importing;
using Microsoft.Extensions.Logging;

namespace Discovery.Infrastructure.Community;

/// <summary>
/// Verifies "share Alternivo" proofs. The badge is checked by fetching the product's homepage with the importer's
/// SSRF-safe client; a post link is validated by format and checked by a moderator during review.
/// </summary>
public sealed class ShareProofVerifier(MakerService maker, IHttpClientFactory http, ILogger<ShareProofVerifier> logger)
{
    private const int MaxHtmlBytes = 2 * 1024 * 1024;

    public async Task VerifyBadgeAsync(Guid userId, Guid submissionId, CancellationToken ct)
    {
        var s = await maker.OpenFreeSubmissionAsync(userId, submissionId, ct);
        if (!Uri.TryCreate(s.WebsiteUrl, UriKind.Absolute, out var site)) throw new BadRequestException("The submission has no valid website.");
        var home = $"{site.Scheme}://{site.Authority}/";
        if (!UrlSafety.IsSafePublicWebUrl(home)) throw new BadRequestException("The website cannot be checked.");

        string? html = null;
        try
        {
            using var response = await http.CreateClient(ProductImporter.HttpClientName).GetAsync(home, HttpCompletionOption.ResponseHeadersRead, ct);
            if (response.IsSuccessStatusCode)
                html = System.Text.Encoding.UTF8.GetString(await ProductImporter.ReadBytesLimitedAsync(response, MaxHtmlBytes, ct));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException or ImportException)
        {
            logger.LogInformation(ex, "Badge check could not load {Url}", home);
        }

        if (html is null) throw new ConflictException($"We could not load {home}. Make sure it is online and try again.");
        if (!ShareProof.BadgeLinked(html))
            throw new ConflictException($"We could not find a link to alternivo.com on {home}. Paste the badge code into your homepage HTML, then try again.");
        await maker.ApplyShareProofAsync(userId, submissionId, ShareProofKind.Badge, home, ct);
    }

    public async Task SubmitPostAsync(Guid userId, Guid submissionId, string? url, CancellationToken ct)
    {
        url = url?.Trim() ?? "";
        if (!ShareProof.PostUrlValid(url)) throw new BadRequestException("Paste the link to your post on X (x.com/…/status/…) or Substack.");
        await maker.ApplyShareProofAsync(userId, submissionId, ShareProofKind.Post, url, ct);
    }
}
