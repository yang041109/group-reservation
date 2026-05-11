/** 인원 구간별 예약금 (store.depositTiersJson) */

import type { DepositTier } from '@/types';

export type { DepositTier } from '@/types';

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
    if (max >= min) out.push({ minHeadcount: min, maxHeadcount: max, amount });
  }
  return out.sort((a, b) => a.minHeadcount - b.minHeadcount);
}

export function serializeDepositTiersForDb(tiers: DepositTier[]): string {
  const cleaned = tiers
    .map((t) => ({
      minHeadcount: Math.max(0, Math.floor(t.minHeadcount) || 0),
      maxHeadcount: Math.max(0, Math.floor(t.maxHeadcount) || 0),
      amount: Math.max(0, Math.floor(t.amount) || 0),
    }))
    .filter((t) => t.maxHeadcount >= t.minHeadcount);
  return JSON.stringify(cleaned);
}

export function resolveDepositForHeadcount(
  headcount: number,
  opts: { depositUseTiers: boolean; depositTiers: DepositTier[]; flatDepositAmount: number },
): number {
  const h = Math.floor(headcount);
  if (!Number.isFinite(h) || h < 1) return 0;
  if (opts.depositUseTiers && opts.depositTiers.length > 0) {
    const tier = opts.depositTiers.find((t) => h >= t.minHeadcount && h <= t.maxHeadcount);
    return tier ? Math.max(0, tier.amount) : 0;
  }
  return Math.max(0, Math.floor(opts.flatDepositAmount) || 0);
}
