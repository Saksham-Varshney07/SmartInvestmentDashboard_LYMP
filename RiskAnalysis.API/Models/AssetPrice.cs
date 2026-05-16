using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RiskAnalysis.API.Models
{
    [Table("asset_prices")]
    public class AssetPrice
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("ticker")]
        public string Ticker { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("open", TypeName = "decimal(18, 8)")]
        public decimal Open { get; set; }

        [Column("high", TypeName = "decimal(18, 8)")]
        public decimal High { get; set; }

        [Column("low", TypeName = "decimal(18, 8)")]
        public decimal Low { get; set; }

        [Column("close", TypeName = "decimal(18, 8)")]
        public decimal Close { get; set; }

        [Column("volume")]
        public long Volume { get; set; }
    }
}
