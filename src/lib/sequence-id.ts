/** 1, 2, 3… 중 사용 중이지 않은 가장 작은 양의 정수 */
export function firstAvailableSequenceNumber(used: Iterable<number>): number {
  const set = new Set<number>();
  for (const n of used) {
    if (Number.isFinite(n) && n >= 1) set.add(Math.floor(n));
  }
  let candidate = 1;
  while (set.has(candidate)) candidate += 1;
  return candidate;
}
