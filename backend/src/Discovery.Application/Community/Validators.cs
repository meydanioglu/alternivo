using Discovery.Application.Common;
using Discovery.Application.Contracts;
using FluentValidation;

namespace Discovery.Application.Community;

public sealed class CreateReviewValidator : AbstractValidator<CreateReviewRequest>
{
    public CreateReviewValidator()
    {
        RuleFor(r => r.Rating).InclusiveBetween(1, 5);
        RuleFor(r => r.Title).NotEmpty().MinimumLength(3).MaximumLength(120);
        RuleFor(r => r.Body).NotEmpty().MinimumLength(30).MaximumLength(5000);
        RuleFor(r => r.Pros).MaximumLength(1000);
        RuleFor(r => r.Cons).MaximumLength(1000);
    }
}

public sealed class CreateSubmissionValidator : AbstractValidator<CreateSubmissionRequest>
{
    public CreateSubmissionValidator()
    {
        RuleFor(s => s.Name).NotEmpty().MaximumLength(100);
        RuleFor(s => s.WebsiteUrl)
            .NotEmpty()
            .Must(UrlSafety.IsSafePublicWebUrl)
            .WithMessage("Enter a public http(s) website address.");
        RuleFor(s => s.Description).NotEmpty().MinimumLength(30).MaximumLength(3000);
        RuleFor(s => s.CategorySlug).Must(c => c is null || Slugs.IsValid(c)).WithMessage("Invalid category.");
        RuleFor(s => s.LicenseSlug).Must(l => l is null || Slugs.IsValid(l)).WithMessage("Invalid license.");
        RuleFor(s => s.Pricing).Must(p => p is null || p.All(x => PricingNames.All.Contains(x))).WithMessage("Unknown pricing value.");
        RuleFor(s => s.Platforms).Must(p => p is null || (p.Length <= 15 && p.All(Slugs.IsValid))).WithMessage("Invalid platforms.");
        RuleFor(s => s.Tags).Must(t => t is null || (t.Length <= 15 && t.All(x => x.Length <= 40))).WithMessage("Invalid tags.");
        RuleFor(s => s.ScreenshotUrls)
            .Must(u => u is null || (u.Length <= 8 && u.All(UrlSafety.IsSafePublicWebUrl)))
            .WithMessage("Screenshot links must be public http(s) URLs (max 8).");
        RuleFor(s => s.SuggestedAlternatives)
            .Must(a => a is null || (a.Length <= 10 && a.All(Slugs.IsValid)))
            .WithMessage("Invalid alternatives.");
    }
}
