'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeId.trim() || !storeName.trim()) {
      setError('가게 ID와 이름을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: storeId.trim(),
          storeName: storeName.trim(),
        }),
      });

      const raw = await res.text();
      let data: { success?: boolean; message?: string; store?: unknown; debug?: string };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        setError(`서버 응답을 읽을 수 없습니다 (HTTP ${res.status}).`);
        return;
      }

      if (data.success) {
        sessionStorage.setItem('adminStore', JSON.stringify(data.store));
        router.push('/admin/dashboard');
      } else {
        const base = data.message || '로그인에 실패했습니다.';
        setError(data.debug ? `${base}\n(${data.debug})` : base);
      }
    } catch (err) {
      setError('네트워크 오류입니다. 연결을 확인해 주세요.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-500 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* 로고 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2">우르르</h1>
            <p className="text-gray-500 text-sm">사장님 전용 관리 페이지</p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가게 ID
              </label>
              <input
                type="text"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="예: store-1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가게 이름
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="예: 주점 A"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 안내 문구 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              가게 ID와 이름은 관리자에게 문의하세요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
