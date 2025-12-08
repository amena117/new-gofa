using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EquipmentTypesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        // Constructor for dependency injection
        public EquipmentTypesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/EquipmentTypes
        // Retrieve all equipment types
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EquipmentType>>> GetEquipmentTypes()
        {
            return await _context.EquipmentTypes.ToListAsync();
        }

        // GET: api/EquipmentTypes/5
        // Retrieve a specific equipment type by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<EquipmentType>> GetEquipmentType(int id)
        {
            var equipmentType = await _context.EquipmentTypes.FindAsync(id);

            if (equipmentType == null)
            {
                return NotFound();
            }

            return equipmentType;
        }

        // POST: api/EquipmentTypes
        // Create a new equipment type
        [HttpPost]
        public async Task<ActionResult<EquipmentType>> PostEquipmentType(EquipmentType equipmentType)
        {
            _context.EquipmentTypes.Add(equipmentType);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEquipmentType), new { id = equipmentType.EquipmentTypeId }, equipmentType);
        }

        // PUT: api/EquipmentTypes/5
        // Update an existing equipment type
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEquipmentType(int id, EquipmentType equipmentType)
        {
            if (id != equipmentType.EquipmentTypeId)
            {
                return BadRequest();
            }

            _context.Entry(equipmentType).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EquipmentTypeExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/EquipmentTypes/5
        // Delete an equipment type
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEquipmentType(int id)
        {
            var equipmentType = await _context.EquipmentTypes.FindAsync(id);
            if (equipmentType == null)
            {
                return NotFound();
            }

            _context.EquipmentTypes.Remove(equipmentType);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Helper method to check if an equipment type exists
        private bool EquipmentTypeExists(int id)
        {
            return _context.EquipmentTypes.Any(e => e.EquipmentTypeId == id);
        }
    }
}