import { describe, expect, it } from 'vitest';
import {
  parseAutoMenuIdNumber,
  storeMenuIdsAreSequential,
  suggestNextAutoMenuId,
} from '@/lib/auto-menu-id';

describe('auto-menu-id', () => {
  it('parses menu-store-1-N', () => {
    expect(parseAutoMenuIdNumber('menu-store-1-2', 'store-1')).toBe(2);
    expect(parseAutoMenuIdNumber('menu-1', 'store-1')).toBeNull();
  });

  it('fills smallest missing menu number', () => {
    expect(
      suggestNextAutoMenuId('store-1', ['menu-store-1-1', 'menu-store-1-3']),
    ).toBe('menu-store-1-2');
    expect(suggestNextAutoMenuId('store-2', [])).toBe('menu-store-2-1');
  });

  it('detects non-sequential ids', () => {
    expect(storeMenuIdsAreSequential('store-1', ['menu-store-1-1', 'menu-store-1-2'])).toBe(true);
    expect(storeMenuIdsAreSequential('store-1', ['menu-store-1-1', 'menu-store-1-3'])).toBe(false);
    expect(storeMenuIdsAreSequential('store-1', ['menu-old'])).toBe(false);
  });
});
