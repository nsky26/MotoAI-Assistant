import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motoai/core/theme/app_theme.dart';

void main() {
  testWidgets('Theme builds correctly', (WidgetTester tester) async {
    final theme = AppTheme.darkTheme;
    expect(theme.brightness, Brightness.dark);
    expect(theme.scaffoldBackgroundColor, AppTheme.darkBackground);
  });
}
