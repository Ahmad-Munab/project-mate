import crypto from 'crypto';

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateExpirationDate(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 24); // 24 hours from now
  return date;
}