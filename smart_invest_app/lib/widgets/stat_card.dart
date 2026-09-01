import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';
import 'glass_card.dart';

class StatCard extends StatelessWidget {
  final String title;
  final double value;
  final String? subtitle;
  final IconData icon;
  final Color iconColor;
  final double? changePct;
  final bool isCurrency;

  const StatCard({
    super.key,
    required this.title,
    required this.value,
    this.subtitle,
    required this.icon,
    required this.iconColor,
    this.changePct,
    this.isCurrency = true,
  });

  String _formatValue(double val) {
    if (!isCurrency) return val.toStringAsFixed(0);
    final formatter = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return formatter.format(val);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GlassCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _formatValue(value),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
              color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
            ),
          ),
          if (changePct != null || subtitle != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                if (changePct != null) ...[
                  Icon(
                    changePct! >= 0 ? Icons.trending_up : Icons.trending_down,
                    size: 14,
                    color: changePct! >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${changePct! >= 0 ? '+' : ''}${changePct!.toStringAsFixed(2)}%',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: changePct! >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                    ),
                  ),
              ],
            ),
          ]
        ],
      ),
    );
  }
}
