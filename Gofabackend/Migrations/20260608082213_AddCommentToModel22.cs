using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentToModel22 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "aRank",
                table: "Model2s",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "cRank",
                table: "Model2s",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "iRank",
                table: "Model2s",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "isRank",
                table: "Model2s",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "pRank",
                table: "Model2s",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "rRank",
                table: "Model2s",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Comment",
                table: "Model22s",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreparedByRank",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "aRank",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "cRank",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "iRank",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "isRank",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "pRank",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "rRank",
                table: "Model2s");

            migrationBuilder.DropColumn(
                name: "Comment",
                table: "Model22s");

            migrationBuilder.DropColumn(
                name: "PreparedByRank",
                table: "Model1");
        }
    }
}
