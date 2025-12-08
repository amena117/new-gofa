using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.Utilities;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Model2Controller : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public Model2Controller(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Model2
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Model2Dto>>> GetAll()
        {
            var model2s = await _context.Model2s
                .Include(m => m.Accessories)
                .Include(m => m.ExtraItems)
                .ToListAsync();

            var model2Dtos = model2s.Select(m => MapToDto(m)).ToList();
            return Ok(model2Dtos);
        }

        // GET: api/Model2/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Model2Dto>> GetById(int id)
        {
            var model2 = await _context.Model2s
                .Include(m => m.Accessories)
                .Include(m => m.ExtraItems)
                .FirstOrDefaultAsync(m => m.Model2Id == id);

            if (model2 == null)
            {
                return NotFound(new { message = "Record not found" });
            }

            return Ok(MapToDto(model2));
        }

        // POST: api/Model2
        [HttpPost]
        public async Task<ActionResult<List<Model2Dto>>> Create([FromBody] List<Model2Dto> model2Dtos)
        {
            if (model2Dtos == null || !model2Dtos.Any())
            {
                return BadRequest(new { message = "Invalid data" });
            }

            var responseDtos = new List<Model2Dto>();
            var currentDate = DateTime.UtcNow.AddHours(3); // Adjust to EAT (UTC+3)
            var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
                ?? throw new InvalidOperationException("Ethiopian date conversion failed");

            foreach (var model2Dto in model2Dtos)
            {
                if (string.IsNullOrEmpty(model2Dto.Date))
                {
                    return BadRequest(new { message = "Date is required" });
                }

                // Validate required fields
                if (string.IsNullOrEmpty(model2Dto.StockNumber) ||
                    string.IsNullOrEmpty(model2Dto.Description) ||
                    string.IsNullOrEmpty(model2Dto.UnitOfMeasurment) ||
                    string.IsNullOrEmpty(model2Dto.Currency))
                {
                    return BadRequest(new { message = "StockNumber, Description, UnitOfMeasurment, and Currency are required" });
                }

                var model2 = MapToEntity(model2Dto);
                model2.Date = ethiopianDate; // Override with server-generated date

                _context.Model2s.Add(model2);
                await _context.SaveChangesAsync();

                responseDtos.Add(MapToDto(model2));
            }

            return CreatedAtAction(nameof(GetAll), responseDtos);
        }

        // PUT: api/Model2/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Model2Dto model2Dto)
        {
            if (model2Dto == null || id != model2Dto.Id)
            {
                return BadRequest(new { message = "ID mismatch or invalid data" });
            }

            var existingModel2 = await _context.Model2s
                .Include(m => m.Accessories)
                .Include(m => m.ExtraItems)
                .FirstOrDefaultAsync(m => m.Model2Id == id);

            if (existingModel2 == null)
            {
                return NotFound(new { message = "Record not found" });
            }

            // Update entity with DTO values
            UpdateEntityFromDto(existingModel2, model2Dto);

            // Update Ethiopian date
            var currentDate = DateTime.UtcNow.AddHours(3); // Adjust to EAT (UTC+3)
            var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate)
                ?? throw new InvalidOperationException("Ethiopian date conversion failed");
            existingModel2.Date = ethiopianDate;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!Model2Exists(id))
                {
                    return NotFound(new { message = "Record not found" });
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/Model2/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var model2 = await _context.Model2s.FindAsync(id);
            if (model2 == null)
            {
                return NotFound(new { message = "Record not found" });
            }

            _context.Model2s.Remove(model2);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool Model2Exists(int id)
        {
            return _context.Model2s.Any(e => e.Model2Id == id);
        }

        private Model2Dto MapToDto(Model2 model2)
        {
            return new Model2Dto
            {
                Id = model2.Model2Id,
                Date = model2.Date,
                IssueVocNo = model2.IssueVocNo,
                VoucherNumber = model2.VoucherNumber,
                TransType = model2.TransType,
                RequestingUnit = model2.RequestingUnit,
                IssuingStore = model2.IssuingStore,
                Model = model2.Model,
                RegisteredBy = model2.RegisteredBy,
                Status = model2.Status,
                Category = model2.Category,
                StockNumber = model2.StockNumber,
                Description = model2.Description,
                UnitOfMeasurment = model2.UnitOfMeasurment,
                OnHand = model2.OnHand,
                Request = model2.Request,
                Issued = model2.Issued,
                DO = model2.DO,
                UnitPrice = model2.UnitPrice,
                TotalPrice = model2.TotalPrice,
                Currency = model2.Currency,
                PreparedBy = model2.PreparedBy,
                pTitle = model2.pTitle,
                CheckedBy = model2.CheckedBy,
                cTitle = model2.cTitle,
                ApprovedBy = model2.ApprovedBy,
                aTitle = model2.aTitle,
                IssuedTurnBy = model2.IssuedTurnBy,
                iTitle = model2.iTitle,
                IssBy = model2.IssBy,
                isTitle = model2.isTitle,
                ReceivedBy = model2.ReceivedBy,
                rTitle = model2.rTitle,
                HasAccessories = model2.HasAccessories,
                Accessories = model2.Accessories?.Select(a => new M2AccessoryDto
                {
                    Name = a.Name,
                    Quantity = a.Quantity
                }).ToList() ?? new List<M2AccessoryDto>(),
                HasExtraItems = model2.HasExtraItems,
                ExtraItems = model2.ExtraItems?.Select(e => new M2ExtraItemDto
                {
                    Name = e.Name,
                    Quantity = e.Quantity,
                    Store = e.Store,
                    ExtraStatus = e.ExtraStatus,
                    ExtraIssuedByName = e.ExtraIssuedByName
                }).ToList() ?? new List<M2ExtraItemDto>()
            };
        }

        private Model2 MapToEntity(Model2Dto model2Dto)
        {
            var model2 = new Model2
            {
                Model2Id = model2Dto.Id,
                Date = model2Dto.Date,
                IssueVocNo = model2Dto.IssueVocNo,
                VoucherNumber = model2Dto.VoucherNumber,
                TransType = model2Dto.TransType,
                RequestingUnit = model2Dto.RequestingUnit,
                IssuingStore = model2Dto.IssuingStore,
                Model = model2Dto.Model,
                RegisteredBy = model2Dto.RegisteredBy,
                Status = model2Dto.Status,
                Category = model2Dto.Category,
                StockNumber = model2Dto.StockNumber,
                Description = model2Dto.Description,
                UnitOfMeasurment = model2Dto.UnitOfMeasurment,
                OnHand = model2Dto.OnHand,
                Request = model2Dto.Request,
                Issued = model2Dto.Issued,
                DO = model2Dto.DO,
                UnitPrice = model2Dto.UnitPrice,
                TotalPrice = model2Dto.TotalPrice,
                Currency = model2Dto.Currency,
                PreparedBy = model2Dto.PreparedBy,
                pTitle = model2Dto.pTitle,
                CheckedBy = model2Dto.CheckedBy,
                cTitle = model2Dto.cTitle,
                ApprovedBy = model2Dto.ApprovedBy,
                aTitle = model2Dto.aTitle,
                IssuedTurnBy = model2Dto.IssuedTurnBy,
                iTitle = model2Dto.iTitle,
                IssBy = model2Dto.IssBy,
                isTitle = model2Dto.isTitle,
                ReceivedBy = model2Dto.ReceivedBy,
                rTitle = model2Dto.rTitle,
                HasAccessories = model2Dto.HasAccessories,
                Accessories = model2Dto.Accessories?.Select(a => new Model2Accessory
                {
                    Name = a.Name,
                    Quantity = a.Quantity
                }).ToList() ?? new List<Model2Accessory>(),
                HasExtraItems = model2Dto.HasExtraItems,
                ExtraItems = model2Dto.ExtraItems?.Select(e => new Model2ExtraItem
                {
                    Name = e.Name,
                    Quantity = e.Quantity,
                    Store = e.Store,
                    ExtraStatus = e.ExtraStatus,
                    ExtraIssuedByName = e.ExtraIssuedByName
                }).ToList() ?? new List<Model2ExtraItem>()
            };

            // Set foreign key relationships for Accessories and ExtraItems
            if (model2.Accessories != null)
            {
                foreach (var accessory in model2.Accessories)
                {
                    accessory.Model2 = model2; // EF Core will set Model2Id
                }
            }
            if (model2.ExtraItems != null)
            {
                foreach (var extraItem in model2.ExtraItems)
                {
                    extraItem.Model2 = model2; // EF Core will set Model2Id
                }
            }

            return model2;
        }

        private void UpdateEntityFromDto(Model2 entity, Model2Dto dto)
        {
            entity.Date = dto.Date;
            entity.IssueVocNo = dto.IssueVocNo;
            entity.VoucherNumber = dto.VoucherNumber;
            entity.TransType = dto.TransType;
            entity.RequestingUnit = dto.RequestingUnit;
            entity.IssuingStore = dto.IssuingStore;
            entity.Model = dto.Model;
            entity.RegisteredBy = dto.RegisteredBy;
            entity.Status = dto.Status;
            entity.Category = dto.Category;
            entity.StockNumber = dto.StockNumber;
            entity.Description = dto.Description;
            entity.UnitOfMeasurment = dto.UnitOfMeasurment;
            entity.OnHand = dto.OnHand;
            entity.Request = dto.Request;
            entity.Issued = dto.Issued;
            entity.DO = dto.DO;
            entity.UnitPrice = dto.UnitPrice;
            entity.TotalPrice = dto.TotalPrice;
            entity.Currency = dto.Currency;
            entity.PreparedBy = dto.PreparedBy;
            entity.pTitle = dto.pTitle;
            entity.CheckedBy = dto.CheckedBy;
            entity.cTitle = dto.cTitle;
            entity.ApprovedBy = dto.ApprovedBy;
            entity.aTitle = dto.aTitle;
            entity.IssuedTurnBy = dto.IssuedTurnBy;
            entity.iTitle = dto.iTitle;
            entity.IssBy = dto.IssBy;
            entity.isTitle = dto.isTitle;
            entity.ReceivedBy = dto.ReceivedBy;
            entity.rTitle = dto.rTitle;
            entity.HasAccessories = dto.HasAccessories;
            entity.HasExtraItems = dto.HasExtraItems;

            // Update Accessories
            entity.Accessories.Clear();
            if (dto.Accessories != null)
            {
                foreach (var accDto in dto.Accessories)
                {
                    var accessory = new Model2Accessory
                    {
                        Name = accDto.Name,
                        Quantity = accDto.Quantity,
                        Model2 = entity
                    };
                    entity.Accessories.Add(accessory);
                }
            }

            // Update ExtraItems
            entity.ExtraItems.Clear();
            if (dto.ExtraItems != null)
            {
                foreach (var extraDto in dto.ExtraItems)
                {
                    var extraItem = new Model2ExtraItem
                    {
                        Name = extraDto.Name,
                        Quantity = extraDto.Quantity,
                        Store = extraDto.Store,
                        ExtraStatus = extraDto.ExtraStatus,
                        ExtraIssuedByName = extraDto.ExtraIssuedByName,
                        Model2 = entity
                    };
                    entity.ExtraItems.Add(extraItem);
                }
            }
        }
    }
}