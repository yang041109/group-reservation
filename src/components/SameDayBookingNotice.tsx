/** 날짜를 오늘로 선택한 경우 — 잔여석·응답 안내 */
export default function SameDayBookingNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 ${className}`}
      role="note"
    >
      <p className="font-semibold">오늘 날짜로 예약하시나요?</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-amber-900">
        <li>
          표시되는 잔여 시간은 <span className="font-medium">사전 예약 현황</span> 기준이에요. 매장에
          바로 들어온 손님은 반영되지 않을 수 있어요.
        </li>
        <li>그래서 화면과 실제 여유가 100% 같지는 않을 수 있어요.</li>
        <li>당일 예약은 가게 확인·응답이 다소 늦을 수 있어요.</li>
      </ul>
    </div>
  );
}
