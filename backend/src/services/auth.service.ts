import crypto from 'crypto';

export class AuthService {
  // Default fallback PIN is '1234' (can be configured in DB or env)
  private operatorPinHash: string;
  private activeSessions: Set<string> = new Set();

  constructor(pin: string = '1234') {
    this.operatorPinHash = this.hashPin(pin);
  }

  private hashPin(pin: string): string {
    return crypto.createHash('sha256').update(pin).digest('hex');
  }

  verifyPin(inputPin: string): { success: boolean; token?: string } {
    const inputHash = this.hashPin(inputPin);
    if (inputHash === this.operatorPinHash) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      this.activeSessions.add(sessionToken);
      return { success: true, token: sessionToken };
    }
    return { success: false };
  }

  validateSession(token?: string): boolean {
    if (!token) return false;
    return this.activeSessions.has(token);
  }

  revokeSession(token: string): void {
    this.activeSessions.delete(token);
  }

  updatePin(newPin: string): void {
    this.operatorPinHash = this.hashPin(newPin);
    this.activeSessions.clear(); // Revoke all sessions on PIN change
  }
}

export const authService = new AuthService(process.env.OPERATOR_PIN || '1234');
