import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';
import 'stock_detail_screen.dart';

class MarketScreen extends StatefulWidget {
  const MarketScreen({super.key});

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, String>> _searchResults = [];
  bool _isSearching = false;
  int _selectedCategory = 0;
  bool _isLoadingTrending = false;

  final List<String> _categories = ['All', 'Indian Stocks', 'Crypto', 'US Tech', 'Metals'];

  final List<Map<String, dynamic>> _trendingAssets = [
    {'symbol': 'TCS.NS', 'name': 'Tata Consultancy', 'price': 2399.30, 'change': 2.45, 'type': 'Indian Stocks', 'currency': '₹'},
    {'symbol': 'RELIANCE.NS', 'name': 'Reliance Industries', 'price': 3020.00, 'change': 1.45, 'type': 'Indian Stocks', 'currency': '₹'},
    {'symbol': 'TATASTEEL.NS', 'name': 'Tata Steel', 'price': 158.40, 'change': 2.85, 'type': 'Indian Stocks', 'currency': '₹'},
    {'symbol': 'INFY.NS', 'name': 'Infosys Limited', 'price': 1840.50, 'change': -0.85, 'type': 'Indian Stocks', 'currency': '₹'},
    {'symbol': 'BTC-USD', 'name': 'Bitcoin', 'price': 66400.00, 'change': 4.75, 'type': 'Crypto', 'currency': '\$'},
    {'symbol': 'ETH-USD', 'name': 'Ethereum', 'price': 3450.00, 'change': 6.20, 'type': 'Crypto', 'currency': '\$'},
    {'symbol': 'GC=F', 'name': 'Gold Futures', 'price': 6400.00, 'change': 0.65, 'type': 'Metals', 'currency': '\$'},
    {'symbol': 'NVDA', 'name': 'NVIDIA Corporation', 'price': 128.50, 'change': 5.80, 'type': 'US Tech', 'currency': '\$'},
    {'symbol': 'AAPL', 'name': 'Apple Inc.', 'price': 224.20, 'change': -1.10, 'type': 'US Tech', 'currency': '\$'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchLiveTrendingPrices();
  }

  void _fetchLiveTrendingPrices() async {
    setState(() => _isLoadingTrending = true);
    for (int i = 0; i < _trendingAssets.length; i++) {
      final sym = _trendingAssets[i]['symbol'] as String;
      final quote = await ApiService.fetchStockAnalysis(sym, range: '1d');
      if (mounted && quote['current_price'] != null) {
        setState(() {
          _trendingAssets[i]['price'] = quote['current_price'];
          _trendingAssets[i]['change'] = quote['change_pct'];
          _trendingAssets[i]['currency'] = quote['currency'];
          if (quote['name'] != null && (quote['name'] as String).isNotEmpty) {
            _trendingAssets[i]['name'] = quote['name'];
          }
        });
      }
    }
    if (mounted) setState(() => _isLoadingTrending = false);
  }

  void _onSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }
    setState(() => _isSearching = true);
    final results = await ApiService.searchStocks(query);
    setState(() {
      _searchResults = results;
      _isSearching = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filteredTrending = _selectedCategory == 0
        ? _trendingAssets
        : _trendingAssets.where((a) => a['type'] == _categories[_selectedCategory]).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Markets & Stock Search'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: _isLoadingTrending ? AppTheme.accentEmerald : AppTheme.primaryBlue),
            onPressed: _fetchLiveTrendingPrices,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            TextField(
              controller: _searchController,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'Search stocks, crypto, ETFs (e.g. RELIANCE, TCS)...',
                prefixIcon: const Icon(Icons.search, color: AppTheme.primaryBlue),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: isDark ? AppTheme.darkCard : AppTheme.lightCard,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: isDark ? AppTheme.darkBorder : AppTheme.lightBorder),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Live Search Results
            if (_isSearching)
              const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
            else if (_searchResults.isNotEmpty) ...[
              const Text('Search Results', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 10),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _searchResults.length,
                itemBuilder: (context, index) {
                  final item = _searchResults[index];
                  return GlassCard(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => StockDetailScreen(symbol: item['symbol']!),
                        ),
                      );
                    },
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item['symbol']!,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                item['shortname']!,
                                style: TextStyle(fontSize: 12, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryBlue.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(item['exchDisp']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue)),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],

            // Category Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (int idx = 0; idx < _categories.length; idx++)
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: Text(_categories[idx]),
                        selected: idx == _selectedCategory,
                        selectedColor: AppTheme.primaryBlue,
                        labelStyle: TextStyle(
                          color: idx == _selectedCategory
                              ? Colors.white
                              : (isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary),
                          fontWeight: idx == _selectedCategory ? FontWeight.bold : FontWeight.normal,
                        ),
                        onSelected: (_) => setState(() => _selectedCategory = idx),
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Watchlist
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Market Watchlist (${filteredTrending.length})',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                if (_isLoadingTrending)
                  const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
              ],
            ),
            const SizedBox(height: 10),

            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredTrending.length,
              itemBuilder: (context, index) {
                final item = filteredTrending[index];
                final double change = (item['change'] as num).toDouble();
                final double price = (item['price'] as num).toDouble();
                final String curr = item['currency'] ?? '₹';

                return GlassCard(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StockDetailScreen(symbol: item['symbol']),
                      ),
                    );
                  },
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: (change >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: Icon(
                          change >= 0 ? Icons.trending_up : Icons.trending_down,
                          color: change >= 0 ? AppTheme.accentEmerald : AppTheme.accentRose,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['name'],
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              item['symbol'],
                              style: TextStyle(fontSize: 11, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$curr${price.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          Text(
                            '${change >= 0 ? '+' : ''}${change.toStringAsFixed(2)}%',
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
