using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Discovery.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixUserNameColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The UserProfiles migration renamed Identity's "UserName" column to "Username" (the names differ only
            // by case) and added an empty "UserName". Restore the sign-in names and move profile handles to "Handle".
            // Hand-written: EF's generated diff would drop the column holding newer members' sign-in names.
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS "IX_AspNetUsers_Username";
                ALTER TABLE "AspNetUsers" ADD COLUMN "Handle" character varying(30) NULL;
                UPDATE "AspNetUsers"
                   SET "Handle" = CASE WHEN "UserName" IS NOT NULL AND "Username" !~ '@' THEN "Username" END,
                       "UserName" = COALESCE("UserName", "Username");
                ALTER TABLE "AspNetUsers" ALTER COLUMN "UserName" TYPE character varying(256);
                ALTER TABLE "AspNetUsers" DROP COLUMN "Username";
                CREATE UNIQUE INDEX "IX_AspNetUsers_Handle" ON "AspNetUsers" ("Handle") WHERE "Handle" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS "IX_AspNetUsers_Handle";
                ALTER TABLE "AspNetUsers" ADD COLUMN "Username" character varying(30) NULL;
                UPDATE "AspNetUsers" SET "Username" = "Handle";
                ALTER TABLE "AspNetUsers" DROP COLUMN "Handle";
                """);
        }
    }
}
