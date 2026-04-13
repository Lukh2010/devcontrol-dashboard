# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |

## Security Features

### Command Execution Safety

This application includes multiple layers of security protection for command execution:

#### 1. Command Classification
- **Dangerous Pattern Detection**: Blocks known dangerous commands
- **Sudo Protection**: Requires confirmation for privileged commands
- **Pattern Matching**: Uses regex to detect potentially harmful operations

#### 2. Shell Injection Prevention
- **Platform-Specific Handling**: Different security measures for Windows vs Unix
- **Command Validation**: Input validation before execution
- **Safe Subprocess Usage**: Uses `shlex.split()` on Unix systems to prevent shell injection

#### 3. Input Sanitization
- **Command Filtering**: Blocks commands like `rm -rf`, `format`, `shutdown`
- **Windows-Specific Protection**: Blocks `del`, `rmdir`, `format`, `shutdown` on Windows
- **Timeout Protection**: 30-second timeout prevents hanging commands

### Protected Commands

The following command patterns are blocked:

#### System Destruction
- `rm -rf /` - Recursive deletion
- `format` - Disk formatting
- `dd if=/dev/zero` - Disk wiping
- `del /f` - Force delete on Windows

#### System Control
- `shutdown` - System shutdown
- `reboot` - System reboot
- `halt` - System halt

#### Code Injection
- `eval $(...)` - Eval injection
- `exec $(...)` - Exec injection
- `:(){ :|:& };:` - Fork bomb

### Network Security

#### CORS Configuration
- **Current Setting**: The backend currently allows all origins with `CORS(..., origins="*")`
- **Development Only**: This is convenient for local development but not suitable for internet exposure

#### WebSocket Security
- **Password Protected**: Terminal WebSocket access requires the shared control password
- **Network Reachability**: The backend and WebSocket server bind to `0.0.0.0`, so host/network exposure depends on firewall and local network setup

### Data Protection

#### No Sensitive Data Storage
- **Shared Password**: The control password is stored in process memory and sent by clients when accessing protected actions
- **No API Keys**: No external API key storage
- **Local Only**: All data processing happens locally

#### Temporary Data
- **Session Data**: Terminal sessions are temporary
- **No Persistence**: No long-term data storage
- **Memory Only**: Sensitive values are kept in memory; PID ownership metadata is stored in a local PID file for cleanup and access control

## Reporting Security Issues

### How to Report

If you discover a security vulnerability, please report it privately:

1. **Do NOT** open a public issue
2. **Email**: security@example.com
3. **Include**: Detailed description and reproduction steps
4. **Response**: We'll respond within 48 hours

### Responsible Disclosure

- **Private Reporting**: Report vulnerabilities privately
- **Time to Fix**: We'll fix issues before public disclosure
- **Credit**: Security researchers will be credited in fixes

## Security Best Practices

### For Users

1. **Local Use Only**: This dashboard is designed for local development only
2. **Network Isolation**: Do not expose to public networks
3. **Regular Updates**: Keep dependencies updated
4. **Review Commands**: Be careful with commands executed through the terminal

### For Developers

1. **Input Validation**: Always validate user input
2. **Principle of Least Privilege**: Run with minimal required permissions
3. **Regular Security Reviews**: Review code for security issues
4. **Dependency Updates**: Keep security dependencies updated

## Security Updates

### How Updates Are Handled

- **Security Patches**: Released as soon as possible
- **Version Bumping**: Security updates may include version bumps
- **Documentation**: Security issues documented in changelog
- **Notifications**: Security updates announced through normal channels

### Update Process

1. **Assessment**: Security issues assessed for severity
2. **Fix Development**: Fixes developed and tested
3. **Release**: Security updates released quickly
4. **Documentation**: Changes documented

## Security Architecture

### Defense in Depth

This application uses multiple layers of security:

1. **Input Validation**: All user input is validated
2. **Command Filtering**: Dangerous commands are blocked
3. **Platform Security**: OS-specific security measures
4. **Process Isolation**: Commands run in isolated processes
5. **Timeout Protection**: Commands can't run indefinitely

### Risk Assessment

#### Low Risk
- **Local Development**: Intended for local use only
- **No External Connections**: No external API calls
- **No Data Persistence**: No long-term data storage

#### Medium Risk
- **Command Execution**: Users can execute system commands
- **Network Access**: Can access local network resources
- **File System Access**: Can read/write local files

#### Mitigations
- **Command Validation**: Input validation and filtering
- **User Confirmation**: Dangerous commands require confirmation
- **Access Control**: Sensitive actions require the shared control password

## Security Testing

### Automated Testing

- **Command Injection Tests**: Tests for shell injection vulnerabilities
- **Input Validation Tests**: Tests for input validation bypasses
- **Pattern Matching Tests**: Tests for dangerous command detection

### Manual Testing

- **Penetration Testing**: Regular security assessments
- **Code Review**: Manual security code reviews
- **Threat Modeling**: Regular threat modeling exercises

## Compliance

### Standards

- **OWASP Top 10**: Addresses common web application vulnerabilities
- **Secure Coding**: Follows secure coding practices
- **Privacy by Design**: Privacy considerations built-in

### Regulations

- **Data Protection**: No personal data collection or storage
- **Local Processing**: All processing happens locally
- **User Control**: Users have full control over their data

---

For security questions or concerns, contact us at security@example.com
