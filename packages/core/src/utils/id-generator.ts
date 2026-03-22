/**
 * Generate unique IDs for bridge messages
 */

let counter = 0;

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  counter = (counter + 1) % 1000;
  return `${timestamp}-${random}-${counter}`;
}
