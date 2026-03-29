using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddAccessorySerialNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RequiresSerialNumbers",
                table: "Accessories",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AccessorySerialNumbers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AccessoryId = table.Column<int>(type: "int", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccessorySerialNumbers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AccessorySerialNumbers_Accessories_AccessoryId",
                        column: x => x.AccessoryId,
                        principalTable: "Accessories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccessorySerialNumbers_AccessoryId",
                table: "AccessorySerialNumbers",
                column: "AccessoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccessorySerialNumbers");

            migrationBuilder.DropColumn(
                name: "RequiresSerialNumbers",
                table: "Accessories");
        }
    }
}
