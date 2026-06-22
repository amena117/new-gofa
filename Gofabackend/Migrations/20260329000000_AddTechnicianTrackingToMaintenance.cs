using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddTechnicianTrackingToMaintenance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaintainedByUserId",
                table: "MaintenanceRequestRegisters",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicianRole",
                table: "MaintenanceRequestRegisters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaintainedByUserId",
                table: "MaintenanceRequestRegisters");

            migrationBuilder.DropColumn(
                name: "TechnicianRole",
                table: "MaintenanceRequestRegisters");
        }
    }
}
