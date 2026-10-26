using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SubmissionShareProof : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ShareProof",
                table: "Submissions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ShareProofAt",
                table: "Submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShareProofUrl",
                table: "Submissions",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShareProof",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "ShareProofAt",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "ShareProofUrl",
                table: "Submissions");
        }
    }
}
