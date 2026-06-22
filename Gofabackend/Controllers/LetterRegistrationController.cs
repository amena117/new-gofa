using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gofabackend.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Gofabackend.Data;

namespace Gofabackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LetterRegistrationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LetterRegistrationController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/LetterRegistration
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LetterRegistration>>> GetLetters()
        {
            return await _context.Letters.ToListAsync();
        }

        // ✅ NEW: GET only letters where Status = "initial" or "Initial" (not yet approved)
        [HttpGet("initial")]
        public async Task<ActionResult<IEnumerable<LetterRegistration>>> GetInitialLetters()
        {
            var initialLetters = await _context.Letters
                .Where(l => l.Status.ToLower() == "initial")
                .ToListAsync();

            return Ok(initialLetters);
        }

        // GET: api/LetterRegistration/5
        [HttpGet("{id}")]
        public async Task<ActionResult<LetterRegistration>> GetLetter(int id)
        {
            var letter = await _context.Letters.FindAsync(id);

            if (letter == null)
                return NotFound();

            return letter;
        }

        // POST: api/LetterRegistration
        [HttpPost]
        public async Task<ActionResult<LetterRegistration>> PostLetter(LetterRegistration letter)
        {
            letter.Status = "initial"; // ✅ Ensure new letters start with "initial"
            _context.Letters.Add(letter);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetLetter), new { id = letter.LetterId }, letter);
        }

        // PUT: api/LetterRegistration/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutLetter(int id, LetterRegistration letter)
        {
            if (id != letter.LetterId)
                return BadRequest();

            _context.Entry(letter).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!LetterExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent();
        }

        // DELETE: api/LetterRegistration/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLetter(int id)
        {
            var letter = await _context.Letters.FindAsync(id);
            if (letter == null)
                return NotFound();

            _context.Letters.Remove(letter);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/LetterRegistration/seed-test
        [HttpPost("seed-test")]
        public async Task<IActionResult> SeedTestLetters()
        {
            var testLetters = new List<LetterRegistration>();
            for (int i = 1; i <= 10; i++)
            {
                testLetters.Add(new LetterRegistration
                {
                    From = $"Test Sender {i}",
                    RecommendBy = $"Test Reason for letter #{i} - Bulk generated for testing.",
                    Status = "initial"
                });
            }

            _context.Letters.AddRange(testLetters);
            await _context.SaveChangesAsync();

            return Ok(new { message = "10 test letters created successfully!", count = testLetters.Count });
        }

        private bool LetterExists(int id)
        {
            return _context.Letters.Any(e => e.LetterId == id);
        }
    }
}