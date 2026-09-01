import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';
import 'stock_detail_screen.dart';

class AssetExplorerScreen extends StatefulWidget {
  const AssetExplorerScreen({super.key});

  @override
  State<AssetExplorerScreen> createState() => _AssetExplorerScreenState();
}

class _AssetExplorerScreenState extends State<AssetExplorerScreen> {
  int _selectedCategory = 0;
  int _selectedSort = 0; // 0: Gainers, 1: Losers, 2: Popular
  bool _isLoading = false;

  final List<String> _categories = ['All', 'Indian Equities', 'Crypto Assets', 'US Stocks', 'Commodities'];
  final List<String> _sortLabels = ['Top Gainers', 'Top Losers', 'Most Popular'];

  List<Map<String, dynamic>> _assets = [
    {'symbol': 'TCS.NS', 'name': 'Tata Consultancy Services', 'price': 0.0, 'change': 0.0, 'risk': 'Low', 'type': 'Indian Equities', 'currency': '₹'},
    {'symbol': 'RELIANCE.NS', 'name': 'Reliance Industries', 'price': 0.0, 'change': 0.0, 'risk': 'Low', 'type': 'Indian Equities', 'currency': '₹'},
    {'symbol': 'TATASTEEL.NS', 'name': 'Tata Steel Limited', 'price': 0.0, 'change': 0.0, 'risk': 'Moderate', 'type': 'Indian Equities', 'currency': '₹'},
    {'symbol': 'INFY.NS', 'name': 'Infosys Limited', 'price': 0.0, 'change': 0.0, 'risk': 'Low', 'type': 'Indian Equities', 'currency': '₹'},
    {'symbol': 'HDFCBANK.NS', 'name': 'HDFC Bank Ltd', 'price': 0.0, 'change': 0.0, 'risk': 'Low', 'type': 'Indian Equities', 'currency': '₹'},
    {'symbol': 'BTC-USD', 'name': 'Bitcoin', 'price': 0.0, 'change': 0.0, 'risk': 'High', 'type': 'Crypto Assets', 'currency': '\$'},
    {'symbol': 'ETH-USD', 'name': 'Ethereum', 'price': 0.0, 'change': 0.0, 'risk': 'High', 'type': 'Crypto Assets', 'currency': '\$'},
    {'symbol': 'GC=F', 'name': 'Gold Futures', 'price': 0.0, 'change': 0.0, 'risk': 'Low', 'type': 'Commodities', 'currency': '\$'},
    {'symbol': 'NVDA', 'name': 'NVIDIA Corp.', 'price': 0.0, 'change': 0.0, 'risk': 'Moderate', 'type': 'US Stocks', 'currency': '\$'},
    {'symbol': 'AAPL', 'name': 'Apple Inc.', 'price': 0.0, 'change': 0.0, 'risk': 'Low', 'type': 'US Stocks', 'currency': '\$'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchLiveData();
  }

  void _fetchLiveData() async {
    setState(() => _isLoading = true);
    for (int i = 0; i < _assets.length; i++) {
      final sym = _assets[i]['symbol'] as String;
      final quote = await ApiService.fetchStockAnalysis(sym, range: '1d');
      if (mounted && quote['current_price'] != null) {
        setState(() {
          _assets[i]['price'] = quote['current_price'];
          _assets[i]['change'] = quote['change_pct'];
          _assets[i]['currency'] = quote['currency'];
          if (quote['name'] != null && (quote['name'] as String).isNotEmpty) {
            _assets[i]['name'] = quote['name'];
          }
        });
      }
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    var filtered = _selectedCategory == 0
        ? _assets
        : _assets.where((a) => a['type'] == _categories[_selectedCategory]).toList();

    if (_selectedSort == 0) {
      filtered.sort((a, b) => (b['change'] as num).compareTo(a['change'] as num));
    } else if (_selectedSort == 1) {
      filtered.sort((a, b) => (a['change'] as num).compareTo(b['change'] as num));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asset Explorer'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: _isLoading ? AppTheme.accentEmerald : AppTheme.primaryBlue),
            onPressed: _fetchLiveData,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category Filter Bar
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (int i = 0; i < _categories.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: Text(_categories[i]),
                        selected: i == _selectedCategory,
                        selectedColor: AppTheme.primaryBlue,
                        labelStyle: TextStyle(
                          color: i == _selectedCategory
                              ? Colors.white
                              : (isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary),
                          fontWeight: i == _selectedCategory ? FontWeight.bold : FontWeight.normal,
                        ),
                        onSelected: (_) => setState(() => _selectedCategory = i),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Sort Tabs
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(_sortLabels.length, (idx) {
                final isSelected = idx == _selectedSort;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: FilterChip(
                    label: Text(_sortLabels[idx]),
                    selected: isSelected,
                    onSelected: (_) => setState(() => _selectedSort = idx),
                    selectedColor: AppTheme.accentEmerald.withValues(alpha: 0.2),
                    checkmarkColor: AppTheme.accentEmerald,
                  ),
                );
              }),
            ),
            ),

            const SizedBox(height: 18),

            Text(
              'Available Assets (${filtered.length})',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filtered.length,
              itemBuilder: (context, index) {
                final asset = filtered[index];
                final double change = (asset['change'] as num).toDouble();
                final double price = (asset['price'] as num).toDouble();
                final String curr = asset['currency'] ?? '₹';

                return GlassCard(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StockDetailScreen(symbol: asset['symbol']),
                      ),
                    );
                  },
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBlue.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          asset['symbol'].toString().substring(0, 3),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue, fontSize: 12),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              asset['name'],
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Text(
                                  asset['symbol'],
                                  style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.accentEmerald.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'Risk: ${asset['risk']}',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.accentEmerald),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            price == 0.0 ? '...' : '$curr${price.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            price == 0.0 ? '' : '${change >= 0 ? '+' : ''}${change.toStringAsFixed(2)}%',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: change >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                            ),
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
}
