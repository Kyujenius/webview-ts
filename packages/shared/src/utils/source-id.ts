export function generateSourceId(name?: string): string {
  const prefix = name ?? 'bridge';
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${random}`;
}
