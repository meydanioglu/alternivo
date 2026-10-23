using System.Text;
using Discovery.Application.Abstractions;
using Discovery.Application.Catalog;
using Discovery.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Discovery.Infrastructure.Search;

/// <summary>
/// PostgreSQL search: weighted full-text (prefix matching on names, aliases, tags, categories)
/// combined with pg_trgm similarity for typo tolerance. All user input is passed as parameters.
/// Swap this class for an Elasticsearch/Meilisearch/Typesense provider without touching callers.
/// </summary>
public sealed class PostgresSearchProvider(AppDbContext db, IOptions<CatalogOptions> options) : ISearchProvider
{
    public sealed class Row
    {
        public Guid Id { get; init; }
        public double Score { get; init; }
        public int Total { get; init; }
    }

    public async Task<(IReadOnlyList<Guid> Ids, int Total)> SearchApplicationsAsync(string query, int skip, int take, CancellationToken ct)
    {
        var tsQuery = BuildPrefixTsQuery(query);
        var prefix = EscapeLike(query) + "%";
        var showDemo = options.Value.ShowDemoData;

        var rows = await db.Database.SqlQuery<Row>($@"
            SELECT a.""Id"" AS ""Id"",
                   (CASE WHEN {tsQuery} <> '' THEN ts_rank_cd(a.""SearchVector"", to_tsquery('simple', {tsQuery})) * 2.0 ELSE 0 END
                    + similarity(a.""Name"", {query}) * 3.0
                    + word_similarity({query}, a.""SearchText"")
                    + CASE WHEN lower(a.""Name"") = lower({query}) THEN 5 ELSE 0 END
                    + CASE WHEN a.""Name"" ILIKE {prefix} ESCAPE '\' THEN 1 ELSE 0 END
                   )::double precision AS ""Score"",
                   (count(*) OVER ())::int AS ""Total""
            FROM ""Applications"" a
            WHERE a.""Status"" = 1
              AND a.""DeletedAt"" IS NULL
              AND (a.""IsDemoData"" = false OR {showDemo})
              AND (
                    ({tsQuery} <> '' AND a.""SearchVector"" @@ to_tsquery('simple', {tsQuery}))
                 OR a.""Name"" % {query}
                 OR {query} <% a.""SearchText""
                 OR a.""Name"" ILIKE {prefix} ESCAPE '\'
              )
            ORDER BY ""Score"" DESC, a.""LikeCount"" DESC, a.""Name""
            LIMIT {take} OFFSET {skip}")
            .ToListAsync(ct);

        var total = rows.Count > 0 ? rows[0].Total : 0;
        if (rows.Count == 0 && skip > 0)
        {
            // Out-of-range page: still report the real total.
            total = (await SearchApplicationsAsync(query, 0, 1, ct)).Total;
        }

        return (rows.Select(r => r.Id).ToList(), total);
    }

    public async Task<IReadOnlyList<Guid>> SearchCategoriesAsync(string query, int take, CancellationToken ct)
    {
        var contains = "%" + EscapeLike(query) + "%";
        var rows = await db.Database.SqlQuery<Row>($@"
            SELECT c.""Id"" AS ""Id"",
                   (similarity(c.""Name"", {query}) + CASE WHEN c.""Name"" ILIKE {contains} ESCAPE '\' THEN 0.5 ELSE 0 END)::double precision AS ""Score"",
                   0 AS ""Total""
            FROM ""Categories"" c
            WHERE c.""Name"" % {query} OR c.""Name"" ILIKE {contains} ESCAPE '\'
            ORDER BY ""Score"" DESC
            LIMIT {take}")
            .ToListAsync(ct);
        return rows.Select(r => r.Id).ToList();
    }

    /// <summary>"photo edit" → "photo:* &amp; edit:*". Only [a-z0-9] tokens survive, so to_tsquery never sees syntax.</summary>
    internal static string BuildPrefixTsQuery(string query)
    {
        var tokens = new List<string>();
        var current = new StringBuilder();
        foreach (var ch in query.ToLowerInvariant())
        {
            if (char.IsAsciiLetterOrDigit(ch))
            {
                current.Append(ch);
            }
            else if (current.Length > 0)
            {
                tokens.Add(current.ToString());
                current.Clear();
            }
        }

        if (current.Length > 0)
        {
            tokens.Add(current.ToString());
        }

        return string.Join(" & ", tokens.Take(8).Select(t => t + ":*"));
    }

    internal static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
