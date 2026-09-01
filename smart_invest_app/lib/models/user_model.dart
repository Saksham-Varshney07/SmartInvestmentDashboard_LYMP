class UserProfile {
  final int userId;
  final String username;
  final String fullName;
  final String riskProfile;
  final String investmentHorizon;

  UserProfile({
    required this.userId,
    required this.username,
    required this.fullName,
    required this.riskProfile,
    required this.investmentHorizon,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['user_id'] ?? json['id'] ?? 1,
      username: json['username'] ?? 'User',
      fullName: json['full_name'] ?? 'Investor',
      riskProfile: json['risk_profile'] ?? 'Moderate',
      investmentHorizon: json['investment_horizon'] ?? '3-5 years',
    );
  }

  Map<String, dynamic> toJson() => {
        'user_id': userId,
        'username': username,
        'full_name': fullName,
        'risk_profile': riskProfile,
        'investment_horizon': investmentHorizon,
      };
}
