using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class RepairSparepartSerialNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Repair SPAREPART items that lost their serial numbers due to withdrawals
            // This creates a generic serial number for any SPAREPART item with quantity > 0 but no serial numbers
            
            migrationBuilder.Sql(@"
                INSERT INTO ItemSerialNumbers (SerialNumber, AddedDate, ItemId)
                SELECT 
                    CONCAT(i.Description, '-', i.Model, '-REPAIR-', i.ItemId) as SerialNumber,
                    'ታህሳስ 13, 2017' as AddedDate,
                    i.ItemId
                FROM Items i
                LEFT JOIN ItemSerialNumbers sn ON i.ItemId = sn.ItemId
                WHERE i.Role = 'SPAREPART' 
                    AND i.Quantity > 0
                GROUP BY i.ItemId, i.Description, i.Model, i.Quantity, i.Role
                HAVING COUNT(sn.Id) = 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the repair serial numbers
            migrationBuilder.Sql(@"
                DELETE FROM ItemSerialNumbers 
                WHERE SerialNumber LIKE '%-REPAIR-%';
            ");
        }
    }
}