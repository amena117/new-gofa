using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gofabackend.Migrations
{
    /// <inheritdoc />
    public partial class SeedVHFCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Get current Ethiopian date for CreatedAt
            var currentDate = "የካቲት 7, 2018"; // February 16, 2026 in Ethiopian Calendar
            
            // Insert VHF radio categories
            migrationBuilder.Sql($@"
                -- Only insert if categories don't already exist
                IF NOT EXISTS (SELECT 1 FROM Categories WHERE Name = 'VHF Radio' AND Role = 'VHF')
                BEGIN
                    INSERT INTO Categories (Name, Description, CreatedBy, CreatedAt, Role)
                    VALUES 
                        ('VHF Radio', 'VHF Radio Communication Equipment', 'System', '{currentDate}', 'VHF'),
                        ('VHF Antenna', 'VHF Antenna and Accessories', 'System', '{currentDate}', 'VHF'),
                        ('VHF Transceiver', 'VHF Transceiver Units', 'System', '{currentDate}', 'VHF'),
                        ('VHF Handheld', 'VHF Handheld Radio Devices', 'System', '{currentDate}', 'VHF'),
                        ('VHF Base Station', 'VHF Base Station Equipment', 'System', '{currentDate}', 'VHF'),
                        ('VHF Mobile Unit', 'VHF Mobile Radio Units', 'System', '{currentDate}', 'VHF'),
                        ('VHF Repeater', 'VHF Repeater Systems', 'System', '{currentDate}', 'VHF'),
                        ('VHF Accessories', 'VHF Radio Accessories and Parts', 'System', '{currentDate}', 'VHF')
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the seeded VHF categories
            migrationBuilder.Sql(@"
                DELETE FROM Categories 
                WHERE Role = 'VHF' 
                AND CreatedBy = 'System'
                AND Name IN (
                    'VHF Radio', 
                    'VHF Antenna', 
                    'VHF Transceiver', 
                    'VHF Handheld', 
                    'VHF Base Station', 
                    'VHF Mobile Unit', 
                    'VHF Repeater', 
                    'VHF Accessories'
                )
            ");
        }
    }
}
