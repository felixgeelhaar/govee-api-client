# Contributing to Govee API TypeScript Client

Thank you for your interest in contributing to the Govee API TypeScript Client! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project follows a Code of Conduct to ensure a welcoming environment for all contributors. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/govee-api-client.git
cd govee-api-client

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

## Development Process

### Branch Strategy

- `main`: Production-ready code, protected branch
- `develop`: Integration branch for new features
- `feature/*`: Individual feature branches
- `hotfix/*`: Critical bug fixes for production

### Workflow

1. Create a feature branch from `develop`
2. Implement your changes
3. Add/update tests
4. Ensure all checks pass
5. Submit a pull request to `develop`

## Coding Standards

### Code Style

- Use TypeScript with strict mode enabled
- Follow existing code formatting (Prettier configured)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Architecture Principles

- Follow Domain-Driven Design (DDD) patterns
- Maintain clear separation of concerns
- Use dependency injection where appropriate
- Keep functions pure when possible

### File Organization

```
src/
├── domain/          # Domain entities and value objects
├── infrastructure/  # External service implementations
├── services/        # Application services
├── errors/          # Custom error classes
└── index.ts         # Public API exports
```

## Testing

### Test Requirements

- All new features must include tests
- Maintain minimum 80% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Test Types

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test interactions with external APIs (mocked)

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests with coverage
npm run test:coverage

# Run tests once
npm test -- --run
```

### Writing Tests

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something when given valid input', () => {
      // Arrange
      const input = createValidInput();

      // Act
      const result = component.methodName(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

## Pull Request Process

### Before Submitting

- [ ] All tests pass
- [ ] Code coverage is maintained above 80%
- [ ] Code is formatted with Prettier
- [ ] TypeScript compiles without errors
- [ ] Documentation is updated (if applicable)

### PR Description

Please include:

- Clear description of changes
- Link to related issues
- Screenshots/examples (if applicable)
- Breaking changes (if any)

### Review Process

1. Automated checks must pass
2. At least one code review approval required
3. All conversations must be resolved
4. No merge conflicts

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Types

- **Stable Release**: Tagged versions on `main` branch
- **Beta Release**: Published from `develop` branch with `-beta` tag
- **Hotfix Release**: Critical fixes published immediately

### Publishing

Releases are automated via GitHub Actions:

1. Create a tag: `git tag v1.2.3`
2. Push tag: `git push origin v1.2.3`
3. GitHub Actions will build, test, and publish to NPM

## Development Guidelines

### API Design

- Keep public API minimal and consistent
- Use builder patterns for complex configurations
- Provide both simple and advanced usage patterns
- Include comprehensive TypeScript types

### Error Handling

- Use custom error classes with specific error codes
- Provide actionable error messages
- Include retry recommendations where applicable
- Log errors at appropriate levels

### Performance

- Implement proper rate limiting
- Cache expensive operations when appropriate
- Use efficient data structures
- Monitor bundle size

### Security

- Never log sensitive information (API keys, tokens)
- Validate all inputs
- Use secure defaults
- Follow security best practices

## Getting Help

- Check existing [issues](https://github.com/felixgeelhaar/govee-api-client/issues)
- Review [documentation](https://github.com/felixgeelhaar/govee-api-client#readme)
- Ask questions in new issues with the `question` label

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions
- Package.json contributors field (for major contributions)

Thank you for contributing to make this library better for everyone!
