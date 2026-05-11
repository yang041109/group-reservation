import Link from 'next/link';

export default function AdminLandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">우르르 · 사장님 관리</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          가게마다 발급된 <strong>전용 링크</strong>로만 접속할 수 있습니다.
          <br />
          로그인 화면은 사용하지 않습니다.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          예: <code className="rounded bg-slate-100 px-1 py-0.5">/admin/m/발급받은토큰</code>
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            예약 사이트로
          </Link>
          <Link
            href="/admin/manage"
            className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
          >
            운영자 전역 관리
          </Link>
        </div>
      </div>
    </div>
  );
}
