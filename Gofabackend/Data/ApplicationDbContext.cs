using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Gofabackend.Models;

namespace Gofabackend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // DbSets
        public DbSet<User> Users { get; set; }
        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<Shelf> Shelves { get; set; }
        public DbSet<Model1> Model1 { get; set; }
        public DbSet<MasterCardItem> MasterCardItems { get; set; }
        public DbSet<MasterCardItemDetails> MasterCardItemDetails { get; set; }
        public DbSet<MasterCardItemReceived> MasterCardItemReceived { get; set; }
        public DbSet<MasterCardItemIssued> MasterCardItemIssued { get; set; }
        public DbSet<RequestOrderForIssue> RequestOrdersForIssue { get; set; }
        public DbSet<IssuedItem> IssuedItems { get; set; }
        public DbSet<Model2> Model2s { get; set; }
        public DbSet<EquipmentType> EquipmentTypes { get; set; }
        public DbSet<Model22> Model22s { get; set; }
        public DbSet<Model22Item> Model22Items { get; set; }
        public DbSet<SparePartsRequest> SparePartsRequests { get; set; }
        public DbSet<MaintenanceRequestRegister> MaintenanceRequestRegisters { get; set; }
        public DbSet<MiniStoreBinCardSerialNumber> MiniStoreBinCardSerialNumbers { get; set; }
        public DbSet<MiniStoreBinCard> MiniStoreBinCards { get; set; }
        public DbSet<LetterRegistration> Letters { get; set; }
        public DbSet<SpecialToolRegister> SpecialToolRegisters { get; set; }
        public DbSet<TransactionEntry> TransactionEntries { get; set; }
        public DbSet<StoredToken> StoredTokens { get; set; }
        public DbSet<LoginLog> LoginLogs { get; set; }
        public DbSet<ItemUnit> ItemUnits { get; set; }
        public DbSet<Accessory> Accessories { get; set; }
        public DbSet<Accessories> Model1Accessories { get; set; }
        public DbSet<Model1AccessorySubAccessory> Model1AccessorySubAccessories { get; set; } // For Model1 (Transit) accessories
        public DbSet<ItemSerialNumber> ItemSerialNumbers { get; set; }
        public DbSet<ItemType> ItemTypes { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Model22ItemAccessory> Model22ItemAccessories { get; set; }
        public DbSet<Model22ItemSubAccessory> Model22ItemSubAccessories { get; set; } // ✅ NEW
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<ReceivedAccessory> ReceivedAccessories { get; set; }
        public DbSet<IssuedAccessory> IssuedAccessories { get; set; }
        public DbSet<ExtraItem> ExtraItems { get; set; }
        public DbSet<ItemEditHistory> ItemEditHistories { get; set; }
        public DbSet<AccessorySerialNumber> AccessorySerialNumbers { get; set; }
        public DbSet<AccessorySubAccessory> AccessorySubAccessories { get; set; } // ✅ NEW
        public DbSet<SparePartHandoverLog> SparePartHandoverLogs { get; set; }
        

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure StoredToken
            modelBuilder.Entity<StoredToken>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.TokenHash);
                entity.HasIndex(e => e.ExpiryDate);
            });

            // Configure User
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.Username).IsUnique();
            });

            // Item -> Warehouse (Foreign Key)
            modelBuilder.Entity<Item>()
                .HasOne<Warehouse>()
                .WithMany()
                .HasForeignKey(i => i.WarehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            // Item -> TransactionHistory
            modelBuilder.Entity<TransactionEntry>()
                .HasOne(t => t.Item)
                .WithMany(i => i.TransactionHistory)
                .HasForeignKey(t => t.ItemId)
                .OnDelete(DeleteBehavior.Cascade);

            // TransactionEntry -> ItemUnit (optional)
            modelBuilder.Entity<TransactionEntry>()
                .HasOne(t => t.ItemUnit)
                .WithMany(iu => iu.TransactionHistory)
                .HasForeignKey(t => t.ItemUnitId)
                .OnDelete(DeleteBehavior.NoAction)
                .IsRequired(false);

            // Item -> ItemUnit (1 to many)
            modelBuilder.Entity<ItemUnit>()
                .HasOne(iu => iu.Item)
                .WithMany(i => i.Units)
                .HasForeignKey(iu => iu.ItemId)
                .OnDelete(DeleteBehavior.Cascade);

            // Item -> Accessory (1 to many)
            modelBuilder.Entity<Accessory>()
                .HasOne(a => a.Item)
                .WithMany(i => i.Accessories)
                .HasForeignKey(a => a.ItemId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Add indexes for AccessorySerialNumber for faster lookups
            modelBuilder.Entity<AccessorySerialNumber>()
                .HasIndex(s => s.AccessoryId);
            
            modelBuilder.Entity<AccessorySerialNumber>()
                .HasIndex(s => s.SerialNumber);
            //..........................
            modelBuilder.Entity<Model1>()
                .HasMany(m => m.Accessories)
                .WithOne(a => a.Model1)
                .HasForeignKey(a => a.Model1Id)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Model1>()
                .HasMany(m => m.ExtraItems)                      
                .WithOne(e => e.Model1)
                .HasForeignKey(e => e.Model1Id)
                .OnDelete(DeleteBehavior.Cascade);

            // Item -> ItemSerialNumber (1 to many)
            modelBuilder.Entity<ItemSerialNumber>()
                .HasOne(s => s.Item)
                .WithMany(i => i.SerialNumbers)
                .HasForeignKey(s => s.ItemId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Add index on SerialNumber for fast lookups
            modelBuilder.Entity<ItemSerialNumber>()
                .HasIndex(s => s.SerialNumber)
                .IsUnique();
            
            // Add index on ItemId for faster serial number fetching per item
            modelBuilder.Entity<ItemSerialNumber>()
                .HasIndex(s => s.ItemId);
            // Model22 -> Model22Item (1 to many)
            modelBuilder.Entity<Model22Item>()
                .HasOne(mi => mi.Model22)
                .WithMany(m => m.Items)
                .HasForeignKey(mi => mi.Model22Id)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<Accessory>(entity =>
    {
        entity.Property(a => a.UnitPrice)
            .HasColumnType("decimal(18,2)") // Match your decimal precision
            .IsRequired(false); // Make it optional

        entity.Property(a => a.Currency)
            .HasMaxLength(10) // Adjust length as needed
            .IsRequired(false) // Make it optional
            .HasDefaultValue("ETB"); // Optional default value
    });
            // Explicitly configure Model22Id as required
            modelBuilder.Entity<Model22Item>()
                .Property(m => m.Model22Id)
                .IsRequired();


            modelBuilder.Entity<Model22>()
                .Property(m => m.RegisteredBy)
                .IsRequired()
                .HasDefaultValue(string.Empty);
            
            modelBuilder.Entity<Model22ItemAccessory>()
    .HasOne(a => a.Model22Item)
    .WithMany(i => i.WithdrawnAccessories)
    .HasForeignKey(a => a.Model22ItemId)
    .OnDelete(DeleteBehavior.Cascade);

            // ✅ Configure Model22ItemSubAccessory primary key as IDENTITY
            modelBuilder.Entity<Model22ItemSubAccessory>()
                .HasKey(s => s.Model22ItemSubAccessoryId);
            
            modelBuilder.Entity<Model22ItemSubAccessory>()
                .Property(s => s.Model22ItemSubAccessoryId)
                .ValueGeneratedOnAdd(); // Ensure IDENTITY is set
            
            // Configure relationship: Model22ItemSubAccessory -> Model22ItemAccessory
            modelBuilder.Entity<Model22ItemSubAccessory>()
                .HasOne(s => s.Model22ItemAccessory)
                .WithMany(a => a.WithdrawnSubAccessories)
                .HasForeignKey(s => s.Model22ItemAccessoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Model22ItemAccessory>()
                .Property(e => e.WithdrawnSerialNumbers)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v ?? new List<string>(), (System.Text.Json.JsonSerializerOptions?)null),
                    v => string.IsNullOrEmpty(v) 
                        ? new List<string>() 
                        : (System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>())
                );

            // Configure Model22 properties
            modelBuilder.Entity<Model22>()
                .Property(m => m.Department)
                .IsRequired();
            modelBuilder.Entity<Model22>()
                .Property(m => m.RecipientName)
                .IsRequired();
            modelBuilder.Entity<Model22>()
                .Property(m => m.RecipientOrganization)
                .IsRequired();
            modelBuilder.Entity<Model22>()
                .Property(m => m.EthiopianDate)
                .IsRequired();
                
            modelBuilder.Entity<Model22>()
                .Property(m => m.Role)
                .IsRequired();


            modelBuilder.Entity<Model1>()
                .HasMany(m => m.ExtraItems)                      
                .WithOne(e => e.Model1)
                .HasForeignKey(e => e.Model1Id)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Model22Item properties
            modelBuilder.Entity<Model22Item>()
                .Property(m => m.Description)
                .IsRequired();
            modelBuilder.Entity<Model22Item>()
                .Property(m => m.Model)
                .IsRequired();
            modelBuilder.Entity<Model22Item>()
                .Property(m => m.Quantity)
                .IsRequired();
            modelBuilder.Entity<Model22Item>()
                .Property(m => m.UnitPrice)
                .HasColumnType("decimal(18,2)")
                .IsRequired();
            modelBuilder.Entity<Model22Item>()
                .Property(m => m.SerialNumber)
                .IsRequired(false);

            modelBuilder.Entity<Model22Item>()
                .Property(e => e.SerialNumbers)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v ?? new List<string>(), (System.Text.Json.JsonSerializerOptions?)null),
                    v => string.IsNullOrEmpty(v) 
                        ? new List<string>() 
                        : (System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>())
                );

            modelBuilder.Entity<Organization>().HasKey(o => o.Id);
            modelBuilder.Entity<Location>().HasKey(l => l.Id);
            modelBuilder.Entity<Organization>().Property(o => o.Name).IsRequired();
            modelBuilder.Entity<Location>().Property(l => l.Name).IsRequired();

            // Owned types in RequestOrderForIssue
            modelBuilder.Entity<RequestOrderForIssue>()
                .OwnsOne(r => r.PreparedBy);
            modelBuilder.Entity<RequestOrderForIssue>()
                .OwnsOne(r => r.VerifiedBy);
            modelBuilder.Entity<RequestOrderForIssue>()
                .OwnsOne(r => r.ApprovedBy);

            modelBuilder.Entity<RequestOrderForIssue>()
                .Property(o => o.Status)
                .HasDefaultValue("Pending");

            // IssuedItem -> RequestOrderForIssue
            modelBuilder.Entity<IssuedItem>()
                .HasOne<RequestOrderForIssue>()
                .WithMany(i => i.IssuedItems)
                .HasForeignKey(d => d.RequestOrderForIssueId)
                .OnDelete(DeleteBehavior.Cascade);

            // MasterCardItem -> ReceivedRecords
            modelBuilder.Entity<MasterCardItemReceived>()
                .HasMany(r => r.ReceivedAccessories)
                .WithOne(a => a.MasterCardItemReceived)
                .HasForeignKey(a => a.MasterCardItemReceivedId);

            modelBuilder.Entity<ReceivedAccessory>()
            .Property(a => a.Name)
            .IsRequired();


            modelBuilder.Entity<MasterCardItemIssued>()
     .HasMany(i => i.IssuedAccessories)
     .WithOne(a => a.MasterCardItemIssued)
     .HasForeignKey(a => a.MasterCardItemIssuedId);

            // Relationship between MasterCardItem and MasterCardItemReceived
            modelBuilder.Entity<MasterCardItem>()
                .HasMany(i => i.ReceivedRecords)
                .WithOne()
                .HasForeignKey(r => r.MasterCardItemId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relationship between MasterCardItem and MasterCardItemIssued
            modelBuilder.Entity<MasterCardItem>()
                .HasMany(i => i.IssuedRecords)
                .WithOne()
                .HasForeignKey(i => i.MasterCardItemId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ignore computed properties
            modelBuilder.Entity<MasterCardItemIssued>()
                .Ignore(i => i.TotalPrice);

            modelBuilder.Entity<IssuedItem>()
                .Ignore(i => i.TotalPrice); // Add this to ignore TotalPrice in IssuedItem

            //     modelBuilder.Entity<Organization>().HasKey(o => o.Id);
            // modelBuilder.Entity<Location>().HasKey(l => l.Id);
            // modelBuilder.Entity<Organization>().Property(o => o.Name).IsRequired();
            // modelBuilder.Entity<Location>().Property(l => l.Name).IsRequired();
            modelBuilder.Entity<IssuedItem>()
                .Ignore(i => i.TotalPrice);
            modelBuilder.Entity<MaintenanceRequestRegister>()
                .HasOne(r => r.LetterRegistration)
                .WithMany()
                .HasForeignKey(r => r.LetterId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<LetterRegistration>()
                .Property(l => l.LetterId)
                .UseIdentityColumn(seed: 1000, increment: 1);
            modelBuilder.Entity<Item>(entity =>
{
    entity.Property(e => e.Source)
        .HasColumnType("nvarchar(50)") // Adjust length as needed (e.g., 50 characters)
        .HasDefaultValue("Purchase")  // Optional: Set default value
        .IsRequired(); // Ensures it's not nullable
});


// -------------------------------
            // MiniStoreBinCard configuration
            // -------------------------------
            modelBuilder.Entity<MiniStoreBinCard>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.StockNumber)
                      .HasColumnType("nvarchar(50)")
                      .IsRequired();

                entity.Property(e => e.Description);

                entity.Property(e => e.Location)
                      .HasColumnType("nvarchar(100)");

                entity.Property(e => e.Category)
                      .HasColumnType("nvarchar(50)");

                entity.Property(e => e.UnitMeasurement)
                      .HasColumnType("nvarchar(20)");

                entity.HasMany(b => b.SerialNumbers)
                      .WithOne(s => s.MiniStoreBinCard)
                      .HasForeignKey(s => s.MiniStoreBinCardId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.StockNumber)
                      .IsUnique();
            });

             // MiniStoreBinCardSerialNumber configuration
            // MiniStoreBinCardSerialNumber configuration
            modelBuilder.Entity<MiniStoreBinCardSerialNumber>(entity =>
            {
                entity.HasKey(s => s.Id);

                entity.Property(s => s.SerialNumber)
                      .HasColumnType("nvarchar(50)")
                      .IsRequired();

                entity.Property(s => s.Status)
                      .HasColumnType("nvarchar(50)")
                      .IsRequired();

                // ❌ Remove the uniqueness constraint
                entity.HasIndex(s => new { s.MiniStoreBinCardId, s.SerialNumber })
                      .IsUnique(false);
            });


            // Configure decimal properties
            modelBuilder.Entity<IssuedItem>()
                .Property(i => i.UnitPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<MaintenanceRequestRegister>()
                .Property(m => m.PartsCost)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<MasterCardItemIssued>()
                .Property(m => m.UnitPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<MasterCardItemReceived>()
                .Property(m => m.UnitPrice)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<SparePartsRequest>()
                .Property(s => s.LabourCost)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<SparePartsRequest>()
                .Property(s => s.PartCost)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<SparePartsRequest>()
                .Property(s => s.TotalCost)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<ItemType>(entity =>
            {
                entity.HasIndex(e => e.Name).IsUnique();
            });
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.EnableSensitiveDataLogging()
                         .EnableDetailedErrors();
        }
    }

    public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseSqlServer("Server=WIN-HRMPGQA7MMN\\SQLExpress;Database=GofaDb;User ID=sa;Password=signal@2025;TrustServerCertificate=True;");
            return new ApplicationDbContext(optionsBuilder.Options);
        }
    }
}