import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/portfolio_service.dart';
import '../theme/app_theme.dart';
import '../widgets/add_transaction_modal.dart';
import 'auth_screen.dart';
import 'dashboard_screen.dart';
import 'portfolio_screen.dart';
import 'risk_screen.dart';
import 'sip_screen.dart';
import 'asset_explorer_screen.dart';
import 'account_screen.dart';
import 'stock_detail_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final VoidCallback onToggleTheme;

  const MainNavigationScreen({super.key, required this.onToggleTheme});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  final PortfolioService _portfolioService = PortfolioService();

  final TextEditingController _globalSearchController = TextEditingController();
  List<Map<String, String>> _searchSuggestions = [];
  bool _showSuggestions = false;

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

  void _onGlobalSearch(String query) async {
    if (query.trim().length < 2) {
      setState(() {
        _searchSuggestions = [];
        _showSuggestions = false;
      });
      return;
    }
    final results = await ApiService.searchStocks(query);
    if (mounted) {
      setState(() {
        _searchSuggestions = results;
        _showSuggestions = true;
      });
    }
  }

  void _selectSearchSuggestion(String symbol) {
    setState(() {
      _showSuggestions = false;
      _globalSearchController.clear();
    });
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => StockDetailScreen(symbol: symbol)),
    );
  }

  void _showTourDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.rocket_launch, color: AppTheme.primaryBlue),
            SizedBox(width: 10),
            Text('Smart Investment Tour'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('• Dashboard: Overview of total wealth, growth line chart, and holdings.'),
            SizedBox(height: 8),
            Text('• Portfolio: Toggle Real vs Sandbox paper-trading modes & manage assets.'),
            SizedBox(height: 8),
            Text('• Risk Analysis: AI Portfolio Doctor, Value at Risk (VaR), and MPT asset allocation.'),
            SizedBox(height: 8),
            Text('• SIP Planner: Wealth calculator with annual step-up projection charts.'),
            SizedBox(height: 8),
            Text('• Asset Explorer: Filter stocks, crypto, commodities & view AI risk scores.'),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBlue, foregroundColor: Colors.white),
            child: const Text('Got it!'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // If not logged in, render AuthScreen
    if (_portfolioService.user.username.isEmpty) {
      return const AuthScreen();
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    final List<Widget> screens = [
      const DashboardScreen(),
      const PortfolioScreen(),
      const RiskScreen(),
      const SipScreen(),
      const AssetExplorerScreen(),
      AccountScreen(onToggleTheme: widget.onToggleTheme),
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: AppTheme.primaryBlue,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.analytics, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 8),
            const Text('Smart Investment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline, color: AppTheme.primaryBlue),
            tooltip: 'Guide Tour',
            onPressed: _showTourDialog,
          ),
          IconButton(
            icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode, color: AppTheme.accentAmber),
            onPressed: widget.onToggleTheme,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.account_circle, color: AppTheme.primaryBlue),
            onSelected: (val) {
              if (val == 'logout') {
                _portfolioService.setUser(UserProfile(
                  userId: 0,
                  username: '',
                  fullName: '',
                  riskProfile: '',
                  investmentHorizon: '',
                ));
              } else if (val == 'settings') {
                setState(() => _currentIndex = 5);
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                enabled: false,
                child: Text('Logged in as @${_portfolioService.user.username}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'settings', child: Text('Account Settings')),
              const PopupMenuItem(value: 'logout', child: Text('Logout', style: TextStyle(color: AppTheme.accentRose))),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: TextField(
                  controller: _globalSearchController,
                  onChanged: _onGlobalSearch,
                  decoration: InputDecoration(
                    hintText: 'Search stocks, crypto, ETFs...',
                    prefixIcon: const Icon(Icons.search, size: 18),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    filled: true,
                    fillColor: isDark ? AppTheme.darkCard : AppTheme.lightCard,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: isDark ? AppTheme.darkBorder : AppTheme.lightBorder),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: IndexedStack(
                  index: _currentIndex,
                  children: screens,
                ),
              ),
            ],
          ),
          if (_showSuggestions && _searchSuggestions.isNotEmpty)
            Positioned(
              top: 50,
              left: 16,
              right: 16,
              child: Material(
                elevation: 8,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  constraints: const BoxConstraints(maxHeight: 250),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkCard : AppTheme.lightCard,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? AppTheme.darkBorder : AppTheme.lightBorder),
                  ),
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _searchSuggestions.length,
                    itemBuilder: (context, index) {
                      final item = _searchSuggestions[index];
                      return ListTile(
                        dense: true,
                        title: Text(item['symbol']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(item['shortname']!),
                        trailing: Text(item['exchDisp']!, style: const TextStyle(fontSize: 10)),
                        onTap: () => _selectSearchSuggestion(item['symbol']!),
                      );
                    },
                  ),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => const AddTransactionModal(),
          );
        },
        backgroundColor: AppTheme.primaryBlue,
        elevation: 4,
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8.0,
        color: isDark ? AppTheme.darkSurface : AppTheme.lightSurface,
        child: SizedBox(
          height: 60,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.grid_view_rounded, 'Overview'),
              _buildNavItem(1, Icons.pie_chart_rounded, 'Portfolio'),
              _buildNavItem(2, Icons.shield_rounded, 'Risk'),
              const SizedBox(width: 32), // FAB spacer
              _buildNavItem(3, Icons.calculate_rounded, 'SIP'),
              _buildNavItem(4, Icons.explore_rounded, 'Explorer'),
              _buildNavItem(5, Icons.person_rounded, 'Account'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    final color = isSelected
        ? AppTheme.primaryBlue
        : (Theme.of(context).brightness == Brightness.dark
            ? AppTheme.darkTextSecondary
            : AppTheme.lightTextSecondary);

    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
