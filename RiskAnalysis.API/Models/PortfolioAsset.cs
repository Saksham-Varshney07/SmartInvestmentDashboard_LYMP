using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RiskAnalysis.API.Models
{
    [Table("portfolio_assets")]
    public class PortfolioAsset
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("portfolio_id")]
        public int PortfolioId { get; set; }

        [Required]
        [Column("ticker")]
        public string Ticker { get; set; }

        [Column("weight", TypeName = "decimal(18, 8)")]
        public decimal Weight { get; set; }

        [JsonIgnore]
        [ForeignKey("PortfolioId")]
        public Portfolio Portfolio { get; set; }
    }
}
