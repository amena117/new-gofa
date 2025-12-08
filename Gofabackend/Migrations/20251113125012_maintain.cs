using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class maintain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MiniStoreBinCardSerialNumbers_MiniStoreBinCardId",
                table: "MiniStoreBinCardSerialNumbers");

            migrationBuilder.AddColumn<bool>(
                name: "IsUrgent",
                table: "SparePartsRequests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "MiniStoreBinCardSerialNumbers",
                type: "nvarchar(50)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "MiniStoreBinCardSerialNumbers",
                type: "nvarchar(50)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "UnitMeasurement",
                table: "MiniStoreBinCards",
                type: "nvarchar(20)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "StockNumber",
                table: "MiniStoreBinCards",
                type: "nvarchar(50)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "MiniStoreBinCards",
                type: "nvarchar(max)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "MiniStoreBinCards",
                type: "nvarchar(50)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<string>(
                name: "Recommendation",
                table: "MaintenanceRequestRegisters",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MiniStoreBinCardSerialNumbers_MiniStoreBinCardId_SerialNumber",
                table: "MiniStoreBinCardSerialNumbers",
                columns: new[] { "MiniStoreBinCardId", "SerialNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MiniStoreBinCardSerialNumbers_MiniStoreBinCardId_SerialNumber",
                table: "MiniStoreBinCardSerialNumbers");

            migrationBuilder.DropColumn(
                name: "IsUrgent",
                table: "SparePartsRequests");

            migrationBuilder.DropColumn(
                name: "Recommendation",
                table: "MaintenanceRequestRegisters");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "MiniStoreBinCardSerialNumbers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNumber",
                table: "MiniStoreBinCardSerialNumbers",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "UnitMeasurement",
                table: "MiniStoreBinCards",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<int>(
                name: "StockNumber",
                table: "MiniStoreBinCards",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "MiniStoreBinCards",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "MiniStoreBinCards",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 100);

            migrationBuilder.CreateIndex(
                name: "IX_MiniStoreBinCardSerialNumbers_MiniStoreBinCardId",
                table: "MiniStoreBinCardSerialNumbers",
                column: "MiniStoreBinCardId");
        }
    }
}
