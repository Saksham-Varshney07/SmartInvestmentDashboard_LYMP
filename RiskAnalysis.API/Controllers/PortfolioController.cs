using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RiskAnalysis.API.Data;
using RiskAnalysis.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace RiskAnalysis.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PortfolioController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PortfolioController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/portfolio/{portfolioId}
        [HttpGet("{portfolioId}")]
        public async Task<IActionResult> GetPortfolio(int portfolioId)
        {
            var portfolio = await _context.Portfolios
                .Include(p => p.Assets)
                .FirstOrDefaultAsync(p => p.Id == portfolioId);

            if (portfolio == null)
            {
                return NotFound(new { message = $"Portfolio {portfolioId} not found." });
            }

            // Calculate aggregate risk score
            var aggregateScore = 0m;
            foreach (var asset in portfolio.Assets)
            {
                var latestScore = await _context.RiskScores
                    .Where(r => r.Ticker == asset.Ticker)
                    .OrderByDescending(r => r.ScoreDate)
                    .FirstOrDefaultAsync();

                if (latestScore != null)
                {
                    aggregateScore += latestScore.AnomalyScore * asset.Weight;
                }
            }

            return Ok(new
            {
                portfolio,
                aggregate_risk_score = aggregateScore,
                aggregate_risk_label = aggregateScore < -0.1m ? "High" : (aggregateScore <= 0.0m ? "Medium" : "Low")
            });
        }

        public class CreatePortfolioDto
        {
            public string PortfolioName { get; set; }
            public string UserId { get; set; }
            public List<PortfolioAssetDto> Assets { get; set; }
        }

        public class PortfolioAssetDto
        {
            public string Ticker { get; set; }
            public decimal Weight { get; set; }
        }

        // POST /api/portfolio
        [HttpPost]
        public async Task<IActionResult> CreatePortfolio([FromBody] CreatePortfolioDto dto)
        {
            if (dto.Assets == null || !dto.Assets.Any() || dto.Assets.Sum(a => a.Weight) != 1.0m)
            {
                return BadRequest("Invalid assets. Weights must sum to 1.0.");
            }

            var portfolio = new Portfolio
            {
                PortfolioName = dto.PortfolioName,
                UserId = dto.UserId,
                CreatedAt = DateTime.UtcNow,
                Assets = dto.Assets.Select(a => new PortfolioAsset
                {
                    Ticker = a.Ticker.ToUpper(),
                    Weight = a.Weight
                }).ToList()
            };

            _context.Portfolios.Add(portfolio);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPortfolio), new { portfolioId = portfolio.Id }, portfolio);
        }
    }
}
