using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ContentDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ContentApprovedAt",
                table: "Applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContentJson",
                table: "Applications",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeoDescription",
                table: "Applications",
                type: "character varying(170)",
                maxLength: 170,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeoTitle",
                table: "Applications",
                type: "character varying(70)",
                maxLength: 70,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ContentDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Error = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    ShortDescription = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "character varying(10000)", maxLength: 10000, nullable: true),
                    SeoTitle = table.Column<string>(type: "character varying(70)", maxLength: 70, nullable: true),
                    SeoDescription = table.Column<string>(type: "character varying(170)", maxLength: 170, nullable: true),
                    SectionsJson = table.Column<string>(type: "jsonb", nullable: true),
                    SourceUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    SourceChars = table.Column<int>(type: "integer", nullable: false),
                    Model = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    InputTokens = table.Column<int>(type: "integer", nullable: false),
                    OutputTokens = table.Column<int>(type: "integer", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentDrafts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContentDrafts_ApplicationId",
                table: "ContentDrafts",
                column: "ApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ContentDrafts_Status",
                table: "ContentDrafts",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentDrafts");

            migrationBuilder.DropColumn(
                name: "ContentApprovedAt",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "ContentJson",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SeoDescription",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "SeoTitle",
                table: "Applications");
        }
    }
}
