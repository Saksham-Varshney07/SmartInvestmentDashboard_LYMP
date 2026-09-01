import 'package:flutter/material.dart';
import 'services/portfolio_service.dart';
import 'theme/app_theme.dart';
import 'screens/main_navigation_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  PortfolioService().init();
  runApp(const SmartInvestApp());
}

class SmartInvestApp extends StatefulWidget {
  const SmartInvestApp({super.key});

  @override
  State<SmartInvestApp> createState() => _SmartInvestAppState();
}

class _SmartInvestAppState extends State<SmartInvestApp> {
  ThemeMode _themeMode = ThemeMode.dark;

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Investment 360',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: _themeMode,
      home: MainNavigationScreen(onToggleTheme: _toggleTheme),
    );
  }
}
