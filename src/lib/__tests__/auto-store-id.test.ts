import { describe, expect, it } from 'vitest';
import { parseAutoStoreIdNumber, suggestNextAutoStoreId } from '@/lib/auto-store-id';

describe('auto-store-id', () => {
  it('parses store-N numbers', () => {
    expect(parseAutoStoreIdNumber('store-1')).toBe(1);
    expect(parseAutoStoreIdNumber('STORE-12')).toBe(12);
    expect(parseAutoStoreIdNumber('store-new')).toBeNull();
    expect(parseAutoStoreIdNumber('wolhyang')).toBeNull();
  });

  it('fills smallest missing store-N (reuse deleted slot)', () => {
    expect(suggestNextAutoStoreId(['store-1', 'store-3', 'cafe-a'])).toBe('store-2');
    expect(suggestNextAutoStoreId(['store-1', 'store-2', 'store-3'])).toBe('store-4');
    expect(suggestNextAutoStoreId([])).toBe('store-1');
  });
});
