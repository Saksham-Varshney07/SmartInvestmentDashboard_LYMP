import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/portfolio_service.dart';
import '../theme/app_theme.dart';

class AddTransactionModal extends StatefulWidget {
  const AddTransactionModal({super.key});

  @override
  State<AddTransactionModal> createState() => _AddTransactionModalState();
}

class _AddTransactionModalState extends State<AddTransactionModal> {
  final _formKey = GlobalKey<FormState>();
  final _symbolController = TextEditingController();
  final _nameController = TextEditingController();
  final _sharesController = TextEditingController();
  final _priceController = TextEditingController();

  String _transactionType = 'BUY';
  bool _isSearching = false;
  bool _isFetchingPrice = false;
  List<Map<String, String>> _searchResults = [];

  void _onSymbolChanged(String val) async {
    if (val.trim().length < 2) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _isSearching = true);
    final res = await ApiService.searchStocks(val);
    setState(() {
      _searchResults = res;
      _isSearching = false;
    });
  }

  void _selectSearchResult(Map<String, String> item) async {
    _symbolController.text = item['symbol']!;
    _nameController.text = item['shortname']!;
    setState(() {
      _searchResults = [];
      _isFetchingPrice = true;
    });

    // Auto fetch REAL live price from Yahoo Finance
    final analysis = await ApiService.fetchStockAnalysis(item['symbol']!);
    if (analysis['current_price'] != null) {
      _priceController.text = (analysis['current_price'] as num).toStringAsFixed(2);
    }
    setState(() => _isFetchingPrice = false);
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final symbol = _symbolController.text.trim().toUpperCase();
    final name = _nameController.text.trim();
    final shares = double.parse(_sharesController.text);
    final price = double.parse(_priceController.text);

    PortfolioService().addTransaction(
      symbol: symbol,
      name: name,
      type: _transactionType,
      shares: shares,
      price: price,
    );

    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Transaction recorded for $symbol'),
        backgroundColor: AppTheme.accentEmerald,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCard : AppTheme.lightCard,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Record Trade / Transaction',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Buy / Sell Selector Segment
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _transactionType = 'BUY'),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _transactionType == 'BUY'
                              ? AppTheme.accentEmerald
                              : (isDark ? AppTheme.darkBg : AppTheme.lightBg),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'BUY',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _transactionType == 'BUY'
                                ? Colors.white
                                : (isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _transactionType = 'SELL'),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _transactionType == 'SELL'
                              ? AppTheme.accentRose
                              : (isDark ? AppTheme.darkBg : AppTheme.lightBg),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'SELL',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _transactionType == 'SELL'
                                ? Colors.white
                                : (isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Ticker Symbol Input with live Yahoo search
              TextFormField(
                controller: _symbolController,
                onChanged: _onSymbolChanged,
                decoration: InputDecoration(
                  labelText: 'Stock Symbol (e.g. TCS.NS, RELIANCE.NS, BTC-USD)',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  suffixIcon: _isSearching
                      ? const Padding(
                          padding: EdgeInsets.all(12.0),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : null,
                ),
                validator: (val) => val == null || val.isEmpty ? 'Enter symbol' : null,
              ),

              if (_searchResults.isNotEmpty) ...[
                Container(
                  margin: const EdgeInsets.only(top: 6),
                  constraints: const BoxConstraints(maxHeight: 180),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkBg : AppTheme.lightBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? AppTheme.darkBorder : AppTheme.lightBorder),
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _searchResults.length,
                    separatorBuilder: (_, index) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final item = _searchResults[index];
                      return ListTile(
                        dense: true,
                        title: Text(item['symbol']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(item['shortname']!),
                        trailing: Text(item['exchDisp']!, style: const TextStyle(fontSize: 11)),
                        onTap: () => _selectSearchResult(item),
                      );
                    },
                  ),
                ),
              ],
              const SizedBox(height: 14),

              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Company / Asset Name',
                  prefixIcon: const Icon(Icons.business),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _sharesController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Shares / Quantity',
                        prefixIcon: const Icon(Icons.numbers),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Required';
                        if (double.tryParse(val) == null || double.parse(val) <= 0) return 'Invalid';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Live Price (₹)',
                        prefixIcon: const Icon(Icons.currency_rupee),
                        suffixIcon: _isFetchingPrice
                            ? const Padding(
                                padding: EdgeInsets.all(12.0),
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : null,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Required';
                        if (double.tryParse(val) == null || double.parse(val) <= 0) return 'Invalid';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Save Trade', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
