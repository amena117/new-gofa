using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddHandoverConfirmation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'SparePartHandoverLogs')
                BEGIN
                    CREATE TABLE [SparePartHandoverLogs] (
                        [Id] int NOT NULL IDENTITY,
                        [StockNumber] nvarchar(max) NOT NULL DEFAULT N'',
                        [Description] nvarchar(max) NOT NULL DEFAULT N'',
                        [SerialNumber] nvarchar(max) NOT NULL DEFAULT N'',
                        [Quantity] int NOT NULL DEFAULT 1,
                        [TechnicianName] nvarchar(max) NOT NULL DEFAULT N'',
                        [IsConfirmedByTechnician] bit NOT NULL DEFAULT CAST(0 AS bit),
                        [ConfirmedAt] datetime2 NULL,
                        [WorksOrderNumber] nvarchar(max) NULL,
                        [IssuedBy] nvarchar(max) NULL,
                        [Remark] nvarchar(max) NULL,
                        [IssueDate] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000',
                        [CreatedAt] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000',
                        CONSTRAINT [PK_SparePartHandoverLogs] PRIMARY KEY ([Id])
                    );
                END
                ELSE
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[SparePartHandoverLogs]') AND name = 'IsConfirmedByTechnician')
                        ALTER TABLE [SparePartHandoverLogs] ADD [IsConfirmedByTechnician] bit NOT NULL DEFAULT CAST(0 AS bit);
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[SparePartHandoverLogs]') AND name = 'ConfirmedAt')
                        ALTER TABLE [SparePartHandoverLogs] ADD [ConfirmedAt] datetime2 NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsConfirmedByTechnician",
                table: "SparePartHandoverLogs");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "SparePartHandoverLogs");
        }
    }
}
