using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RiskAnalysis.API.Data;
using System.Linq;
using System.Threading.Tasks;

namespace RiskAnalysis.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AssetsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AssetsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/assets
        [HttpGet]
        public async Task<IActionResult> GetAssets()
        {
            var latestScores = await _context.RiskScores
                .GroupBy(r => r.Ticker)
                .Select(g => g.OrderByDescending(r => r.ScoreDate).FirstOrDefault())
                .ToListAsync();

            return Ok(latestScores);
        }

        // GET /api/assets/{ticker}/risk
        [HttpGet("{ticker}/risk")]
        public async Task<IActionResult> GetAssetRisk(string ticker)
        {
            var riskHistory = await _context.RiskScores
                .Where(r => r.Ticker.ToUpper() == ticker.ToUpper())
                .OrderBy(r => r.ScoreDate)
                .ToListAsync();

            if (riskHistory == null || !riskHistory.Any())
            {
                return NotFound(new { message = $"No risk data found for ticker: {ticker}" });
            }

            var currentClassification = riskHistory.LastOrDefault();

            return Ok(new
            {
                ticker = ticker.ToUpper(),
                current_classification = currentClassification,
                history = riskHistory
            });
        }
    }
}
