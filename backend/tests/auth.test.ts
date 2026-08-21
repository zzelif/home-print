import { describe, it, expect } from 'vitest';
import { AuthService } from '../src/services/auth.service';

describe('AuthService (4-Digit PIN & Session Security)', () => {
  it('authenticates valid PIN and issues a secure session token', () => {
    const auth = new AuthService('1234');

    const invalidResult = auth.verifyPin('9999');
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.token).toBeUndefined();

    const validResult = auth.verifyPin('1234');
    expect(validResult.success).toBe(true);
    expect(validResult.token).toBeDefined();
    expect(typeof validResult.token).toBe('string');
  });

  it('validates active session tokens and rejects revoked ones', () => {
    const auth = new AuthService('5678');
    const { token } = auth.verifyPin('5678');

    expect(auth.validateSession(token)).toBe(true);
    expect(auth.validateSession('fake_token_123')).toBe(false);

    if (token) {
      auth.revokeSession(token);
      expect(auth.validateSession(token)).toBe(false);
    }
  });

  it('revokes all existing sessions when the PIN is updated', () => {
    const auth = new AuthService('1111');
    const { token } = auth.verifyPin('1111');
    expect(auth.validateSession(token)).toBe(true);

    auth.updatePin('2222');
    // Old session must be invalid
    expect(auth.validateSession(token)).toBe(false);

    // Old PIN fails, new PIN succeeds
    expect(auth.verifyPin('1111').success).toBe(false);
    expect(auth.verifyPin('2222').success).toBe(true);
  });
});
