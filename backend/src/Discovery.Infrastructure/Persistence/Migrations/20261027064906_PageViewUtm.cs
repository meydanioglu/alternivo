using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PageViewUtm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UtmCampaign",
                table: "PageViews",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmMedium",
                table: "PageViews",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmSource",
                table: "PageViews",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PageViews_VisitorId_CreatedAt",
                table: "PageViews",
                columns: new[] { "VisitorId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PageViews_VisitorId_CreatedAt",
                table: "PageViews");

            migrationBuilder.DropColumn(
                name: "UtmCampaign",
                table: "PageViews");

            migrationBuilder.DropColumn(
                name: "UtmMedium",
                table: "PageViews");

            migrationBuilder.DropColumn(
                name: "UtmSource",
                table: "PageViews");
        }
    }
}
