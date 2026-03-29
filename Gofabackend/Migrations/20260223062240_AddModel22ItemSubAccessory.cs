using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddModel22ItemSubAccessory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Model22ItemSubAccessories",
                columns: table => new
                {
                    Model22ItemSubAccessoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Model22ItemAccessoryId = table.Column<int>(type: "int", nullable: false),
                    SubAccessoryId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Model22ItemSubAccessories", x => x.Model22ItemSubAccessoryId);
                    table.ForeignKey(
                        name: "FK_Model22ItemSubAccessories_Model22ItemAccessories_Model22ItemAccessoryId",
                        column: x => x.Model22ItemAccessoryId,
                        principalTable: "Model22ItemAccessories",
                        principalColumn: "Model22ItemAccessoryId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Model22ItemSubAccessories_Model22ItemAccessoryId",
                table: "Model22ItemSubAccessories",
                column: "Model22ItemAccessoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Model22ItemSubAccessories");
        }
    }
}
