import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class DiagnosticReportScreen extends StatelessWidget {
  final String issueType;

  const DiagnosticReportScreen({
    super.key,
    required this.issueType,
  });

  @override
  Widget build(BuildContext context) {
    // Determine info based on path
    final isBrake = issueType == 'exhaust'; // simulate other paths
    final titleLabel = isBrake ? "Exhaust O2 Sensor" : "Low Battery Voltage / Terminal Corrosion";
    final errorLabel = isBrake ? "E103" : "B001";
    final severityText = isBrake ? "MODERATE" : "HIGH";
    final estimatedDuration = isBrake ? "30 mins" : "15 mins";
    final diyCostLabel = isBrake ? "\$35" : "\$0";
    final diyCostSub = isBrake ? "OEM sensor replacement" : "Using standard tools";
    final proEstimateCost = isBrake ? "\$140+" : "\$80+";

    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            const Icon(Icons.logo_dev_rounded, color: AppTheme.primaryNeon, size: 24),
            const SizedBox(width: 8),
            Text(
              'MotoAI Diagnostics',
              style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Circular Progress Indicator Gauge Dial Header
            Center(
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      // Gauge Background Glow
                      Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryNeon.withOpacity(0.08),
                              blurRadius: 36,
                              spreadRadius: 4,
                            )
                          ],
                        ),
                      ),
                      
                      // Outer progress ring
                      SizedBox(
                        width: 120,
                        height: 120,
                        child: CircularProgressIndicator(
                          value: 0.98,
                          strokeWidth: 8,
                          backgroundColor: AppTheme.terminalGray,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryNeon),
                        ),
                      ),
                      
                      // Text percentage
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            "98",
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 38,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              height: 1.0,
                            ),
                          ),
                          Text(
                            "%",
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryNeon,
                            ),
                          )
                        ],
                      )
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    "AI Diagnosis Complete",
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "High-confidence resolution detected.",
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.white38,
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Suspect description Card layout
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.cardBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF24242B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.alertRed.withOpacity(0.1),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.alertRed.withOpacity(0.3)),
                        ),
                        child: const Icon(Icons.warning_amber_rounded, color: AppTheme.alertRed, size: 20),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              titleLabel,
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              "Identified via voltage drop analysis and acoustic signature telemetry data.",
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: Colors.white54,
                              ),
                            ),
                          ],
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFF24242B)),
                  const SizedBox(height: 10),

                  // Difficulty and Estimated time
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Difficulty",
                            style: GoogleFonts.jetBrainsMono(
                              fontSize: 9,
                              color: Colors.white38,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _buildWrenchRow(3),
                              const SizedBox(width: 8),
                              Text(
                                "Intermediate",
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            "Estimated Time",
                            style: GoogleFonts.jetBrainsMono(
                              fontSize: 9,
                              color: Colors.white38,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            estimatedDuration,
                            style: GoogleFonts.jetBrainsMono(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryNeon,
                            ),
                          ),
                        ],
                      )
                    ],
                  )
                ],
              ),
            ),
            const SizedBox(height: 16),

            // DIY Costs Comparison grids
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.cardBackground.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF24242B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "DIY COST",
                          style: GoogleFonts.jetBrainsMono(fontSize: 8, color: Colors.white38, letterSpacing: 1.0),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          diyCostLabel,
                          style: GoogleFonts.spaceGrotesk(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.primaryNeon),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          diyCostSub,
                          style: GoogleFonts.inter(fontSize: 10, color: Colors.white54),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.cardBackground.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF24242B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "PRO ESTIMATE",
                          style: GoogleFonts.jetBrainsMono(fontSize: 8, color: Colors.white38, letterSpacing: 1.0),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          proEstimateCost,
                          style: GoogleFonts.spaceGrotesk(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white70),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "Local technician fee",
                          style: GoogleFonts.inter(fontSize: 10, color: Colors.white54),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 30),

            // Startguided button action trigger
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryNeon,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 4,
                shadowColor: AppTheme.primaryNeon.withOpacity(0.3),
              ),
              onPressed: () {
                context.push('/repair?issue=$issueType');
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.play_circle_fill_rounded, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    "Start Guided Repair",
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // External mechanic callback link
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF24242B)),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: () {
                context.push('/mechanics?critical=false');
              },
              child: Text(
                "Find Nearby Mechanics",
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.white70,
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildWrenchRow(int score) {
    return Row(
      children: List.generate(5, (index) {
        final isFilled = index < score;
        return Icon(
          Icons.build,
          size: 11,
          color: isFilled ? AppTheme.primaryNeon : const Color(0xFF2E2E35),
        );
      }),
    );
  }
}
