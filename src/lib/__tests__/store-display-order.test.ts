import { describe, expect, it } from 'vitest';
import { compareStoresByDisplayOrder } from '@/lib/store-display-order';

describe('store-display-order', () => {
  it('sorts by sortOrder then Korean name', () => {
    const list = [
      { name: '갱생', sortOrder: 20 },
      { name: '박지원', sortOrder: 10 },
      { name: '우르르', sortOrder: 10 },
    ];
    list.sort(compareStoresByDisplayOrder);
    expect(list.map((s) => s.name)).toEqual(['박지원', '우르르', '갱생']);
  });
});
