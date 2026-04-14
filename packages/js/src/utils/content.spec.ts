import { joinScriptContent } from './content';

describe('joinScriptContent', () => {
  it('should return empty string for null', () => {
    expect(joinScriptContent(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(joinScriptContent(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(joinScriptContent('')).toBe('');
  });

  it('should return the string as-is for a single string', () => {
    expect(joinScriptContent('var x = 1;')).toBe('var x = 1;');
  });

  it('should join an array of strings', () => {
    expect(joinScriptContent(['var x = 1;', 'var y = 2;'])).toBe('var x = 1;var y = 2;');
  });

  it('should handle array with null/undefined entries', () => {
    expect(joinScriptContent(['var x = 1;', null, 'var y = 2;', undefined])).toBe('var x = 1;var y = 2;');
  });

  it('should return empty string for empty array', () => {
    expect(joinScriptContent([])).toBe('');
  });
});
