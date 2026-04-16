const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//i,
  /rm\s+-rf\s+\*/i,
  /del\s+\/[fqs]/i,
  /format\s+/i,
  /shutdown\s+/i,
  /reboot\s+/i,
  /poweroff\s+/i,
  /halt\s+/i,
  /dd\s+if=\/dev\/zero/i
];

const INTERACTIVE_PATTERNS = [
  /vim(\s|$)/i,
  /vi(\s|$)/i,
  /nano(\s|$)/i,
  /top(\s|$)/i,
  /htop(\s|$)/i,
  /less(\s|$)/i,
  /more(\s|$)/i,
  /tail\s+-f/i,
  /watch\s+/i,
  /python\s*$/i,
  /python3\s*$/i,
  /node\s*$/i,
  /ssh\s+/i
];

const SAFE_PATTERNS = [
  /^(ls|dir|pwd|cd|cat|type|grep|find|where|tasklist|netstat|ipconfig|systeminfo|git|npm|pip|python\s+.*\.py|node\s+.*\.js|echo|cls|set|env|whoami|date|ping|curl|wget|tar|zip|unzip)(\s|$)/i
];

export const SHELL_OPERATOR_MESSAGE = 'Shell operators like &&, ||, |, >, <, ;, backticks, and command substitution are not allowed for security reasons';

export function containsDangerousShellMetachars(command) {
  if (typeof command !== 'string') {
    return false;
  }

  const strippedCommand = command.trim();
  if (!strippedCommand) {
    return false;
  }

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let index = 0; index < strippedCommand.length; index += 1) {
    const char = strippedCommand[index];
    const nextChar = strippedCommand[index + 1] ?? '';

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      continue;
    }

    if (char === '`') {
      return true;
    }

    if (char === '$' && (nextChar === '(' || nextChar === '{')) {
      return true;
    }

    if ((char === '&' && nextChar === '&') || (char === '|' && nextChar === '|') || (char === '>' && nextChar === '>')) {
      return true;
    }

    if (['|', '>', '<', ';'].includes(char)) {
      return true;
    }
  }

  return false;
}

export function classifyCommand(command) {
  const normalized = String(command || '').trim();

  if (!normalized) {
    return {
      classification: 'empty',
      reason: 'Enter a command to see the safety classification.'
    };
  }

  if (containsDangerousShellMetachars(normalized)) {
    return {
      classification: 'dangerous',
      reason: SHELL_OPERATOR_MESSAGE
    };
  }

  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      classification: 'dangerous',
      reason: 'This command matches a dangerous command pattern and needs explicit confirmation.'
    };
  }

  if (INTERACTIVE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      classification: 'interactive',
      reason: 'Interactive programs are not supported in the current subprocess terminal.'
    };
  }

  if (SAFE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      classification: 'safe',
      reason: 'This command matches the allowlist and should run without extra confirmation.'
    };
  }

  return {
    classification: 'unknown',
    reason: 'This command is not on the allowlist and may require confirmation from the backend.'
  };
}
