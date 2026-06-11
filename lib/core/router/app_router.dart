import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Import shell placeholders we have or are preparing
import '../../features/diagnosis/screens/camera_scan_screen.dart';
import '../../features/diagnosis/screens/diagnostic_report_screen.dart';
import '../../features/repair_workflow/screens/guided_repair_screen.dart';
import '../../features/mechanic/screens/mechanic_directory_screen.dart';

final appRouterWithStateProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: 'scan',
        builder: (context, state) => const CameraScanScreen(),
      ),
      GoRoute(
        path: '/report',
        name: 'report',
        builder: (context, state) {
          final issueType = state.uri.queryParameters['issue'] ?? 'battery';
          return DiagnosticReportScreen(issueType: issueType);
        },
      ),
      GoRoute(
        path: '/repair',
        name: 'repair',
        builder: (context, state) {
          final issueType = state.uri.queryParameters['issue'] ?? 'battery';
          return GuidedRepairScreen(issueType: issueType);
        },
      ),
      GoRoute(
        path: '/mechanics',
        name: 'mechanics',
        builder: (context, state) {
          final isCritical = state.uri.queryParameters['critical'] == 'true';
          return MechanicDirectoryScreen(isCritical: isCritical);
        },
      ),
    ],
  );
});
