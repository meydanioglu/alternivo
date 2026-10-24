using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Billing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPriority",
                table: "Submissions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FeaturedUntil",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "LaunchBoosted",
                table: "Applications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "BillingEntitlements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FsLicenseId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    FsPlanId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    FsPricingId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    FsUserId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    Expiration = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsCanceled = table.Column<bool>(type: "boolean", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillingEntitlements", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingEntitlements_FsLicenseId",
                table: "BillingEntitlements",
                column: "FsLicenseId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BillingEntitlements_UserId",
                table: "BillingEntitlements",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BillingEntitlements");

            migrationBuilder.DropColumn(
                name: "IsPriority",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "FeaturedUntil",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "LaunchBoosted",
                table: "Applications");
        }
    }
}
