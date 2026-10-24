using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PayTr : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Freemius was never configured in production; any rows would have no PayTR order to point to.
            migrationBuilder.Sql("DELETE FROM \"BillingEntitlements\"; DELETE FROM \"AppSettings\" WHERE \"Key\" LIKE 'freemius.%';");

            migrationBuilder.DropTable(
                name: "CheckoutIntents");

            migrationBuilder.DropIndex(
                name: "IX_BillingEntitlements_FsLicenseId",
                table: "BillingEntitlements");

            migrationBuilder.DropColumn(
                name: "FsLicenseId",
                table: "BillingEntitlements");

            migrationBuilder.DropColumn(
                name: "FsPlanId",
                table: "BillingEntitlements");

            migrationBuilder.DropColumn(
                name: "FsPricingId",
                table: "BillingEntitlements");

            migrationBuilder.DropColumn(
                name: "FsUserId",
                table: "BillingEntitlements");

            migrationBuilder.AddColumn<Guid>(
                name: "OrderId",
                table: "BillingEntitlements",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "PaymentOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MerchantOid = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanKey = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: true),
                    AmountMinor = table.Column<int>(type: "integer", nullable: false),
                    Currency = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    TestMode = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PaidAmountMinor = table.Column<int>(type: "integer", nullable: true),
                    PaymentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    FailedReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentOrders", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingEntitlements_OrderId",
                table: "BillingEntitlements",
                column: "OrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentOrders_MerchantOid",
                table: "PaymentOrders",
                column: "MerchantOid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentOrders_UserId_CreatedAt",
                table: "PaymentOrders",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentOrders");

            migrationBuilder.DropIndex(
                name: "IX_BillingEntitlements_OrderId",
                table: "BillingEntitlements");

            migrationBuilder.DropColumn(
                name: "OrderId",
                table: "BillingEntitlements");

            migrationBuilder.AddColumn<string>(
                name: "FsLicenseId",
                table: "BillingEntitlements",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FsPlanId",
                table: "BillingEntitlements",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FsPricingId",
                table: "BillingEntitlements",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FsUserId",
                table: "BillingEntitlements",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CheckoutIntents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConsumedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EntitlementId = table.Column<Guid>(type: "uuid", nullable: true),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CheckoutIntents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BillingEntitlements_FsLicenseId",
                table: "BillingEntitlements",
                column: "FsLicenseId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CheckoutIntents_UserId_Kind_CreatedAt",
                table: "CheckoutIntents",
                columns: new[] { "UserId", "Kind", "CreatedAt" });
        }
    }
}
