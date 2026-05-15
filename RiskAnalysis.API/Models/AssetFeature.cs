using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RiskAnalysis.API.Models
{
    [Table("asset_features")]
    public class AssetFeature
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("ticker")]
        public string Ticker { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("daily_return", TypeName = "decimal(18, 8)")]
        public decimal DailyReturn { get; set; }

        [Column("volatility_Nd", TypeName = "decimal(18, 8)")]
        public decimal VolatilityNd { get; set; }

        [Column("trend_slope", TypeName = "decimal(18, 8)")]
        public decimal TrendSlope { get; set; }
    }
}
