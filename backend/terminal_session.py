"""
Terminal Session Manager
Manages WebSocket terminal sessions with PTY support and real-time streaming
"""

import asyncio
import json
import uuid
import time
import os
import signal
import platform
import shlex
from typing import Dict, Optional, Any
from websockets.legacy.server import WebSocketServerProtocol
from command_classifier import CommandClassifier

# PTY support - Windows compatible
if platform.system() == 'Windows':
    try:
        import winpty
        PTY_AVAILABLE = True
    except ImportError:
        PTY_AVAILABLE = False
        print("Warning: winpty not available, falling back to subprocess")
else:
    try:
        from ptyprocess import PtyProcessUnicode
        PTY_AVAILABLE = True
    except ImportError:
        PTY_AVAILABLE = False
        print("Warning: ptyprocess not available, falling back to subprocess")

class TerminalSession:
    def __init__(self, session_id: str, websocket: WebSocketServerProtocol, working_dir: str = None):
        self.session_id = session_id
        self.websocket = websocket
        self.working_dir = working_dir or os.getcwd()
        self.process = None
        self.classifier = CommandClassifier()
        self.is_running = False
        self.output_buffer = []
        self.command_history = []
        self.current_command = ""
        self.sudo_pending = False
        self.pending_classification = ""
        self.command_lock = asyncio.Lock()
        self.start_time = time.time()
        
    async def start_session(self):
        """Start terminal session with shell"""
        try:
            print("Starting simple terminal session...")
            
            self.is_running = True
            
            # Send welcome message
            await self.send_message({
                'type': 'welcome',
                'message': f'Terminal session ready in {self.working_dir}',
                'working_dir': self.working_dir,
                'session_id': self.session_id,
                'pty_available': False
            })
            
            print(f"Terminal session started: {self.session_id}")
            
        except Exception as e:
            print(f"Error starting terminal session: {e}")
            await self.send_message({
                'type': 'error',
                'message': f'Failed to start terminal: {str(e)}'
            })
    
    async def execute_command(self, command: str):
        """Execute command with safety checks"""
        try:
            command = (command or "").strip()
            if not command:
                return

            # Classify command
            classification, reason = self.classifier.classify_command(command)
            
            # Add to history
            self.command_history.append({
                'command': command,
                'classification': classification,
                'timestamp': time.time()
            })

            if classification == 'interactive':
                await self.send_message({
                    'type': 'warning',
                    'message': 'Interactive terminal programs are not supported in the current subprocess mode'
                })
                return
            
            # Check if dangerous command needs sudo confirmation
            if self.classifier.needs_sudo(command):
                self.current_command = command
                self.sudo_pending = True
                self.pending_classification = classification
                
                await self.send_message({
                    'type': 'sudo_required',
                    'command': command,
                    'reason': reason,
                    'warning': (
                        'This command can be dangerous to your system!'
                        if classification == 'dangerous'
                        else 'This command is not in the allowlist and needs confirmation.'
                    ),
                    'dangerous_examples': self.classifier.get_dangerous_commands()
                })
                return
            
            # Execute command
            async with self.command_lock:
                await self._execute_command_internal(command, classification)
            
        except Exception as e:
            await self.send_message({
                'type': 'error',
                'message': f'Command execution failed: {str(e)}'
            })
    
    async def confirm_sudo(self, confirmed: bool):
        """Handle sudo confirmation"""
        if not self.sudo_pending:
            return
        
        self.sudo_pending = False
        
        if confirmed:
            await self.send_message({
                'type': 'sudo_confirmed',
                'message': 'Executing confirmed command...'
            })
            async with self.command_lock:
                await self._execute_command_internal(self.current_command, self.pending_classification or 'dangerous')
        else:
            await self.send_message({
                'type': 'sudo_cancelled',
                'message': 'Command cancelled'
            })
        
        self.current_command = ""
        self.pending_classification = ""

    def _parse_command(self, command: str):
        if platform.system() == 'Windows':
            return shlex.split(command, posix=False)
        return shlex.split(command)

    def _resolve_directory(self, target: str) -> str:
        if not target or target == "~":
            return os.path.expanduser("~")

        expanded = os.path.expandvars(os.path.expanduser(target.strip('"').strip("'")))
        if os.path.isabs(expanded):
            return os.path.abspath(expanded)
        return os.path.abspath(os.path.join(self.working_dir, expanded))

    async def _handle_builtin_command(self, command: str) -> bool:
        try:
            parts = self._parse_command(command)
        except ValueError as exc:
            await self.send_message({
                'type': 'error',
                'message': f'Could not parse command: {exc}'
            })
            return True

        if not parts:
            return True

        if parts[0].lower() != 'cd':
            return False

        target = parts[1] if len(parts) > 1 else "~"
        resolved_dir = self._resolve_directory(target)
        if not os.path.isdir(resolved_dir):
            await self.send_message({
                'type': 'error',
                'message': f'Directory not found: {resolved_dir}'
            })
            return True

        self.working_dir = resolved_dir
        await self.send_message({
            'type': 'cwd_changed',
            'working_dir': self.working_dir,
            'message': f'Working directory changed to {self.working_dir}'
        })
        return True
    
    async def _execute_command_internal(self, command: str, classification: str):
        """Internal command execution"""
        try:
            print(f"Executing command: {command}")
            
            await self.send_message({
                'type': 'command_sent',
                'command': command,
                'classification': classification
            })

            if await self._handle_builtin_command(command):
                return

            if platform.system() == 'Windows':
                if any(cmd in command.lower() for cmd in ['del', 'rmdir', 'format', 'shutdown']):
                    await self.send_message({
                        'type': 'error',
                        'message': 'Dangerous command blocked for security'
                    })
                    return
                
                # Handle admin commands on Windows - check if running as admin
                admin_commands = ['net sess', 'net session', 'net user', 'net localgroup', 'net share']
                if any(cmd in command.lower() for cmd in admin_commands):
                    # Check if running as administrator
                    try:
                        import ctypes
                        is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
                        if not is_admin:
                            await self.send_message({
                                'type': 'error',
                                'message': 'Administrator privileges required. Please run the dashboard as Administrator (right-click → Run as administrator)'
                            })
                            return
                        else:
                            # Running as admin, allow the command
                            await self.send_message({
                                'type': 'info',
                                'message': '🔑 Executing admin command with elevated privileges...'
                            })
                    except:
                        # If we can't check, try the command anyway with warning
                        await self.send_message({
                            'type': 'warning',
                            'message': '⚠️ Could not verify admin privileges, trying command anyway...'
                        })
                process = await asyncio.create_subprocess_exec(
                    "cmd.exe",
                    "/C",
                    command,
                    cwd=self.working_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
            else:
                try:
                    args = self._parse_command(command)
                    process = await asyncio.create_subprocess_exec(
                        *args,
                        cwd=self.working_dir,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                except ValueError:
                    process = await asyncio.create_subprocess_shell(
                        command,
                        cwd=self.working_dir,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )

            self.process = process
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)
            except asyncio.TimeoutError:
                process.terminate()
                await process.wait()
                self.process = None
                await self.send_message({
                    'type': 'error',
                    'message': 'Command execution timed out'
                })
                return
            finally:
                self.process = None

            stdout_text = stdout.decode(errors='replace') if stdout else ''
            stderr_text = stderr.decode(errors='replace') if stderr else ''

            if stdout_text:
                await self.send_message({
                    'type': 'output',
                    'data': stdout_text,
                    'timestamp': time.time()
                })
            
            if stderr_text:
                await self.send_message({
                    'type': 'output',
                    'data': f"ERROR: {stderr_text}",
                    'timestamp': time.time()
                })
            
            print(f"Command executed: {command}, Return code: {process.returncode}")
        except Exception as e:
            print(f"Error executing command: {e}")
            await self.send_message({
                'type': 'error',
                'message': f'Failed to execute command: {str(e)}'
            })
    
    async def interrupt_command(self):
        """Send interrupt signal (Ctrl+C)"""
        try:
            if not self.process or self.process.returncode is not None:
                await self.send_message({
                    'type': 'warning',
                    'message': 'No running command to interrupt'
                })
                return

            if platform.system() == 'Windows':
                self.process.terminate()
            else:
                self.process.send_signal(signal.SIGINT)

            await self.send_message({
                'type': 'interrupt_sent',
                'message': 'Interrupt signal sent to the running command'
            })
        except Exception as e:
            await self.send_message({
                'type': 'error',
                'message': f'Failed to interrupt: {str(e)}'
            })
    
    async def send_message(self, message: Dict[str, Any]):
        """Send message to WebSocket client"""
        try:
            await self.websocket.send(json.dumps(message))
        except Exception as e:
            print(f"Failed to send message: {e}")
    
    async def read_output(self):
        """Read output from terminal process"""
        # No continuous output reader needed for simple command execution
        pass
    
    async def resize_terminal(self, cols: int, rows: int):
        """Resize terminal"""
        await self.send_message({
            'type': 'warning',
            'message': 'Terminal resize is not supported in the current subprocess mode',
            'cols': cols,
            'rows': rows
        })
    
    async def close_session(self):
        """Close terminal session"""
        self.is_running = False
        
        if self.process:
            try:
                if self.process.returncode is None:
                    self.process.terminate()
                    await asyncio.wait_for(self.process.wait(), timeout=5)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
        
        await self.send_message({
            'type': 'session_closed',
            'message': 'Terminal session closed',
            'duration': time.time() - self.start_time
        })

class TerminalSessionManager:
    def __init__(self):
        self.sessions: Dict[str, TerminalSession] = {}
        self.classifier = CommandClassifier()
    
    async def create_session(self, websocket: WebSocketServerProtocol, working_dir: str = None) -> str:
        """Create new terminal session"""
        session_id = str(uuid.uuid4())
        session = TerminalSession(session_id, websocket, working_dir)
        self.sessions[session_id] = session
        
        await session.start_session()
        return session_id
    
    async def handle_message(self, session_id: str, message: Dict[str, Any]):
        """Handle message from client"""
        session = self.sessions.get(session_id)
        if not session:
            return
        
        message_type = message.get('type')
        
        if message_type == 'execute_command':
            command = message.get('command', '')
            await session.execute_command(command)
        
        elif message_type == 'sudo_confirm':
            confirmed = message.get('confirmed', False)
            await session.confirm_sudo(confirmed)
        
        elif message_type == 'interrupt':
            await session.interrupt_command()
        
        elif message_type == 'resize':
            cols = message.get('cols', 80)
            rows = message.get('rows', 24)
            await session.resize_terminal(cols, rows)
        
        elif message_type == 'get_history':
            await session.send_message({
                'type': 'history',
                'history': session.command_history[-20:]  # Last 20 commands
            })
        
        elif message_type == 'get_safe_commands':
            await session.send_message({
                'type': 'safe_commands',
                'examples': self.classifier.get_safe_commands_examples()
            })
    
    async def close_session(self, session_id: str):
        """Close terminal session"""
        session = self.sessions.get(session_id)
        if session:
            await session.close_session()
            del self.sessions[session_id]
    
    def get_session_count(self) -> int:
        """Get active session count"""
        return len(self.sessions)
    
    async def cleanup_sessions(self):
        """Clean up inactive sessions"""
        for session_id, session in list(self.sessions.items()):
            if not session.is_running:
                await self.close_session(session_id)
