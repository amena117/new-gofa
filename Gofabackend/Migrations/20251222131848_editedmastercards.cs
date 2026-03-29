using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class editedmastercards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptedAt",
                table: "RequestOrdersForIssue",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AcceptedBy",
                table: "RequestOrdersForIssue",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RejectedAt",
                table: "RequestOrdersForIssue",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectedBy",
                table: "RequestOrdersForIssue",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "RequestOrdersForIssue",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Pending");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcceptedAt",
                table: "RequestOrdersForIssue");

            migrationBuilder.DropColumn(
                name: "AcceptedBy",
                table: "RequestOrdersForIssue");

            migrationBuilder.DropColumn(
                name: "RejectedAt",
                table: "RequestOrdersForIssue");

            migrationBuilder.DropColumn(
                name: "RejectedBy",
                table: "RequestOrdersForIssue");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "RequestOrdersForIssue");
        }
    }
}
