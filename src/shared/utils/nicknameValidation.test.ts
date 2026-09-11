import { describe, it, expect } from 'vitest';
import { validateNickname } from './nicknameValidation';

describe('validateNickname', () => {
  it('يرفض قيمة فارغة', () => {
    expect(validateNickname('')).toEqual({ valid: false, reason: 'required' });
  });

  it('يرفض مسافات فقط', () => {
    expect(validateNickname('   ')).toEqual({ valid: false, reason: 'required' });
  });

  it('يرفض أقل من حرفين', () => {
    expect(validateNickname('ا')).toEqual({ valid: false, reason: 'too-short' });
  });

  it('يرفض أكثر من 20 حرف', () => {
    expect(validateNickname('a'.repeat(21))).toEqual({ valid: false, reason: 'too-long' });
  });

  it('يقبل اسماً صالحاً', () => {
    expect(validateNickname('أحمد')).toEqual({ valid: true });
  });
});
