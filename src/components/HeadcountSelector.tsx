'use client';

interface HeadcountSelectorProps {
  maxCapacity: number;
  minCapacity?: number;
  selectedHeadcount: number;
  onChange: (headcount: number) => void;
}

export default function HeadcountSelector({
  maxCapacity,
  minCapacity = 1,
  selectedHeadcount,
  onChange,
}: HeadcountSelectorProps) {
  const effectiveMin = Math.max(0, minCapacity);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">👥 인원수</h3>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            disabled={selectedHeadcount <= effectiveMin}
            onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            disabled={selectedHeadcount <= effectiveMin}
            onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 10))}
            className="flex h-6 w-9 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −10
          </button>
        </div>
        <span className="min-w-[2.5rem] text-center text-lg font-bold text-gray-900">
          {selectedHeadcount}
        </span>
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            disabled={selectedHeadcount >= maxCapacity}
            onClick={() => onChange(Math.min(maxCapacity, selectedHeadcount + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            disabled={selectedHeadcount >= maxCapacity}
            onClick={() => onChange(Math.min(maxCapacity, selectedHeadcount + 10))}
            className="flex h-6 w-9 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +10
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {effectiveMin}명 ~ {maxCapacity}명
        </span>
      </div>
    </div>
  );
}
