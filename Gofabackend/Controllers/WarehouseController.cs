using Microsoft.AspNetCore.Mvc;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.DTO;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace Gofabackend.Controller
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class WarehousesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WarehousesController(ApplicationDbContext context)
        {
            _context = context;
        }

        private WarehouseDto MapToDto(Warehouse warehouse)
        {
            return new WarehouseDto
            {
                WarehouseId = warehouse.WarehouseId,
                Name = warehouse.Name,
                Location = warehouse.Location
            };
        }

        // GET: api/warehouses
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<WarehouseDto>>> GetWarehouses()
        {
            var warehouses = await _context.Warehouses.ToListAsync();
            return Ok(warehouses.Select(MapToDto).ToList());
        }

        // GET: api/warehouses/{id}
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<WarehouseDto>> GetWarehouse(string id)
        {
            var warehouse = await _context.Warehouses.FindAsync(id);

            if (warehouse == null)
            {
                return NotFound();
            }

            return Ok(MapToDto(warehouse));
        }

        // POST: api/warehouses
        [HttpPost]
        [AllowAnonymous]
        public async Task<ActionResult<WarehouseDto>> CreateWarehouse([FromBody] WarehouseDto warehouseDto)
        {
            if (warehouseDto == null || !ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid warehouse data.", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
            }

            if (string.IsNullOrEmpty(warehouseDto.WarehouseId) || string.IsNullOrEmpty(warehouseDto.Name) || string.IsNullOrEmpty(warehouseDto.Location))
            {
                return BadRequest(new { message = "All fields (WarehouseId, Name, Location) are required." });
            }

            if (await _context.Warehouses.AnyAsync(w => w.WarehouseId == warehouseDto.WarehouseId))
            {
                return BadRequest(new { message = $"Warehouse with ID '{warehouseDto.WarehouseId}' already exists." });
            }

            try
            {
                var warehouse = new Warehouse
                {
                    WarehouseId = warehouseDto.WarehouseId,
                    Name = warehouseDto.Name,
                    Location = warehouseDto.Location
                };

                _context.Warehouses.Add(warehouse);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetWarehouse), new { id = warehouse.WarehouseId }, MapToDto(warehouse));
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = "Failed to save warehouse.", error = ex.InnerException?.Message ?? ex.Message });
            }
        }

        // PUT: api/warehouses/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateWarehouse(string id, [FromBody] WarehouseDto updatedWarehouseDto)
        {
            if (id != updatedWarehouseDto.WarehouseId) // Compare strings directly
            {
                return BadRequest(new { message = "Mismatch between ID in URL and warehouse ID." });
            }

            var existingWarehouse = await _context.Warehouses.FindAsync(id);

            if (existingWarehouse == null)
            {
                return NotFound();
            }

            existingWarehouse.Name = updatedWarehouseDto.Name;
            existingWarehouse.Location = updatedWarehouseDto.Location;

            try
            {
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = "Failed to update warehouse.", error = ex.InnerException?.Message ?? ex.Message });
            }
        }

        // DELETE: api/warehouses/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWarehouse(string id)
        {
            var warehouse = await _context.Warehouses.FindAsync(id);

            if (warehouse == null)
            {
                return NotFound();
            }

            _context.Warehouses.Remove(warehouse);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}