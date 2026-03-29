using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddVatAndGrandTotalToModel1And2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<float>(
                name: "GrandTotal",
                table: "Model2s",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<float>(
                name: "Vat",
                table: "Model2s",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<float>(
                name: "GrandTotal",
                table: "Model1",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<float>(
                name: "Vat",
                table: "Model1",
                type: "real",
                nullable: false,
                defaultValue: 0f);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GrandTotal",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "Vat",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "GrandTotal",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "Vat",
                table: "Model1");
        }
    }
}
