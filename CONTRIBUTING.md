# Contributing to NextPress

Thank you for your interest in contributing to NextPress! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for running WordPress backend)
- npm

### Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nextpress.git
   cd nextpress
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build packages:
   ```bash
   npm run build
   ```

4. Start the development environment:
   ```bash
   npm run dev
   ```

   This starts:
   - WordPress backend at http://localhost:8080
   - Next.js example app at http://localhost:3000

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes

3. Run tests:
   ```bash
   npm run test:unit      # Unit tests
   npm run typecheck      # TypeScript check
   ```

4. Add a changeset (if your change affects published packages):
   ```bash
   npm run changeset
   ```

5. Commit and push:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feat/your-feature-name
   ```

6. Open a Pull Request

### Code Style

- **TypeScript**: Never use `any` type. Use proper type definitions.
- **Formatting**: Follow existing code style
- **Comments**: Add comments only where the logic isn't self-evident
- **Tests**: Write tests for new functionality

### Commit Messages

Follow conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

When your PR includes changes that should be released:

```bash
npm run changeset
```

This will prompt you to:
1. Select affected packages
2. Choose version bump type (major/minor/patch)
3. Write a summary of changes

Commit the generated changeset file with your PR.

## Project Structure

```
nextpress/
├── packages/
│   ├── js/              # NPM package (@axistaylor/nextpress)
│   ├── wordpress/       # WordPress plugin
│   ├── example-01/      # Example Next.js app
│   ├── backend-4-examples/  # Development WordPress backend
│   └── e2e-tests/       # Playwright E2E tests
├── docs/                # Documentation
└── .github/             # GitHub workflows and templates
```

## Testing

### Unit Tests
```bash
npm run test:unit
```

### E2E Tests
```bash
npm run test:e2e
```

### Type Checking
```bash
npm run typecheck
```

## Documentation

- Update documentation for any user-facing changes
- Documentation lives in `/docs`
- Package READMEs should stay concise with links to full docs

## Need Help?

- Check existing [issues](https://github.com/axistaylor/nextpress/issues)
- Open a new issue for bugs or feature requests
- Discussions welcome for questions and ideas

## License

By contributing, you agree that your contributions will be licensed under the project's MIT license (for the JS package) or GPL-3.0 license (for the WordPress plugin).
