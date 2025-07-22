# Security Policy

## Supported Versions

We provide security updates for the following versions of the Govee API TypeScript Client:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Send a Private Report

Send an email to: **security@geelhaar.com**

Include the following information:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes (if you have them)

### 3. Response Timeline

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 5 business days
- **Status Updates**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

### 4. Responsible Disclosure

We kindly ask that you:

- Give us reasonable time to fix the issue before public disclosure
- Do not access or modify data that doesn't belong to you
- Do not disrupt our services or degrade the user experience
- Do not spam or social engineer our employees or contractors

## Security Best Practices

When using this library:

### API Key Security

- **Never commit API keys to version control**
- Store API keys in environment variables
- Use different API keys for different environments
- Rotate API keys regularly
- Monitor API key usage for suspicious activity

```typescript
// ❌ Don't do this
const client = new GoveeClient({
  apiKey: 'your-actual-api-key-here', // Never hardcode!
});

// ✅ Do this instead
const client = new GoveeClient({
  apiKey: process.env.GOVEE_API_KEY!,
});
```

### Network Security

- Use HTTPS in production environments
- Implement proper error handling to avoid information disclosure
- Consider using a proxy or firewall for additional security
- Monitor for unusual API usage patterns

### Logging Security

- The library is silent by default to prevent accidental key logging
- If you enable logging, ensure API keys are not logged
- Use appropriate log levels (avoid debug in production)
- Secure your log files and rotate them regularly

```typescript
// ✅ Safe logging configuration
const client = new GoveeClient({
  apiKey: process.env.GOVEE_API_KEY!,
  logger: pino({ level: 'info' }), // API key won't be logged
});
```

### Rate Limiting

- Use the built-in rate limiting features
- Don't try to bypass rate limits
- Monitor your API usage to stay within limits
- Implement exponential backoff for retry logic

### Input Validation

- Validate all device IDs and models before API calls
- Use the provided value objects for type safety
- Handle errors appropriately in your application

## Vulnerability Disclosure Process

1. **Report Received**: We acknowledge the security report
2. **Triage**: We assess the severity and impact
3. **Investigation**: We investigate and develop a fix
4. **Testing**: We test the fix thoroughly
5. **Release**: We release a security patch
6. **Disclosure**: We coordinate public disclosure with the reporter
7. **Recognition**: We acknowledge the reporter (if desired)

## Security Contact

For security-related questions or concerns:

- **Email**: security@geelhaar.com
- **GPG Key**: Available upon request

## Scope

This security policy applies to:

- The `@felixgeelhaar/govee-api-client` NPM package
- The source code in this repository
- The build and distribution process

This policy does not cover:

- Third-party dependencies (report to respective maintainers)
- The Govee API itself (report to Govee directly)
- Applications that use this library (secure your own implementations)

## Thanks

We appreciate the security community's efforts to improve the security of open source software. Responsible disclosure of vulnerabilities helps us ensure the security and privacy of all users.

Thank you for helping keep our project and our users safe!
