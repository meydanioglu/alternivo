using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PaymentTermsAndRefunds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RefundReason",
                table: "PaymentOrders",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RefundedAmountMinor",
                table: "PaymentOrders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RefundedAt",
                table: "PaymentOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "TermsAcceptedAt",
                table: "PaymentOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TermsVersion",
                table: "PaymentOrders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RefundReason",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "RefundedAmountMinor",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "RefundedAt",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "TermsAcceptedAt",
                table: "PaymentOrders");

            migrationBuilder.DropColumn(
                name: "TermsVersion",
                table: "PaymentOrders");
        }
    }
}
