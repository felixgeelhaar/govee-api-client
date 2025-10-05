# Contributing to Govee API Client

Thank you for your interest in contributing to the Govee API TypeScript Client! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Areas for Contribution](#areas-for-contribution)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and considerate in all interactions
- Provide constructive feedback
- Focus on what's best for the community and project
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or inappropriate comments
- Trolling or insulting/derogatory comments
- Publishing others' private information
- Other conduct that would be inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- **Node.js:** 20.0.0 or higher
- **npm:** 10.0.0 or higher
- **Git:** Latest version
- **TypeScript:** 5.x knowledge
- **Testing:** Vitest experience helpful

### Initial Setup

1. **Fork the repository**
   ```bash
   # Visit https://github.com/felixgeelhaar/govee-api-client
   # Click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/govee-api-client.git
   cd govee-api-client
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/felixgeelhaar/govee-api-client.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up environment**
   ```bash
   # Copy .env.example to .env (if it exists)
   # Add your Govee API key for testing
   export GOVEE_API_KEY='your-api-key-here'
   ```

6. **Verify setup**
   ```bash
   npm run build
   npm test
   ```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow these principles:

- **Domain-Driven Design (DDD):** Organize code by domain concepts
- **Test-Driven Development (TDD):** Write tests first when possible
- **SOLID Principles:** Keep code modular and maintainable
- **No Placeholders:** Implement complete, production-ready functionality

### 3. Run Tests Frequently

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/value-objects/LightScene.test.ts
```

### 4. Ensure Code Quality

```bash
# Type checking
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Build project
npm run build
```

---

## Code Standards

### TypeScript

- **Strict mode enabled:** All code must compile with strict TypeScript
- **Explicit types:** Use explicit type annotations for function parameters and return types
- **No `any`:** Avoid `any` type; use proper types or `unknown`
- **Immutability:** Prefer `readonly` and immutable patterns

**Example:**
```typescript
// Good
export class LightScene {
  private readonly _id: number;
  private readonly _name: string;

  constructor(id: number, name: string) {
    this._id = id;
    this._name = name;
    Object.freeze(this);
  }

  get id(): number {
    return this._id;
  }
}

// Bad
export class LightScene {
  id: any;
  name: string;

  constructor(id, name) {  // Missing types
    this.id = id;
    this.name = name;
  }
}
```

### Architecture Patterns

**Domain Layer (src/domain/):**
- Value Objects: Immutable, validated primitives
- Entities: Domain objects with identity
- Repositories: Data access interfaces

**Infrastructure Layer (src/infrastructure/):**
- Repository implementations
- External API communication
- Rate limiting, retry logic

**Service Layer (src/services/):**
- Application services
- Use case orchestration

### File Organization

```
src/
├── domain/
│   ├── entities/          # Core domain entities
│   ├── value-objects/     # Immutable value objects
│   └── repositories/      # Repository interfaces
├── infrastructure/        # External concerns
│   ├── retry/            # Retry mechanisms
│   └── *.ts              # Repository implementations
├── services/             # Application services
└── errors/               # Custom error classes

tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── benchmarks/          # Performance tests
```

---

## Testing Requirements

### Test Coverage Standards

- **Minimum coverage:** 70% overall
- **Value objects:** 90%+ coverage required
- **Critical paths:** 100% coverage required

### Test Types

**Unit Tests:**
- Test individual components in isolation
- Mock external dependencies
- Fast execution (< 1ms per test)

**Integration Tests:**
- Test component interactions
- Mock API responses with realistic data
- Verify error handling scenarios

**Benchmark Tests:**
- Performance regression testing
- Memory usage monitoring
- Throughput measurements

### Writing Tests

Follow the TDD approach when possible:

1. **Red:** Write a failing test
2. **Green:** Implement minimal code to pass
3. **Refactor:** Clean up implementation

**Example Test Structure:**
```typescript
import { describe, it, expect } from 'vitest';
import { LightScene } from '../../../src/domain/value-objects/LightScene';

describe('LightScene', () => {
  describe('constructor', () => {
    it('should create a valid LightScene with all parameters', () => {
      const scene = new LightScene(3853, 4280, 'Sunrise');

      expect(scene.id).toBe(3853);
      expect(scene.paramId).toBe(4280);
      expect(scene.name).toBe('Sunrise');
    });

    it('should throw error when id is invalid', () => {
      expect(() => new LightScene(-1, 4280, 'Test'))
        .toThrow('ID must be a positive integer');
    });
  });

  describe('equals', () => {
    it('should return true for identical scenes', () => {
      const scene1 = new LightScene(3853, 4280, 'Sunrise');
      const scene2 = new LightScene(3853, 4280, 'Sunrise');

      expect(scene1.equals(scene2)).toBe(true);
    });
  });
});
```

---

## Commit Guidelines

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

**Examples:**
```bash
feat(scenes): add candlelight factory method

Add LightScene.candlelight() factory method for flickering
candle simulation effect.

Closes #42

---

fix(retry): correct exponential backoff calculation

Fixed issue where exponential backoff was not properly
increasing delay between retries.

Fixes #123

---

docs(readme): add examples for segment control

Added comprehensive examples showing how to use segment
color control with rainbow effects.
```

### Atomic Commits

- Each commit should represent a single logical change
- Commits should be self-contained and reversible
- Keep commits focused and small

---

## Pull Request Process

### Before Submitting

**Checklist:**
- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Code coverage maintained or improved
- [ ] TypeScript compiles without errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for significant changes)
- [ ] Commits follow conventional commit format
- [ ] No debug code or console.logs

### Submitting a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create pull request**
   - Visit your fork on GitHub
   - Click "Compare & pull request"
   - Fill out the PR template

3. **PR Title Format**
   ```
   feat(scope): brief description of change
   ```

4. **PR Description Template**
   ```markdown
   ## Description
   Brief description of what this PR does.

   ## Motivation
   Why is this change necessary?

   ## Changes
   - Change 1
   - Change 2
   - Change 3

   ## Testing
   How was this tested?

   ## Screenshots (if applicable)
   Add screenshots for UI changes.

   ## Checklist
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Follows code style
   - [ ] No breaking changes (or documented)
   ```

### Review Process

1. **Automated checks:** CI must pass
2. **Code review:** Maintainer review required
3. **Feedback:** Address review comments
4. **Approval:** At least one approval required
5. **Merge:** Squash and merge

### After Merge

- Delete your feature branch
- Update your local main branch
- Celebrate! 🎉

---

## Areas for Contribution

### Good First Issues

Perfect for newcomers:

- Add LightScene factory methods
- Improve documentation
- Add example scripts
- Fix typos or formatting
- Update dependencies

**Label:** `good first issue`

### High Priority

Current focus areas:

- Animation utilities
- Performance optimizations
- Real-time monitoring
- Device discovery
- Enhanced error handling

**Label:** `high priority`

### Help Wanted

Areas where we need expertise:

- UI component libraries (React, Vue)
- Home automation integrations
- Performance optimization
- WebSocket implementation

**Label:** `help wanted`

### Feature Requests

See the [ROADMAP.md](ROADMAP.md) for planned features.

Propose new features in [Discussions](https://github.com/felixgeelhaar/govee-api-client/discussions).

---

## Development Tips

### Running Examples

```bash
# Set your API key
export GOVEE_API_KEY='your-api-key'

# Run an example
npx ts-node examples/dynamic-scenes.ts <deviceId> <model>
npx ts-node examples/segment-control.ts <deviceId> <model>
```

### Debugging Tests

```bash
# Run specific test with debugging
npm test -- --inspect-brk tests/unit/value-objects/LightScene.test.ts

# Run tests with verbose output
npm test -- --reporter=verbose
```

### Common Issues

**Issue: Tests failing locally but pass in CI**
- Solution: Ensure Node.js version matches CI (20.x)

**Issue: Type errors in node_modules**
- Solution: Delete `node_modules` and `package-lock.json`, then `npm install`

**Issue: Husky pre-commit hook failing**
- Solution: Run `npm run format` and `npm run lint` manually

---

## Getting Help

### Resources

- **Documentation:** [README.md](README.md)
- **API Reference:** [docs/LLM_API_REFERENCE.md](docs/LLM_API_REFERENCE.md)
- **Examples:** [examples/](examples/)
- **Roadmap:** [ROADMAP.md](ROADMAP.md)

### Support Channels

- **Questions:** [GitHub Discussions Q&A](https://github.com/felixgeelhaar/govee-api-client/discussions)
- **Bug Reports:** [GitHub Issues](https://github.com/felixgeelhaar/govee-api-client/issues)
- **Feature Ideas:** [GitHub Discussions](https://github.com/felixgeelhaar/govee-api-client/discussions)

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in relevant documentation

Thank you for contributing to the Govee API TypeScript Client! 🎨✨
