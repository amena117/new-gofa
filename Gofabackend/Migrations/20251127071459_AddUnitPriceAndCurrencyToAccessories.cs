using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddUnitPriceAndCurrencyToAccessories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "ItemSerialNumbers",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Accessories",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true,
                defaultValue: "ETB");

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "Accessories",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItemSerialNumbers_SerialNumber",
                table: "ItemSerialNumbers",
                column: "SerialNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ItemSerialNumbers_SerialNumber",
                table: "ItemSerialNumbers");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Accessories");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "Accessories");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "ItemSerialNumbers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
