import * as crypto from 'crypto';

if (!globalThis.crypto) {
  (globalThis as Record<string, unknown>).crypto = crypto;
}
