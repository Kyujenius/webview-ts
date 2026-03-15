/**
 * Registry for managing callbacks and matching requests to responses
 */

import type { BridgeResponse } from '@ts-bridge/shared';

/**
 * Callback entry with timeout handling
 */
interface CallbackEntry {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  timestamp: number;
}

/**
 * Manages callbacks for pending bridge requests
 */
export class CallbackRegistry {
  private callbacks = new Map<string, CallbackEntry>();

  /**
   * Register a callback for a message ID
   */
  register(
    messageId: string,
    resolve: (value: unknown) => void,
    reject: (error: Error) => void,
    timeout?: number
  ): void {
    const entry: CallbackEntry = {
      resolve,
      reject,
      timestamp: Date.now(),
    };

    // Set timeout if specified
    if (timeout && timeout > 0) {
      entry.timeoutId = setTimeout(() => {
        this.remove(messageId);
        reject(new Error(`Bridge call timeout after ${timeout}ms`));
      }, timeout);
    }

    this.callbacks.set(messageId, entry);
  }

  /**
   * Handle response from native
   */
  handleResponse(response: BridgeResponse): boolean {
    const entry = this.callbacks.get(response.id);

    if (!entry) {
      return false;
    }

    // Clear timeout
    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }

    // Remove callback
    this.callbacks.delete(response.id);

    // Resolve or reject based on response
    if (response.success) {
      entry.resolve(response.data);
    } else {
      const error = new Error(response.error?.message || 'Bridge call failed');
      (error as any).code = response.error?.code;
      (error as any).details = response.error?.details;
      entry.reject(error);
    }

    return true;
  }

  /**
   * Remove a callback
   */
  remove(messageId: string): boolean {
    const entry = this.callbacks.get(messageId);

    if (!entry) {
      return false;
    }

    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }

    this.callbacks.delete(messageId);
    return true;
  }

  /**
   * Check if a callback exists
   */
  has(messageId: string): boolean {
    return this.callbacks.has(messageId);
  }

  /**
   * Get number of pending callbacks
   */
  size(): number {
    return this.callbacks.size;
  }

  /**
   * Clear all callbacks
   */
  clear(): void {
    // Clear all timeouts
    for (const entry of this.callbacks.values()) {
      if (entry.timeoutId) {
        clearTimeout(entry.timeoutId);
      }
    }

    this.callbacks.clear();
  }

  /**
   * Get all pending message IDs
   */
  getPendingIds(): string[] {
    return Array.from(this.callbacks.keys());
  }
}
