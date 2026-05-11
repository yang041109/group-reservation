import Link from 'next/link';

export default function AdminTokenNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">링크를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm text-gray-600">
          주소가 잘못되었거나 만료·비활성화된 관리 링크일 수 있습니다. 운영자에게 새 링크를 요청해 주세요.
        </p>
        <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
          관리 안내로
        </Link>
      </div>
    </div>
  );
}
