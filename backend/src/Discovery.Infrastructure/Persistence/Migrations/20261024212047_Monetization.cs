using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Monetization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InternalNote",
                table: "Submissions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PriorityPaidAt",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReviewDeadline",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReviewStartedAt",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "GrowthUntil",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            // Existing submissions get the standard 15-day promise from their submission date.
            migrationBuilder.Sql("UPDATE \"Submissions\" SET \"ReviewDeadline\" = \"CreatedAt\" + interval '15 days' WHERE \"ReviewDeadline\" IS NULL;");

            migrationBuilder.CreateTable(
                name: "CheckoutIntents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConsumedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    EntitlementId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CheckoutIntents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FoundingVendors",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Plan = table.Column<int>(type: "integer", nullable: false),
                    PriceCents = table.Column<int>(type: "integer", nullable: false),
                    GrantedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FoundingVendors", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "SponsorStats",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Placement = table.Column<int>(type: "integer", nullable: false),
                    Day = table.Column<DateOnly>(type: "date", nullable: false),
                    Impressions = table.Column<int>(type: "integer", nullable: false),
                    Clicks = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SponsorStats", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SponsorshipCampaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Placement = table.Column<int>(type: "integer", nullable: false),
                    TargetCategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    TargetApplicationId = table.Column<Guid>(type: "uuid", nullable: true),
                    InventoryKey = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    StartsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PriceCents = table.Column<int>(type: "integer", nullable: false),
                    EntitlementId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ModeratedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ModeratedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModeratorNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SponsorshipCampaigns", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CheckoutIntents_UserId_Kind_CreatedAt",
                table: "CheckoutIntents",
                columns: new[] { "UserId", "Kind", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SponsorStats_ApplicationId_Placement_Day",
                table: "SponsorStats",
                columns: new[] { "ApplicationId", "Placement", "Day" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SponsorshipCampaigns_EntitlementId",
                table: "SponsorshipCampaigns",
                column: "EntitlementId");

            migrationBuilder.CreateIndex(
                name: "IX_SponsorshipCampaigns_InventoryKey_Status_EndsAt",
                table: "SponsorshipCampaigns",
                columns: new[] { "InventoryKey", "Status", "EndsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SponsorshipCampaigns_UserId",
                table: "SponsorshipCampaigns",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CheckoutIntents");

            migrationBuilder.DropTable(
                name: "FoundingVendors");

            migrationBuilder.DropTable(
                name: "SponsorStats");

            migrationBuilder.DropTable(
                name: "SponsorshipCampaigns");

            migrationBuilder.DropColumn(
                name: "InternalNote",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "PriorityPaidAt",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "ReviewDeadline",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "ReviewStartedAt",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "GrowthUntil",
                table: "Applications");
        }
    }
}
