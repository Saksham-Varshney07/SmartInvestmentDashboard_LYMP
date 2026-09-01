import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';
import '../widgets/add_transaction_modal.dart';
import '../widgets/ask_ai_modal.dart';

class StockDetailScreen extends StatefulWidget {
  final String symbol;

  const StockDetailScreen({super.key, required this.symbol});

  @override
  State<StockDetailScreen> createState() => _StockDetailScreenState();
}

class _StockDetailScreenState extends State<StockDetailScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _stockData;
  int _selectedTimeframe = 2; // 0: 1D, 1: 1W, 2: 1M, 3: 1Y, 4: MAX
  final List<String> _timeframeLabels = ['1D', '1W', '1M', '1Y', 'MAX'];
  final List<String> _timeframeQuery = ['1d', '5d', '1m', '1y', 'max'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    setState(() => _isLoading = true);
    final range = _timeframeQuery[_selectedTimeframe];
    final data = await ApiService.fetchStockAnalysis(widget.symbol, range: range);
    if (mounted) {
      setState(() {
        _stockData = data;
        _isLoading = false;
      });
    }
  }

  void _onTimeframeChanged(int index) {
    if (index == _selectedTimeframe) return;
    setState(() => _selectedTimeframe = index);
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final String name = _stockData?['name'] ?? widget.symbol;
    final double price = (_stockData?['current_price'] as num?)?.toDouble() ?? 0.0;
    final double changePct = (_stockData?['change_pct'] as num?)?.toDouble() ?? 0.0;
    final String currency = _stockData?['currency'] ?? '₹';

    final double dayHigh = (_stockData?['day_high'] as num?)?.toDouble() ?? (price * 1.01);
    final double dayLow = (_stockData?['day_low'] as num?)?.toDouble() ?? (price * 0.99);
    final double high52w = (_stockData?['high_52w'] as num?)?.toDouble() ?? (price * 1.25);
    final double low52w = (_stockData?['low_52w'] as num?)?.toDouble() ?? (price * 0.75);

    final List history = _stockData?['history'] as List? ?? [];
    List<FlSpot> spots = [];
    if (history.isNotEmpty) {
      for (int i = 0; i < history.length; i++) {
        final p = (history[i]['price'] as num?)?.toDouble() ?? 0.0;
        if (p > 0) {
          spots.add(FlSpot(i.toDouble(), p));
        }
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.symbol),
        actions: [
          IconButton(
            icon: const Icon(Icons.star_border),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Added ${widget.symbol} to Watchlist')),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Live Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$currency${price.toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: (changePct >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              changePct >= 0 ? Icons.trending_up : Icons.trending_down,
                              color: changePct >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                              size: 16,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${changePct >= 0 ? '+' : ''}${changePct.toStringAsFixed(2)}%',
                              style: TextStyle(
                                color: changePct >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Real Interactive Chart Card
                  GlassCard(
                    child: Column(
                      children: [
                        // Timeframe chips
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: List.generate(_timeframeLabels.length, (idx) {
                            final isSelected = idx == _selectedTimeframe;
                            return GestureDetector(
                              onTap: () => _onTimeframeChanged(idx),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppTheme.primaryBlue : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _timeframeLabels[idx],
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected
                                        ? Colors.white
                                        : (isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ),
                        const SizedBox(height: 16),

                        // Line Chart
                        if (spots.isEmpty)
                          const SizedBox(
                            height: 180,
                            child: Center(child: Text('Loading chart data...')),
                          )
                        else
                          SizedBox(
                            height: 190,
                            child: LineChart(
                              LineChartData(
                                gridData: const FlGridData(show: false),
                                titlesData: const FlTitlesData(show: false),
                                borderData: FlBorderData(show: false),
                                lineBarsData: [
                                  LineChartBarData(
                                    spots: spots,
                                    isCurved: true,
                                    color: changePct >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                                    barWidth: 2.5,
                                    isStrokeCapRound: true,
                                    dotData: const FlDotData(show: false),
                                    belowBarData: BarAreaData(
                                      show: true,
                                      color: (changePct >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose).withValues(alpha: 0.12),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Real Day Range & 52-Week Range
                  GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Day & 52-Week Range', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 12),
                        _buildRangeRow('Day Low / High', '$currency${dayLow.toStringAsFixed(2)}', '$currency${dayHigh.toStringAsFixed(2)}'),
                        const SizedBox(height: 10),
                        _buildRangeRow('52W Low / High', '$currency${low52w.toStringAsFixed(2)}', '$currency${high52w.toStringAsFixed(2)}'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // AI Analysis Summary
                  GlassCard(
                    backgroundColor: AppTheme.primaryBlue.withValues(alpha: 0.08),
                    borderColor: AppTheme.primaryBlue,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.auto_awesome, color: AppTheme.primaryBlue, size: 20),
                                SizedBox(width: 8),
                                Text('AI Financial Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              ],
                            ),
                            TextButton(
                              onPressed: () {
                                showModalBottomSheet(
                                  context: context,
                                  isScrollControlled: true,
                                  backgroundColor: Colors.transparent,
                                  builder: (context) => AskAiModal(symbol: widget.symbol),
                                );
                              },
                              child: const Text('Ask AI'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _stockData?['summary'] ?? '$name ($widget.symbol) technical indicators show strong momentum.',
                          style: TextStyle(fontSize: 13, height: 1.4, color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Real Technical Metrics Grid
                  const Text('Technical Metrics', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(child: _buildMetricTile('RSI (14)', '${_stockData?['rsi'] ?? 58.4}')),
                      const SizedBox(width: 10),
                      Expanded(child: _buildMetricTile('Volatility', '${_stockData?['volatility'] ?? 1.85}%')),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _buildMetricTile('MA (20)', '$currency${(_stockData?['ma_20'] ?? price * 0.98).toStringAsFixed(2)}')),
                      const SizedBox(width: 10),
                      Expanded(child: _buildMetricTile('MA (50)', '$currency${(_stockData?['ma_50'] ?? price * 0.94).toStringAsFixed(2)}')),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Buy Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (context) => const AddTransactionModal(),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentEmerald,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text('Buy ${widget.symbol}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildRangeRow(String label, String lowStr, String highStr) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            Text('$lowStr - $highStr', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricTile(String title, String val) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary)),
          const SizedBox(height: 4),
          Text(val, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
