import { describe, expect, it } from 'vitest';
import {
  depositModeFromDb,
  depositModeToDb,
  depositRequiresBankInfo,
  resolveDepositForHeadcount,
} from '../deposit-tiers';

describe('resolveDepositForHeadcount', () => {
  it('flat mode returns fixed amount', () => {
    expect(
      resolveDepositForHeadcount(30, {
        depositMode: 'flat',
        flatDepositAmount: 100_000,
        depositTiers: [],
      }),
    ).toBe(100_000);
  });

  it('per_person mode multiplies by headcount', () => {
    expect(
      resolveDepositForHeadcount(30, {
        depositMode: 'per_person',
        flatDepositAmount: 5_000,
        depositTiers: [],
      }),
    ).toBe(150_000);
  });

  it('tiered fixed amount for matching range', () => {
    expect(
      resolveDepositForHeadcount(25, {
        depositMode: 'tiered',
        flatDepositAmount: 0,
        depositTiers: [
          { minHeadcount: 1, maxHeadcount: 30, amount: 100_000, calcType: 'fixed' },
          { minHeadcount: 31, maxHeadcount: 99, amount: 5_000, calcType: 'per_person' },
        ],
      }),
    ).toBe(100_000);
  });

  it('tiered per_person for upper range', () => {
    expect(
      resolveDepositForHeadcount(40, {
        depositMode: 'tiered',
        flatDepositAmount: 0,
        depositTiers: [
          { minHeadcount: 1, maxHeadcount: 30, amount: 100_000, calcType: 'fixed' },
          { minHeadcount: 31, maxHeadcount: 99, amount: 5_000, calcType: 'per_person' },
        ],
      }),
    ).toBe(200_000);
  });
});

describe('depositModeFromDb', () => {
  it('maps 0/1/2', () => {
    expect(depositModeFromDb(0)).toBe('flat');
    expect(depositModeFromDb(1)).toBe('tiered');
    expect(depositModeFromDb(2)).toBe('per_person');
  });
});

describe('depositModeToDb', () => {
  it('round-trips modes', () => {
    expect(depositModeToDb('flat')).toBe(0);
    expect(depositModeToDb('tiered')).toBe(1);
    expect(depositModeToDb('per_person')).toBe(2);
  });
});

describe('depositRequiresBankInfo', () => {
  it('shows bank fields when tier has per-person rate', () => {
    expect(
      depositRequiresBankInfo({
        depositMode: 'tiered',
        flatDepositAmount: 0,
        depositTiers: [{ minHeadcount: 31, maxHeadcount: 99, amount: 5000, calcType: 'per_person' }],
      }),
    ).toBe(true);
  });
});
