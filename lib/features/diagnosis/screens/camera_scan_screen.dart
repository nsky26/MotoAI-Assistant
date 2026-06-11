import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';

class CameraScanScreen extends ConsumerStatefulWidget {
  const CameraScanScreen({super.key});

  @override
  ConsumerState<CameraScanScreen> createState() => _CameraScanScreenState();
}

class _CameraScanScreenState extends ConsumerState<CameraScanScreen> with SingleTickerProviderStateMixin {
  late AnimationController _scannerController;
  bool _isRecording = true;
  String _activeTag = "clicking";
  final List<double> _waveAmplitudes = [15, 30, 10, 45, 20, 60, 25, 40, 15, 30, 10];
  final Random _random = Random();

  bool _flashOn = false;
  bool _showGrid = true;
  String _lensMode = "lidar";
  double _zoomScale = 1.0;
  String _resSetting = "1080p_60";
  bool _showSettings = false;

  @override
  void initState() {
    super.initState();
    _scannerController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    // Simulate real-time audio amplitudes pulsing
    Future.doWhile(() async {
      await Future.delayed(const Duration(milliseconds: 150));
      if (!mounted) return false;
      if (_isRecording) {
        setState(() {
          for (int i = 0; i < _waveAmplitudes.length; i++) {
            _waveAmplitudes[i] = _random.nextDouble() * 50 + 10;
          }
        });
      }
      return true;
    });
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  void _onTagSelected(String tag, String query) {
    setState(() {
      _activeTag = tag;
    });
    // Route to diagnostic report
    context.push('/report?issue=$query');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.logo_dev_rounded, color: AppTheme.primaryNeon, size: 28),
            const SizedBox(width: 8),
            Text(
              'MotoAI',
              style: GoogleFonts.spaceGrotesk(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_circle_outlined, color: Colors.white70),
            onPressed: () {},
          )
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 10),
              
              // Animated Instruction Display Heading
              Center(
                child: Column(
                  children: [
                    Text(
                      "Point camera at motorcycle",
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.secondaryNeon.withOpacity(0.3)),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            "and describe the issue",
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.secondaryNeon,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Filter Presets tags
              Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.center,
                children: [
                  _buildIssueTag("Bike not starting", "battery", "battery"),
                  _buildIssueTag("Strange noise", "clicking", "battery"),
                  _buildIssueTag("Smoke detected", "exhaust", "exhaust"),
                  _buildIssueTag("Battery issue", "corrosion", "battery"),
                ],
              ),
              const SizedBox(height: 24),

              // Cybernetic Neon Lidar Camera Viewfinder Frame
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: AppTheme.primaryNeon.withOpacity(0.15)),
                          color: Colors.black,
                        ),
                        child: Stack(
                          children: [
                            // Climate Optical Lens / Scale Engine
                            Positioned.fill(
                              child: AnimatedScale(
                                scale: _zoomScale,
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeOutCubic,
                                child: ColorFiltered(
                                  colorFilter: ColorFilter.matrix(
                                    _lensMode == "thermal"
                                        ? [
                                            -1.0, 0.0, 0.0, 0.0, 255.0, // Red
                                            0.0, 1.0, 0.0, 0.0, 0.0,   // Green
                                            0.0, 0.0, 2.0, 0.0, 0.0,   // Blue
                                            0.0, 0.0, 0.0, 1.0, 0.0,   // Alpha
                                          ]
                                        : _lensMode == "xray"
                                            ? [
                                                -1.0, 0.0, 0.0, 0.0, 255.0,
                                                0.0, -1.0, 0.0, 0.0, 255.0,
                                                0.0, 0.0, -1.0, 0.0, 255.0,
                                                0.0, 0.0, 0.0, 1.0, 0.0,
                                              ]
                                            : [
                                                1.0, 0.0, 0.0, 0.0, 0.0,
                                                0.0, 1.0, 0.0, 0.0, 0.0,
                                                0.0, 0.0, 1.0, 0.0, 0.0,
                                                0.0, 0.0, 0.0, 1.0, 0.0,
                                              ],
                                  ),
                                  child: Image.asset(
                                    "src/assets/images/sk_bike_bg_1781152534434.png",
                                    width: double.infinity,
                                    height: double.infinity,
                                    fit: BoxFit.cover,
                                    opacity: const AlwaysStoppedAnimation(0.65),
                                  ),
                                ),
                              ),
                            ),

                            // Flashlight Highintensity Beam overlay
                            if (_flashOn)
                              Positioned.fill(
                                child: IgnorePointer(
                                  child: Container(
                                    decoration: BoxDecoration(
                                      gradient: RadialGradient(
                                        center: Alignment.center,
                                        radius: 0.8,
                                        colors: [
                                          Colors.white.withOpacity(0.35),
                                          Colors.white.withOpacity(0.01),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),

                            // 3x3 Composition Guidelines Grid lines
                            if (_showGrid)
                              Positioned.fill(
                                child: IgnorePointer(
                                  child: CustomPaint(
                                    painter: CameraGridPainter(),
                                  ),
                                ),
                              ),

                            // Corner Reticle Brackets
                            _buildReticleCorners(),

                            // Laser Line Scanner overlay (active in Lidar scanner)
                            if (_lensMode == "lidar")
                              AnimatedBuilder(
                                animation: _scannerController,
                                builder: (context, child) {
                                  return Positioned(
                                    top: _scannerController.value * (constraints.maxHeight - 4),
                                    left: 12,
                                    right: 12,
                                    child: Container(
                                      height: 3,
                                      decoration: BoxDecoration(
                                        boxShadow: [
                                          BoxShadow(
                                            color: AppTheme.primaryNeon.withOpacity(0.8),
                                            blurRadius: 10,
                                            spreadRadius: 2,
                                          )
                                        ],
                                        gradient: const LinearGradient(
                                          colors: [
                                            Colors.transparent,
                                            AppTheme.primaryNeon,
                                            AppTheme.primaryNeon,
                                            Colors.transparent,
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),

                            // Lidar dynamic targeting boxes overlay (active except in X-Ray)
                            if (_lensMode != "xray")
                              Positioned(
                                top: constraints.maxHeight * 0.42,
                                right: constraints.maxWidth * 0.12,
                                child: Container(
                                  width: constraints.maxWidth * 0.38,
                                  height: constraints.maxHeight * 0.28,
                                  decoration: BoxDecoration(
                                    border: Border.all(color: AppTheme.secondaryNeon, width: 1.5),
                                    color: AppTheme.secondaryNeon.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Stack(
                                    clipBehavior: Clip.none,
                                    children: [
                                      Positioned(
                                        top: -18,
                                        left: 0,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: AppTheme.primaryNeon,
                                            borderRadius: BorderRadius.circular(2),
                                          ),
                                          child: Text(
                                            _lensMode == "thermal" ? "THERMAL BLOCK" : "BATTERY CLUSTER",
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

                            if (_lensMode != "xray")
                              Positioned(
                                bottom: constraints.maxHeight * 0.18,
                                left: constraints.maxWidth * 0.2,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.terminalGray,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.white24, width: 0.5),
                                  ),
                                  child: Text(
                                    "ENGINE BLOCK",
                                    style: GoogleFonts.jetBrainsMono(
                                      fontSize: 9,
                                      color: Colors.white70,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),

                            // Camera settings action bar top-right
                            Positioned(
                              top: 12,
                              right: 12,
                              child: Row(
                                children: [
                                  _buildControlIcon(
                                    icon: _flashOn ? Icons.flash_on : Icons.flash_off,
                                    isActive: _flashOn,
                                    onTap: () {
                                      setState(() {
                                        _flashOn = !_flashOn;
                                      });
                                    },
                                  ),
                                  const SizedBox(width: 8),
                                  _buildControlIcon(
                                    icon: _showGrid ? Icons.grid_on : Icons.grid_off,
                                    isActive: _showGrid,
                                    onTap: () {
                                      setState(() {
                                        _showGrid = !_showGrid;
                                      });
                                    },
                                  ),
                                  const SizedBox(width: 8),
                                  _buildControlIcon(
                                    icon: Icons.tune_rounded,
                                    isActive: _showSettings,
                                    onTap: () {
                                      setState(() {
                                        _showSettings = !_showSettings;
                                      });
                                    },
                                  ),
                                ],
                              ),
                            ),

                            // Calibration live telemetry tag bottom-left
                            Positioned(
                              bottom: 15,
                              left: 15,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.7),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: AppTheme.primaryNeon.withOpacity(0.3)),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: const BoxDecoration(
                                        color: AppTheme.primaryNeon,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      "${_lensMode.toUpperCase()} | ${_resSetting.replaceAll('_', ' @ ')} FPS | ZOOM ${_zoomScale.toStringAsFixed(1)}x",
                                      style: GoogleFonts.jetBrainsMono(
                                        fontSize: 8,
                                        color: AppTheme.primaryNeon,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // INTERACTIVE SETTINGS GLASS DRAWER DIALOG
                            if (_showSettings)
                              Positioned.fill(
                                child: Container(
                                  margin: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withOpacity(0.96),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: AppTheme.primaryNeon.withOpacity(0.2)),
                                  ),
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              const Icon(Icons.settings_suggest, color: AppTheme.primaryNeon, size: 18),
                                              const SizedBox(width: 8),
                                              Text(
                                                "Camera Settings",
                                                style: GoogleFonts.spaceGrotesk(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.white,
                                                ),
                                              ),
                                            ],
                                          ),
                                          GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                _showSettings = false;
                                              });
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: Colors.white10,
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                "CLOSE",
                                                style: GoogleFonts.jetBrainsMono(
                                                  fontSize: 10,
                                                  color: Colors.white70,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const Divider(color: Colors.white12, height: 16),
                                      const SizedBox(height: 4),

                                      // Optical lens mode selector
                                      Text(
                                        "Optical Engine Mode",
                                        style: GoogleFonts.jetBrainsMono(fontSize: 8, color: Colors.white54),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Expanded(child: _buildSettingsChip("LIDAR Scanner", "lidar", _lensMode, (v) => setState(() => _lensMode = v))),
                                          const SizedBox(width: 8),
                                          Expanded(child: _buildSettingsChip("Standard View", "standard", _lensMode, (v) => setState(() => _lensMode = v))),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Expanded(child: _buildSettingsChip("Thermal Sensor", "thermal", _lensMode, (v) => setState(() => _lensMode = v))),
                                          const SizedBox(width: 8),
                                          Expanded(child: _buildSettingsChip("X-Ray Depth", "xray", _lensMode, (v) => setState(() => _lensMode = v))),
                                        ],
                                      ),
                                      const SizedBox(height: 12),

                                      // Zoom chip factors
                                      Text(
                                        "Digital Telephoto Zoom",
                                        style: GoogleFonts.jetBrainsMono(fontSize: 8, color: Colors.white54),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [1.0, 1.5, 2.0, 3.0].map((zoom) {
                                          final isActive = _zoomScale == zoom;
                                          return Expanded(
                                            child: Padding(
                                              padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                              child: GestureDetector(
                                                onTap: () => setState(() => _zoomScale = zoom),
                                                child: Container(
                                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                                  decoration: BoxDecoration(
                                                    color: isActive ? AppTheme.primaryNeon : Colors.white10,
                                                    borderRadius: BorderRadius.circular(6),
                                                    border: Border.all(color: isActive ? Colors.transparent : Colors.white12),
                                                  ),
                                                  alignment: Alignment.center,
                                                  child: Text(
                                                    "${zoom.toStringAsFixed(1)}x",
                                                    style: GoogleFonts.jetBrainsMono(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                      color: isActive ? Colors.black : Colors.white70,
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                      const SizedBox(height: 12),

                                      // Quality/FPS selection
                                      Text(
                                        "Capture & FPS Resolution",
                                        style: GoogleFonts.jetBrainsMono(fontSize: 8, color: Colors.white54),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Expanded(child: _buildSettingsChip("1080p @ 60", "1080p_60", _resSetting, (v) => setState(() => _resSetting = v))),
                                          const SizedBox(width: 6),
                                          Expanded(child: _buildSettingsChip("4K @ 30", "4K_30", _resSetting, (v) => setState(() => _resSetting = v))),
                                          const SizedBox(width: 6),
                                          Expanded(child: _buildSettingsChip("720p @ 120", "720p_120", _resSetting, (v) => setState(() => _resSetting = v))),
                                        ],
                                      ),
                                      const Spacer(),

                                      // Sensors calibrate footer diagnostic
                                      Container(
                                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
                                        decoration: BoxDecoration(
                                          color: Colors.white12,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text("SENSORS: CALIBRATED", style: GoogleFonts.jetBrainsMono(fontSize: 8, color: AppTheme.primaryNeon, fontWeight: FontWeight.bold)),
                                            Text("ISO: AUTO", style: GoogleFonts.jetBrainsMono(fontSize: 8, color: Colors.white60)),
                                            Text("FPS: ${_resSetting.split('_')[1]}", style: GoogleFonts.jetBrainsMono(fontSize: 8, color: AppTheme.primaryNeon, fontWeight: FontWeight.bold)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),

              // Transcript Audio dialog overlay
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.cardBackground.withOpacity(0.85),
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
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: _isRecording ? AppTheme.primaryNeon : Colors.grey,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _isRecording ? "AI SYNCING..." : "MIC CALIBRATED",
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryNeon,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          "LIDAR ACTIVE",
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9,
                            color: Colors.white38,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '"I\'m hearing a clicking sound near the battery..."',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w500,
                        color: Colors.white,
                      ),
                    ),
                    if (_isRecording) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: _waveAmplitudes.map((amp) => Container(
                          width: 4,
                          height: amp * 0.6,
                          margin: const EdgeInsets.symmetric(horizontal: 2.5),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryNeon,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        )).toList(),
                      ),
                    ]
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Animated Sound Trigger Mic Button
              Center(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isRecording = !_isRecording;
                    });
                  },
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isRecording ? AppTheme.primaryNeon : AppTheme.cardBackground,
                      boxShadow: [
                        BoxShadow(
                          color: (_isRecording ? AppTheme.primaryNeon : Colors.black).withOpacity(0.4),
                          blurRadius: 16,
                          spreadRadius: 4,
                        )
                      ],
                      border: Border.all(
                        color: _isRecording ? Colors.white30 : AppTheme.terminalGray,
                        width: 1.5,
                      ),
                    ),
                    child: Icon(
                      _isRecording ? Icons.mic : Icons.mic_none_outlined,
                      color: _isRecording ? Colors.black : AppTheme.primaryNeon,
                      size: 32,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 25),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIssueTag(String label, String tag, String query) {
    final isActive = _activeTag == tag;
    return GestureDetector(
      onTap: () => _onTagSelected(tag, query),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primaryNeon.withOpacity(0.1) : AppTheme.cardBackground,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: isActive ? AppTheme.primaryNeon : const BorderSide().color,
            width: isActive ? 1.5 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isActive ? AppTheme.primaryNeon : Colors.white70,
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

  Widget _buildControlIcon({
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primaryNeon : Colors.black.withOpacity(0.6),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? Colors.white30 : Colors.white12,
            width: 1,
          ),
        ),
        child: Icon(
          icon,
          color: isActive ? Colors.black : Colors.white70,
          size: 16,
        ),
      ),
    );
  }

  Widget _buildSettingsChip(String label, String value, String groupValue, ValueChanged<String> onChanged) {
    final isActive = value == groupValue;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primaryNeon.withOpacity(0.15) : Colors.white10,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: isActive ? AppTheme.primaryNeon : Colors.white12),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: isActive ? AppTheme.primaryNeon : Colors.white70,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class CameraGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white24
      ..strokeWidth = 1.0;
    
    // Draw vertical grid lines
    canvas.drawLine(Offset(size.width / 3, 0), Offset(size.width / 3, size.height), paint);
    canvas.drawLine(Offset(size.width * 2 / 3, 0), Offset(size.width * 2 / 3, size.height), paint);
    
    // Draw horizontal grid lines
    canvas.drawLine(Offset(0, size.height / 3), Offset(size.width, size.height / 3), paint);
    canvas.drawLine(Offset(0, size.height * 2 / 3), Offset(size.width, size.height * 2 / 3), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
