// TASK:669 Secret detection & redaction utilities
// Lightweight heuristic-based scanner; future enhancement: pluggable rules & entropy scoring.

export interface SecretFinding {
  type: string;
  value: string;
  start: number;
  end: number;
  redacted: string;
}

export interface ScanResult {
  findings: SecretFinding[];
  redactedText: string;
}

// Common secret pattern heuristics (broad, low false-positive tuning for first pass)
// Notes: Keep ordering stable (longer / more specific first).
const PATTERNS: { type: string; regex: RegExp; redaction?: string }[] = [
  // Generic API keys (hex / base64 like)
  { type: 'generic_api_key', regex: /(?<![A-Z0-9])[A-F0-9]{32}(?![A-Z0-9])/g },
  // AWS Access Key ID
  { type: 'aws_access_key', regex: /AKIA[0-9A-Z]{16}/g },
  // AWS Secret Key (not exact but heuristic)
  { type: 'aws_secret', regex: /(?<![A-Za-z0-9+\/])[A-Za-z0-9+\/]{40}(?![A-Za-z0-9+\/])/g },
  // JWT (header.payload.signature)
  { type: 'jwt', regex: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/g },
  // Private key headers (single-line snippet detection)
  { type: 'pem_private_key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g },
  // OAuth bearer tokens (very loose)
  { type: 'bearer_token', regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g },
];

export function scanSecrets(text: string): ScanResult {
  const findings: SecretFinding[] = [];
  let redacted = text;
  for (const { type, regex } of PATTERNS) {
    regex.lastIndex = 0; // reset
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0];
      const start = match.index;
      const end = start + value.length;
      const replacement = `__REDACTED_${type.toUpperCase()}__`;
      findings.push({ type, value, start, end, redacted: replacement });
    }
  }
  // Apply redactions without messing indices: iterate findings sorted by start
  if (findings.length) {
    const segments: string[] = [];
    let cursor = 0;
    const sorted = findings.sort((a,b)=> a.start - b.start);
    for(const f of sorted){
      segments.push(redacted.slice(cursor, f.start));
      segments.push(f.redacted);
      cursor = f.end;
    }
    segments.push(redacted.slice(cursor));
    redacted = segments.join('');
  }
  return { findings, redactedText: redacted };
}

export function redactSecrets(text: string): string {
  return scanSecrets(text).redactedText;
}

export function hasSecrets(text: string): boolean {
  return scanSecrets(text).findings.length > 0;
}

// Future: entropy-based detection for random-looking strings > certain length.
