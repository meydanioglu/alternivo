using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NeedsContentReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NeedsContentReview",
                table: "Applications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Backfill: listings created by the importer (audit "application.create") whose content is not approved yet.
            // Catalogue seed apps are written by the seeder, which does not audit, so they stay indexable.
            migrationBuilder.Sql("""
                UPDATE "Applications" SET "NeedsContentReview" = TRUE
                WHERE "ContentApprovedAt" IS NULL
                  AND "Id" IN (SELECT "EntityId" FROM "AuditLogs" WHERE "Action" = 'application.create' AND "EntityId" IS NOT NULL);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Applications_NeedsContentReview",
                table: "Applications",
                column: "NeedsContentReview");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Applications_NeedsContentReview",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "NeedsContentReview",
                table: "Applications");
        }
    }
}
