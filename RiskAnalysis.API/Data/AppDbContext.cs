using Microsoft.EntityFrameworkCore;
using RiskAnalysis.API.Models;

namespace RiskAnalysis.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<AssetPrice> AssetPrices { get; set; }
        public DbSet<AssetFeature> AssetFeatures { get; set; }
        public DbSet<RiskScore> RiskScores { get; set; }
        public DbSet<Portfolio> Portfolios { get; set; }
        public DbSet<PortfolioAsset> PortfolioAssets { get; set; }
        public DbSet<SipPlan> SipPlans { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Composite Indexes based on requirements
            modelBuilder.Entity<AssetPrice>()
                .HasIndex(a => new { a.Ticker, a.Date });

            modelBuilder.Entity<AssetFeature>()
                .HasIndex(a => new { a.Ticker, a.Date });

            modelBuilder.Entity<RiskScore>()
                .HasIndex(r => new { r.Ticker, r.ScoreDate });
        }
    }
}
