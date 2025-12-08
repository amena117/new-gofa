using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Gofabackend.Models;
using Gofabackend.Data;
using Gofabackend.DTO;
using Microsoft.EntityFrameworkCore;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MiniStoreBinCardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MiniStoreBinCardController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/MiniStoreBinCard
        [HttpGet]
        public ActionResult<IEnumerable<MiniStoreBinCard>> GetAll()
        {
            return Ok(_context.MiniStoreBinCards.ToList());
        }

        // GET: api/MiniStoreBinCard/{id}
        [HttpGet("{id}")]
        public ActionResult<MiniStoreBinCard> GetById(int id)
        {
            var card = _context.MiniStoreBinCards.FirstOrDefault(m => m.Id == id);
            if (card == null) return NotFound($"MiniStoreBinCard with ID {id} not found.");
            return Ok(card);
        }

        // GET: api/MiniStoreBinCard/parts
        [HttpGet("parts")]
        public ActionResult<IEnumerable<object>> GetParts()
        {
            var parts = _context.MiniStoreBinCards.Select(m => new { m.StockNumber }).ToList();
            if (!parts.Any()) return NotFound("No parts found in MiniStoreBinCard.");
            return Ok(parts);
        }

        [HttpGet("check-stock/{stockNumber}")]
        public IActionResult CheckStock(string stockNumber)
        {
            var exists = _context.MiniStoreBinCards.Any(m => m.StockNumber == stockNumber);
            return Ok(new { exists });
        }

        [HttpGet("{stockNumber}/serials")]
        public ActionResult<IEnumerable<string>> GetSerialNumbersByStockNumber(string stockNumber, string status)
        {
            var serials = _context.MiniStoreBinCardSerialNumbers
                .Where(s => s.MiniStoreBinCard.StockNumber == stockNumber && s.Status == status)
                .Select(s => s.SerialNumber)
                .ToList();
            return Ok(serials);
        }

        [HttpGet("{id}/serial-numbers")]
        public ActionResult<IEnumerable<string>> GetSerialNumbers(int id)
        {
            var binCard = _context.MiniStoreBinCards
                                  .Include(b => b.SerialNumbers)
                                  .FirstOrDefault(b => b.Id == id);
            if (binCard == null) return NotFound();
            return Ok(binCard.SerialNumbers.Select(sn => sn.SerialNumber).ToList());
        }

        [HttpGet("all-stock-numbers")]
        public ActionResult<IEnumerable<string>> GetAllStockNumbers()
        {
            var stockNumbers = _context.MiniStoreBinCards.Select(m => m.StockNumber).Distinct().ToList();
            if (!stockNumbers.Any()) return NotFound("No stock numbers found.");
            return Ok(stockNumbers);
        }

        [HttpGet("{stockNumber}/serials-detailed")]
        public ActionResult<MiniStoreSerialDetailDto> GetDetailedSerials(string stockNumber)
        {
            var binCard = _context.MiniStoreBinCards
                .Include(b => b.SerialNumbers)
                .FirstOrDefault(b => b.StockNumber == stockNumber);

            if (binCard == null) return NotFound($"No record found for StockNumber {stockNumber}.");

            var dto = new MiniStoreSerialDetailDto
            {
                StockNumber = binCard.StockNumber,
                Model = binCard.Model,
                Serials = binCard.SerialNumbers.Select(sn => new SerialDetailDto
                {
                    SerialNumber = sn.SerialNumber,
                    InDate = sn.InDate ?? DateTime.MinValue,
                    Status = sn.Status
                }).ToList()
            };

            return Ok(dto);
        }

        [HttpPut("recieve-spare")]
        public ActionResult<MiniStoreBinCardResponseDto> RecieveSparePart([FromBody] RecieveSpareFormDto form)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Direct string comparison
            var miniStoreBinCard = _context.MiniStoreBinCards
                .FirstOrDefault(m => m.StockNumber == form.StockNumber);

            if (miniStoreBinCard == null)
                return NotFound($"No record found for StockNumber {form.StockNumber}.");
            if (form.SerialNumbers.Count != form.QuantityRecieved)
                return BadRequest("The number of serial numbers must match the quantity received.");

            miniStoreBinCard.Model = form.Model;
            miniStoreBinCard.Date = form.Date;
            miniStoreBinCard.RecievedFrom = form.RecievedFrom;
            miniStoreBinCard.QuantityRecieved = form.QuantityRecieved;
            miniStoreBinCard.Balance += form.QuantityRecieved;

            foreach (var serial in form.SerialNumbers)
            {
                _context.MiniStoreBinCardSerialNumbers.Add(new MiniStoreBinCardSerialNumber
                {
                    SerialNumber = serial.SerialNumber,
                    Status = serial.Status,
                    InDate = serial.InDate,
                    MiniStoreBinCardId = miniStoreBinCard.Id
                });
            }

            _context.SaveChanges();

            var response = new MiniStoreBinCardResponseDto
            {
                Id = miniStoreBinCard.Id,
                StockNumber = miniStoreBinCard.StockNumber,
                Description = miniStoreBinCard.Description,
                Model = miniStoreBinCard.Model,
                RecievedFrom = miniStoreBinCard.RecievedFrom,
                QuantityRecieved = miniStoreBinCard.QuantityRecieved ?? 0,
                Balance = miniStoreBinCard.Balance ?? 0,
                Date = miniStoreBinCard.Date.ToString("yyyy-MM-dd"),
                SerialNumbers = form.SerialNumbers.Select(s => s.SerialNumber).ToList()
            };

            return Ok(response);
        }


        [HttpPost]
        public ActionResult<MiniStoreBinCard> Create([FromBody] MiniStoreBinCard miniStoreBinCard)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (_context.MiniStoreBinCards.Any(m => m.StockNumber == miniStoreBinCard.StockNumber))
                return Conflict($"A record with StockNumber {miniStoreBinCard.StockNumber} already exists.");

            _context.MiniStoreBinCards.Add(miniStoreBinCard);
            _context.SaveChanges();

            return CreatedAtAction(nameof(GetById), new { id = miniStoreBinCard.Id }, miniStoreBinCard);
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] MiniStoreBinCard updatedMiniStoreBinCard)
        {
            var existing = _context.MiniStoreBinCards.FirstOrDefault(m => m.Id == id);
            if (existing == null) return NotFound($"MiniStoreBinCard with ID {id} not found.");

            if (_context.MiniStoreBinCards.Any(m => m.StockNumber == updatedMiniStoreBinCard.StockNumber && m.Id != id))
                return Conflict($"A record with StockNumber {updatedMiniStoreBinCard.StockNumber} already exists.");

            existing.StockNumber = updatedMiniStoreBinCard.StockNumber;
            existing.Description = updatedMiniStoreBinCard.Description;
            _context.SaveChanges();

            return NoContent();
        }

        // ... (other methods remain unchanged) ...

        [HttpPut("give-spare")]
        public ActionResult GiveSpareParts([FromBody] GiveSpareDto dto)
        {
            using var transaction = _context.Database.BeginTransaction();
            try
            {
                var binCard = _context.MiniStoreBinCards
                                      .Include(b => b.SerialNumbers)
                                      .FirstOrDefault(b => b.StockNumber == dto.StockNumber);

                if (binCard == null)
                    return NotFound($"No MiniStoreBinCard found with StockNumber {dto.StockNumber}.");

                var matchedSerials = binCard.SerialNumbers
                                            .Where(sn => dto.SerialNumbers.Contains(sn.SerialNumber))
                                            .ToList();

                if (matchedSerials.Count != dto.SerialNumbers.Count)
                    return BadRequest("One or more serial numbers were not found or do not belong to the stock number.");

                if (matchedSerials.Any(s => s.Status == "Given"))
                    return BadRequest("Some serial numbers were already marked as 'Given'.");

                int currentBalance = binCard.Balance ?? 0;

                if (currentBalance < matchedSerials.Count)
                    return BadRequest($"Insufficient stock. Trying to give {matchedSerials.Count}, but only {currentBalance} available.");

                // ✅ Only update status and balance here
                foreach (var serial in matchedSerials)
                {
                    serial.Status = "Given";
                    serial.OutDate = dto.DateGiven ?? DateTime.Now;
                }

                binCard.Balance = currentBalance;

                _context.SaveChanges();
                transaction.Commit();

                return Ok(new
                {
                    message = "Spare parts given successfully.",
                    newBalance = binCard.Balance,
                    serialsUpdated = matchedSerials.Select(s => s.SerialNumber)
                });
            }
            catch (Exception)
            {
                transaction.Rollback();
                return StatusCode(500, "An error occurred while processing the request.");
            }
        }





        [HttpGet("report")]
        public ActionResult<IEnumerable<object>> GetMiniStoreReport()
        {
            var report = _context.MiniStoreBinCards
                .Select(b => new
                {
                    b.Id,
                    b.StockNumber,
                    b.Balance,
                    SerialNumbers = b.SerialNumbers.Select(sn => new
                    {
                        sn.SerialNumber,
                        sn.Status,
                        sn.InDate,
                        sn.OutDate
                    }).ToList()
                })
                .ToList();

            return Ok(report);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            var card = _context.MiniStoreBinCards.FirstOrDefault(m => m.Id == id);
            if (card == null) return NotFound($"MiniStoreBinCard with ID {id} not found.");
            _context.MiniStoreBinCards.Remove(card);
            _context.SaveChanges();
            return NoContent();
        }
    }
}
