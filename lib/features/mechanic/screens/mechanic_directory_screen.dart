import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class MechanicDirectoryScreen extends StatelessWidget {
  final bool isCritical;

  const MechanicDirectoryScreen({
    super.key,
    required this.isCritical,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: Text(
          "Nearby Certified Mechanics",
          style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Critical warning card banner (Screen 3 layout)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1F0D0D), // Dark Warning Crimson
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF5C1E1E)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(color: Color(0xFF7C1F1F), shape: BoxShape.circle),
                        child: const Icon(Icons.cancel, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.warning, color: Colors.amber, size: 40),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "CRITICAL: BRAKE SYSTEM FAILURE",
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF381010),
                      border: Border.all(color: const Color(0xFF5C1E1E)),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      "SEVERITY LEVEL: 5/5 (DANGEROUS)",
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFFFCA5A5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "Unsafe to continue DIY repair. Professional assistance required immediately to prevent hydraulic lock or total pressure loss.",
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: const Color(0xFFFECACA),
                    ),
                    textAlign: TextAlign.center,
                  )
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Estimated Repair Cost Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.cardBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF24242B)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.payment, color: AppTheme.primaryNeon, size: 24),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "EST. REPAIR COST",
                        style: GoogleFonts.jetBrainsMono(fontSize: 9, color: Colors.white38, letterSpacing: 1.0, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "\$350 — \$500",
                        style: GoogleFonts.spaceGrotesk(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        "Includes hydraulic fluid flush & caliper replacement.",
                        style: GoogleFonts.inter(fontSize: 10, color: Colors.white54),
                      ),
                    ],
                  )
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Status Indicator Scale bar
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.cardBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF24242B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.new_releases_outlined, color: Colors.pinkAccent, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            "SEVERITY LEVEL",
                            style: GoogleFonts.jetBrainsMono(fontSize: 9, color: Colors.white38, letterSpacing: 1.0, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Text(
                        "HIGH CODE: B001",
                        style: GoogleFonts.jetBrainsMono(fontSize: 9, color: Colors.white70, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 5,
                    decoration: BoxDecoration(
                      color: AppTheme.terminalGray,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: FractionallySizedBox(
                      alignment: Alignment.centerLeft,
                      widthFactor: 0.85,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.redAccent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Verified Header metadata
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Nearby Certified Mechanics",
                  style: GoogleFonts.spaceGrotesk(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Row(
                  children: [
                    const Icon(Icons.verified, color: AppTheme.primaryNeon, size: 12),
                    const SizedBox(width: 4),
                    Text(
                      "VERIFIED BY MOTOAI",
                      style: GoogleFonts.jetBrainsMono(fontSize: 8, color: AppTheme.primaryNeon, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Mechanics list cards
            _buildMechanicCard(
              context,
              name: "Apex Precision Moto",
              rating: "4.9",
              reviews: "214 reviews",
              distance: "0.8 miles away",
              avatarUrl: "https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&q=80&w=150",
            ),
            const SizedBox(height: 14),
            _buildMechanicCard(
              context,
              name: "Nitro Diagnostics Hub",
              rating: "4.7",
              reviews: "128 reviews",
              distance: "2.4 miles away",
              avatarUrl: "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&q=80&w=150",
            ),
            const SizedBox(height: 20),

            // AI Recommendation Banner info box
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF0C1914),
                    AppTheme.darkBackground,
                  ],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
                border: const Border(
                  left: BorderSide(color: AppTheme.primaryNeon, width: 4),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.psychology_outlined, color: AppTheme.primaryNeon, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        "AI RECOMMENDATION",
                        style: GoogleFonts.jetBrainsMono(fontSize: 10, color: AppTheme.primaryNeon, fontWeight: FontWeight.bold),
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Based on your telemetry, the front rotor has reached a critical heat point. Avoid braking hard until a professional inspects the calipers.",
                    style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, height: 1.5),
                  )
                ],
              ),
            ),
            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }

  Widget _buildMechanicCard(
    BuildContext context, {
    required String name,
    required String rating,
    required String reviews,
    required String distance,
    required String avatarUrl,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF24242B)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.primaryNeon.withOpacity(0.3)),
                  image: DecorationImage(
                    image: NetworkImage(avatarUrl),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          rating,
                          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          "($reviews)  |  $distance",
                          style: GoogleFonts.inter(fontSize: 11, color: Colors.white38),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF24242B)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {},
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.explore_outlined, size: 16, color: Colors.white70),
                      const SizedBox(width: 6),
                      Text("Navigate", style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFCA5A5).withOpacity(0.15),
                    foregroundColor: const Color(0xFFFECACA),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: const BorderSide(color: Color(0xFF7F1D1D)),
                    ),
                  ),
                  onPressed: () {},
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.phone_in_talk_outlined, size: 16),
                      const SizedBox(width: 6),
                      Text("Call Mechanic", style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}
