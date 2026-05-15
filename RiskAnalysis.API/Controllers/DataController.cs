using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace RiskAnalysis.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DataController : ControllerBase
    {
        // POST /api/data/refresh
        // [Authorize(Roles = "admin")]
        [HttpPost("refresh")]
        public IActionResult RefreshData()
        {
            // Trigger the python scripts
            // For now, return a success message placeholder
            return Ok(new { status = "success", message = "Data refresh and ML re-scoring pipeline triggered successfully." });
        }
    }
}
