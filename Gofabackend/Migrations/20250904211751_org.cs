using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class org : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsUnserviceable",
                table: "RequestOrdersForIssue",
                newName: "IsServiceable");

            migrationBuilder.AddColumn<bool>(
                name: "HasAccessories",
                table: "MasterCardItemReceived",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasAccessories",
                table: "MasterCardItemIssued",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "IssuedAccessories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    MasterCardItemIssuedId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IssuedAccessories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IssuedAccessories_MasterCardItemIssued_MasterCardItemIssuedId",
                        column: x => x.MasterCardItemIssuedId,
                        principalTable: "MasterCardItemIssued",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MasterCardItemDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MasterCardItemId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OrderNo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Suppliers = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QuantityOrdered = table.Column<int>(type: "int", nullable: false),
                    Received = table.Column<int>(type: "int", nullable: false),
                    Organization = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PostedBy = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Issued = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterCardItemDetails", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Organizations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReceivedAccessories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    MasterCardItemReceivedId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceivedAccessories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReceivedAccessories_MasterCardItemReceived_MasterCardItemReceivedId",
                        column: x => x.MasterCardItemReceivedId,
                        principalTable: "MasterCardItemReceived",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IssuedAccessories_MasterCardItemIssuedId",
                table: "IssuedAccessories",
                column: "MasterCardItemIssuedId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceivedAccessories_MasterCardItemReceivedId",
                table: "ReceivedAccessories",
                column: "MasterCardItemReceivedId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IssuedAccessories");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "MasterCardItemDetails");

            migrationBuilder.DropTable(
                name: "Organizations");

            migrationBuilder.DropTable(
                name: "ReceivedAccessories");

            migrationBuilder.DropColumn(
                name: "HasAccessories",
                table: "MasterCardItemReceived");

            migrationBuilder.DropColumn(
                name: "HasAccessories",
                table: "MasterCardItemIssued");

            migrationBuilder.RenameColumn(
                name: "IsServiceable",
                table: "RequestOrdersForIssue",
                newName: "IsUnserviceable");
        }
    }
}
