export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

export type NicknameValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: 'required' | 'too-short' | 'too-long' };

export function validateNickname(rawValue: string): NicknameValidationResult {
  const trimmed = rawValue.trim();

  if (trimmed.length === 0) return { valid: false, reason: 'required' };
  if (trimmed.length < NICKNAME_MIN_LENGTH) return { valid: false, reason: 'too-short' };
  if (trimmed.length > NICKNAME_MAX_LENGTH) return { valid: false, reason: 'too-long' };

  return { valid: true };
}
