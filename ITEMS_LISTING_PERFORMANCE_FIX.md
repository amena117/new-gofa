# Items Listing Performance Optimization

## Problem Identified

The items listing page is loading slowly because the backend `GetItemsByRoles` endpoint is loading **ALL** related data for every item:
- All SerialNumbers
- All Accessories with their SerialNumbers and SubAccessories  
- All TransactionHistory entries

This creates massive data transfer and processing overhead, especially when there are many items.

## Root Cause

In `ItemController.cs`, the `GetItemsByRoles` method uses:
```csharp
.Include(i => i.SerialNumbers)
.Include(i => i.Accessories.Where(a => !a.IsStandalone))
    .ThenInclude(a => a.SerialNumbers)
.Include(i => i.Accessories.Where(a => !a.IsStandalone))
    .ThenInclude(a => a.SubAccessories)
.Include(i => i.TransactionHistory)
```

This loads **everything** into memory, then maps it to DTOs. For a listing page, this is unnecessary.

## Solution

Use **projection** instead of **eager loading**:
- Load only the fields needed for the listing view
- Use subqueries for counts (HasAccessories, SerialNumbersCount)
- Don't load full collections (SerialNumbers, Accessories, TransactionHistory)
- Load detailed data only when user clicks to view item details

## Performance Benefits

- **Reduced database query time**: No joins for large collections
- **Reduced memory usage**: No loading of unnecessary data
- **Reduced network transfer**: Smaller JSON payload
- **Faster frontend rendering**: Less data to process

## Implementation

Replace the eager loading approach with direct projection in the LINQ query.

### Before (Slow):
```csharp
var rawItems = await _context.Items
    .Where(i => upperRoles.Contains(i.Role.ToUpper()))
    .Include(i => i.SerialNumbers)  // Loads ALL serial numbers
    .Include(i => i.Accessories...)  // Loads ALL accessories
    .Include(i => i.TransactionHistory)  // Loads ALL transactions
    .ToListAsync();

var items = rawItems.Select(i => new ItemListingDto { ... }).ToList();
```

### After (Fast):
```csharp
var items = await _context.Items
    .Where(i => upperRoles.Contains(i.Role.ToUpper()))
    .Select(i => new ItemListingDto
    {
        ItemId = i.ItemId,
        Description = i.Description,
        // ... other scalar fields ...
        
        // Use subqueries for counts only
        HasAccessories = _context.Accessories.Any(a => a.ItemId == i.ItemId && !a.IsStandalone),
        SerialNumbersCount = _context.ItemSerialNumbers.Count(s => s.ItemId == i.ItemId),
        
        // Don't load collections - set to empty
        SerialNumbers = new List<ItemSerialNumber>(),
        Accessories = new List<Accessory>(),
        
        // Get only the latest transaction date
        LatestTransactionDate = _context.TransactionEntries
            .Where(t => t.ItemId == i.ItemId)
            .OrderByDescending(t => t.GregorianDate)
            .Select(t => (DateTime?)t.GregorianDate)
            .FirstOrDefault()
    })
    .AsNoTracking()
    .ToListAsync();
```

## Expected Results

- **Initial load time**: Should reduce from several seconds to under 1 second
- **Data transfer**: Reduced by 70-90% depending on how many accessories/serials exist
- **Memory usage**: Significantly reduced on both server and client
- **User experience**: Near-instant listing page load

## Note

The detailed item view (when clicking on an item) will still load all data via the `GetItem(int id)` endpoint, which is appropriate for that use case.
