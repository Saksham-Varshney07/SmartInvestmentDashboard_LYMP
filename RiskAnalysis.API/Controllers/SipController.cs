using Microsoft.AspNetCore.Mvc;
using RiskAnalysis.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace RiskAnalysis.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SipController : ControllerBase
    {
        // GET /api/sip/suggest
        [HttpGet("suggest")]
        public IActionResult SuggestSip([FromQuery] decimal monthlyAmount, [FromQuery] int tenureMonths, [FromQuery] string riskTolerance)
        {
            var suggestions = new List<object>();

            if (riskTolerance?.ToLower() == "low")
            {
                suggestions.Add(new { asset_type = "Debt Funds / Bonds", allocation = 60m, amount = monthlyAmount * 0.6m });
                suggestions.Add(new { asset_type = "Large Cap Equity", allocation = 40m, amount = monthlyAmount * 0.4m });
            }
            else if (riskTolerance?.ToLower() == "high")
            {
                suggestions.Add(new { asset_type = "Small/Mid Cap Equity", allocation = 70m, amount = monthlyAmount * 0.7m });
                suggestions.Add(new { asset_type = "Large Cap Equity", allocation = 30m, amount = monthlyAmount * 0.3m });
            }
            else
            {
                // Medium / Default
                suggestions.Add(new { asset_type = "Index Funds", allocation = 50m, amount = monthlyAmount * 0.5m });
                suggestions.Add(new { asset_type = "Debt / Gold", allocation = 20m, amount = monthlyAmount * 0.2m });
                suggestions.Add(new { asset_type = "Flexi Cap Equity", allocation = 30m, amount = monthlyAmount * 0.3m });
            }

            return Ok(new
            {
                monthly_investment = monthlyAmount,
                tenure_months = tenureMonths,
                risk_tolerance = riskTolerance,
                allocations = suggestions
            });
        }
    }
}
