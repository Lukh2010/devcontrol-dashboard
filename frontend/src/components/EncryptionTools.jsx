import React, { useMemo, useState } from 'react';
import { Copy, KeyRound, RotateCcw, ShieldAlert, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const METHOD_GROUPS = {
  base64: {
    label: 'Base64',
    kind: 'Encoding',
    modes: ['encode', 'decode'],
    explanation: 'Base64 is encoding, not encryption. It is useful for moving text through formats that expect plain ASCII.'
  },
  url: {
    label: 'URL',
    kind: 'Encoding',
    modes: ['encode', 'decode'],
    explanation: 'URL encoding safely escapes text for query strings and paths. It does not protect secrets.'
  },
  hex: {
    label: 'Hex',
    kind: 'Encoding',
    modes: ['encode', 'decode'],
    explanation: 'Hex encoding represents UTF-8 bytes as hexadecimal characters. It is reversible and not encryption.'
  },
  sha256: {
    label: 'SHA-256',
    kind: 'Hash',
    modes: ['hash'],
    explanation: 'SHA-256 is a one-way hash. Hash output cannot be decrypted back to the original input.'
  },
  sha1: {
    label: 'SHA-1',
    kind: 'Legacy hash',
    modes: ['hash'],
    warning: 'SHA-1 is legacy and should not be used for security-sensitive integrity checks.',
    explanation: 'SHA-1 is a one-way hash, but it is no longer considered strong for security use.'
  },
  md5: {
    label: 'MD5',
    kind: 'Legacy hash',
    modes: ['hash'],
    warning: 'MD5 is insecure and should only be used for legacy compatibility checks.',
    explanation: 'MD5 is a one-way legacy hash. It cannot be decrypted and is unsafe for security use.'
  },
  aes: {
    label: 'AES-GCM',
    kind: 'Encryption',
    modes: ['encrypt', 'decrypt'],
    explanation: 'AES-GCM uses a password-derived key with PBKDF2, a random salt and a random IV. The encrypted output is local JSON.'
  },
  rsa: {
    label: 'RSA-OAEP',
    kind: 'Encryption',
    modes: ['encrypt', 'decrypt'],
    explanation: 'RSA-OAEP uses the browser crypto engine. Encrypt with a public key and decrypt with the matching private key.'
  }
};

const MODE_LABELS = {
  encode: 'Encode',
  decode: 'Decode',
  hash: 'Hash',
  encrypt: 'Encrypt',
  decrypt: 'Decrypt'
};

function bytesToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const cleanValue = value.replace(/\s+/g, '');
  const binary = atob(cleanValue);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function textToHex(value) {
  return [...textEncoder.encode(value)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function hexToText(value) {
  const cleanValue = value.replace(/\s+/g, '');
  if (!/^[0-9a-fA-F]*$/.test(cleanValue) || cleanValue.length % 2 !== 0) {
    throw new Error('Hex input must contain an even number of hexadecimal characters.');
  }

  const bytes = new Uint8Array(cleanValue.match(/.{1,2}/g)?.map((pair) => parseInt(pair, 16)) || []);
  return textDecoder.decode(bytes);
}

function rotateLeft(value, amount) {
  return (value << amount) | (value >>> (32 - amount));
}

function addUnsigned(left, right) {
  return (left + right) >>> 0;
}

function md5(input) {
  const bytes = textEncoder.encode(input);
  const originalBitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, originalBitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(originalBitLength / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];
  const constants = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0
  );

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => view.getUint32(offset + index * 4, true));
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f;
      let g;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const next = d;
      d = c;
      c = b;
      b = addUnsigned(b, rotateLeft(addUnsigned(addUnsigned(a, f >>> 0), addUnsigned(constants[index], words[g])), shifts[index]));
      a = next;
    }

    a0 = addUnsigned(a0, a);
    b0 = addUnsigned(b0, b);
    c0 = addUnsigned(c0, c);
    d0 = addUnsigned(d0, d);
  }

  return [a0, b0, c0, d0]
    .flatMap((word) => [word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, (word >>> 24) & 0xff])
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashText(method, input) {
  if (method === 'md5') {
    return md5(input);
  }

  const algorithm = method === 'sha1' ? 'SHA-1' : 'SHA-256';
  const digest = await crypto.subtle.digest(algorithm, textEncoder.encode(input));
  return arrayBufferToHex(digest);
}

async function deriveAesKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: 210000
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptAes(input, password) {
  if (!password) {
    throw new Error('AES encryption needs a password.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(input));

  return JSON.stringify({
    version: 1,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 210000,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  }, null, 2);
}

async function decryptAes(input, password) {
  if (!password) {
    throw new Error('AES decryption needs the same password used for encryption.');
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    throw new Error('AES input must be the JSON output created by this tool.');
  }

  if (payload?.algorithm !== 'AES-GCM' || !payload.salt || !payload.iv || !payload.ciphertext) {
    throw new Error('AES payload is missing algorithm, salt, IV or ciphertext.');
  }

  const key = await deriveAesKey(password, base64ToBytes(payload.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext)
  );
  return textDecoder.decode(decrypted);
}

function pemToArrayBuffer(pem, label) {
  const cleanPem = pem
    .replace(`-----BEGIN ${label}-----`, '')
    .replace(`-----END ${label}-----`, '')
    .replace(/\s+/g, '');

  if (!cleanPem) {
    throw new Error(`Enter a valid ${label.toLowerCase()}.`);
  }

  return base64ToBytes(cleanPem).buffer;
}

function arrayBufferToPem(buffer, label) {
  const base64 = bytesToBase64(new Uint8Array(buffer));
  const lines = base64.match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

async function generateRsaKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );
  const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToPem(publicKey, 'PUBLIC KEY'),
    privateKey: arrayBufferToPem(privateKey, 'PRIVATE KEY')
  };
}

async function encryptRsa(input, publicKeyPem) {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem, 'PUBLIC KEY'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, textEncoder.encode(input));
  return bytesToBase64(new Uint8Array(encrypted));
}

async function decryptRsa(input, privateKeyPem) {
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem, 'PRIVATE KEY'),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64ToBytes(input));
  return textDecoder.decode(decrypted);
}

function EncryptionTools() {
  const [method, setMethod] = useState('base64');
  const [mode, setMode] = useState('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [secret, setSecret] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const [running, setRunning] = useState(false);
  const [generatingKeys, setGeneratingKeys] = useState(false);

  const selectedMethod = METHOD_GROUPS[method];
  const allowedModes = selectedMethod.modes;

  const normalizedMode = allowedModes.includes(mode) ? mode : allowedModes[0];

  const methodOptions = useMemo(() => Object.entries(METHOD_GROUPS), []);

  const setMethodAndMode = (nextMethod) => {
    const nextConfig = METHOD_GROUPS[nextMethod];
    setMethod(nextMethod);
    setMode(nextConfig.modes[0]);
    setError('');
    setCopyState('idle');
  };

  const runTool = async () => {
    setRunning(true);
    setError('');
    setCopyState('idle');

    try {
      let result = '';

      if (method === 'base64') {
        result = normalizedMode === 'encode'
          ? bytesToBase64(textEncoder.encode(input))
          : textDecoder.decode(base64ToBytes(input));
      } else if (method === 'url') {
        result = normalizedMode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
      } else if (method === 'hex') {
        result = normalizedMode === 'encode' ? textToHex(input) : hexToText(input);
      } else if (['sha256', 'sha1', 'md5'].includes(method)) {
        result = await hashText(method, input);
      } else if (method === 'aes') {
        result = normalizedMode === 'encrypt' ? await encryptAes(input, secret) : await decryptAes(input, secret);
      } else if (method === 'rsa') {
        result = normalizedMode === 'encrypt' ? await encryptRsa(input, publicKey) : await decryptRsa(input, privateKey);
      }

      setOutput(result);
    } catch (toolError) {
      setOutput('');
      setError(toolError.message || 'The selected operation failed.');
    } finally {
      setRunning(false);
    }
  };

  const copyOutput = async () => {
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setSecret('');
    setError('');
    setCopyState('idle');
  };

  const handleGenerateKeys = async () => {
    setGeneratingKeys(true);
    setError('');
    setCopyState('idle');

    try {
      const keyPair = await generateRsaKeyPair();
      setPublicKey(keyPair.publicKey);
      setPrivateKey(keyPair.privateKey);
    } catch (keyError) {
      setError(keyError.message || 'RSA key generation failed.');
    } finally {
      setGeneratingKeys(false);
    }
  };

  return (
    <motion.section
      className="panel encryption-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <KeyRound size={18} />
          </span>
          <div>
            <h2 className="panel-title">Encryptions</h2>
            <p className="panel-subtitle">Local encoding, hashing and encryption tools.</p>
          </div>
        </div>
        <span className="status-badge status-success">Local only</span>
      </div>

      <div className="panel-body encryption-layout">
        <aside className="mini-card encryption-options">
          <div className="stack compact-stack">
            <label className="field-label" htmlFor="encryption-method">Method</label>
            <select
              id="encryption-method"
              className="select"
              value={method}
              onChange={(event) => setMethodAndMode(event.target.value)}
            >
              {methodOptions.map(([id, option]) => (
                <option key={id} value={id}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="stack compact-stack">
            <label className="field-label" htmlFor="encryption-mode">Mode</label>
            <select
              id="encryption-mode"
              className="select"
              value={normalizedMode}
              onChange={(event) => setMode(event.target.value)}
            >
              {allowedModes.map((modeName) => (
                <option key={modeName} value={modeName}>{MODE_LABELS[modeName]}</option>
              ))}
            </select>
          </div>

          <div className="encryption-method-card">
            <div className="status-pill neutral">{selectedMethod.kind}</div>
            <p className="muted-note">{selectedMethod.explanation}</p>
            {selectedMethod.warning ? (
              <div className="alert warning compact-alert">
                <ShieldAlert size={16} />
                <span>{selectedMethod.warning}</span>
              </div>
            ) : null}
            {allowedModes.includes('hash') ? (
              <div className="alert info compact-alert">
                Hashes are one-way. Decrypt mode is intentionally unavailable.
              </div>
            ) : null}
          </div>
        </aside>

        <div className="encryption-main">
          {method === 'aes' ? (
            <div className="mini-card encryption-key-card">
              <label className="field-label" htmlFor="aes-secret">Password / Key Material</label>
              <input
                id="aes-secret"
                className="input"
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="Used only in this browser session"
              />
              <p className="muted-note">The password is never logged or sent to the backend.</p>
            </div>
          ) : null}

          {method === 'rsa' ? (
            <div className="mini-card encryption-key-card">
              <div className="encryption-key-header">
                <div>
                  <p className="metric-eyebrow">RSA Keys</p>
                  <p className="muted-note">Use PEM-formatted RSA-OAEP keys generated by this tool or another trusted source.</p>
                </div>
                <button
                  className="ghost-button compact-action-button"
                  type="button"
                  onClick={() => { void handleGenerateKeys(); }}
                  disabled={generatingKeys}
                >
                  <Wand2 size={16} />
                  {generatingKeys ? 'Generating...' : 'Generate key pair'}
                </button>
              </div>
              <div className="encryption-key-grid">
                <label className="stack compact-stack" htmlFor="rsa-public-key">
                  <span className="field-label">Public key</span>
                  <textarea
                    id="rsa-public-key"
                    className="input textarea mono-input"
                    value={publicKey}
                    onChange={(event) => setPublicKey(event.target.value)}
                    placeholder="-----BEGIN PUBLIC KEY-----"
                  />
                </label>
                <label className="stack compact-stack" htmlFor="rsa-private-key">
                  <span className="field-label">Private key</span>
                  <textarea
                    id="rsa-private-key"
                    className="input textarea mono-input"
                    value={privateKey}
                    onChange={(event) => setPrivateKey(event.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----"
                  />
                </label>
              </div>
            </div>
          ) : null}

          <div className="mini-card encryption-workbench">
            {error ? (
              <div className="alert error" aria-live="polite">
                {error}
              </div>
            ) : null}

            <div className="encryption-text-grid">
              <label className="stack compact-stack" htmlFor="encryption-input">
                <span className="field-label">Input</span>
                <textarea
                  id="encryption-input"
                  className="input textarea encryption-textarea"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste text here"
                />
              </label>

              <label className="stack compact-stack" htmlFor="encryption-output">
                <span className="field-label">Output</span>
                <textarea
                  id="encryption-output"
                  className="input textarea encryption-textarea mono-input"
                  value={output}
                  readOnly
                  placeholder="Result appears here"
                />
              </label>
            </div>

            <div className="encryption-actions">
              <button
                className="button"
                type="button"
                onClick={() => { void runTool(); }}
                disabled={running}
              >
                <KeyRound size={16} />
                {running ? 'Running...' : 'Run'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => { void copyOutput(); }}
                disabled={!output}
              >
                <Copy size={16} />
                {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy output'}
              </button>
              <button className="ghost-button" type="button" onClick={clearAll}>
                <RotateCcw size={16} />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default EncryptionTools;
