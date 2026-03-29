
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.Utilities; // Added for EthiopianCalendarConverter

namespace UserManagment.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Model1Controller : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public Model1Controller(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Model1
        // GET: api/Model1
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Model1Dto>>> GetModel1()
        {
            try 
            {
                var models = await _context.Model1
                    .Include(m => m.Accessories)
                    .Include(m => m.ExtraItems)  // Include ExtraItems
                    .ToListAsync();

                var dtoList = models.Select(model => new Model1Dto
                {
                    Model1Id = model.Model1Id,
                    Supplier = model.Supplier,
                    Category = model.Category,
                    PRNO = model.PRNO,
                    Date = model.Date,
                    InvoiceNo = model.InvoiceNo,
                    ItemType = model.ItemType,
                    ContactNumber = model.ContactNumber,
                    Number = model.Number,
                    RegisteredBy = model.RegisteredBy,
                    SerialNumber = model.SerialNumber,
                    Description = model.Description,
                    UnitOfMeasurment = model.UnitOfMeasurment,
                    Ordered = model.Ordered,
                    Received = model.Received,
                    UnitOfPrice = model.UnitOfPrice,
                    Amount = model.Amount,
                    Currency = model.Currency,
                    Location = model.Location,
                    Remark = model.Remark,
                    CheckedByName = model.CheckedByName,
                    CTitle = model.CTitle,
                    RecivedByName = model.RecivedByName,
                    RTitle = model.RTitle,
                    AuthorizedByName = model.AuthorizedByName,
                    ATitle = model.ATitle,
                    Model19Ref = model.Model19Ref,
                    Status = model.Status,
                    StoreType = model.StoreType,
                    HasAccessories = model.HasAccessories,
                    Accessories = model.Accessories?.Select(a => new AccessoryDto
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Quantity = a.Quantity,
                        Model1Id = a.Model1Id
                    }).ToList(),
                    ExtraItems = model.ExtraItems?.Select(e => new ExtraItemDto
                    {
                        Id = e.Id,
                        Name = e.Name,
                        Quantity = e.Quantity,
                        Store = e.Store,
                        ExtraStatus = e.ExtraStatus,
                        ExtraRecivedByName = e.ExtraRecivedByName,
                        Model1Id = e.Model1Id
                    }).ToList(),
                    Vat = model.Vat,
                    GrandTotal = model.GrandTotal
                });

                return Ok(dtoList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new 
                { 
                    message = "An error occurred while fetching Model1.", 
                    detailedMessage = ex.Message,
                    innerException = ex.InnerException?.Message 
                });
            }
        }
        // GET: api/Model1/filter-by-date?period=1month
[HttpGet("filter-by-date")]
public async Task<ActionResult<IEnumerable<Model1Dto>>> GetModel1sByDateRange([FromQuery] string period)
{
    try
    {
        DateTime now = DateTime.UtcNow.AddHours(3); // East Africa Time (UTC+3)
        DateTime lowerBound;

        // Define supported periods
        switch (period.ToLower())
        {
            case "1week":
                lowerBound = now.AddDays(-7);
                break;
            case "1month":
                lowerBound = now.AddMonths(-1);
                break;
            case "3months":
                lowerBound = now.AddMonths(-3);
                break;
            case "6months":
                lowerBound = now.AddMonths(-6);
                break;
            case "9months":
                lowerBound = now.AddMonths(-9);
                break;
            case "1year":
                lowerBound = now.AddYears(-1);
                break;
            default:
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid period. Allowed values: 1week, 1month, 3months, 6months, 9months, 1year."
                });
        }

        // Fetch all Model1s (since EthiopianDate is a string)
        var allModel1s = await _context.Model1
            .Include(m => m.Accessories)
            .Include(m => m.ExtraItems)
            .ToListAsync();

        // Filter in-memory using EthiopianDate parsing
        var filteredModel1s = allModel1s
            .Where(m => TryParseEthiopianDate(m.Date, out DateTime gregorianDate)
                        && gregorianDate >= lowerBound
                        && gregorianDate <= now)
            .Select(model => new Model1Dto
            {
                Model1Id = model.Model1Id,
                Supplier = model.Supplier,
                Category = model.Category,
                PRNO = model.PRNO,
                Date = model.Date,
                InvoiceNo = model.InvoiceNo,
                ItemType = model.ItemType,
                ContactNumber = model.ContactNumber,
                Number = model.Number,
                RegisteredBy = model.RegisteredBy,
                SerialNumber = model.SerialNumber,
                Description = model.Description,
                UnitOfMeasurment = model.UnitOfMeasurment,
                Ordered = model.Ordered,
                Received = model.Received,
                UnitOfPrice = model.UnitOfPrice,
                Amount = model.Amount,
                Currency = model.Currency,
                Location = model.Location,
                Remark = model.Remark,
                CheckedByName = model.CheckedByName,
                CTitle = model.CTitle,
                RecivedByName = model.RecivedByName,
                RTitle = model.RTitle,
                AuthorizedByName = model.AuthorizedByName,
                ATitle = model.ATitle,
                Model19Ref = model.Model19Ref,
                Status = model.Status,
                StoreType = model.StoreType,
                HasAccessories = model.HasAccessories,
                Accessories = model.Accessories?.Select(a => new AccessoryDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    Quantity = a.Quantity,
                    Model1Id = a.Model1Id
                }).ToList(),
                ExtraItems = model.ExtraItems?.Select(e => new ExtraItemDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Quantity = e.Quantity,
                    Store = e.Store,
                    ExtraStatus = e.ExtraStatus,
                    ExtraRecivedByName = e.ExtraRecivedByName,
                    Model1Id = e.Model1Id
                }).ToList(),
                Vat = model.Vat,
                GrandTotal = model.GrandTotal
            })
            .ToList();

        return Ok(filteredModel1s);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new
        {
            success = false,
            message = "Internal error filtering by date.",
            detailedMessage = ex.Message
        });
    }
}

private static bool TryParseEthiopianDate(string ethiopianDate, out DateTime gregorianDate)
{
    gregorianDate = DateTime.MinValue;

    if (string.IsNullOrWhiteSpace(ethiopianDate))
        return false;

    try
    {
        var parts = ethiopianDate.Split(',');
        if (parts.Length != 2) return false;

        var monthDay = parts[0].Trim();
        var yearStr = parts[1].Trim();

        if (!int.TryParse(yearStr, out int year)) return false;

        var monthDayParts = monthDay.Split(' ');
        if (monthDayParts.Length < 2) return false;

        string amharicMonth = monthDayParts[0];
        if (!int.TryParse(monthDayParts[1], out int day)) return false;

        var monthMap = new Dictionary<string, int>
        {
            ["መስከረም"] = 1,
            ["ጥቅምት"] = 2,
            ["ህዳር"] = 3,
            ["ታህሳስ"] = 4,
            ["ጥር"] = 5,
            ["የካቲት"] = 6,
            ["መጋቢት"] = 7,
            ["ሚያዝያ"] = 8,
            ["ግንቦት"] = 9,
            ["ሰኔ"] = 10,
            ["ሐምሌ"] = 11,
            ["ነሐሴ"] = 12,
            ["ጳጉሜ"] = 13
        };

        if (!monthMap.TryGetValue(amharicMonth, out int month)) return false;

        bool isGregorianLeapYear = DateTime.IsLeapYear(year + 7);
        int newYearDay = isGregorianLeapYear ? 12 : 11;
        DateTime ethiopianNewYear = new DateTime(year + 7, 9, newYearDay);

        int daysSinceStart = (month - 1) * 30 + (day - 1);

        bool isEthiopianLeapYear = (year + 1) % 4 == 0;
        if (month == 13)
        {
            int pagumeDays = isEthiopianLeapYear ? 6 : 5;
            if (day > pagumeDays) return false;
            daysSinceStart = 360 + (day - 1);
        }

        gregorianDate = ethiopianNewYear.AddDays(daysSinceStart);
        return true;
    }
    catch
    {
        return false;
    }
}

        // GET: api/Model1/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Model1Dto>> GetModel1(int id)
        {
            var model = await _context.Model1
                .Include(m => m.Accessories)
                    .ThenInclude(a => a.SubAccessories)
                .Include(m => m.ExtraItems)  // Include ExtraItems
                .FirstOrDefaultAsync(m => m.Model1Id == id);

            if (model == null)
                return NotFound();


            var dto = new Model1Dto
            {
                Model1Id = model.Model1Id,
                Supplier = model.Supplier,
                Category = model.Category,
                PRNO = model.PRNO,
                Date = model.Date,
                InvoiceNo = model.InvoiceNo,
                ItemType = model.ItemType,
                ContactNumber = model.ContactNumber,
                Number = model.Number,
                RegisteredBy = model.RegisteredBy,
                SerialNumber = model.SerialNumber,
                Description = model.Description,
                UnitOfMeasurment = model.UnitOfMeasurment,
                Ordered = model.Ordered,
                Received = model.Received,
                UnitOfPrice = model.UnitOfPrice,
                Amount = model.Amount,
                Currency = model.Currency,
                Location = model.Location,
                Remark = model.Remark,
                CheckedByName = model.CheckedByName,
                CTitle = model.CTitle,
                RecivedByName = model.RecivedByName,
                RTitle = model.RTitle,
                AuthorizedByName = model.AuthorizedByName,
                ATitle = model.ATitle,
                Model19Ref = model.Model19Ref,
                Status = model.Status,
                StoreType = model.StoreType,
                HasAccessories = model.HasAccessories,
                Accessories = model.Accessories?.Select(a => new AccessoryDto
                {
                    Id = a.Id,
                    Name = a.Name,
                    Quantity = a.Quantity,
                    Model1Id = a.Model1Id,
                    UnitPrice = a.UnitPrice,
                    Currency = a.Currency,
                    SubAccessories = a.SubAccessories?.Select(sa => new SubAccessoryDto
                    {
                        Id = sa.Id,
                        Name = sa.Name,
                        Quantity = sa.Quantity,
                        UnitPrice = sa.UnitPrice,
                        Currency = sa.Currency
                    }).ToList() ?? new List<SubAccessoryDto>()
                }).ToList(),
                ExtraItems = model.ExtraItems?.Select(e => new ExtraItemDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    Quantity = e.Quantity,
                    Store = e.Store,
                    ExtraStatus = e.ExtraStatus,
                    ExtraRecivedByName = e.ExtraRecivedByName,
                    Model1Id = e.Model1Id
                }).ToList(),
                Vat = model.Vat,
                GrandTotal = model.GrandTotal
            };

            return Ok(dto);
        }

        // POST: api/Model1
        [HttpPost]
public async Task<ActionResult<Model1Dto>> PostModel1(Model1Dto dto)
{
    var currentDate = DateTime.UtcNow.AddHours(3); // Adjust to EAT (UTC+3)
    var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
        ?? throw new InvalidOperationException("Ethiopian date conversion failed");

    var model1 = new Model1
    {
        Supplier = dto.Supplier,
        Category = dto.Category,
        PRNO = dto.PRNO,
        Date = ethiopianDate,
        InvoiceNo = dto.InvoiceNo,
        ItemType = dto.ItemType,
        ContactNumber = dto.ContactNumber,
        Number = dto.Number,
        RegisteredBy = dto.RegisteredBy,
        SerialNumber = dto.SerialNumber,
        Description = dto.Description,
        UnitOfMeasurment = dto.UnitOfMeasurment,
        Ordered = dto.Ordered,
        Received = dto.Received,
        UnitOfPrice = dto.UnitOfPrice,
        Amount = dto.Amount,
        Currency = dto.Currency,
        Location = dto.Location,
        Remark = dto.Remark,
        CheckedByName = dto.CheckedByName,
        CTitle = dto.CTitle,
        RecivedByName = dto.RecivedByName,
        RTitle = dto.RTitle,
        AuthorizedByName = dto.AuthorizedByName,
        ATitle = dto.ATitle,
        Model19Ref = dto.Model19Ref,
        Status = dto.Status,
        StoreType = dto.StoreType,
        HasAccessories = dto.HasAccessories,
        Accessories = dto.Accessories?.Select(a => new Accessories
        {
            Name = a.Name,
            Quantity = a.Quantity,
            UnitPrice = a.UnitPrice,
            Currency = a.Currency,
            SubAccessories = a.SubAccessories?.Select(sa => new Model1AccessorySubAccessory
            {
                Name = sa.Name,
                Quantity = sa.Quantity,
                UnitPrice = sa.UnitPrice,
                Currency = sa.Currency
            }).ToList() ?? new List<Model1AccessorySubAccessory>()
        }).ToList(),
        ExtraItems = dto.ExtraItems?.Select(e => new ExtraItem
        {
            Name = e.Name,
            Quantity = e.Quantity,
            Store = e.Store,
            ExtraStatus = e.ExtraStatus,
            ExtraRecivedByName = e.ExtraRecivedByName
        }).ToList(),
        Vat = dto.Vat,
        GrandTotal = dto.GrandTotal
    };

    _context.Model1.Add(model1);
    await _context.SaveChangesAsync();

    dto.Model1Id = model1.Model1Id;
    dto.Date = ethiopianDate;

    return CreatedAtAction(nameof(GetModel1), new { id = model1.Model1Id }, dto);
}

        // PUT: api/Model1/5
        [HttpPut("{id}")]
public async Task<IActionResult> PutModel1(int id, Model1Dto updatedModel)
{
    if (id != updatedModel.Model1Id)
        return BadRequest();

    var existingModel = await _context.Model1
        .Include(m => m.Accessories)
        .Include(m => m.ExtraItems)
        .FirstOrDefaultAsync(m => m.Model1Id == id);

    if (existingModel == null)
        return NotFound();

    var currentDate = DateTime.UtcNow.AddHours(3); // Adjust to EAT (UTC+3)
    var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
        ?? throw new InvalidOperationException("Ethiopian date conversion failed");

    _context.Entry(existingModel).CurrentValues.SetValues(updatedModel);
    existingModel.Date = ethiopianDate;

    existingModel.Accessories.Clear();
    if (updatedModel.Accessories != null)
    {
        foreach (var accessoryDto in updatedModel.Accessories)
        {
            var accessory = new Accessories
            {
                Name = accessoryDto.Name,
                Quantity = accessoryDto.Quantity,
                UnitPrice = accessoryDto.UnitPrice,
                Currency = accessoryDto.Currency
            };
            
            if (accessoryDto.SubAccessories != null && accessoryDto.SubAccessories.Any())
            {
                accessory.SubAccessories = accessoryDto.SubAccessories.Select(sa => new Model1AccessorySubAccessory
                {
                    Name = sa.Name,
                    Quantity = sa.Quantity,
                    UnitPrice = sa.UnitPrice,
                    Currency = sa.Currency
                }).ToList();
            }
            
            existingModel.Accessories.Add(accessory);
        }
    }

    existingModel.ExtraItems.Clear();
    if (updatedModel.ExtraItems != null)
    {
        foreach (var extraItemDto in updatedModel.ExtraItems)
        {
            existingModel.ExtraItems.Add(new ExtraItem
            {
                Name = extraItemDto.Name,
                Quantity = extraItemDto.Quantity,
                Store = extraItemDto.Store,
                ExtraStatus = extraItemDto.ExtraStatus,
                ExtraRecivedByName = extraItemDto.ExtraRecivedByName
            });
        }
    }

    try
    {
        await _context.SaveChangesAsync();
    }
    catch (DbUpdateConcurrencyException)
    {
        if (!Model1Exists(id))
            return NotFound();
        else
            throw;
    }

    return NoContent();
}

        // DELETE: api/Model1/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteModel1(int id)
        {
            var model1 = await _context.Model1
                .Include(m => m.Accessories)
                .Include(m => m.ExtraItems)  // Include ExtraItems when deleting
                .FirstOrDefaultAsync(m => m.Model1Id == id);

            if (model1 == null)
                return NotFound();

            _context.Model1.Remove(model1);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool Model1Exists(int id)
        {
            return _context.Model1.Any(e => e.Model1Id == id);
        }
    }
}