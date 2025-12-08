using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddAccessoriesAndAccessory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Date",
                table: "Model2s",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<string>(
                name: "Date",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasAccessories",
                table: "Model1",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasExtraItems",
                table: "Model1",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "StoreType",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "ExtraItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Store = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExtraStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExtraRecivedByName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Model1Id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExtraItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExtraItems_Model1_Model1Id",
                        column: x => x.Model1Id,
                        principalTable: "Model1",
                        principalColumn: "Model1Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Model1Accessories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Model1Id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Model1Accessories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Model1Accessories_Model1_Model1Id",
                        column: x => x.Model1Id,
                        principalTable: "Model1",
                        principalColumn: "Model1Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExtraItems_Model1Id",
                table: "ExtraItems",
                column: "Model1Id");

            migrationBuilder.CreateIndex(
                name: "IX_Model1Accessories_Model1Id",
                table: "Model1Accessories",
                column: "Model1Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExtraItems");

            migrationBuilder.DropTable(
                name: "Model1Accessories");

            migrationBuilder.DropColumn(
                name: "HasAccessories",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "HasExtraItems",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "StoreType",
                table: "Model1");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "Model2s",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "Model1",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }
    }
}
