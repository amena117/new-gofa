using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddSignatureRanks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AuthorizedByRank",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CheckedByRank",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ITitle",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IsTitle",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IssBy",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IssuedTurnBy",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PTitle",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PreparedBy",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RecivedByRank",
                table: "Model1",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AuthorizedByRank",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "CheckedByRank",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "ITitle",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "IsTitle",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "IssBy",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "IssuedTurnBy",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "PTitle",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "PreparedBy",
                table: "Model1");

            migrationBuilder.DropColumn(
                name: "RecivedByRank",
                table: "Model1");
        }
    }
}
