import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class GuidedRepairScreen extends StatefulWidget {
  final String issueType;

  const GuidedRepairScreen({
    super.key,
    required this.issueType,
  });

  @override
  State<GuidedRepairScreen> createState() => _GuidedRepairScreenState();
}

class _GuidedRepairScreenState extends State<GuidedRepairScreen> {
  int _currentStep = 2; // Step 2 of 5 by default
  bool _flashlightOn = false;
  bool _showBlueprint = false;
  bool _isScanning = false;
  bool _stepVerified = false;

  void _triggerVerify() {
    setState(() {
      _isScanning = true;
    });

    // Simulate 1.5 seconds high-precision telemetry scanning
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        setState(() {
          _isScanning = false;
          _stepVerified = true;
        });
        
        // Show success snackbar
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.primaryNeon,
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.black),
                const SizedBox(width: 8),
                Text(
                  "Step $_currentStep verified via acoustic signature resonance!",
                  style: GoogleFonts.inter(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ],
            ),
          ),
        );
      }
    });
  }

  void _onNextStep() {
    if (_currentStep < 5) {
      setState(() {
        _currentStep++;
        _stepVerified = false;
      });
    } else {
      // Complete! Show dialog or return home
      _showCompletionDialog();
    }
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          "Repair Complete!",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: Text(
          "You have successfully reconnected the battery and calibrated current voltage telemetry. Ride safe!",
          style: GoogleFonts.inter(color: Colors.white70),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryNeon, foregroundColor: Colors.black),
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/');
            },
            child: const Text("Return to Dashboard"),
          )
        ],
      ),
    );
  }

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
          'Guided Repair',
          style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _flashlightOn ? Icons.lightbulb : Icons.lightbulb_outline,
              color: _flashlightOn ? Colors.yellow : Colors.white,
            ),
            onPressed: () {
              setState(() {
                _flashlightOn = !_flashlightOn;
              });
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top banner metadata
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "MOTOAI DIAGNOSTICS DEPT",
                    style: GoogleFonts.jetBrainsMono(fontSize: 9, color: AppTheme.primaryNeon, letterSpacing: 1.0, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "HUD SYS V3.21",
                    style: GoogleFonts.jetBrainsMono(fontSize: 9, color: Colors.white38, letterSpacing: 1.0),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Cybernetic engine block close-up HUD viewfinder frame (Screen 2 image layout)
              Stack(
                children: [
                  Container(
                    height: 240,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: AppTheme.primaryNeon.withOpacity(0.2)),
                      color: Colors.black,
                      image: const DecorationImage(
                        image: AssetImage("src/assets/images/sk_battery_closeup_1781152565527.png"),
                        fit: BoxFit.cover,
                        opacity: 0.75,
                      ),
                    ),
                  ),

                  // Ambient Yellow flashlight beam overlay overlay
                  if (_flashlightOn)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(24),
                          gradient: RadialGradient(
                            center: Alignment.center,
                            radius: 0.6,
                            colors: [
                              Colors.yellow.withOpacity(0.25),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),

                  // Outer scanner reticle corners
                  _buildReticleCorners(),

                  // Circular target lock overlay "BATTERY DETECTED"
                  Center(
                    child: Container(
                      height: 240,
                      alignment: Alignment.center,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Radar Ring
                          Container(
                            width: 130,
                            height: 130,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: AppTheme.primaryNeon.withOpacity(0.4), width: 1.5),
                            ),
                          ),
                          Container(
                            width: 110,
                            height: 110,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: AppTheme.primaryNeon, width: 2),
                            ),
                            padding: const EdgeInsets.all(12),
                            child: const CircularProgressIndicator(
                              value: 0.45,
                              strokeWidth: 1.5,
                              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryNeon),
                            ),
                          ),

                          // Target locking point dot glow
                          Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(
                              color: AppTheme.primaryNeon,
                              shape: BoxShape.circle,
                            ),
                          ),

                          // Bubble Label tag
                          Positioned(
                            top: 25,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryNeon,
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppTheme.primaryNeon.withOpacity(0.3),
                                    blurRadius: 8,
                                  )
                                ],
                              ),
                              child: Text(
                                "BATTERY DETECTED",
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Blueprint overlay overlay
                  if (_showBlueprint)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppTheme.darkBackground.withOpacity(0.92),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              "BOLT SCHEMATIC DIAGRAM",
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.secondaryNeon,
                                letterSpacing: 1.0,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                border: Border.all(color: AppTheme.primaryNeon),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.build_outlined, color: AppTheme.primaryNeon, size: 36),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              "Rotate torque socket anti-clockwise with 8mm socket adapter to dismount battery fastener clip pin.",
                              style: GoogleFonts.inter(fontSize: 12, color: Colors.white70),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: () {
                                setState(() {
                                  _showBlueprint = false;
                                });
                              },
                              child: Text(
                                "CLOSE FRAME",
                                style: GoogleFonts.jetBrainsMono(fontSize: 11, color: AppTheme.primaryNeon, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 20),

              // Progress metric tracker slider
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "REPAIR PROGRESS",
                    style: GoogleFonts.jetBrainsMono(fontSize: 10, color: Colors.white38, letterSpacing: 1.0, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Step $_currentStep of 5",
                    style: GoogleFonts.spaceGrotesk(fontSize: 18, color: AppTheme.secondaryNeon, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Horizontal progress slider bar bar
              Stack(
                children: [
                  Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: AppTheme.terminalGray,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  FractionallySizedBox(
                    widthFactor: _currentStep / 5.0,
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryNeon,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryNeon.withOpacity(0.5),
                            blurRadius: 6,
                          )
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Steps navigations arrows action
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: _currentStep > 1
                        ? () {
                            setState(() {
                              _currentStep--;
                              _stepVerified = false;
                            });
                          }
                        : null,
                    icon: const Icon(Icons.arrow_back_ios, size: 10),
                    label: Text("PREV", style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold)),
                    style: TextButton.styleFrom(foregroundColor: Colors.white54),
                  ),
                  TextButton.icon(
                    onPressed: _stepVerified
                        ? () {
                            _onNextStep();
                          }
                        : null,
                    icon: Text("NEXT", style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold)),
                    label: const Icon(Icons.arrow_forward_ios, size: 10),
                    style: TextButton.styleFrom(foregroundColor: AppTheme.primaryNeon),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Instruction container action required card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.cardBackground,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF24242B)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryNeon.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.build_outlined, color: AppTheme.primaryNeon, size: 20),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                "Action Required",
                                style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              if (_stepVerified) ...[
                                const SizedBox(width: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryNeon.withOpacity(0.15),
                                    border: Border.all(color: AppTheme.primaryNeon),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    "VERIFIED",
                                    style: GoogleFonts.jetBrainsMono(fontSize: 8, color: AppTheme.primaryNeon, fontWeight: FontWeight.bold),
                                  ),
                                )
                              ]
                            ],
                          ),
                          const SizedBox(height: 8),
                          RichText(
                            text: TextSpan(
                              style: GoogleFonts.inter(fontSize: 13, color: Colors.white70, height: 1.5),
                              children: const [
                                TextSpan(text: "Locate the "),
                                TextSpan(
                                  text: "negative terminal\n(black)",
                                  style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryNeon, decoration: TextDecoration.underline),
                                ),
                                TextSpan(text: " and loosen the bolt using an "),
                                TextSpan(
                                  text: "8mm wrench",
                                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontFamily: "monospace"),
                                ),
                                TextSpan(text: "."),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Secondary triggers button arrays
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF24242B)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () {
                        setState(() {
                          _showBlueprint = !_showBlueprint;
                        });
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.visibility_outlined, size: 16, color: Colors.white54),
                          const SizedBox(width: 8),
                          Text("Show Example", style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF24242B)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () {
                        setState(() {
                          _flashlightOn = !_flashlightOn;
                        });
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.lightbulb_outline, size: 16, color: _flashlightOn ? Colors.yellow : Colors.white54),
                          const SizedBox(width: 8),
                          Text(
                            _flashlightOn ? "Torch ON" : "Torch Tool",
                            style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Big active verifying confirmation button actions
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _stepVerified ? AppTheme.primaryNeon : AppTheme.cardBackground,
                  foregroundColor: _stepVerified ? Colors.black : AppTheme.primaryNeon,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: _stepVerified ? Colors.transparent : AppTheme.primaryNeon.withOpacity(0.5),
                    ),
                  ),
                  elevation: 0,
                ),
                onPressed: _isScanning ? null : (_stepVerified ? _onNextStep : _triggerVerify),
                child: _isScanning
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryNeon),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            "SCANNING TELEMETRY...",
                            style: GoogleFonts.jetBrainsMono(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ],
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _stepVerified ? Icons.check_circle_outline_rounded : Icons.check_circle,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _stepVerified ? "Proceed to Next Step" : "Verify Repair Step",
                            style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReticleCorners() {
    return Positioned.fill(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Stack(
          children: [
            // Top Left corner
            Positioned(
              top: 0,
              left: 0,
              child: Container(width: 16, height: 16, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppTheme.primaryNeon, width: 2), left: BorderSide(color: AppTheme.primaryNeon, width: 2)))),
            ),
            // Top Right
            Positioned(
              top: 0,
              right: 0,
              child: Container(width: 16, height: 16, decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppTheme.primaryNeon, width: 2), right: BorderSide(color: AppTheme.primaryNeon, width: 2)))),
            ),
            // Bottom Left
            Positioned(
              bottom: 0,
              left: 0,
              child: Container(width: 16, height: 16, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppTheme.primaryNeon, width: 2), left: BorderSide(color: AppTheme.primaryNeon, width: 2)))),
            ),
            // Bottom Right
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(width: 16, height: 16, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppTheme.primaryNeon, width: 2), right: BorderSide(color: AppTheme.primaryNeon, width: 2)))),
            ),
          ],
        ),
      ),
    );
  }
}
