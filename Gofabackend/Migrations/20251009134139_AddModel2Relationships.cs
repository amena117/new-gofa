using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddModel2Relationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasAccessories",
                table: "Model2s",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasExtraItems",
                table: "Model2s",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Model2Accessory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Model2Id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Model2Accessory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Model2Accessory_Model2s_Model2Id",
                        column: x => x.Model2Id,
                        principalTable: "Model2s",
                        principalColumn: "Model2Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Model2ExtraItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Store = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExtraStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExtraIssuedByName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Model2Id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Model2ExtraItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Model2ExtraItem_Model2s_Model2Id",
                        column: x => x.Model2Id,
                        principalTable: "Model2s",
                        principalColumn: "Model2Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Model2Accessory_Model2Id",
                table: "Model2Accessory",
                column: "Model2Id");

            migrationBuilder.CreateIndex(
                name: "IX_Model2ExtraItem_Model2Id",
                table: "Model2ExtraItem",
                column: "Model2Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Model2Accessory");

            migrationBuilder.DropTable(
                name: "Model2ExtraItem");

            migrationBuilder.DropColumn(
                name: "HasAccessories",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "HasExtraItems",
                table: "Model2s");
        }
    }
}
