/**
 * Generate unique IDs for bridge messages
 */

/** Resolved once at module load — feature detection off the per-call hot path */
const getRandomValues =
  typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    : undefined;

const randomBytes = new Uint8Array(8);

/**
 * Cryptographically random hex string (16 chars).
 * Message IDs must be unpredictable — a spoofed response needs a matching id.
 * Falls back to Math.random only when Web Crypto is unavailable.
 */
function randomPart(): string {
  if (getRandomValues) {
    getRandomValues(randomBytes);
    return Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `${Date.now()}-${randomPart()}`;
}
