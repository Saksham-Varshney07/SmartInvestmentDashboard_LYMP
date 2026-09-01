class Transaction {
  final String id;
  final String type; // BUY or SELL
  final double shares;
  final double price;
  final DateTime date;

  Transaction({
    required this.id,
    required this.type,
    required this.shares,
    required this.price,
    required this.date,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id']?.toString() ?? '',
      type: json['type'] ?? 'BUY',
      shares: (json['shares'] as num?)?.toDouble() ?? 0.0,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'shares': shares,
        'price': price,
        'date': date.toIso8601String(),
      };
}

class PortfolioAsset {
  final String symbol;
  final String name;
  final double shares;
  final double avgPurchasePrice;
  final double currentPrice;
  final double currentValue;
  final double totalProfit;
  final double totalProfitPct;
  final double allocationPct;
  final List<Transaction> history;

  PortfolioAsset({
    required this.symbol,
    required this.name,
    required this.shares,
    required this.avgPurchasePrice,
    required this.currentPrice,
    required this.currentValue,
    required this.totalProfit,
    required this.totalProfitPct,
    required this.allocationPct,
    this.history = const [],
  });

  factory PortfolioAsset.fromJson(Map<String, dynamic> json) {
    List<Transaction> txList = [];
    if (json['history'] != null) {
      txList = (json['history'] as List)
          .map((tx) => Transaction.fromJson(tx))
          .toList();
    }
    return PortfolioAsset(
      symbol: json['symbol'] ?? '',
      name: json['name'] ?? json['symbol'] ?? '',
      shares: (json['shares'] as num?)?.toDouble() ?? 0.0,
      avgPurchasePrice: (json['avg_purchase_price'] as num?)?.toDouble() ?? 0.0,
      currentPrice: (json['current_price'] as num?)?.toDouble() ?? 0.0,
      currentValue: (json['current_value'] as num?)?.toDouble() ?? 0.0,
      totalProfit: (json['total_profit'] as num?)?.toDouble() ?? 0.0,
      totalProfitPct: (json['total_profit_pct'] as num?)?.toDouble() ?? 0.0,
      allocationPct: (json['allocation_pct'] as num?)?.toDouble() ?? 0.0,
      history: txList,
    );
  }

  Map<String, dynamic> toJson() => {
        'symbol': symbol,
        'name': name,
        'shares': shares,
        'avg_purchase_price': avgPurchasePrice,
        'current_price': currentPrice,
        'current_value': currentValue,
        'total_profit': totalProfit,
        'total_profit_pct': totalProfitPct,
        'allocation_pct': allocationPct,
        'history': history.map((e) => e.toJson()).toList(),
      };
}

class PortfolioSummary {
  final double totalInvestment;
  final double portfolioValue;
  final double totalProfit;
  final double totalProfitPct;

  PortfolioSummary({
    required this.totalInvestment,
    required this.portfolioValue,
    required this.totalProfit,
    required this.totalProfitPct,
  });

  factory PortfolioSummary.fromJson(Map<String, dynamic> json) {
    return PortfolioSummary(
      totalInvestment: (json['total_investment'] as num?)?.toDouble() ?? 0.0,
      portfolioValue: (json['portfolio_value'] as num?)?.toDouble() ?? 0.0,
      totalProfit: (json['total_profit'] as num?)?.toDouble() ?? 0.0,
      totalProfitPct: (json['total_profit_pct'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'total_investment': totalInvestment,
        'portfolio_value': portfolioValue,
        'total_profit': totalProfit,
        'total_profit_pct': totalProfitPct,
      };
}

class PortfolioData {
  final PortfolioSummary summary;
  final List<PortfolioAsset> assets;

  PortfolioData({
    required this.summary,
    required this.assets,
  });

  factory PortfolioData.fromJson(Map<String, dynamic> json) {
    List<PortfolioAsset> assetsList = [];
    if (json['assets'] != null) {
      assetsList = (json['assets'] as List)
          .map((a) => PortfolioAsset.fromJson(a))
          .toList();
    }
    return PortfolioData(
      summary: PortfolioSummary.fromJson(json['summary'] ?? {}),
      assets: assetsList,
    );
  }
}
