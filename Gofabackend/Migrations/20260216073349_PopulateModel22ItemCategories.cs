using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class PopulateModel22ItemCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update Model22Items with categories from Items table
            // This will populate categories for all existing Model22 withdrawal records
            migrationBuilder.Sql(@"
                UPDATE m22i
                SET m22i.Category = ISNULL(i.Category, '')
                FROM Model22Items m22i
                INNER JOIN Items i ON m22i.Description = i.Description AND m22i.Model = i.Model
                WHERE m22i.Category = '' OR m22i.Category IS NULL
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
