import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/asset_model.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class PortfolioService extends ChangeNotifier {
  static final PortfolioService _instance = PortfolioService._internal();
  factory PortfolioService() => _instance;
  PortfolioService._internal();

  // Unauthenticated by default so Login / Sign Up screen appears first!
  UserProfile _user = UserProfile(
    userId: 0,
    username: '',
    fullName: '',
    riskProfile: 'Balanced',
    investmentHorizon: 'Medium-term',
  );

  String _portfolioType = 'real'; // 'real' or 'sandbox'
  bool _isLoading = false;
  
  // Real Assets
  List<PortfolioAsset> _realAssets = [];

  // Sandbox Assets
  List<PortfolioAsset> _sandboxAssets = [];

  UserProfile get user => _user;
  String get portfolioType => _portfolioType;
  bool get isLoading => _isLoading;

  List<PortfolioAsset> get currentAssets =>
      _portfolioType == 'real' ? _realAssets : _sandboxAssets;

  PortfolioSummary get currentSummary {
    double totalInvested = 0;
    double currentVal = 0;

    for (var asset in currentAssets) {
      totalInvested += asset.shares * asset.avgPurchasePrice;
      currentVal += asset.currentValue;
    }

    double profit = currentVal - totalInvested;
    double profitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return PortfolioSummary(
      totalInvestment: totalInvested,
      portfolioValue: currentVal,
      totalProfit: profit,
      totalProfitPct: profitPct,
    );
  }

  void init() async {
    await loadLocalState();
    if (_user.username.isNotEmpty) {
      refreshPortfolio();
    }
  }

  void setPortfolioType(String type) {
    _portfolioType = type;
    notifyListeners();
    saveLocalState();
    if (_user.username.isNotEmpty) {
      refreshPortfolio();
    }
  }

  void setUser(UserProfile newUser) {
    _user = newUser;
    notifyListeners();
    saveLocalState();
    if (_user.username.isNotEmpty) {
      refreshPortfolio();
    }
  }

  void logout() async {
    _user = UserProfile(
      userId: 0,
      username: '',
      fullName: '',
      riskProfile: 'Balanced',
      investmentHorizon: 'Medium-term',
    );
    _realAssets = [];
    _sandboxAssets = [];
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('user');
      await prefs.remove('realAssets');
      await prefs.remove('sandboxAssets');
    } catch (e) {
      //
    }
  }

  Future<void> refreshPortfolio() async {
    if (_user.userId <= 0) return;
    _isLoading = true;
    notifyListeners();

    final fetched = await ApiService.fetchPortfolio(_user.userId, _portfolioType);
    if (fetched != null && fetched.assets.isNotEmpty) {
      if (_portfolioType == 'real') {
        _realAssets = fetched.assets;
      } else {
        _sandboxAssets = fetched.assets;
      }
    }

    // Refresh live quotes from Yahoo Finance
    final assetsToUpdate = _portfolioType == 'real' ? _realAssets : _sandboxAssets;
    for (int i = 0; i < assetsToUpdate.length; i++) {
      final a = assetsToUpdate[i];
      final quote = await ApiService.fetchStockAnalysis(a.symbol);
      if (quote['current_price'] != null) {
        final double livePrice = (quote['current_price'] as num).toDouble();
        final double currentVal = a.shares * livePrice;
        final double profit = currentVal - (a.shares * a.avgPurchasePrice);
        final double profitPct = (a.shares * a.avgPurchasePrice) > 0
            ? (profit / (a.shares * a.avgPurchasePrice)) * 100
            : 0.0;

        assetsToUpdate[i] = PortfolioAsset(
          symbol: a.symbol,
          name: a.name,
          shares: a.shares,
          avgPurchasePrice: a.avgPurchasePrice,
          currentPrice: livePrice,
          currentValue: currentVal,
          totalProfit: profit,
          totalProfitPct: profitPct,
          allocationPct: a.allocationPct,
          history: a.history,
        );
      }
    }

    recalculateAllocations(assetsToUpdate);
    _isLoading = false;
    notifyListeners();
  }

  Future<void> addTransaction({
    required String symbol,
    required String name,
    required String type,
    required double shares,
    required double price,
  }) async {
    final list = _portfolioType == 'real' ? _realAssets : _sandboxAssets;
    
    int existingIdx = list.indexWhere((a) => a.symbol.toUpperCase() == symbol.toUpperCase());

    if (existingIdx >= 0) {
      final existing = list[existingIdx];
      double newShares = type == 'BUY'
          ? existing.shares + shares
          : (existing.shares - shares).clamp(0.0, double.infinity);
      
      double newAvgPrice = type == 'BUY'
          ? ((existing.shares * existing.avgPurchasePrice) + (shares * price)) / (newShares > 0 ? newShares : 1)
          : existing.avgPurchasePrice;

      if (newShares <= 0) {
        list.removeAt(existingIdx);
      } else {
        double currentVal = newShares * price;
        double profit = currentVal - (newShares * newAvgPrice);
        double profitPct = (profit / (newShares * newAvgPrice)) * 100;

        final newHistory = List<Transaction>.from(existing.history)
          ..add(Transaction(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            type: type,
            shares: shares,
            price: price,
            date: DateTime.now(),
          ));

        list[existingIdx] = PortfolioAsset(
          symbol: symbol,
          name: name.isNotEmpty ? name : symbol,
          shares: newShares,
          avgPurchasePrice: newAvgPrice,
          currentPrice: price,
          currentValue: currentVal,
          totalProfit: profit,
          totalProfitPct: profitPct,
          allocationPct: 0,
          history: newHistory,
        );
      }
    } else if (type == 'BUY') {
      double currentVal = shares * price;
      list.add(PortfolioAsset(
        symbol: symbol,
        name: name.isNotEmpty ? name : symbol,
        shares: shares,
        avgPurchasePrice: price,
        currentPrice: price,
        currentValue: currentVal,
        totalProfit: 0.0,
        totalProfitPct: 0.0,
        allocationPct: 0,
        history: [
          Transaction(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            type: type,
            shares: shares,
            price: price,
            date: DateTime.now(),
          )
        ],
      ));
    }

    recalculateAllocations(list);
    notifyListeners();
    saveLocalState();

    // Sync transaction with backend DB
    if (_user.userId > 0) {
      ApiService.addTransaction(
        userId: _user.userId,
        symbol: symbol,
        type: type,
        shares: shares,
        price: price,
        portfolioType: _portfolioType,
      );
    }
  }

  void deleteAsset(String symbol) {
    final list = _portfolioType == 'real' ? _realAssets : _sandboxAssets;
    list.removeWhere((a) => a.symbol.toUpperCase() == symbol.toUpperCase());
    recalculateAllocations(list);
    notifyListeners();
    saveLocalState();
  }

  void recalculateAllocations(List<PortfolioAsset> assets) {
    double totalVal = 0;
    for (var a in assets) {
      totalVal += a.currentValue;
    }
    if (totalVal <= 0) return;

    for (int i = 0; i < assets.length; i++) {
      final a = assets[i];
      final pct = (a.currentValue / totalVal) * 100;
      assets[i] = PortfolioAsset(
        symbol: a.symbol,
        name: a.name,
        shares: a.shares,
        avgPurchasePrice: a.avgPurchasePrice,
        currentPrice: a.currentPrice,
        currentValue: a.currentValue,
        totalProfit: a.totalProfit,
        totalProfitPct: a.totalProfitPct,
        allocationPct: pct,
        history: a.history,
      );
    }
  }

  Future<void> saveLocalState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_user.username.isNotEmpty) {
        prefs.setString('user', jsonEncode(_user.toJson()));
      } else {
        prefs.remove('user');
      }
      prefs.setString('portfolioType', _portfolioType);
      prefs.setString('realAssets', jsonEncode(_realAssets.map((e) => e.toJson()).toList()));
      prefs.setString('sandboxAssets', jsonEncode(_sandboxAssets.map((e) => e.toJson()).toList()));
    } catch (e) {
      //
    }
  }

  Future<void> loadLocalState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userStr = prefs.getString('user');
      if (userStr != null) {
        _user = UserProfile.fromJson(jsonDecode(userStr));
      }

      _portfolioType = prefs.getString('portfolioType') ?? 'real';

      final realStr = prefs.getString('realAssets');
      if (realStr != null) {
        final List decoded = jsonDecode(realStr);
        _realAssets = decoded.map((e) => PortfolioAsset.fromJson(e)).toList();
      }

      final sandboxStr = prefs.getString('sandboxAssets');
      if (sandboxStr != null) {
        final List decoded = jsonDecode(sandboxStr);
        _sandboxAssets = decoded.map((e) => PortfolioAsset.fromJson(e)).toList();
      }
    } catch (e) {
      //
    }
  }
}
