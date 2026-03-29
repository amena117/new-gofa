using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddModel1AccessorySubAccessories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Model1AccessorySubAccessories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AccessoriesId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Model1AccessorySubAccessories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Model1AccessorySubAccessories_Model1Accessories_AccessoriesId",
                        column: x => x.AccessoriesId,
                        principalTable: "Model1Accessories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Model1AccessorySubAccessories_AccessoriesId",
                table: "Model1AccessorySubAccessories",
                column: "AccessoriesId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Model1AccessorySubAccessories");
        }
    }
}
