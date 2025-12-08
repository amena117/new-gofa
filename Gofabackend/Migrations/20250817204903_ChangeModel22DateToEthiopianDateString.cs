using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class ChangeModel22DateToEthiopianDateString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Date",
                table: "Model22s",
                newName: "EthiopianDate");

            migrationBuilder.AddColumn<string>(
                name: "SerialNumbers",
                table: "Model22Items",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SerialNumbers",
                table: "Model22Items");

            migrationBuilder.RenameColumn(
                name: "EthiopianDate",
                table: "Model22s",
                newName: "Date");
        }
    }
}
