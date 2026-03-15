"""
Terminal Session Manager
Manages WebSocket terminal sessions with PTY support and real-time streaming
"""

import asyncio
import json
import uuid
import subprocess
import threading
import time
import os
import signal
import platform
from typing import Dict, Optional, Any
from websockets.server import WebSocketServerProtocol
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
        self.start_time = time.time()
        
    async def start_session(self):
        """Start terminal session with shell"""
        try:
            # Start shell process (Windows compatible)
            shell_command = 'cmd.exe' if platform.system() == 'Windows' else '/bin/bash'
            
            if PTY_AVAILABLE and platform.system() != 'Windows':
                # Use PTY for Unix systems
                self.process = PtyProcessUnicode.spawn(
                    [shell_command],
                    cwd=self.working_dir,
                    env=os.environ.copy()
                )
            else:
                # Use subprocess for Windows or fallback
                self.process = subprocess.Popen(
                    [shell_command],
                    cwd=self.working_dir,
                    env=os.environ.copy(),
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,
                    universal_newlines=True
                )
            
            self.is_running = True
            
            # Send welcome message
            await self.send_message({
                'type': 'welcome',
                'message': f'Terminal session started in {self.working_dir}',
                'working_dir': self.working_dir,
                'session_id': self.session_id,
                'pty_available': PTY_AVAILABLE
            })
            
            # Start output reader
            asyncio.create_task(self.read_output())
            
        except Exception as e:
            await self.send_message({
                'type': 'error',
                'message': f'Failed to start terminal: {str(e)}'
            })
    
    async def execute_command(self, command: str):
        """Execute command with safety checks"""
        try:
            # Classify command
            classification, reason = self.classifier.classify_command(command)
            
            # Add to history
            self.command_history.append({
                'command': command,
                'classification': classification,
                'timestamp': time.time()
            })
            
            # Check if dangerous command needs sudo confirmation
            if self.classifier.needs_sudo(command):
                self.current_command = command
                self.sudo_pending = True
                
                await self.send_message({
                    'type': 'sudo_required',
                    'command': command,
                    'reason': reason,
                    'warning': 'This command can be dangerous to your system!',
                    'dangerous_examples': self.classifier.get_dangerous_commands()
                })
                return
            
            # Execute command
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
                'message': 'Executing dangerous command...'
            })
            await self._execute_command_internal(self.current_command, 'dangerous')
        else:
            await self.send_message({
                'type': 'sudo_cancelled',
                'message': 'Dangerous command cancelled'
            })
        
        self.current_command = ""
    
    async def _execute_command_internal(self, command: str, classification: str):
        """Internal command execution"""
        try:
            # Send command to terminal
            if self.process:
                if PTY_AVAILABLE and hasattr(self.process, 'isalive') and self.process.isalive():
                    # PTY process
                    self.process.write(command + '\n')
                else:
                    # Subprocess
                    self.process.stdin.write(command + '\n')
                    self.process.stdin.flush()
                
                await self.send_message({
                    'type': 'command_sent',
                    'command': command,
                    'classification': classification
                })
                
                # For non-interactive commands, we might want to wait for completion
                if classification != 'interactive':
                    # Give some time for command to execute
                    await asyncio.sleep(0.5)
                
            else:
                await self.send_message({
                    'type': 'error',
                    'message': 'Terminal process not available'
                })
                
        except Exception as e:
            await self.send_message({
                'type': 'error',
                'message': f'Failed to execute command: {str(e)}'
            })
    
    async def interrupt_command(self):
        """Send interrupt signal (Ctrl+C)"""
        try:
            if self.process:
                if PTY_AVAILABLE and hasattr(self.process, 'isalive') and self.process.isalive():
                    # PTY process
                    self.process.write('\x03')  # Ctrl+C
                else:
                    # Subprocess
                    self.process.stdin.write('\x03')  # Ctrl+C
                    self.process.stdin.flush()
                
                await self.send_message({
                    'type': 'interrupt_sent',
                    'message': 'Command interrupted'
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
        while self.is_running and self.process:
            try:
                output = None
                
                if PTY_AVAILABLE and hasattr(self.process, 'isalive') and self.process.isalive():
                    # PTY process
                    if self.process.read():
                        output = self.process.read()
                elif hasattr(self.process, 'poll') and self.process.poll() is None:
                    # Subprocess - non-blocking read
                    try:
                        # Use select for non-blocking read on Unix
                        import select
                        if hasattr(select, 'select'):
                            ready, _, _ = select.select([self.process.stdout], [], [], 0.1)
                            if ready:
                                output = self.process.stdout.read(1024)
                        else:
                            # Windows fallback - small blocking read with timeout
                            output = self.process.stdout.read(1)
                            if output:
                                # Try to read more if available
                                try:
                                    while True:
                                        more = self.process.stdout.read(1)
                                        if not more:
                                            break
                                        output += more
                                except:
                                    pass
                    except:
                        # Fallback for Windows
                        try:
                            output = self.process.stdout.readline()
                        except:
                            pass
                
                if output:
                    await self.send_message({
                        'type': 'output',
                        'data': output,
                        'timestamp': time.time()
                    })
                
                await asyncio.sleep(0.1)  # Small delay to prevent busy loop
                
            except Exception as e:
                await self.send_message({
                    'type': 'error',
                    'message': f'Output reading error: {str(e)}'
                })
                break
    
    async def resize_terminal(self, cols: int, rows: int):
        """Resize terminal"""
        try:
            if self.process:
                if PTY_AVAILABLE and hasattr(self.process, 'isalive') and self.process.isalive():
                    # PTY process
                    self.process.setwinsize(rows, cols)
                    await self.send_message({
                        'type': 'resize_complete',
                        'cols': cols,
                        'rows': rows
                    })
                else:
                    # Subprocess - resize not supported
                    await self.send_message({
                        'type': 'error',
                        'message': 'Terminal resize not supported with subprocess fallback'
                    })
        except Exception as e:
            await self.send_message({
                'type': 'error',
                'message': f'Failed to resize terminal: {str(e)}'
            })
    
    async def close_session(self):
        """Close terminal session"""
        self.is_running = False
        
        if self.process:
            try:
                if PTY_AVAILABLE and hasattr(self.process, 'isalive') and self.process.isalive():
                    # PTY process
                    self.process.terminate()
                    self.process.wait()
                elif hasattr(self.process, 'poll') and self.process.poll() is None:
                    # Subprocess
                    self.process.terminate()
                    self.process.wait(timeout=5)
            except:
                try:
                    if PTY_AVAILABLE and hasattr(self.process, 'kill'):
                        self.process.kill()
                    else:
                        self.process.kill()
                except:
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
