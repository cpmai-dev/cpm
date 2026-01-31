# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in CPM, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email us at: security@cpm-ai.dev
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Investigation**: We will investigate and provide an initial assessment within 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Disclosure**: We will coordinate with you on public disclosure timing

### Scope

The following are in scope for security reports:

- CPM CLI (`@cpm/cli`)
- Package installation and execution
- Configuration file handling
- Network requests and data transmission
- Authentication and authorization (when applicable)

### Out of Scope

- Issues in third-party packages installed via CPM
- Social engineering attacks
- Physical attacks
- Denial of service attacks

## Security Best Practices for Users

When using CPM:

1. **Verify packages** before installation - check the author, repository, and reviews
2. **Review MCP configurations** before installing packages that configure MCP servers
3. **Use environment variables** for sensitive data, never hardcode secrets
4. **Keep CPM updated** to get the latest security patches
5. **Report suspicious packages** if you encounter any

## Vulnerability Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 2**: Acknowledgment sent
3. **Day 7**: Initial assessment provided
4. **Day 30**: Fix developed and tested
5. **Day 37**: Fix released
6. **Day 44**: Public disclosure (coordinated)

Thank you for helping keep CPM secure!
