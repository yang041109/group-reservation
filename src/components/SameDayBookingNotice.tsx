/** 날짜를 오늘로 선택한 경우 — 잔여석·응답 안내 */
export default function SameDayBookingNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700 ${className}`}
      role="note"
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">당일 예약 현황 안내</p>
        <p className="mt-1 text-gray-600">
          실시간 잔여석이 아닌, 사전 예약 현황 기준으로 표시됩니다.
          <br />
          당일 예약의 경우 빠른 응답이 어려울 수 있습니다.
        </p>
      </div>
    </div>
  );
}
