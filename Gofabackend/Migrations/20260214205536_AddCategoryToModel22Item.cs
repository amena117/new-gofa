using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryToModel22Item : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Model22Items",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            // Populate Category from Items table for existing records
            migrationBuilder.Sql(@"
                UPDATE m22i
                SET m22i.Category = ISNULL(i.Category, '')
                FROM Model22Items m22i
                LEFT JOIN Items i ON m22i.Description = i.Description AND m22i.Model = i.Model
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Model22Items");
        }
    }
}
