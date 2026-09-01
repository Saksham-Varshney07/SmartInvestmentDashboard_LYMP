import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/portfolio_service.dart';
import '../theme/app_theme.dart';
import '../widgets/glass_card.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _serverController = TextEditingController();

  bool _isSignup = false;
  bool _isLoading = false;

  String _riskProfile = 'Balanced';
  String _investmentHorizon = 'Medium-term';

  final List<String> _riskProfiles = ['Conservative', 'Balanced', 'Growth', 'Aggressive'];
  final List<String> _investmentHorizons = ['Short-term', 'Medium-term', 'Long-term'];

  @override
  void initState() {
    super.initState();
    _serverController.text = ApiService.baseUrl;
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final username = _usernameController.text.trim();
    final fullName = _fullNameController.text.trim();

    ApiService.baseUrl = _serverController.text.trim();

    final res = await ApiService.loginOrSignup(username, isSignup: _isSignup);

    if (res['status'] == 'success' || res['user_id'] != null) {
      final user = UserProfile(
        userId: (res['user_id'] as num?)?.toInt() ?? 1,
        username: res['username'] ?? username,
        fullName: (res['full_name'] != null && res['full_name'].toString().isNotEmpty)
            ? res['full_name']
            : (fullName.isNotEmpty ? fullName : username),
        riskProfile: res['risk_profile'] ?? _riskProfile,
        investmentHorizon: res['investment_horizon'] ?? _investmentHorizon,
      );

      PortfolioService().setUser(user);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? 'Account not found. Please switch to Sign Up.'),
            backgroundColor: AppTheme.accentRose,
          ),
        );
      }
    }

    if (mounted) setState(() => _isLoading = false);
  }

  void _demoLogin() {
    PortfolioService().setUser(UserProfile(
      userId: 1,
      username: 'Saksham',
      fullName: 'Saksham Varshney',
      riskProfile: 'Growth',
      investmentHorizon: 'Medium-term',
    ));
  }

  // Hidden secret gesture for database/server configuration
  void _openHiddenServerSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.dns, color: AppTheme.primaryBlue),
            SizedBox(width: 10),
            Text('Server & DB Config'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter the backend host URL (e.g. http://10.0.2.2:8000 or your local IP):',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _serverController,
              decoration: InputDecoration(
                labelText: 'Backend URL',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              ApiService.baseUrl = _serverController.text.trim();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Server URL updated')),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBlue, foregroundColor: Colors.white),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: GlassCard(
              padding: const EdgeInsets.all(28),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Icon Logo Header with Secret Long-Press/Tap gesture for DB Settings
                    GestureDetector(
                      onLongPress: _openHiddenServerSettings,
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryBlue.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Icon(
                          _isSignup ? Icons.person_add : Icons.lock_open,
                          size: 32,
                          color: AppTheme.primaryBlue,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    Text(
                      _isSignup ? 'Create Investor Account' : 'Welcome Back',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppTheme.darkTextPrimary : AppTheme.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _isSignup ? 'Set up your investor profile' : 'Login to access your portfolio & risk tools',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppTheme.darkTextSecondary : AppTheme.lightTextSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),

                    // Username Input
                    TextFormField(
                      controller: _usernameController,
                      decoration: InputDecoration(
                        labelText: 'Username',
                        prefixIcon: const Icon(Icons.person),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Please enter username' : null,
                    ),
                    const SizedBox(height: 14),

                    if (_isSignup) ...[
                      // Full Name
                      TextFormField(
                        controller: _fullNameController,
                        decoration: InputDecoration(
                          labelText: 'Full Name',
                          prefixIcon: const Icon(Icons.badge),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Risk Profile Dropdown (Fixed Exact String Matches)
                      DropdownButtonFormField<String>(
                        initialValue: _riskProfile,
                        decoration: InputDecoration(
                          labelText: 'Risk Profile',
                          prefixIcon: const Icon(Icons.shield),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: _riskProfiles
                            .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                            .toList(),
                        onChanged: (val) => setState(() => _riskProfile = val!),
                      ),
                      const SizedBox(height: 14),

                      // Investment Horizon Dropdown (Fixed Exact String Matches)
                      DropdownButtonFormField<String>(
                        initialValue: _investmentHorizon,
                        decoration: InputDecoration(
                          labelText: 'Investment Horizon',
                          prefixIcon: const Icon(Icons.timer),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: _investmentHorizons
                            .map((h) => DropdownMenuItem(value: h, child: Text(h)))
                            .toList(),
                        onChanged: (val) => setState(() => _investmentHorizon = val!),
                      ),
                      const SizedBox(height: 14),
                    ],

                    const SizedBox(height: 10),

                    // Main Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryBlue,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _isLoading
                            ? const CircularProgressIndicator(color: Colors.white)
                            : Text(
                                _isSignup ? 'Create Account' : 'Sign In',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Quick Demo Login Button
                    OutlinedButton.icon(
                      onPressed: _demoLogin,
                      icon: const Icon(Icons.flash_on, color: AppTheme.accentEmerald, size: 18),
                      label: const Text('Quick Demo Sign In (Saksham)', style: TextStyle(color: AppTheme.accentEmerald, fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.accentEmerald),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Toggle Sign In / Sign Up
                    TextButton(
                      onPressed: () => setState(() => _isSignup = !_isSignup),
                      child: Text(
                        _isSignup ? 'Already registered? Click to Sign In' : "Don't have an account? Click to Sign Up",
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
