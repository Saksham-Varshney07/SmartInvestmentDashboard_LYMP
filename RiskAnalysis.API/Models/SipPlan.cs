using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RiskAnalysis.API.Models
{
    [Table("sip_plans")]
    public class SipPlan
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; }

        [Column("monthly_amount", TypeName = "decimal(18, 8)")]
        public decimal MonthlyAmount { get; set; }

        [Column("tenure_months")]
        public int TenureMonths { get; set; }

        [Column("risk_tolerance")]
        public string RiskTolerance { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
