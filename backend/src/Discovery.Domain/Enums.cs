namespace Discovery.Domain;

/// <summary>Pricing models are combinable (an app can be Freemium and Subscription at once).</summary>
[Flags]
public enum PricingModel
{
    None = 0,
    Free = 1,
    Freemium = 2,
    Paid = 4,
    FreeTrial = 8,
    OneTimePurchase = 16,
    Subscription = 32,
}

public enum PublicationStatus
{
    Draft = 0,
    Published = 1,
    Archived = 2,
}

public enum VerificationStatus
{
    /// <summary>Imported or seeded data that no editor has confirmed yet.</summary>
    Unverified = 0,
    Verified = 1,
}

public enum PlatformKind
{
    Desktop = 0,
    Mobile = 1,
    Web = 2,
    Extension = 3,
    Server = 4,
}

/// <summary>Where an alternative relationship came from (provenance).</summary>
public enum RelationshipSource
{
    Editorial = 0,
    Community = 1,
    Import = 2,
}

public enum ModerationStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}

public enum ReviewStatus
{
    Published = 0,
    Pending = 1,
    Hidden = 2,
}

public enum SubmissionStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    NeedsChanges = 3,
    InReview = 4,
}

public enum ReportTargetType
{
    Application = 0,
    Review = 1,
    AlternativeRelationship = 2,
}

public enum ReportStatus
{
    Open = 0,
    Resolved = 1,
    Dismissed = 2,
}
