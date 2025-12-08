using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Data;
using Gofabackend.Models;
using Gofabackend.Utilities;
using System;
using System.Threading.Tasks;
using Serilog;
using Microsoft.AspNetCore.Authorization;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous] // Temporarily allow anonymous — consider securing later
    public class CategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CategoriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/categories?role=VHF
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetCategories([FromQuery] string? role)
        {
            var query = _context.Categories.AsQueryable();

            // Filter by role if provided and not SUPER_ADMIN
            if (!string.IsNullOrEmpty(role) && role != "SUPER_ADMIN")
            {
                query = query.Where(c => c.Role == role);
            }

            var categories = await query.ToListAsync();
            return Ok(categories);
        }

        // GET: api/categories/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Category>> GetCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { success = false, message = "Category not found." });
            }
            return Ok(category);
        }

        // POST: api/categories
        [HttpPost]
public async Task<IActionResult> CreateCategory([FromBody] CategoryRequest request)
{
    if (!ModelState.IsValid)
    {
        return BadRequest(new { success = false, message = "Invalid request." });
    }

    var existingCategory = await _context.Categories
        .FirstOrDefaultAsync(c => c.Name == request.Name);
    if (existingCategory != null)
    {
        return BadRequest(new { success = false, message = $"Category '{request.Name}' already exists." });
    }

    var currentDate = DateTime.UtcNow.AddHours(3); // EAT
    var ethiopianDate = EthiopianCalendarConverter.ToEthiopianString(currentDate);

    // 👇 Use request.Role if provided, otherwise fallback
    var categoryRole = !string.IsNullOrWhiteSpace(request.Role) ? request.Role : "Unknown";

    var category = new Category
    {
        Name = request.Name,
        Description = request.Description,
        CreatedBy = "Anonymous", // You may also want to set this to username later
        CreatedAt = ethiopianDate,
        Role = categoryRole // 👈 Use role from frontend
    };

    _context.Categories.Add(category);
    await _context.SaveChangesAsync();

    return Ok(new { success = true, message = "Category created successfully.", data = category });
}

        // PUT: api/categories/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] CategoryRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid request." });
            }

            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { success = false, message = "Category not found." });
            }

            var existingCategory = await _context.Categories
                .FirstOrDefaultAsync(c => c.Name == request.Name && c.Id != id);
            if (existingCategory != null)
            {
                return BadRequest(new { success = false, message = $"Category '{request.Name}' already exists." });
            }

            category.Name = request.Name;
            category.Description = request.Description;
            // Optionally update CreatedAt or Role if needed

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Category updated successfully." });
        }

        // DELETE: api/categories/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { success = false, message = "Category not found." });
            }

            var itemsUsingCategory = await _context.Items.AnyAsync(i => i.Category == category.Name);
            if (itemsUsingCategory)
            {
                return BadRequest(new { success = false, message = "Cannot delete category; it is in use by items." });
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Category deleted successfully." });
        }
    }
}