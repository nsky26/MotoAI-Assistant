<div align="center">
<img width="1200" height="475" alt="MotoAI Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# MotoAI

AI-powered motorcycle diagnosis and repair assistant built with Flutter.

## Features

- **Visual Diagnosis**: Camera-based scanning for motorcycle issues
- **Guided Repair**: Step-by-step repair workflows with verification
- **Mechanic Directory**: Find nearby mechanics and services
- **Diagnostic Reports**: Detailed issue reports and recommendations

## Getting Started

### Prerequisites

- Flutter SDK (3.0.0 or higher)
- Dart SDK
- Android Studio / Xcode / VS Code with Flutter extensions

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   flutter pub get
   ```
3. Run the app:
   ```bash
   flutter run
   ```

## Development

### Project Structure

```
lib/
├── main.dart                    # App entry point
├── core/
│   ├── theme/                   # App theme and styling
│   └── router/                  # Navigation routing
└── features/
    ├── diagnosis/               # Motorcycle diagnosis screens
    ├── repair_workflow/         # Guided repair workflows
    └── mechanic/              # Mechanic directory screens
```

### Building for Production

```bash
flutter build apk    # Android
flutter build ios    # iOS
flutter build web    # Web
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

This project is licensed under the MIT License - see LICENSE file for details.