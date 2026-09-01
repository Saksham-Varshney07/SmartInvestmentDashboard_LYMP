import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/portfolio_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';

class AccountScreen extends StatefulWidget {
  final VoidCallback onToggleTheme;

  const AccountScreen({super.key, required this.onToggleTheme});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final PortfolioService _portfolioService = PortfolioService();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _serverController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _usernameController.text = _portfolioService.user.username;
    _serverController.text = ApiService.baseUrl;
  }

  void _saveProfile() {
    final newUsername = _usernameController.text.trim();
    if (newUsername.isEmpty) return;

    _portfolioService.setUser(UserProfile(
      userId: 1,
      username: newUsername,
      fullName: newUsername,
      riskProfile: _portfolioService.user.riskProfile,
      investmentHorizon: _portfolioService.user.investmentHorizon,
    ));

    ApiService.baseUrl = _serverController.text.trim();

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Settings saved successfully'),
        backgroundColor: AppTheme.accentEmerald,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = _portfolioService.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Avatar Card
            GlassCard(
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppTheme.primaryBlue,
                    child: Text(
                      user.username.isNotEmpty ? user.username[0].toUpperCase() : 'U',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '@${user.username.toLowerCase()}',
                          style: TextStyle(fontSize: 13, color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.accentEmerald.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Risk Profile: ${user.riskProfile}',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.accentEmerald),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            const Text('Profile & Server Settings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            GlassCard(
              child: Column(
                children: [
                  TextField(
                    controller: _usernameController,
                    decoration: InputDecoration(
                      labelText: 'Username',
                      prefixIcon: const Icon(Icons.person),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _serverController,
                    decoration: InputDecoration(
                      labelText: 'Backend Server URL',
                      prefixIcon: const Icon(Icons.dns),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _saveProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryBlue,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Save Profile Settings', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            const Text('Preferences', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            GlassCard(
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.dark_mode, color: AppTheme.primaryBlue),
                    title: const Text('Dark Mode / Theme'),
                    trailing: Switch(
                      value: isDark,
                      activeColor: AppTheme.primaryBlue,
                      onChanged: (_) => widget.onToggleTheme(),
                    ),
                  ),
                  const Divider(),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.currency_rupee, color: AppTheme.accentEmerald),
                    title: const Text('Default Currency'),
                    trailing: const Text('INR (₹)', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 30),

            const Center(
              child: Text(
                'Smart Investment 360 v1.0.0 • Built with Flutter',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
