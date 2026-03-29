using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class AddHistoryToTransactionEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "History",
                table: "TransactionEntries",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<double>(
                name: "Vat",
                table: "Model2s",
                type: "float",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AlterColumn<double>(
                name: "GrandTotal",
                table: "Model2s",
                type: "float",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            // Copy Item.History to the first transaction for each item
            migrationBuilder.Sql(@"
                UPDATE t
                SET t.History = i.History
                FROM TransactionEntries t
                INNER JOIN Items i ON t.ItemId = i.ItemId
                INNER JOIN (
                    SELECT ItemId, MIN(Id) as FirstTransactionId
                    FROM TransactionEntries
                    WHERE Action = 'receive'
                    GROUP BY ItemId
                ) first ON t.Id = first.FirstTransactionId
                WHERE i.History IS NOT NULL AND i.History != '';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "History",
                table: "TransactionEntries");

            migrationBuilder.AlterColumn<float>(
                name: "Vat",
                table: "Model2s",
                type: "real",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "float");

            migrationBuilder.AlterColumn<float>(
                name: "GrandTotal",
                table: "Model2s",
                type: "real",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "float");
        }
    }
}
