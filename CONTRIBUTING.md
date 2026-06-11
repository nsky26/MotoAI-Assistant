# Contributing to MotoAI

Thank you for your interest in contributing to MotoAI! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating, you are expected to uphold our code of conduct and respect all community members.

## How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Run tests**: `flutter test`
5. **Commit your changes**: Use clear, descriptive commit messages
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Open a Pull Request**

## Development Setup

### Prerequisites
- Flutter SDK 3.0.0 or higher
- Dart SDK
- Android/iOS emulator or physical device

### Running the App
```bash
flutter pub get
flutter run
```

### Running Tests
```bash
flutter test
```

### Code Generation
This project uses Riverpod for state management. After modifying providers or models:
```bash
flutter pub run build_runner build
```

## Coding Standards

- Follow [Dart style guidelines](https://dart.dev/guides/language/effective-dart)
- Use `flutter analyze` to check for linting issues
- Write meaningful comments for complex logic
- Keep functions small and focused

## Commit Guidelines

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests in body

## Pull Request Process

1. Update README.md if needed for changes
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the CHANGELOG if applicable
5. Request review from maintainers

## Questions?

Feel free to open an issue with the `question` label for any inquiries.