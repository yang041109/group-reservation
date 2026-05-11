import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '사장님용 우르르 - 예약 관리',
  description: '우르르 예약 관리 시스템',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // admin 페이지에서는 일반 사용자용 헤더를 표시하지 않음
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
