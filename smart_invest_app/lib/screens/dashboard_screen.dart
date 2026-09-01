import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../services/portfolio_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';
import '../widgets/stat_card.dart';
import '../widgets/add_transaction_modal.dart';
import 'stock_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final PortfolioService _portfolioService = PortfolioService();

  @override
  void initState() {
    super.initState();
    _portfolioService.addListener(_onStateChange);
  }

  @override
  void dispose() {
    _portfolioService.removeListener(_onStateChange);
    super.dispose();
  }

  void _onStateChange() {
    if (mounted) setState(() {});
  }

  String _formatCurrency(double val) {
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(val);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final summary = _portfolioService.currentSummary;
    final assets = _portfolioService.currentAssets;
    final user = _portfolioService.user;
    final portfolioType = _portfolioService.portfolioType;

    // Calculate allocation distribution
    double stocksPct = 0;
    double cryptoPct = 0;
    double goldPct = 0;

    for (var a in assets) {
      final sym = a.symbol.toUpperCase();
      if (sym.contains('BTC') || sym.contains('ETH') || sym.contains('USD')) {
        cryptoPct += a.allocationPct;
      } else if (sym.contains('GC') || sym.contains('GOLD') || sym.contains('SILV')) {
        goldPct += a.allocationPct;
      } else {
        stocksPct += a.allocationPct;
      }
    }

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Header with Overflow Fix (Expanded + TextOverflow.ellipsis)
          SliverAppBar(
            floating: true,
            pinned: true,
            expandedHeight: 110.0,
            backgroundColor: isDark ? AppTheme.darkBg : AppTheme.lightBg,
            flexibleSpace: FlexibleSpaceBar(
              background: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      // Fixed Overflow: Wrap left column in Expanded
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Welcome back, ${user.username} 👋',
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Smart Investment 360',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(width: 8),

                      // Portfolio Type Segment (Real vs Sandbox)
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: isDark ? AppTheme.darkCard : AppTheme.lightCard,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? AppTheme.darkBorder : AppTheme.lightBorder),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            GestureDetector(
                              onTap: () => _portfolioService.setPortfolioType('real'),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: portfolioType == 'real' ? AppTheme.primaryBlue : Colors.transparent,
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                child: Text(
                                  'Real',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: portfolioType == 'real'
                                        ? Colors.white
                                        : (isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                                  ),
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: () => _portfolioService.setPortfolioType('sandbox'),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: portfolioType == 'sandbox' ? AppTheme.accentEmerald : Colors.transparent,
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                child: Text(
                                  'Sandbox',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: portfolioType == 'sandbox'
                                        ? Colors.white
                                        : (isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Main Body Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero Card: Live Valuation & Live Update
                  GlassCard(
                    backgroundColor: isDark ? AppTheme.darkCard : Colors.white,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: AppTheme.accentEmerald,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'LIVE PORTFOLIO VALUE',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.0,
                                    color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                            IconButton(
                              icon: Icon(
                                Icons.refresh,
                                size: 18,
                                color: _portfolioService.isLoading ? AppTheme.accentEmerald : AppTheme.primaryBlue,
                              ),
                              onPressed: () => _portfolioService.refreshPortfolio(),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatCurrency(summary.portfolioValue),
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.8,
                            color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 12,
                          runSpacing: 6,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: (summary.totalProfit >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    summary.totalProfit >= 0 ? Icons.trending_up : Icons.trending_down,
                                    size: 14,
                                    color: summary.totalProfit >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${summary.totalProfit >= 0 ? '+' : ''}${_formatCurrency(summary.totalProfit)} (${summary.totalProfitPct.toStringAsFixed(2)}%)',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: summary.totalProfit >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              'Invested: ${_formatCurrency(summary.totalInvestment)}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Quick Stats Grid
                  Row(
                    children: [
                      Expanded(
                        child: StatCard(
                          title: 'Total Invested',
                          value: summary.totalInvestment,
                          icon: Icons.account_balance_wallet,
                          iconColor: AppTheme.primaryBlue,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: StatCard(
                          title: 'Total Gain',
                          value: summary.totalProfit,
                          changePct: summary.totalProfitPct,
                          icon: Icons.ssid_chart,
                          iconColor: summary.totalProfit >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // Performance Timeline
                  Text(
                    'Performance Timeline',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  GlassCard(
                    child: SizedBox(
                      height: 170,
                      child: LineChart(
                        LineChartData(
                          gridData: const FlGridData(show: false),
                          titlesData: const FlTitlesData(show: false),
                          borderData: FlBorderData(show: false),
                          lineBarsData: [
                            LineChartBarData(
                              spots: [
                                FlSpot(0, (summary.totalInvestment * 0.85).clamp(1000, 1000000)),
                                FlSpot(1, (summary.totalInvestment * 0.92).clamp(1000, 1000000)),
                                FlSpot(2, (summary.totalInvestment * 0.98).clamp(1000, 1000000)),
                                FlSpot(3, summary.portfolioValue.clamp(1000, 1000000)),
                              ],
                              isCurved: true,
                              color: AppTheme.primaryBlue,
                              barWidth: 3,
                              isStrokeCapRound: true,
                              dotData: const FlDotData(show: false),
                              belowBarData: BarAreaData(
                                show: true,
                                color: AppTheme.primaryBlue.withValues(alpha: 0.15),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Asset Allocation Breakdown
                  Text(
                    'Asset Allocation',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  GlassCard(
                    child: Row(
                      children: [
                        SizedBox(
                          width: 100,
                          height: 100,
                          child: PieChart(
                            PieChartData(
                              sectionsSpace: 3,
                              centerSpaceRadius: 28,
                              sections: [
                                PieChartSectionData(
                                  color: AppTheme.primaryBlue,
                                  value: stocksPct > 0 ? stocksPct : 50,
                                  title: '',
                                  radius: 16,
                                ),
                                PieChartSectionData(
                                  color: AppTheme.accentEmerald,
                                  value: cryptoPct > 0 ? cryptoPct : 25,
                                  title: '',
                                  radius: 16,
                                ),
                                PieChartSectionData(
                                  color: AppTheme.accentAmber,
                                  value: goldPct > 0 ? goldPct : 25,
                                  title: '',
                                  radius: 16,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildAllocationRow('Stocks & ETFs', stocksPct > 0 ? stocksPct : 50, AppTheme.primaryBlue),
                              const SizedBox(height: 8),
                              _buildAllocationRow('Crypto Assets', cryptoPct > 0 ? cryptoPct : 25, AppTheme.accentEmerald),
                              const SizedBox(height: 8),
                              _buildAllocationRow('Gold & Metals', goldPct > 0 ? goldPct : 25, AppTheme.accentAmber),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Holdings List Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Your Holdings (${assets.length})',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (context) => const AddTransactionModal(),
                          );
                        },
                        icon: const Icon(Icons.add_circle, color: AppTheme.primaryBlue, size: 26),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (assets.isEmpty)
                    GlassCard(
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.inventory_2_outlined, size: 44, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                            const SizedBox(height: 8),
                            Text('No assets in $portfolioType portfolio', style: const TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text('Tap + to add your first stock or crypto asset', style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary)),
                          ],
                        ),
                      ),
                    )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: assets.length,
                      itemBuilder: (context, index) {
                        final asset = assets[index];
                        return GlassCard(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => StockDetailScreen(symbol: asset.symbol),
                              ),
                            );
                          },
                          child: Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryBlue.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  asset.symbol.substring(0, asset.symbol.length > 3 ? 3 : asset.symbol.length),
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue, fontSize: 12),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      asset.name,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${asset.shares} shares @ ₹${asset.avgPurchasePrice.toStringAsFixed(1)}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    _formatCurrency(asset.currentValue),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${asset.totalProfit >= 0 ? '+' : ''}${asset.totalProfitPct.toStringAsFixed(2)}%',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: asset.totalProfit >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAllocationRow(String label, double pct, Color color) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ),
        Text(
          '${pct.toStringAsFixed(1)}%',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}
