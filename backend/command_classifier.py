"""
Command Classifier for Terminal Security
Classifies commands as safe or dangerous and handles sudo confirmations
"""

import re
from typing import Tuple, List

class CommandClassifier:
    def __init__(self):
        # Dangerous command patterns
        self.dangerous_patterns = [
            r'rm\s+-rf\s+/',           # Delete root directory
            r'rm\s+-rf\s+\*',          # Delete all files
            r'del\s+/[fqs]',           # Windows delete system files
            r'format\s+',              # Format drives
            r'fdisk\s+',               # Disk partitioning
            r'mkfs\.',                 # Make filesystem
            r'shutdown\s+',            # Shutdown system
            r'reboot\s+',              # Reboot system
            r'poweroff\s+',            # Power off system
            r'halt\s+',                # Halt system
            r'init\s+0',               # System shutdown
            r'init\s+6',               # System reboot
            r'sudo\s+rm\s+-rf',        # Sudo dangerous delete
            r'sudo\s+del',             # Sudo Windows delete
            r'sudo\s+format',          # Sudo format
            r'sudo\s+shutdown',        # Sudo shutdown
            r'sudo\s+reboot',          # Sudo reboot
            r'chmod\s+777\s+/',       # Make root writable
            r'chown\s+.*\s+/',        # Change root ownership
            r'sudo\s+chmod\s+777',    # Sudo dangerous permissions
            r'sudo\s+chown\s+.*\s+/', # Sudo dangerous ownership
            r'dd\s+if=/dev/zero',      # Disk destruction
            r':\(\)\{\.*:\|.*\}\.*:', # Fork bomb - fixed regex
            r'eval\s+\$\(.*\)',        # Eval injection
            r'exec\s+\$\(.*\)',        # Exec injection
        ]
        
        # Interactive commands that need PTY
        self.interactive_patterns = [
            r'vim\s+',                  # Vim editor
            r'vi\s+',                   # Vi editor
            r'nano\s+',                 # Nano editor
            r'emacs\s+',                # Emacs editor
            r'top\s+',                  # Process monitor
            r'htop\s+',                 # Better process monitor
            r'less\s+',                 # File viewer
            r'more\s+',                 # File viewer
            r'tail\s+-f',               # Follow file
            r'watch\s+',                # Watch command
            r'irb\s+',                  # Ruby interactive
            r'python\s+\s*$',          # Python interactive
            r'python3\s+\s*$',         # Python3 interactive
            r'node\s+\s*$',             # Node.js interactive
            r'ssh\s+',                  # SSH connections
            r'ftp\s+',                  # FTP connections
            r'telnet\s+',               # Telnet connections
            r'mysql\s+',                # MySQL client
            r'psql\s+',                 # PostgreSQL client
            r'sqlite3\s+',              # SQLite client
        ]
        
        # Safe commands (whitelist)
        self.safe_patterns = [
            r'ls\s*',                   # List files
            r'dir(\s|$)',               # Windows directory listing
            r'pwd\s*',                  # Print working directory
            r'cd\s+',                   # Change directory
            r'cat\s+',                  # View files
            r'type\s+',                 # Windows file output
            r'grep\s+',                 # Search in files
            r'find\s+',                 # Find files
            r'where\s+',                # Windows executable lookup
            r'ps\s+',                   # Process list
            r'tasklist(\s|$)',          # Windows process list
            r'netstat(\s|$)',           # Network status
            r'ipconfig(\s|$)',          # Network config
            r'systeminfo(\s|$)',        # Windows system info
            r'kill\s+',                 # Kill processes
            r'git\s+',                  # Git commands
            r'npm\s+',                  # NPM commands
            r'pip\s+',                  # PIP commands
            r'python\s+.*\.py',        # Python scripts
            r'node\s+.*\.js',          # Node.js scripts
            r'mkdir\s+',                # Make directory
            r'touch\s+',                # Create files
            r'cp\s+',                   # Copy files
            r'copy\s+',                 # Windows copy
            r'mv\s+',                   # Move files
            r'move\s+',                 # Windows move
            r'ren\s+',                  # Windows rename
            r'rename\s+',               # Windows rename
            r'echo\s+',                 # Echo command
            r'cls\s*',                  # Clear console
            r'set(\s|$)',               # Windows environment
            r'export\s+',               # Export variables
            r'env\s*',                  # Environment
            r'whoami\s*',               # Current user
            r'id\s*',                   # User ID
            r'date\s*',                 # Date command
            r'uptime\s*',               # Uptime
            r'df\s+-h',                 # Disk usage
            r'du\s+-h',                 # Directory usage
            r'free\s+-h',               # Memory usage
            r'uname\s+-a',              # System info
            r'ping\s+',                 # Ping command
            r'curl\s+',                 # HTTP requests
            r'wget\s+',                 # Download files
            r'tar\s+',                  # Archive commands
            r'zip\s+',                  # Zip commands
            r'unzip\s+',                # Unzip commands
            r'chmod\s+[0-7]{3,4}\s+',  # Safe chmod
            r'chown\s+.*\s+(?!=/)',     # Safe chown (not root)
        ]
    
    def classify_command(self, command: str) -> Tuple[str, str]:
        """
        Classify command as safe, dangerous, or interactive
        Returns: (classification, reason)
        """
        command_lower = command.lower().strip()
        
        # Check for dangerous commands
        for pattern in self.dangerous_patterns:
            if re.search(pattern, command_lower, re.IGNORECASE):
                return 'dangerous', f"Dangerous command detected: {pattern}"
        
        # Check for interactive commands
        for pattern in self.interactive_patterns:
            if re.search(pattern, command_lower, re.IGNORECASE):
                return 'interactive', f"Interactive command: {pattern}"
        
        # Check for safe commands
        for pattern in self.safe_patterns:
            if re.search(pattern, command_lower, re.IGNORECASE):
                return 'safe', f"Safe command: {pattern}"
        
        # Unknown commands require explicit confirmation.
        return 'unknown', "Unknown command - not matched by the allowlist"
    
    def needs_sudo(self, command: str) -> bool:
        """Check if command needs sudo confirmation"""
        classification, _ = self.classify_command(command)
        return classification in ('dangerous', 'unknown')
    
    def is_interactive(self, command: str) -> bool:
        """Check if command needs PTY for interactive mode"""
        classification, _ = self.classify_command(command)
        return classification == 'interactive'
    
    def get_dangerous_commands(self) -> List[str]:
        """Get list of dangerous command descriptions"""
        return [
            "Delete system files (rm -rf /)",
            "Format drives (format)",
            "Shutdown/reboot system",
            "Change root permissions",
            "Disk destruction commands",
            "Fork bombs and injection attacks"
        ]
    
    def get_safe_commands_examples(self) -> List[str]:
        """Get examples of safe commands"""
        return [
            "ls, pwd, cd - Basic navigation",
            "cat, grep, find - File operations",
            "git, npm, pip - Development tools",
            "ps, kill - Process management",
            "ping, curl - Network tools"
        ]
