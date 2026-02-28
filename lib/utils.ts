import crypto from 'crypto';

export function generateId(store: string, name: string): string {
  return crypto
    .createHash('md5')
    .update(`${store}:${name.toLowerCase()}`)
    .digest('hex')
    .slice(0, 16);
}

export function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
