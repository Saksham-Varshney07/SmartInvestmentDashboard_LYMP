import 'package:flutter/material.dart';
import '../services/portfolio_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';

class RiskScreen extends StatefulWidget {
  const RiskScreen({super.key});

  @override
  State<RiskScreen> createState() => _RiskScreenState();
}

class _RiskScreenState extends State<RiskScreen> {
  int _ageIdx = 1; // 0: <25, 1: 25-40, 2: 41-55, 3: >55
  int _toleranceIdx = 2; // 0: Low, 1: Moderate, 2: High, 3: Very High
  int _horizonIdx = 1; // 0: <1y, 1: 1-5y, 2: 5-10y, 3: >10y
  int _objectiveIdx = 1; // 0: Capital Preservation, 1: Balanced Growth, 2: Maximum Returns

  final List<String> _ageLabels = ['Under 25', '25 - 40', '41 - 55', 'Above 55'];
  final List<String> _toleranceLabels = ['Low (Keep Capital Safe)', 'Moderate (Minor Dips Ok)', 'High (Growth Focused)', 'Very High (Crypto/Aggressive)'];
  final List<String> _horizonLabels = ['< 1 Year', '1 - 5 Years', '5 - 10 Years', '10+ Years'];
  final List<String> _objectiveLabels = ['Preserve Capital', 'Balanced Growth', 'Aggressive Expansion'];

  Map<String, dynamic> _computeRiskProfile() {
    int score = (_toleranceIdx * 35) + (_horizonIdx * 25) + ((3 - _ageIdx) * 20) + (_objectiveIdx * 20);
    
    String profile = 'Balanced';
    Color profileColor = AppTheme.primaryBlue;
    double var95 = 4.2;
    double var99 = 7.8;
    List<double> allocation = [50, 30, 20]; // Stocks, Crypto, Gold

    if (score < 30) {
      profile = 'Conservative';
      profileColor = AppTheme.accentAmber;
      var95 = 1.8;
      var99 = 3.5;
      allocation = [30, 5, 65];
    } else if (score < 60) {
      profile = 'Balanced';
      profileColor = AppTheme.primaryBlue;
      var95 = 3.8;
      var99 = 6.9;
      allocation = [55, 15, 30];
    } else if (score < 85) {
      profile = 'Growth';
      profileColor = AppTheme.accentPurple;
      var95 = 5.6;
      var99 = 9.8;
      allocation = [65, 25, 10];
    } else {
      profile = 'Aggressive';
      profileColor = AppTheme.accentRose;
      var95 = 8.9;
      var99 = 15.4;
      allocation = [50, 45, 5];
    }

    return {
      'score': score,
      'profile': profile,
      'color': profileColor,
      'var95': var95,
      'var99': var99,
      'allocation': allocation,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final riskData = _computeRiskProfile();

    final portfolioValue = PortfolioService().currentSummary.portfolioValue;
    final double var95Amt = (portfolioValue * (riskData['var95'] as double)) / 100;
    final double var99Amt = (portfolioValue * (riskData['var99'] as double)) / 100;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Risk Analysis & Optimization'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Calculated Score Hero
            GlassCard(
              backgroundColor: (riskData['color'] as Color).withOpacity(0.12),
              borderColor: riskData['color'] as Color,
              child: Row(
                children: [
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      color: riskData['color'] as Color,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${riskData['score']}',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'RISK SCORE & PROFILE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                            color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          riskData['profile'],
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: riskData['color'] as Color,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Tailored for optimal risk-adjusted returns.',
                          style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Value at Risk (VaR) Metrics
            const Text(
              'Value at Risk (VaR) Analysis',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('95% VaR (1-Day)', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        const SizedBox(height: 6),
                        Text(
                          '-${riskData['var95']}%',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.accentRose),
                        ),
                        Text('Max loss: ₹${var95Amt.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('99% VaR (Worst Case)', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        const SizedBox(height: 6),
                        Text(
                          '-${riskData['var99']}%',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.accentRose),
                        ),
                        Text('Max loss: ₹${var99Amt.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11)),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // MPT Optimal Portfolio Recommendation
            const Text(
              'Recommended MPT Asset Allocation',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            GlassCard(
              child: Column(
                children: [
                  _buildAllocBar('Equities & Index ETFs', (riskData['allocation'] as List)[0], AppTheme.primaryBlue),
                  const SizedBox(height: 12),
                  _buildAllocBar('Digital Assets & Crypto', (riskData['allocation'] as List)[1], AppTheme.accentEmerald),
                  const SizedBox(height: 12),
                  _buildAllocBar('Gold & Sovereign Bonds', (riskData['allocation'] as List)[2], AppTheme.accentAmber),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Interactive Questionnaire
            const Text(
              'Risk Assessment Questionnaire',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildQuestion('1. What is your age group?', _ageLabels, _ageIdx, (val) => setState(() => _ageIdx = val)),
                  const SizedBox(height: 16),
                  _buildQuestion('2. How do you handle market drops?', _toleranceLabels, _toleranceIdx, (val) => setState(() => _toleranceIdx = val)),
                  const SizedBox(height: 16),
                  _buildQuestion('3. What is your investment horizon?', _horizonLabels, _horizonIdx, (val) => setState(() => _horizonIdx = val)),
                  const SizedBox(height: 16),
                  _buildQuestion('4. Primary Financial Goal?', _objectiveLabels, _objectiveIdx, (val) => setState(() => _objectiveIdx = val)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAllocBar(String label, double pct, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            Text('${pct.toInt()}%', style: TextStyle(fontWeight: FontWeight.bold, color: color)),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: pct / 100,
          backgroundColor: color.withOpacity(0.15),
          color: color,
          minHeight: 8,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }

  Widget _buildQuestion(String title, List<String> options, int currentIdx, ValueChanged<int> onChanged) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: List.generate(options.length, (idx) {
            final isSelected = idx == currentIdx;
            return ChoiceChip(
              label: Text(options[idx]),
              selected: isSelected,
              selectedColor: AppTheme.primaryBlue,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : (isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary),
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              onSelected: (_) => onChanged(idx),
            );
          }),
        ),
      ],
    );
  }
}
