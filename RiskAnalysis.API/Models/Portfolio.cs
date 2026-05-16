using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RiskAnalysis.API.Models
{
    [Table("portfolio")]
    public class Portfolio
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("portfolio_name")]
        public string PortfolioName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("user_id")]
        public string UserId { get; set; }

        public ICollection<PortfolioAsset> Assets { get; set; }
    }
}
