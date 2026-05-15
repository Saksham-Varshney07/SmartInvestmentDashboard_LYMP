using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RiskAnalysis.API.Models
{
    [Table("risk_scores")]
    public class RiskScore
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("ticker")]
        public string Ticker { get; set; }

        [Column("score_date")]
        public DateTime ScoreDate { get; set; }

        [Column("anomaly_score", TypeName = "decimal(18, 8)")]
        public decimal AnomalyScore { get; set; }

        [Column("risk_label")]
        public string RiskLabel { get; set; }

        [Column("stability_label")]
        public string StabilityLabel { get; set; }
    }
}
