import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/portfolio_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';
import '../widgets/add_transaction_modal.dart';
import 'stock_detail_screen.dart';

class PortfolioScreen extends StatefulWidget {
  const PortfolioScreen({super.key});

  @override
  State<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
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
    final portfolioType = _portfolioService.portfolioType;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Portfolio Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_card),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (context) => const AddTransactionModal(),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Mode Selector Banner
            GlassCard(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ACTIVE MODE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                            color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          portfolioType == 'real' ? 'Real Money Portfolio' : 'Sandbox Simulated Portfolio',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: portfolioType == 'real' ? AppTheme.primaryBlue : AppTheme.accentEmerald,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => _portfolioService.setPortfolioType('real'),
                        style: TextButton.styleFrom(
                          foregroundColor: portfolioType == 'real' ? AppTheme.primaryBlue : AppTheme.darkTextSecondary,
                        ),
                        child: const Text('Real'),
                      ),
                      TextButton(
                        onPressed: () => _portfolioService.setPortfolioType('sandbox'),
                        style: TextButton.styleFrom(
                          foregroundColor: portfolioType == 'sandbox' ? AppTheme.accentEmerald : AppTheme.darkTextSecondary,
                        ),
                        child: const Text('Sandbox'),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Summary Card
            GlassCard(
              backgroundColor: portfolioType == 'real'
                  ? AppTheme.primaryBlue.withOpacity(0.08)
                  : AppTheme.accentEmerald.withOpacity(0.08),
              borderColor: portfolioType == 'real' ? AppTheme.primaryBlue : AppTheme.accentEmerald,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Value', style: TextStyle(fontSize: 12)),
                          Text(
                            _formatCurrency(summary.portfolioValue),
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Total Profit', style: TextStyle(fontSize: 12)),
                          Text(
                            '${summary.totalProfit >= 0 ? '+' : ''}${_formatCurrency(summary.totalProfit)}',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: summary.totalProfit >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            Text(
              'Assets in Portfolio (${assets.length})',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            if (assets.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Text('No assets added yet. Tap + button to record a trade.'),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryBlue.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      asset.symbol,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primaryBlue,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      asset.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 20, color: AppTheme.accentRose),
                              onPressed: () {
                                _portfolioService.deleteAsset(asset.symbol);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Removed ${asset.symbol}')),
                                );
                              },
                            ),
                          ],
                        ),
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildMetaCol('Shares', '${asset.shares}'),
                            _buildMetaCol('Avg Price', '₹${asset.avgPurchasePrice.toStringAsFixed(1)}'),
                            _buildMetaCol('Current Price', '₹${asset.currentPrice.toStringAsFixed(1)}'),
                            _buildMetaCol(
                              'Return',
                              '${asset.totalProfitPct >= 0 ? '+' : ''}${asset.totalProfitPct.toStringAsFixed(1)}%',
                              color: asset.totalProfitPct >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaCol(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
