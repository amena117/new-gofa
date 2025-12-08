using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.DTO;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SpecialToolRegisterController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SpecialToolRegisterController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/SpecialToolRegister
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SpecialToolRegister>>> GetSpecialToolRegisters()
        {
            return await _context.SpecialToolRegisters.ToListAsync();
        }

        // GET: api/SpecialToolRegister/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SpecialToolRegister>> GetSpecialToolRegister(int id)
        {
            var tool = await _context.SpecialToolRegisters.FindAsync(id);

            if (tool == null)
            {
                return NotFound($"Special Tool Register with ID {id} not found.");
            }

            return tool;
        }

        // POST: api/SpecialToolRegister
        [HttpPost]
        public async Task<ActionResult<SpecialToolRegister>> CreateSpecialToolRegister(SpecialToolRegister tool)
        {
            _context.SpecialToolRegisters.Add(tool);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSpecialToolRegister), new { id = tool.Id }, tool);
        }

        // PUT: api/SpecialToolRegister/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSpecialToolRegister(int id, SpecialToolRegister updatedTool)
        {
            if (id != updatedTool.Id)
            {
                return BadRequest("ID mismatch.");
            }

            var existingTool = await _context.SpecialToolRegisters.FindAsync(id);
            if (existingTool == null)
            {
                return NotFound($"Special Tool Register with ID {id} not found.");
            }

            // Update properties
            existingTool.ToolName = updatedTool.ToolName;
            existingTool.RecievedBy = updatedTool.RecievedBy;
            existingTool.Quantity = updatedTool.Quantity;
            existingTool.Description = updatedTool.Description;
            existingTool.RecievedDate = updatedTool.RecievedDate;
            existingTool.GivenBy = updatedTool.GivenBy;
            existingTool.ReturnDate = updatedTool.ReturnDate;
            existingTool.ReturnedDate = updatedTool.ReturnedDate;
            existingTool.Remarks = updatedTool.Remarks;

            _context.Entry(existingTool).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{id}/returnedDate")]
public async Task<IActionResult> UpdateReturnedDate(int id, UpdateReturnedDateDto dto)
{
    var existingTool = await _context.SpecialToolRegisters.FindAsync(id);
    if (existingTool == null)
    {
        return NotFound($"Special Tool Register with ID {id} not found.");
    }

    existingTool.ReturnedDate = dto.ReturnedDate;

    await _context.SaveChangesAsync();

    return NoContent();
}


        // DELETE: api/SpecialToolRegister/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSpecialToolRegister(int id)
        {
            var tool = await _context.SpecialToolRegisters.FindAsync(id);
            if (tool == null)
            {
                return NotFound($"Special Tool Register with ID {id} not found.");
            }

            _context.SpecialToolRegisters.Remove(tool);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Special Tool Register deleted successfully." });
        }
    }
}