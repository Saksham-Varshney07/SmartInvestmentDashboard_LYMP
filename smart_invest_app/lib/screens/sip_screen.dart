import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';

class SipScreen extends StatefulWidget {
  const SipScreen({super.key});

  @override
  State<SipScreen> createState() => _SipScreenState();
}

class _SipScreenState extends State<SipScreen> {
  double _monthlyInvestment = 10000;
  double _expectedReturnRate = 12.5;
  double _tenureYears = 10;
  double _stepUpRate = 5;

  String _formatCurrency(double val) {
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(val);
  }

  Map<String, dynamic> _calculateSip() {
    int totalMonths = (_tenureYears * 12).toInt();
    double monthlyRate = _expectedReturnRate / 12 / 100;

    double totalInvested = 0;
    double currentPortfolioValue = 0;
    double currentMonthly = _monthlyInvestment;

    List<FlSpot> chartSpots = [];
    List<Map<String, dynamic>> yearlyBreakdown = [];

    for (int month = 1; month <= totalMonths; month++) {
      if (month > 1 && (month - 1) % 12 == 0) {
        currentMonthly += currentMonthly * (_stepUpRate / 100);
      }

      totalInvested += currentMonthly;
      currentPortfolioValue = (currentPortfolioValue + currentMonthly) * (1 + monthlyRate);

      if (month % 12 == 0) {
        int year = month ~/ 12;
        chartSpots.add(FlSpot(year.toDouble(), currentPortfolioValue));
        yearlyBreakdown.add({
          'year': year,
          'invested': totalInvested,
          'value': currentPortfolioValue,
          'gain': currentPortfolioValue - totalInvested,
        });
      }
    }

    double totalReturns = currentPortfolioValue - totalInvested;

    return {
      'totalInvested': totalInvested,
      'totalReturns': totalReturns,
      'maturityValue': currentPortfolioValue,
      'chartSpots': chartSpots,
      'yearlyBreakdown': yearlyBreakdown,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sipResults = _calculateSip();

    final double totalInvested = sipResults['totalInvested'];
    final double totalReturns = sipResults['totalReturns'];
    final double maturityValue = sipResults['maturityValue'];
    final List<FlSpot> chartSpots = sipResults['chartSpots'];
    final List<Map<String, dynamic>> yearlyBreakdown = sipResults['yearlyBreakdown'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('SIP Calculator & Planner'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Maturity Card
            GlassCard(
              backgroundColor: AppTheme.primaryBlue,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'EXPECTED MATURITY VALUE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatCurrency(maturityValue),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -0.8,
                    ),
                  ),
                  const Divider(color: Colors.white24, height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Invested', style: TextStyle(fontSize: 12, color: Colors.white70)),
                          Text(
                            _formatCurrency(totalInvested),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Estimated Wealth Gain', style: TextStyle(fontSize: 12, color: Colors.white70)),
                          Text(
                            '+${_formatCurrency(totalReturns)}',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.accentEmerald,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Growth Chart
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Wealth Growth Projection',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 180,
                    child: LineChart(
                      LineChartData(
                        gridData: const FlGridData(show: false),
                        titlesData: const FlTitlesData(show: false),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: chartSpots,
                            isCurved: true,
                            color: AppTheme.accentEmerald,
                            barWidth: 3,
                            belowBarData: BarAreaData(
                              show: true,
                              color: AppTheme.accentEmerald.withOpacity(0.15),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Controls Sliders Card
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Monthly Investment
                  _buildSliderHeader(
                    'Monthly Investment',
                    _formatCurrency(_monthlyInvestment),
                  ),
                  Slider(
                    value: _monthlyInvestment,
                    min: 500,
                    max: 100000,
                    divisions: 199,
                    activeColor: AppTheme.primaryBlue,
                    onChanged: (v) => setState(() => _monthlyInvestment = v),
                  ),

                  const SizedBox(height: 12),

                  // Expected Return Rate
                  _buildSliderHeader(
                    'Expected Return Rate (p.a.)',
                    '${_expectedReturnRate.toStringAsFixed(1)}%',
                  ),
                  Slider(
                    value: _expectedReturnRate,
                    min: 1,
                    max: 30,
                    divisions: 58,
                    activeColor: AppTheme.accentEmerald,
                    onChanged: (v) => setState(() => _expectedReturnRate = v),
                  ),

                  const SizedBox(height: 12),

                  // Investment Period
                  _buildSliderHeader(
                    'Time Period',
                    '${_tenureYears.toInt()} Years',
                  ),
                  Slider(
                    value: _tenureYears,
                    min: 1,
                    max: 30,
                    divisions: 29,
                    activeColor: AppTheme.accentAmber,
                    onChanged: (v) => setState(() => _tenureYears = v),
                  ),

                  const SizedBox(height: 12),

                  // Annual Step-Up Rate
                  _buildSliderHeader(
                    'Annual Step-Up Rate',
                    '${_stepUpRate.toInt()}%',
                  ),
                  Slider(
                    value: _stepUpRate,
                    min: 0,
                    max: 25,
                    divisions: 25,
                    activeColor: AppTheme.accentPurple,
                    onChanged: (v) => setState(() => _stepUpRate = v),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Yearly Breakdown
            const Text(
              'Year-by-Year Breakdown',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            GlassCard(
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: yearlyBreakdown.length,
                separatorBuilder: (_, __) => const Divider(height: 16),
                itemBuilder: (context, index) {
                  final row = yearlyBreakdown[index];
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Year ${row['year']}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            _formatCurrency(row['value']),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Inv: ${_formatCurrency(row['invested'])}',
                            style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                          ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSliderHeader(String label, String valueStr) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        Text(valueStr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.primaryBlue)),
      ],
    );
  }
}
