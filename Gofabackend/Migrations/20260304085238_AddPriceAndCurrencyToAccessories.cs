using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddPriceAndCurrencyToAccessories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Model1AccessorySubAccessories",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "Model1AccessorySubAccessories",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Model1Accessories",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "Model1Accessories",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Model1AccessorySubAccessories");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "Model1AccessorySubAccessories");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Model1Accessories");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "Model1Accessories");
        }
    }
}
