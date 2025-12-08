using Microsoft.AspNetCore.Mvc;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.DTO;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class ShelvesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ShelvesController(ApplicationDbContext context)
        {
            _context = context;
        }

        private ShelfDto MapToDto(Shelf shelf)
    {
        return new ShelfDto
        {
            ShelfId = shelf.ShelfId,
            Name = shelf.Name,
            Column = shelf.Column,
            Row = shelf.Row,
            WarehouseId = shelf.WarehouseId
        };
    }


        // GET: api/shelves
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<ShelfDto>>> GetShelves()
        {
            var shelves = await _context.Shelves
                .Include(s => s.Warehouse)
                .ToListAsync();
            return Ok(shelves.Select(MapToDto).ToList());
        }

        // GET: api/shelves/{id}
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<ShelfDto>> GetShelf(int id)
        {
            var shelf = await _context.Shelves
                .Include(s => s.Warehouse)
                .FirstOrDefaultAsync(s => s.ShelfId == id);

            if (shelf == null)
            {
                return NotFound();
            }

            return Ok(MapToDto(shelf));
        }

        // POST: api/shelves
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult<ShelfDto>> CreateShelf([FromBody] ShelfDto shelfDto)
        {
            if (shelfDto == null || !ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid shelf data.", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
            }

            // Validate required fields
            if (string.IsNullOrEmpty(shelfDto.Name) || string.IsNullOrEmpty(shelfDto.Column) || string.IsNullOrEmpty(shelfDto.Row) || string.IsNullOrEmpty(shelfDto.WarehouseId))
            {
                return BadRequest(new { message = "All fields (Name, Column, Row, WarehouseId) are required." });
            }

            // Check if WarehouseId exists
            if (!await _context.Warehouses.AnyAsync(w => w.WarehouseId == shelfDto.WarehouseId))
            {
                return BadRequest(new { message = $"Warehouse with ID '{shelfDto.WarehouseId}' does not exist." });
            }

            // ShelfId is auto-incremented, so ignore shelfDto.ShelfId
            var shelf = new Shelf
            {
                Name = shelfDto.Name,
                Column = shelfDto.Column,
                Row = shelfDto.Row,
                WarehouseId = shelfDto.WarehouseId
            };

            try
            {
                _context.Shelves.Add(shelf);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetShelf), new { id = shelf.ShelfId }, MapToDto(shelf));
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = "Failed to save shelf.", error = ex.InnerException?.Message ?? ex.Message });
            }
        }

        // PUT: api/shelves/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateShelf(int id, [FromBody] ShelfDto shelfDto)
        {
            if (id != shelfDto.ShelfId)
            {
                return BadRequest(new { message = "Mismatch between ID in URL and shelf ID." });
            }

            var existingShelf = await _context.Shelves.FindAsync(id);
            if (existingShelf == null)
            {
                return NotFound();
            }

            // Validate WarehouseId
            if (!await _context.Warehouses.AnyAsync(w => w.WarehouseId == shelfDto.WarehouseId))
            {
                return BadRequest(new { message = $"Warehouse with ID '{shelfDto.WarehouseId}' does not exist." });
            }

            existingShelf.Name = shelfDto.Name;
            existingShelf.Column = shelfDto.Column;
            existingShelf.Row = shelfDto.Row;
            existingShelf.WarehouseId = shelfDto.WarehouseId;

            try
            {
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = "Failed to update shelf.", error = ex.InnerException?.Message ?? ex.Message });
            }
        }

        // DELETE: api/shelves/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteShelf(int id)
        {
            var shelf = await _context.Shelves.FindAsync(id);
            if (shelf == null)
            {
                return NotFound();
            }

            _context.Shelves.Remove(shelf);
            await _context.SaveChangesAsync();

            return NoContent();
        }


        // In ShelvesController.cs

// GET: api/shelves/by-warehouse/{warehouseId}
    [HttpGet("by-warehouse/{warehouseId}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ShelfDto>>> GetShelvesByWarehouse(string warehouseId)
    {
        var shelves = await _context.Shelves
            .Where(s => s.WarehouseId == warehouseId)
            .ToListAsync();

        if (!shelves.Any())
        {
            return NotFound(new { message = $"No shelves found for warehouse ID '{warehouseId}'." });
        }

        return Ok(shelves.Select(MapToDto).ToList());
    }
    }
}