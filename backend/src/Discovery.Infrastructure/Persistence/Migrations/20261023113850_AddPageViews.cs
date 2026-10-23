using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPageViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PageViews",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    Path = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ReferrerHost = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    VisitorId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Device = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageViews", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PageViews_CreatedAt",
                table: "PageViews",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PageViews");
        }
    }
}
