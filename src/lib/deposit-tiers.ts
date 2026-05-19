/** 예약금: 고정 / 인당 / 구간별(구간마다 고정·인당 선택) */

import type { DepositTier } from '@/types';

export type { DepositTier } from '@/types';
export type DepositMode = 'flat' | 'per_person' | 'tiered';
export type DepositCalcType = 'fixed' | 'per_person';

/** DB depositUseTiers: 0=고정, 1=구간별, 2=인당 */
export function depositModeFromDb(raw: unknown): DepositMode {
  const n = Number(raw);
  if (n === 2) return 'per_person';
  if (n === 1 || raw === true || String(raw).toLowerCase() === 'true') return 'tiered';
  return 'flat';
}

export function depositModeToDb(mode: DepositMode): number {
  if (mode === 'per_person') return 2;
  if (mode === 'tiered') return 1;
  return 0;
}

export function parseDepositTiersJson(raw: unknown): DepositTier[] {
  if (raw == null) return [];
  let v: unknown = raw;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      v = JSON.parse(t) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: DepositTier[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const min = Math.max(0, Math.floor(Number(o.minHeadcount ?? o.min ?? 0) || 0));
    const max = Math.max(0, Math.floor(Number(o.maxHeadcount ?? o.max ?? 0) || 0));
    const amount = Math.max(0, Math.floor(Number(o.amount ?? 0) || 0));
    const ctRaw = String(o.calcType ?? o.calc ?? 'fixed').toLowerCase();
    const calcType: DepositCalcType = ctRaw === 'per_person' || ctRaw === 'perperson' ? 'per_person' : 'fixed';
    if (max >= min) out.push({ minHeadcount: min, maxHeadcount: max, amount, calcType });
  }
  return out.sort((a, b) => a.minHeadcount - b.minHeadcount);
}

export function serializeDepositTiersForDb(tiers: DepositTier[]): string {
  const cleaned = tiers
    .map((t) => ({
      minHeadcount: Math.max(0, Math.floor(t.minHeadcount) || 0),
      maxHeadcount: Math.max(0, Math.floor(t.maxHeadcount) || 0),
      amount: Math.max(0, Math.floor(t.amount) || 0),
      calcType: t.calcType === 'per_person' ? 'per_person' : 'fixed',
    }))
    .filter((t) => t.maxHeadcount >= t.minHeadcount);
  return JSON.stringify(cleaned);
}

export function resolveDepositForHeadcount(
  headcount: number,
  opts: {
    depositMode: DepositMode;
    depositTiers: DepositTier[];
    flatDepositAmount: number;
  },
): number {
  const h = Math.floor(headcount);
  if (!Number.isFinite(h) || h < 1) return 0;

  if (opts.depositMode === 'per_person') {
    const rate = Math.max(0, Math.floor(opts.flatDepositAmount) || 0);
    return rate * h;
  }

  if (opts.depositMode === 'tiered' && opts.depositTiers.length > 0) {
    const tier = opts.depositTiers.find((t) => h >= t.minHeadcount && h <= t.maxHeadcount);
    if (!tier) return 0;
    const amount = Math.max(0, Math.floor(tier.amount) || 0);
    if (tier.calcType === 'per_person') return amount * h;
    return amount;
  }

  return Math.max(0, Math.floor(opts.flatDepositAmount) || 0);
}

/** 예약금이 1원 이상이면 입금 안내(예금주·계좌) 필요 */
export function depositRequiresBankInfo(opts: {
  depositMode: DepositMode;
  flatDepositAmount: number;
  depositTiers: DepositTier[];
}): boolean {
  if (opts.depositMode === 'per_person') {
    return (Math.floor(opts.flatDepositAmount) || 0) >= 1;
  }
  if (opts.depositMode === 'flat') {
    return (Math.floor(opts.flatDepositAmount) || 0) >= 1;
  }
  return opts.depositTiers.some((t) => (Math.floor(t.amount) || 0) >= 1);
}

export function formatTierDepositLabel(tier: DepositTier): string {
  if (tier.calcType === 'per_person') {
    return `인당 ${tier.amount.toLocaleString()}원`;
  }
  return `${tier.amount.toLocaleString()}원`;
}

export function formatDepositModeLabel(mode: DepositMode): string {
  if (mode === 'per_person') return '인당';
  if (mode === 'tiered') return '구간별';
  return '고정';
}
