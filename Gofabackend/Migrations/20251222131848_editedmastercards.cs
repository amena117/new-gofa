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
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[RequestOrdersForIssue]') AND name = 'AcceptedAt')
                    ALTER TABLE [RequestOrdersForIssue] ADD [AcceptedAt] datetime2 NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[RequestOrdersForIssue]') AND name = 'AcceptedBy')
                    ALTER TABLE [RequestOrdersForIssue] ADD [AcceptedBy] nvarchar(max) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[RequestOrdersForIssue]') AND name = 'RejectedAt')
                    ALTER TABLE [RequestOrdersForIssue] ADD [RejectedAt] datetime2 NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[RequestOrdersForIssue]') AND name = 'RejectedBy')
                    ALTER TABLE [RequestOrdersForIssue] ADD [RejectedBy] nvarchar(max) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[RequestOrdersForIssue]') AND name = 'Status')
                    ALTER TABLE [RequestOrdersForIssue] ADD [Status] nvarchar(max) NOT NULL DEFAULT 'Pending';
            ");
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
