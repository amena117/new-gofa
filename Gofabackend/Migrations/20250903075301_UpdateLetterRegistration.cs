using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLetterRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnedDate",
                table: "SpecialToolRegisters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SerialNumber",
                table: "SparePartsRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "SerialNoOfEquip",
                table: "MaintenanceRequestRegisters",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "MaintainedBy",
                table: "MaintenanceRequestRegisters",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectReason",
                table: "MaintenanceRequestRegisters",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "MaintenanceRequestRegisters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LetterId",
                table: "Letters",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("SqlServer:Identity", "1000, 1")
                .OldAnnotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedDate",
                table: "Letters",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "EquipmentModel",
                table: "EquipmentTypes",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReturnedDate",
                table: "SpecialToolRegisters");

            migrationBuilder.DropColumn(
                name: "SerialNumber",
                table: "SparePartsRequests");

            migrationBuilder.DropColumn(
                name: "MaintainedBy",
                table: "MaintenanceRequestRegisters");

            migrationBuilder.DropColumn(
                name: "RejectReason",
                table: "MaintenanceRequestRegisters");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "MaintenanceRequestRegisters");

            migrationBuilder.DropColumn(
                name: "CreatedDate",
                table: "Letters");

            migrationBuilder.DropColumn(
                name: "EquipmentModel",
                table: "EquipmentTypes");

            migrationBuilder.AlterColumn<string>(
                name: "SerialNoOfEquip",
                table: "MaintenanceRequestRegisters",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LetterId",
                table: "Letters",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .Annotation("SqlServer:Identity", "1, 1")
                .OldAnnotation("SqlServer:Identity", "1000, 1");
        }
    }
}
