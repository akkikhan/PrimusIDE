import { approxTokensFromText } from '../../src/shared/aiContext';

describe('approxTokensFromText', () => {
  it('returns 0 for empty text', () => {
    expect(approxTokensFromText('')).toBe(0);
  });

  it('estimates token count using 4 char heuristic', () => {
    const text = 'abcd'.repeat(10); // 40 chars => ~10 tokens
    expect(approxTokensFromText(text)).toBe(10);
  });

  it('rounds to nearest whole token', () => {
    expect(approxTokensFromText('12345')).toBe(1);
  });
});
